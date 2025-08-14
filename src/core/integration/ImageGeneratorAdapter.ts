import { BaseAdapter, AdapterContext, AdapterError, PluginInfo } from './BaseAdapter';

export interface ImageGenOptions {
  size?: { width: number; height: number };
  style?: string;
}

export interface ImageAttribution {
  model?: string;
  license?: string;
  source?: string;
}

export interface GeneratedImage {
  url?: string;
  dataUrl?: string;
  width: number;
  height: number;
  attribution?: ImageAttribution;
  promptUsed?: string;
}

export interface ImageGeneratorApi {
  generateImage(prompt: string, options?: ImageGenOptions): Promise<GeneratedImage>;
}

export class ImageGeneratorAdapter extends BaseAdapter {
  private readonly api: ImageGeneratorApi;

  constructor(pluginInfo: PluginInfo, api: ImageGeneratorApi, context: AdapterContext = {}) {
    super(pluginInfo, context);
    this.api = api;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.api.generateImage('ping');
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

  async generateBasic(prompt: string, options?: ImageGenOptions): Promise<GeneratedImage> {
    if (!prompt || prompt.trim().length < 3) {
      throw new AdapterError('Prompt too short', 'INVALID_PROMPT', this.pluginInfo.id);
    }
    const op = () => this.api.generateImage(prompt, options);
    const img = await this.withResilience(op);
    return this.validateImage(img, prompt);
  }

  protected validateImage(image: GeneratedImage, promptUsed?: string): GeneratedImage {
    if (!image)
      throw new AdapterError('Empty image response', 'INVALID_RESPONSE', this.pluginInfo.id);
    if (!image.url && !image.dataUrl) {
      throw new AdapterError(
        'Missing image data (url/dataUrl)',
        'INVALID_RESPONSE',
        this.pluginInfo.id,
      );
    }
    if (!Number.isFinite(image.width) || !Number.isFinite(image.height)) {
      throw new AdapterError('Invalid image dimensions', 'INVALID_RESPONSE', this.pluginInfo.id);
    }
    return { ...image, promptUsed };
  }
}
