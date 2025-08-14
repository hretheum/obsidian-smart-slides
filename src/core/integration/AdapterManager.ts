import { BaseAdapter, PluginInfo } from './BaseAdapter';
import { DetectedPlugin, PluginDetector } from './PluginDetector';

export interface AdapterFactory<T extends BaseAdapter> {
  (plugin: PluginInfo): T;
}

export class AdapterManager<T extends BaseAdapter> {
  private readonly detector: PluginDetector;
  private readonly factory: AdapterFactory<T>;
  private readonly adapters = new Map<string, T>();

  constructor(detector: PluginDetector, factory: AdapterFactory<T>) {
    this.detector = detector;
    this.factory = factory;
  }

  async ensureAdapter(pluginId: string): Promise<T | null> {
    if (this.adapters.has(pluginId)) return this.adapters.get(pluginId)!;
    const detected = await this.detector.detectById(pluginId);
    if (!detected) return null;
    const adapter = this.factory({
      id: detected.id,
      name: detected.name,
      version: detected.version,
    });
    this.adapters.set(pluginId, adapter);
    return adapter;
  }

  async listAvailable(): Promise<Array<{ plugin: DetectedPlugin; healthy: boolean }>> {
    const detected = await this.detector.detectAll();
    const results: Array<{ plugin: DetectedPlugin; healthy: boolean }> = [];
    for (const p of detected) {
      const adapter = await this.ensureAdapter(p.id);
      if (!adapter) {
        results.push({ plugin: p, healthy: false });
        continue;
      }
      const health = await adapter.healthCheck();
      results.push({ plugin: p, healthy: health.status === 'healthy' });
    }
    return results;
  }
}
