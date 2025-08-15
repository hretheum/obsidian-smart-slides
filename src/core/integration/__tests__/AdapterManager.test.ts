import { AdapterManager } from '../AdapterManager';
import { BaseAdapter, PluginInfo } from '../BaseAdapter';
import { PluginDetector, DetectedPlugin } from '../PluginDetector';

class FakeAdapter extends BaseAdapter {
  constructor(private readonly info: PluginInfo, private readonly ok: boolean) {
    super();
  }
  async isAvailable(): Promise<boolean> {
    return this.ok;
  }
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }> {
    return { status: this.ok ? 'healthy' : 'unhealthy' };
  }
}

class FakeDetector implements PluginDetector {
  constructor(private readonly plugins: DetectedPlugin[]) {}
  async detectAll(): Promise<DetectedPlugin[]> {
    return this.plugins;
  }
  async detectById(id: string): Promise<DetectedPlugin | null> {
    return this.plugins.find((p) => p.id === id) ?? null;
  }
}

describe('AdapterManager', () => {
  test('ensureAdapter caches created adapters and returns null for missing', async () => {
    const plugins: DetectedPlugin[] = [{ id: 'x', name: 'X', version: '1.0.0' }];
    const detector = new FakeDetector(plugins);
    const manager = new AdapterManager<FakeAdapter>(
      detector as any,
      (pi) => new FakeAdapter(pi, true),
    );

    const a1 = await manager.ensureAdapter('x');
    const a2 = await manager.ensureAdapter('x');
    const missing = await manager.ensureAdapter('y');

    expect(a1).toBe(a2);
    expect(missing).toBeNull();
  });

  test('listAvailable marks missing adapters as unhealthy and awaits health', async () => {
    const plugins: DetectedPlugin[] = [
      { id: 'x', name: 'X', version: '1.0.0' },
      { id: 'y', name: 'Y', version: '2.0.0' },
    ];
    const detector = new FakeDetector(plugins);
    const manager = new AdapterManager<FakeAdapter>(
      detector as any,
      (pi) => new FakeAdapter(pi, pi.id === 'x'),
    );

    const list = await manager.listAvailable();
    const map = new Map(list.map((e) => [e.plugin.id, e.healthy]));
    expect(map.get('x')).toBe(true);
    expect(map.get('y')).toBe(false);
  });
});
