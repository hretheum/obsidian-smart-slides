import { BaseAdapter, AdapterContext } from '../../integration/BaseAdapter';
import { PluginDetector } from '../../integration/PluginDetector';
import { AdapterManager } from '../../integration/AdapterManager';

describe('Adapter system - 4.1.2–4.1.9', () => {
  class MockAdapter extends BaseAdapter {
    async isAvailable(): Promise<boolean> {
      return true;
    }
    async getVersion(): Promise<string> {
      return '1.0.0';
    }
    async getName(): Promise<string> {
      return 'Mock';
    }
  }

  const env = {
    listInstalled: async () => [
      { id: 'plugin.a', name: 'Plugin A', version: '1.0.0' },
      { id: 'plugin.b', name: 'Plugin B', version: '2.1.0' },
    ],
  };

  test('detects plugins and ensures adapters', async () => {
    const detector = new PluginDetector(env);
    const mgr = new AdapterManager(detector, (p) => new MockAdapter(p, {} as AdapterContext));
    const a = await mgr.ensureAdapter('plugin.a');
    expect(a).not.toBeNull();
    const miss = await mgr.ensureAdapter('plugin.missing');
    expect(miss).toBeNull();
  });

  test('lists available adapters with health', async () => {
    const detector = new PluginDetector(env);
    const mgr = new AdapterManager(detector, (p) => new MockAdapter(p, {} as AdapterContext));
    const list = await mgr.listAvailable();
    expect(list.length).toBe(2);
    expect(list[0].healthy).toBe(true);
  });
});
