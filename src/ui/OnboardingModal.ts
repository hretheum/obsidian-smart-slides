import { App, Modal, Setting } from 'obsidian';

export type OnboardingAction = 'start' | 'skip' | 'close';

export class OnboardingModal extends Modal {
  private readonly onAction: (action: OnboardingAction) => void | Promise<void>;
  constructor(app: App, onAction: (action: OnboardingAction) => void | Promise<void>) {
    super(app);
    this.onAction = onAction;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: 'Welcome to Smart Slides' });
    contentEl.createEl('p', {
      text: 'Create high-quality presentations from notes with safety and style presets.',
    });

    new Setting(contentEl)
      .setName('Default theme')
      .setDesc('Choose your preferred starting theme')
      .addDropdown((d) => {
        d.addOptions({
          business: 'Business',
          technical: 'Technical',
          academic: 'Academic',
          creative: 'Creative',
        });
        d.setValue('business');
      });

    new Setting(contentEl)
      .setName('Learn the basics')
      .setDesc('Open a quick tutorial note to get started')
      .addButton((b) =>
        b.setButtonText('Start tutorial').onClick(async () => {
          await this.onAction('start');
          this.close();
        }),
      )
      .addExtraButton((b) =>
        b
          .setIcon('chevrons-right')
          .setTooltip('Skip for now')
          .onClick(async () => {
            await this.onAction('skip');
            this.close();
          }),
      );
  }

  onClose(): void {
    this.onAction('close');
    this.contentEl.empty();
  }
}
