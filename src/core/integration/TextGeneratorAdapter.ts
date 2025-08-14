import { BaseAdapter, AdapterContext, AdapterError, PluginInfo } from './BaseAdapter';
import { sanitizePlainText } from '../../security/InputValidator';

export interface PromptTemplates {
  title: (topic: string) => string;
  outline: (topic: string) => string;
  slide: (topic: string, keyPoint: string) => string;
}

export const DefaultPromptTemplates: PromptTemplates = {
  title: (topic) => `Generate a compelling presentation title for: ${topic}`,
  outline: (topic) => `List 5-7 key bullet points for a presentation about: ${topic}`,
  slide: (topic, key) =>
    `Expand the point "${key}" into 3 concise bullet points for a presentation about ${topic}.`,
};

export interface TextGeneratorApi {
  generate(prompt: string): Promise<string>;
}

export class TextGeneratorAdapter extends BaseAdapter {
  private readonly api: TextGeneratorApi;
  private readonly prompts: PromptTemplates;

  constructor(
    pluginInfo: PluginInfo,
    api: TextGeneratorApi,
    context: AdapterContext = {},
    prompts: PromptTemplates = DefaultPromptTemplates,
  ) {
    super(pluginInfo, context);
    this.api = api;
    this.prompts = prompts;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.api.generate('ping');
      return true;
    } catch {
      return false;
    }
  }

  async getVersion(): Promise<string> {
    return this.pluginInfo.version;
  }

  async getName(): Promise<string> {
    return this.pluginInfo.name;
  }

  async generateTitle(topic: string): Promise<string> {
    const prompt = this.prompts.title(topic);
    const text = await this.withResilience(() => this.api.generate(prompt));
    return this.sanitizeText(text).trim();
  }

  async generateOutline(topic: string): Promise<string[]> {
    const prompt = this.prompts.outline(topic);
    const text = await this.withResilience(() => this.api.generate(prompt));
    const lines = this.sanitizeText(text)
      .split(/\r?\n/)
      .map((l) => l.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean);
    if (lines.length < 3)
      throw new AdapterError('Invalid outline response', 'INVALID_RESPONSE', this.pluginInfo.id);
    return lines.slice(0, 7);
  }

  async generateSlide(topic: string, keyPoint: string): Promise<string[]> {
    const prompt = this.prompts.slide(topic, keyPoint);
    const text = await this.withResilience(() => this.api.generate(prompt));
    const bullets = this.sanitizeText(text)
      .split(/\r?\n/)
      .map((l) => l.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean);
    if (bullets.length < 2)
      throw new AdapterError('Invalid slide response', 'INVALID_RESPONSE', this.pluginInfo.id);
    return bullets.slice(0, 5);
  }

  private sanitizeText(text: string): string {
    return sanitizePlainText(text).replace(/<[^>]+>/g, '');
  }
}
