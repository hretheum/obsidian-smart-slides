import {
  ImageGeneratorAdapter,
  ImageGeneratorApi,
  DefaultImagePromptTemplates,
  SlideImageContext,
} from '../../integration/ImageGeneratorAdapter';
import { AdapterContext } from '../../integration/BaseAdapter';
import { AdapterError } from '../../integration/BaseAdapter';

describe('ImageGeneratorAdapter - 4.3.1', () => {
  const plugin = { id: 'imagegen.plugin', name: 'ImageGen', version: '1.0.0' };

  const api: ImageGeneratorApi = {
    async generateImage(prompt) {
      if (prompt === 'ping') return { url: 'data:', width: 1, height: 1 } as any;
      return { url: 'https://example.com/img.png', width: 1024, height: 768 };
    },
  };

  const ctx: AdapterContext = {
    retry: { exec: async (fn) => fn() },
    circuitBreaker: { exec: async (fn) => fn() },
    rateLimiter: { schedule: async (fn) => fn() },
  };

  test('generateBasic returns validated image', async () => {
    const adapter = new ImageGeneratorAdapter(plugin, api, ctx);
    const img = await adapter.generateBasic('cat');
    expect(img.url).toMatch(/^https?:|^data:/);
    expect(img.width).toBeGreaterThan(0);
    expect(img.height).toBeGreaterThan(0);
  });

  test('invalid prompt rejected', async () => {
    const adapter = new ImageGeneratorAdapter(plugin, api, ctx);
    await expect(adapter.generateBasic(' a ')).rejects.toBeTruthy();
  });

  test('isAvailable returns false on API failure', async () => {
    const failingApi: ImageGeneratorApi = {
      async generateImage(prompt) {
        if (prompt === 'ping') throw new Error('nope');
        return { url: 'x', width: 1, height: 1 } as any;
      },
    };
    const adapter = new ImageGeneratorAdapter(plugin, failingApi, ctx);
    await expect(adapter.isAvailable()).resolves.toBe(false);
  });

  test('missing url/dataUrl is rejected', async () => {
    const badApi: ImageGeneratorApi = {
      async generateImage() {
        return { width: 10, height: 10 } as any;
      },
    };
    const adapter = new ImageGeneratorAdapter(plugin, badApi, ctx);
    await expect(adapter.generateBasic('tree')).rejects.toBeTruthy();
  });

  test('invalid dimensions are rejected', async () => {
    const badApi: ImageGeneratorApi = {
      async generateImage() {
        return { url: 'https://example.com/bad.png', width: -1 as any, height: NaN as any } as any;
      },
    };
    const adapter = new ImageGeneratorAdapter(plugin, badApi, ctx);
    await expect(adapter.generateBasic('house')).rejects.toBeTruthy();
  });
});

describe('ImageGeneratorAdapter - 4.3.2 prompts and generateForSlide', () => {
  const plugin = { id: 'imagegen.plugin', name: 'ImageGen', version: '1.0.0' };
  const api: ImageGeneratorApi = {
    async generateImage(prompt) {
      return { url: 'https://img', width: 1024, height: 576, promptUsed: prompt } as any;
    },
  };
  const ctxCfg: AdapterContext = {
    retry: { exec: async (fn) => fn() },
    circuitBreaker: { exec: async (fn) => fn() },
    rateLimiter: { schedule: async (fn) => fn() },
  };

  test('generateForSlide constructs prompt with context', async () => {
    const adapter = new ImageGeneratorAdapter(plugin, api, ctxCfg);
    const slideCtx: SlideImageContext = {
      topic: 'Renewable energy',
      keyPoints: ['solar', 'wind'],
      layoutType: 'image',
      tone: 'inspirational',
      audience: 'executives',
      domain: 'business',
      styleHint: 'isometric',
    };
    const img = await adapter.generateForSlide(slideCtx, { style: 'brand colors' });
    expect(img.width).toBeGreaterThan(0);
    expect(img.height).toBeGreaterThan(0);
  });
});

describe('ImageGeneratorAdapter - 4.3.3–4.3.8 batch, quality, fallback, error mapping', () => {
  const plugin = { id: 'imagegen.plugin', name: 'ImageGen', version: '1.0.0' };
  const ctxCfg: AdapterContext = {
    retry: { exec: async (fn) => fn() },
    circuitBreaker: { exec: async (fn) => fn() },
    rateLimiter: { schedule: async (fn) => fn() },
  };

  test('quality upgrade path triggers second attempt', async () => {
    let calls = 0;
    const api: ImageGeneratorApi = {
      async generateImage(prompt) {
        calls += 1;
        if (calls === 1)
          return { url: 'https://img', width: 100, height: 100, promptUsed: prompt } as any;
        return { url: 'https://img', width: 1280, height: 720, promptUsed: prompt } as any;
      },
    };
    const adapter = new ImageGeneratorAdapter(plugin, api, ctxCfg);
    const img = await adapter.generateForSlide({ topic: 'Q' });
    expect(calls).toBeGreaterThanOrEqual(2);
    expect(img.width * img.height).toBeGreaterThanOrEqual(640 * 360);
  });

  test('fallback path used after first error', async () => {
    let calls = 0;
    const seenPrompts: string[] = [];
    const prompts = {
      ...DefaultImagePromptTemplates,
      fallback: (prev: string) => `${prev} | Fallback variant`,
    };
    const api: ImageGeneratorApi = {
      async generateImage(prompt) {
        seenPrompts.push(prompt);
        calls += 1;
        if (calls === 1) throw new Error('temporary error');
        return { url: 'https://img', width: 1024, height: 576, promptUsed: prompt } as any;
      },
    };
    const adapter = new ImageGeneratorAdapter(plugin, api, ctxCfg, prompts);
    const img = await adapter.generateForSlide({ topic: 'Fallback test' });
    expect(seenPrompts.some((p) => p.includes('Fallback variant'))).toBe(true);
    expect(img.width).toBeGreaterThan(0);
  });

  test('error mapping: rate limit', async () => {
    const api: ImageGeneratorApi = {
      async generateImage() {
        throw new Error('Rate limit exceeded by API');
      },
    };
    const adapter = new ImageGeneratorAdapter(plugin, api, ctxCfg);
    await expect(adapter.generateForSlide({ topic: 'X' })).rejects.toMatchObject(
      new AdapterError('Rate limit exceeded', 'RATE_LIMIT', plugin.id),
    );
  });

  test('error mapping: quota', async () => {
    const api: ImageGeneratorApi = {
      async generateImage() {
        throw new Error('Quota reached');
      },
    };
    const adapter = new ImageGeneratorAdapter(plugin, api, ctxCfg);
    await expect(adapter.generateForSlide({ topic: 'X' })).rejects.toMatchObject(
      new AdapterError('Quota exhausted', 'QUOTA_EXCEEDED', plugin.id),
    );
  });

  test('error mapping: unauthorized', async () => {
    const api: ImageGeneratorApi = {
      async generateImage() {
        throw new Error('Unauthorized: invalid API key');
      },
    };
    const adapter = new ImageGeneratorAdapter(plugin, api, ctxCfg);
    await expect(adapter.generateForSlide({ topic: 'X' })).rejects.toMatchObject(
      new AdapterError('Unauthorized', 'UNAUTHORIZED', plugin.id),
    );
  });

  test('error mapping: temporary', async () => {
    const api: ImageGeneratorApi = {
      async generateImage() {
        throw new Error('Timeout while processing');
      },
    };
    const adapter = new ImageGeneratorAdapter(plugin, api, ctxCfg);
    await expect(adapter.generateForSlide({ topic: 'X' })).rejects.toMatchObject(
      new AdapterError('Temporarily unavailable', 'TEMPORARY_UNAVAILABLE', plugin.id),
    );
  });

  test('error mapping: default', async () => {
    const api: ImageGeneratorApi = {
      async generateImage() {
        throw new Error('Some other error');
      },
    };
    const adapter = new ImageGeneratorAdapter(plugin, api, ctxCfg);
    await expect(adapter.generateForSlide({ topic: 'X' })).rejects.toMatchObject(
      new AdapterError('Some other error', 'IMAGE_API_ERROR', plugin.id),
    );
  });

  test('batch generation reports progress', async () => {
    const api: ImageGeneratorApi = {
      async generateImage(prompt) {
        return { url: 'https://img', width: 1024, height: 576, promptUsed: prompt } as any;
      },
    };
    const adapter = new ImageGeneratorAdapter(plugin, api, ctxCfg);
    const calls: Array<{ c: number; t: number }> = [];
    const contexts: SlideImageContext[] = [{ topic: 'A' }, { topic: 'B' }, { topic: 'C' }];
    const images = await adapter.generateBatch(contexts, {}, (c, t) => calls.push({ c, t }));
    expect(images.length).toBe(3);
    expect(calls.length).toBe(3);
    expect(calls[calls.length - 1]).toEqual({ c: 3, t: 3 });
  });

  test('concurrent generateForSlide calls complete successfully (4.3.10)', async () => {
    let active = 0;
    let maxActive = 0;
    const api: ImageGeneratorApi = {
      async generateImage(prompt) {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((r) => setTimeout(r, 5));
        active -= 1;
        return { url: 'https://img', width: 1024, height: 576, promptUsed: prompt } as any;
      },
    };
    const adapter = new ImageGeneratorAdapter(plugin, api, ctxCfg);
    const tasks = Array.from({ length: 5 }, (_, i) => adapter.generateForSlide({ topic: `T${i}` }));
    const images = await Promise.all(tasks);
    expect(images.length).toBe(5);
    expect(maxActive).toBeGreaterThanOrEqual(2);
  });
});
