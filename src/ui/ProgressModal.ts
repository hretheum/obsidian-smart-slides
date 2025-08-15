import { App, Modal } from 'obsidian';
import { ProgressController, ProgressUpdate } from './ProgressController';

export class ProgressModal extends Modal {
  private readonly controller: ProgressController;
  private progressBarEl!: HTMLDivElement;
  private progressTextEl!: HTMLDivElement;
  private statusEl!: HTMLDivElement;
  private cancelButtonEl!: HTMLButtonElement;
  private previewEl!: HTMLDivElement;
  private errorEl!: HTMLDivElement;

  constructor(app: App, controller: ProgressController) {
    super(app);
    this.controller = controller;
  }

  onOpen(): void {
    const { contentEl, modalEl } = this;
    modalEl.setAttr('aria-labelledby', 'smart-slides-progress-title');
    modalEl.setAttr('role', 'dialog');
    modalEl.setAttr('aria-modal', 'true');

    contentEl.empty();

    const title = contentEl.createEl('h2', { text: 'Generating presentation…' });
    title.id = 'smart-slides-progress-title';

    const barContainer = contentEl.createEl('div', {
      attr: { 'aria-live': 'polite' },
      cls: 'smart-slides-progress-bar-container',
    });

    this.progressBarEl = barContainer.createEl('div', {
      cls: 'smart-slides-progress-bar',
    });

    this.progressTextEl = contentEl.createEl('div', {
      cls: 'smart-slides-progress-text',
      text: '0% — Starting…',
    });

    this.statusEl = contentEl.createEl('div', {
      cls: 'smart-slides-status',
      text: 'Idle',
    });

    this.previewEl = contentEl.createEl('div', {
      cls: 'smart-slides-preview',
    });

    this.errorEl = contentEl.createEl('div', {
      cls: 'smart-slides-error',
    });

    const controls = contentEl.createEl('div', { cls: 'smart-slides-controls' });
    this.cancelButtonEl = controls.createEl('button', {
      text: 'Cancel',
    });
    this.cancelButtonEl.addEventListener('click', () => {
      this.controller.cancel();
      this.cancelButtonEl.setAttr('disabled', 'true');
    });

    this.controller.start();
    this.unsubscribe = this.controller.on((u) => this.onProgress(u));
  }

  private unsubscribe: (() => void) | null = null;

  onClose(): void {
    if (this.unsubscribe) this.unsubscribe();
    this.contentEl.empty();
  }

  private onProgress(update: ProgressUpdate): void {
    const pct = Math.round(update.percent);
    this.progressBarEl.style.width = `${pct}%`;
    this.progressTextEl.setText(
      `${pct}% — ${update.message}${
        update.etaMs != null ? ` — ETA ${Math.ceil(update.etaMs / 1000)}s` : ''
      }`,
    );
    this.statusEl.setText(`Phase: ${update.phase}`);

    // Prevent closing while running
    if (pct < 100 && !this.controller.cancelled) {
      this.scope.register([], 'Escape', (evt) => {
        evt.preventDefault();
      });
    }

    if (update.previewSnippet) this.previewEl.setText(update.previewSnippet);

    if (update.message.startsWith('Error:')) {
      this.errorEl.setText(update.message);
      this.cancelButtonEl.setAttr('disabled', 'true');
    }

    if (pct >= 100 || this.controller.cancelled) {
      this.close();
    }
  }
}
