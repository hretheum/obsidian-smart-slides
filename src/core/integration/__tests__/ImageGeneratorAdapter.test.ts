import { ImageGeneratorAdapter, ImageGeneratorApi } from '../../integration/ImageGeneratorAdapter';
import { AdapterContext } from '../../integration/BaseAdapter';

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
