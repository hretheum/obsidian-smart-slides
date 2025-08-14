import {
  TextGeneratorAdapter,
  DefaultPromptTemplates,
} from '../../integration/TextGeneratorAdapter';
import { AdapterContext } from '../../integration/BaseAdapter';

describe('TextGeneratorAdapter - 4.2', () => {
  const plugin = { id: 'textgen.plugin', name: 'TextGen', version: '3.0.0' };

  const api = {
    async generate(prompt: string): Promise<string> {
      if (prompt.includes('title')) return 'Awesome Deck Title\n';
      if (prompt.includes('List 5-7')) return '- Point A\n- Point B\n- Point C\n- Point D';
      if (prompt.includes('Expand the point')) return '- Detail 1\n- Detail 2\n- Detail 3';
      if (prompt === 'ping') return 'pong';
      return 'ok';
    },
  };

  const ctx: AdapterContext = {
    retry: { exec: async (fn) => fn() },
    circuitBreaker: { exec: async (fn) => fn() },
    rateLimiter: { schedule: async (fn) => fn() },
  };

  test('generateTitle returns sanitized title', async () => {
    const adapter = new TextGeneratorAdapter(plugin, api, ctx);
    const t = await adapter.generateTitle('microservices');
    expect(t.toLowerCase()).toContain('title');
  });

  test('generateOutline returns list of 3-7 items', async () => {
    const adapter = new TextGeneratorAdapter(plugin, api, ctx);
    const outline = await adapter.generateOutline('testing');
    expect(outline.length).toBeGreaterThanOrEqual(3);
    expect(outline.length).toBeLessThanOrEqual(7);
  });

  test('generateSlide returns 2-5 bullets', async () => {
    const adapter = new TextGeneratorAdapter(plugin, api, ctx, DefaultPromptTemplates);
    const bullets = await adapter.generateSlide('testing', 'Point A');
    expect(bullets.length).toBeGreaterThanOrEqual(2);
    expect(bullets.length).toBeLessThanOrEqual(5);
  });
});
