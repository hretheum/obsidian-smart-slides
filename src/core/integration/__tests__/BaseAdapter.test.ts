import { BaseAdapter, AdapterContext, PluginInfo } from '../../integration/BaseAdapter';

describe('BaseAdapter - 4.1.1', () => {
  class TestAdapter extends BaseAdapter {
    async isAvailable(): Promise<boolean> {
      return true;
    }
    async getVersion(): Promise<string> {
      return '1.2.3';
    }
    async getName(): Promise<string> {
      return 'Test';
    }
  }

  const plugin: PluginInfo = { id: 'test', name: 'Test', version: '1.2.3' };

  test('exposes plugin info and context', async () => {
    const adapter = new TestAdapter(plugin, {} as AdapterContext);
    expect(await adapter.getName()).toBe('Test');
    expect(await adapter.getVersion()).toBe('1.2.3');
  });

  test('withResilience executes operation and supports optional wrappers', async () => {
    let called = 0;
    const adapter = new TestAdapter(plugin, {
      circuitBreaker: { exec: async <T>(fn: () => Promise<T>) => fn() },
      retry: { exec: async <T>(fn: () => Promise<T>) => fn() },
      rateLimiter: { schedule: async <T>(fn: () => Promise<T>) => fn() },
    });
    const result = await adapter.withResilience(async () => {
      called += 1;
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(called).toBe(1);
  });

  test('version compatibility check via regex', async () => {
    const adapter = new TestAdapter(plugin, {});
    expect(await adapter.isVersionCompatible(/^1\./)).toBe(true);
    expect(await adapter.isVersionCompatible(/^2\./)).toBe(false);
  });

  test('healthCheck reports healthy/degraded/unavailable', async () => {
    const healthy = new TestAdapter(plugin, {});
    const h1 = await healthy.healthCheck();
    expect(h1.status).toBe('healthy');

    class DownAdapter extends TestAdapter {
      async isAvailable(): Promise<boolean> {
        return false;
      }
    }
    const degraded = new DownAdapter(plugin, {});
    const h2 = await degraded.healthCheck();
    expect(h2.status).toBe('degraded');

    class ErrorAdapter extends TestAdapter {
      async isAvailable(): Promise<boolean> {
        throw new Error('boom');
      }
    }
    const errorAdapter = new ErrorAdapter(plugin, {
      logger: { info() {}, warn() {}, error() {} } as any,
    });
    const h3 = await errorAdapter.healthCheck();
    expect(h3.status).toBe('unavailable');
    expect(typeof h3.details).toBe('string');
  });
});
