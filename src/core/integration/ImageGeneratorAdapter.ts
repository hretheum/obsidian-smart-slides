import { BaseAdapter, AdapterContext, AdapterError, PluginInfo } from './BaseAdapter';
import { sanitizePlainText } from '../../security/InputValidator';

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
  metadata?: Record<string, unknown>;
}

export interface ImageGeneratorApi {
  generateImage(prompt: string, options?: ImageGenOptions): Promise<GeneratedImage>;
}

export class ImageGeneratorAdapter extends BaseAdapter {
  private readonly api: ImageGeneratorApi;
  private readonly prompts: ImagePromptTemplates;

  constructor(
    pluginInfo: PluginInfo,
    api: ImageGeneratorApi,
    context: AdapterContext = {},
    prompts: ImagePromptTemplates = DefaultImagePromptTemplates,
  ) {
    super(pluginInfo, context);
    this.api = api;
    this.prompts = prompts;
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
    const clean = this.cleanPrompt(prompt);
    const op = () => this.api.generateImage(clean, this.normalizeOptions(options));
    const img = await this.withResilience(op);
    return this.validateImage(img, clean);
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
    const enriched: GeneratedImage = {
      ...image,
      promptUsed,
      attribution: this.normalizeAttribution(image.attribution),
      metadata: { ...(image.metadata ?? {}), generatedAt: new Date().toISOString() },
    };
    return enriched;
  }

  // 4.3.2: Prompt engineering for slide context
  async generateForSlide(
    context: SlideImageContext,
    options?: ImageGenOptions,
  ): Promise<GeneratedImage> {
    const prompt = this.prompts.slide(context);
    return this.generateWithQualityAndFallback(prompt, options);
  }

  // 4.3.3, 4.3.8: Batch with progress tracking
  async generateBatch(
    contexts: SlideImageContext[],
    options: ImageGenOptions = {},
    onProgress?: (current: number, total: number) => void,
  ): Promise<GeneratedImage[]> {
    const total = contexts.length;
    const results: GeneratedImage[] = [];
    let index = 0;
    for (const ctx of contexts) {
      const img = await this.generateForSlide(ctx, options);
      results.push(img);
      index += 1;
      if (onProgress) onProgress(index, total);
    }
    return results;
  }

  // 4.3.4, 4.3.5, 4.3.6, 4.3.7: Style consistency, fallback, quality, error mapping
  protected async generateWithQualityAndFallback(
    prompt: string,
    options?: ImageGenOptions,
    attempt: number = 1,
  ): Promise<GeneratedImage> {
    const normalizedOptions = this.normalizeOptions(options);
    const enforcedPrompt = this.enforceStyleConsistency(prompt, normalizedOptions);
    try {
      const img = await this.withResilience(() =>
        this.api.generateImage(enforcedPrompt, normalizedOptions),
      );
      const validated = this.validateImage(img, enforcedPrompt);
      const meetsQuality = this.meetsQuality(validated, normalizedOptions);
      if (!meetsQuality && attempt === 1) {
        const upgraded: ImageGenOptions = {
          ...normalizedOptions,
          size: normalizedOptions.size ?? { width: 1280, height: 720 },
        };
        return this.generateWithQualityAndFallback(enforcedPrompt, upgraded, attempt + 1);
      }
      return validated;
    } catch (e: any) {
      if (attempt === 1) {
        const fallbackPrompt = this.prompts.fallback(enforcedPrompt);
        return this.generateWithQualityAndFallback(fallbackPrompt, normalizedOptions, attempt + 1);
      }
      throw this.mapApiError(e);
    }
  }

  protected meetsQuality(image: GeneratedImage, _options?: ImageGenOptions): boolean {
    const minPixels = 640 * 360;
    return image.width * image.height >= minPixels;
  }

  protected normalizeOptions(options?: ImageGenOptions): ImageGenOptions {
    const out: ImageGenOptions = { ...options };
    if (!out.size) {
      out.size = { width: 1024, height: 576 }; // default 16:9
    }
    return out;
  }

  protected enforceStyleConsistency(prompt: string, options: ImageGenOptions): string {
    const styleSuffix = options.style ? ` Style: ${this.cleanPrompt(options.style)}` : '';
    return `${prompt}${styleSuffix}`.trim();
  }

  protected mapApiError(error: any): AdapterError {
    const message = String(error?.message ?? error ?? 'Unknown error');
    const lower = message.toLowerCase();
    if (lower.includes('rate') && lower.includes('limit')) {
      return new AdapterError('Rate limit exceeded', 'RATE_LIMIT', this.pluginInfo.id, error);
    }
    if (lower.includes('quota')) {
      return new AdapterError('Quota exhausted', 'QUOTA_EXCEEDED', this.pluginInfo.id, error);
    }
    if (lower.includes('unauthorized') || lower.includes('invalid api key')) {
      return new AdapterError('Unauthorized', 'UNAUTHORIZED', this.pluginInfo.id, error);
    }
    if (lower.includes('timeout') || lower.includes('temporar')) {
      return new AdapterError(
        'Temporarily unavailable',
        'TEMPORARY_UNAVAILABLE',
        this.pluginInfo.id,
        error,
      );
    }
    return new AdapterError(message, 'IMAGE_API_ERROR', this.pluginInfo.id, error);
  }

  protected cleanPrompt(p: string): string {
    return sanitizePlainText(p).replace(/\s+/g, ' ').trim();
  }

  protected normalizeAttribution(attr?: ImageAttribution): ImageAttribution | undefined {
    if (!attr) return undefined;
    const cleaned: ImageAttribution = { ...attr };
    return cleaned;
  }
}

// ---- 4.3.2 Prompt templates ----
export interface SlideImageContext {
  topic: string;
  keyPoints?: string[];
  layoutType?: 'title' | 'content' | 'split' | 'comparison' | 'image' | string;
  tone?: string;
  audience?: string;
  domain?: string;
  styleHint?: string;
}

export interface ImagePromptTemplates {
  slide: (ctx: SlideImageContext) => string;
  fallback: (prevPrompt: string) => string;
}

export const DefaultImagePromptTemplates: ImagePromptTemplates = {
  slide: (ctx) => {
    const parts: string[] = [];
    parts.push(`Generate a presentation image about: ${ctx.topic}`);
    if (ctx.keyPoints?.length) parts.push(`Key points: ${ctx.keyPoints.join('; ')}`);
    if (ctx.layoutType) parts.push(`Layout hint: ${ctx.layoutType}`);
    if (ctx.tone) parts.push(`Tone: ${ctx.tone}`);
    if (ctx.audience) parts.push(`Audience: ${ctx.audience}`);
    if (ctx.domain) parts.push(`Domain: ${ctx.domain}`);
    if (ctx.styleHint) parts.push(`Style: ${ctx.styleHint}`);
    parts.push('Avoid text in the image.');
    return parts.join(' | ');
  },
  fallback: (prev) => `${prev} | Minimal flat vector illustration, high contrast, simple shapes`,
};
