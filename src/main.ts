import { App, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { ProgressController } from './ui/ProgressController';
import { ProgressModal } from './ui/ProgressModal';
import { isOk } from './types/Result';
import { CircuitBreaker } from './utils/CircuitBreaker';
import { withRetry } from './utils/Retry';
import { Logger } from './utils/Logger';

export interface SmartSlidesSettings {
  lastUsedAt: number;
  enableAnimations: boolean;
  defaultTheme: 'business' | 'technical' | 'academic' | 'creative';
  maxSlides: number; // 5..200
  safeMode: boolean;
  // UX & Onboarding
  hasCompletedOnboarding: boolean;
  onboardingVersion: number;
}

const DEFAULT_SETTINGS: SmartSlidesSettings = {
  lastUsedAt: 0,
  enableAnimations: true,
  defaultTheme: 'business',
  maxSlides: 40,
  safeMode: true,
  hasCompletedOnboarding: false,
  onboardingVersion: 1,
};

export default class SmartSlidesPlugin extends Plugin {
  public settings: SmartSlidesSettings = DEFAULT_SETTINGS;
  private ribbonEl: HTMLElement | null = null;
  private breaker = new CircuitBreaker();
  private log = new Logger('SmartSlides');
  private static readonly ONBOARDING_VERSION = 1;

  async onload() {
    await this.loadSettings();
    await this.saveSettings();

    this.addSettingTab(new SmartSlidesSettingTab(this.app, this));

    await this.maybeShowOnboarding();

    this.addCommand({
      id: 'smart-slides-generate-sample',
      name: 'Generate sample presentation (validate input)',
      callback: async () => {
        const filename = 'Sample Presentation';
        const validated = await this.validateAndNormalizeFilename(filename);
        if (!isOk(validated)) {
          this.log.warn(`Invalid filename: ${validated.error.message}`);
          new Notice(`Invalid filename: ${validated.error.message}`);
          return;
        }
        const controller = new ProgressController();
        const modal = new ProgressModal(this.app, controller);
        modal.open();
        // Simulate generation with staged updates
        await this.breaker.execute(async () => {
          await withRetry(async () => {
            controller.update({ percent: 5, phase: 'analysis', message: 'Analyzing content…' });
            await sleep(200);
            controller.update({ percent: 25, phase: 'layout', message: 'Selecting layouts…' });
            await sleep(200);
            controller.update({ percent: 45, phase: 'style', message: 'Applying styles…' });
            await sleep(200);
            controller.update({
              percent: 70,
              phase: 'compose',
              message: 'Composing slides…',
              previewSnippet: '# Title\n- point A\n- point B',
            });
            await sleep(200);
            controller.update({
              percent: 90,
              phase: 'quality',
              message: 'Running quality checks…',
            });
            await sleep(200);
            controller.update({ percent: 100, phase: 'finalize', message: 'Finalizing…' });
            this.log.info(`Validated path: ${validated.value.path}`);
          });
        });
        new Notice(`OK: ${validated.value.path}`);
      },
    });

    this.ribbonEl = this.addRibbonIcon(
      'presentation',
      'Smart Slides: Generate sample',
      async () => {
        const result = await this.validateAndNormalizeFilename('Sample Presentation');
        if (!result.ok) {
          new Notice(`Validation error: ${result.error.message}`);
          return;
        }
        new Notice('Smart Slides ready');
      },
    );

    this.addCommand({
      id: 'smart-slides-open-onboarding',
      name: 'Open onboarding',
      callback: async () => this.openOnboarding(),
    });
  }

  async onunload() {
    if (this.ribbonEl?.parentElement) {
      this.ribbonEl.parentElement.removeChild(this.ribbonEl);
    }
    this.ribbonEl = null;
  }

  public async loadSettings() {
    const data = (await this.loadData()) ?? {};
    const merged = { ...DEFAULT_SETTINGS, ...data } as SmartSlidesSettings;
    this.settings = this.validateAndCoerceSettings(merged);
  }

  public async saveSettings() {
    await this.saveData(this.settings);
  }

  public validateAndCoerceSettings(s: SmartSlidesSettings): SmartSlidesSettings {
    const coerced: SmartSlidesSettings = { ...s };
    this.coerceCoreFields(coerced);
    this.coerceThemeFields(coerced);
    this.coerceOnboardingFields(coerced);
    return coerced;
  }

  private coerceCoreFields(settings: SmartSlidesSettings): void {
    if (typeof settings.lastUsedAt !== 'number' || settings.lastUsedAt < 0) settings.lastUsedAt = 0;
    if (typeof settings.enableAnimations !== 'boolean')
      settings.enableAnimations = DEFAULT_SETTINGS.enableAnimations;
    if (typeof settings.maxSlides !== 'number' || !Number.isFinite(settings.maxSlides))
      settings.maxSlides = DEFAULT_SETTINGS.maxSlides;
    settings.maxSlides = Math.min(200, Math.max(5, Math.round(settings.maxSlides)));
    if (typeof settings.safeMode !== 'boolean') settings.safeMode = DEFAULT_SETTINGS.safeMode;
  }

  private coerceThemeFields(settings: SmartSlidesSettings): void {
    const allowedThemes: Array<SmartSlidesSettings['defaultTheme']> = [
      'business',
      'technical',
      'academic',
      'creative',
    ];
    const themeIsAllowed = allowedThemes.includes(settings.defaultTheme);
    if (!themeIsAllowed) settings.defaultTheme = DEFAULT_SETTINGS.defaultTheme;
  }

  private coerceOnboardingFields(settings: SmartSlidesSettings): void {
    if (typeof settings.hasCompletedOnboarding !== 'boolean')
      settings.hasCompletedOnboarding = DEFAULT_SETTINGS.hasCompletedOnboarding;
    const versionValid =
      typeof settings.onboardingVersion === 'number' && settings.onboardingVersion >= 0;
    if (!versionValid) settings.onboardingVersion = DEFAULT_SETTINGS.onboardingVersion;
  }

  private async maybeShowOnboarding(): Promise<void> {
    const shouldShow =
      this.settings.hasCompletedOnboarding !== true ||
      (this.settings.onboardingVersion ?? 0) < SmartSlidesPlugin.ONBOARDING_VERSION;
    if (!shouldShow) return;
    await this.openOnboarding();
  }

  private async openOnboarding(): Promise<void> {
    const { OnboardingModal } = await import('./ui/OnboardingModal');
    new OnboardingModal(this.app, async (action) => {
      if (action === 'start') {
        this.settings.hasCompletedOnboarding = true;
        this.settings.onboardingVersion = SmartSlidesPlugin.ONBOARDING_VERSION;
        await this.saveSettings();
      }
    }).open();
  }

  private async validateAndNormalizeFilename(name: string) {
    const { validateSafeFilename } = await import('./security/InputValidatorShim');
    const { normalizeVaultRelativePath } = await import('./security/SecurePathShim');
    const safe = validateSafeFilename(name);
    if (!safe.ok) return safe;
    return normalizeVaultRelativePath(`${safe.value}.md`);
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

class SmartSlidesSettingTab extends PluginSettingTab {
  private plugin: SmartSlidesPlugin;
  constructor(app: App, plugin: SmartSlidesPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Smart Slides Settings' });
    const searchWrap = containerEl.createEl('div', { cls: 'smart-slides-settings-search' });
    const searchInput = searchWrap.createEl('input', {
      type: 'search',
      attr: { placeholder: 'Search settings…', 'aria-label': 'Search settings' },
    });
    searchInput.addEventListener('input', () =>
      this.filterSettings(containerEl, searchInput.value),
    );
    this.renderGeneralSection(containerEl);
    this.renderControlsSection(containerEl);
  }

  private renderGeneralSection(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName('Enable animations')
      .setDesc('Toggle smooth UI animations in modals and slides.')
      .addToggle((t) => {
        t.setValue(this.plugin.settings.enableAnimations).onChange(async (v) => {
          this.plugin.settings.enableAnimations = Boolean(v);
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Default theme')
      .setDesc('Theme preference used when composing slides.')
      .addDropdown((d) => {
        d.addOptions({
          business: 'Business',
          technical: 'Technical',
          academic: 'Academic',
          creative: 'Creative',
        });
        d.setValue(this.plugin.settings.defaultTheme);
        d.onChange(async (v) => {
          const value = v as SmartSlidesSettings['defaultTheme'];
          this.plugin.settings.defaultTheme = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Max slides')
      .setDesc('Upper bound for generated slide count (5–200).')
      .addText((t) => {
        t.setPlaceholder('e.g. 40');
        t.setValue(String(this.plugin.settings.maxSlides));
        t.onChange(async (raw) => {
          const parsed = Number.parseInt(raw, 10);
          const before = this.plugin.settings.maxSlides;
          this.plugin.settings.maxSlides = Number.isFinite(parsed) ? parsed : before;
          this.plugin.settings = this.plugin.validateAndCoerceSettings(this.plugin.settings);
          t.setValue(String(this.plugin.settings.maxSlides));
          await this.plugin.saveSettings();
        });
      })
      .addExtraButton((b) =>
        b
          .setIcon('help')
          .setTooltip('Generator will not exceed this bound; actual count depends on content.'),
      );

    new Setting(containerEl)
      .setName('Safe mode')
      .setDesc('Apply aggressive sanitization and validation to user inputs and generated content.')
      .addToggle((t) => {
        t.setValue(this.plugin.settings.safeMode).onChange(async (v) => {
          this.plugin.settings.safeMode = Boolean(v);
          await this.plugin.saveSettings();
        });
      });
  }

  private renderControlsSection(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName('Restore defaults')
      .setDesc('Reset all settings to default values (confirmation required).')
      .addButton((b) => {
        b.setButtonText('Reset to defaults');
        b.setTooltip('Revert every option to its original value');
        b.onClick(async () => {
          const confirmed = confirm('Reset Smart Slides settings to defaults?');
          if (!confirmed) return;
          this.plugin.settings = { ...DEFAULT_SETTINGS };
          await this.plugin.saveSettings();
          this.display();
        });
      });

    new Setting(containerEl)
      .setName('Export settings')
      .setDesc('Copy current settings as JSON to clipboard.')
      .addButton((b) => {
        b.setButtonText('Export JSON');
        b.setTooltip('Copy current settings to clipboard as JSON');
        b.onClick(async () => {
          const json = JSON.stringify(this.plugin.settings, null, 2);
          await navigator.clipboard.writeText(json);
          new Notice('Smart Slides settings copied to clipboard');
        });
      });

    new Setting(containerEl)
      .setName('Import settings')
      .setDesc('Paste JSON to import. Invalid fields are ignored.')
      .addTextArea((ta) => {
        ta.setPlaceholder('{"maxSlides": 50, "defaultTheme": "technical" }');
        ta.onChange(async (raw) => {
          try {
            const parsed = JSON.parse(raw);
            const next = this.plugin.validateAndCoerceSettings({
              ...this.plugin.settings,
              ...parsed,
            });
            this.plugin.settings = next;
            await this.plugin.saveSettings();
          } catch {
            // ignore parsing errors until user clicks elsewhere
          }
        });
      });
  }

  private filterSettings(containerEl: HTMLElement, query: string): void {
    const normalized = query.trim().toLowerCase();
    const items = containerEl.querySelectorAll('.setting-item');
    items.forEach((el) => {
      const text = el.textContent?.toLowerCase() ?? '';
      (el as HTMLElement).style.display =
        normalized === '' || text.includes(normalized) ? '' : 'none';
    });
  }
}
