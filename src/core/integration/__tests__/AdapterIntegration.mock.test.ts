import { BaseAdapter } from '../../integration/BaseAdapter';
import { PluginDetector } from '../../integration/PluginDetector';
import { AdapterManager } from '../../integration/AdapterManager';

describe('Adapter integration with mock plugins (4.1.10)', () => {
  class MockTGAdapter extends BaseAdapter {
    async isAvailable(): Promise<boolean> {
      return true;
    }
    async getVersion(): Promise<string> {
      return this.pluginInfo.version;
    }
    async getName(): Promise<string> {
      return this.pluginInfo.name;
    }
    async generate(title: string): Promise<string[]> {
      return [`# ${title}`, '- point 1', '- point 2'];
    }
  }

  const env = {
    listInstalled: async () => [{ id: 'textgen.plugin', name: 'TextGen', version: '3.0.0' }],
  };

  test('manager creates adapter and mock operation succeeds', async () => {
    const detector = new PluginDetector(env);
    const mgr = new AdapterManager(detector, (p) => new MockTGAdapter(p, {}));
    const adapter = await mgr.ensureAdapter('textgen.plugin');
    expect(adapter).toBeTruthy();
    const slides = await (adapter as any).generate('Hello');
    expect(Array.isArray(slides)).toBe(true);
    expect(slides[0]).toContain('# Hello');
  });
});
