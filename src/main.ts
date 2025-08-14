import { Plugin } from 'obsidian';

export interface SmartSlidesSettings {
  lastUsedAt: number;
}

const DEFAULT_SETTINGS: SmartSlidesSettings = { lastUsedAt: 0 };

export default class SmartSlidesPlugin extends Plugin {
  private settings: SmartSlidesSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();
    await this.saveSettings();
  }

  async onunload() {
    // noop for now: lifecycle hook used to cleanup resources later
  }

  private async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  private async saveSettings() {
    // Intentionally unused for now; will be used in Task 1.5
    await this.saveData(this.settings);
  }
}
