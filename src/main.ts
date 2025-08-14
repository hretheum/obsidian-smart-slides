import { Plugin, Notice } from 'obsidian';
import { isOk } from './types/Result';
import { CircuitBreaker } from './utils/CircuitBreaker';
import { withRetry } from './utils/Retry';
import { Logger } from './utils/Logger';

export interface SmartSlidesSettings {
  lastUsedAt: number;
}

const DEFAULT_SETTINGS: SmartSlidesSettings = { lastUsedAt: 0 };

export default class SmartSlidesPlugin extends Plugin {
  private settings: SmartSlidesSettings = DEFAULT_SETTINGS;
  private ribbonEl: HTMLElement | null = null;
  private breaker = new CircuitBreaker();
  private log = new Logger('SmartSlides');

  async onload() {
    await this.loadSettings();
    await this.saveSettings();

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
        await this.breaker.execute(async () => {
          await withRetry(async () => {
            // Placeholder future IO; currently just success path
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
  }

  async onunload() {
    if (this.ribbonEl?.parentElement) {
      this.ribbonEl.parentElement.removeChild(this.ribbonEl);
    }
    this.ribbonEl = null;
  }

  private async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  private async saveSettings() {
    // Intentionally unused for now; will be used in Task 1.5
    await this.saveData(this.settings);
  }

  private async validateAndNormalizeFilename(name: string) {
    const { validateSafeFilename } = await import('./security/InputValidatorShim');
    const { normalizeVaultRelativePath } = await import('./security/SecurePathShim');
    const safe = validateSafeFilename(name);
    if (!safe.ok) return safe;
    return normalizeVaultRelativePath(`${safe.value}.md`);
  }
}
