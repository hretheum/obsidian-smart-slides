export type AdapterStatus = 'healthy' | 'degraded' | 'unavailable';

export interface PluginInfo {
  id: string;
  name: string;
  version: string;
}

export interface AdapterHealth {
  status: AdapterStatus;
  lastCheckedAt: Date;
  details?: string;
}

export interface AdapterContext {
  logger?: {
    info: (m: string, meta?: unknown) => void;
    warn: (m: string, meta?: unknown) => void;
    error: (m: string, meta?: unknown) => void;
  };
  circuitBreaker?: { exec<T>(fn: () => Promise<T>): Promise<T> };
  retry?: { exec<T>(fn: () => Promise<T>): Promise<T> };
}

export abstract class BaseAdapter {
  protected readonly pluginInfo: PluginInfo;
  protected readonly context: AdapterContext;

  constructor(pluginInfo: PluginInfo, context: AdapterContext = {}) {
    this.pluginInfo = pluginInfo;
    this.context = context;
  }

  abstract isAvailable(): Promise<boolean>;
  abstract getVersion(): Promise<string>;
  abstract getName(): Promise<string>;

  // Graceful degradation hook
  async withResilience<T>(operation: () => Promise<T>): Promise<T> {
    const exec = async () => await operation();
    const wrapped = this.context.circuitBreaker
      ? () => this.context.circuitBreaker!.exec(exec)
      : exec;
    const maybeRetry = this.context.retry ? () => this.context.retry!.exec(wrapped) : wrapped;
    return maybeRetry();
  }

  // Compatibility check (semantic version awareness can be added later)
  async isVersionCompatible(requiredRange: RegExp): Promise<boolean> {
    const v = await this.getVersion();
    return requiredRange.test(v);
  }

  async healthCheck(): Promise<AdapterHealth> {
    try {
      const ok = await this.isAvailable();
      return { status: ok ? 'healthy' : 'degraded', lastCheckedAt: new Date() };
    } catch (error) {
      this.context.logger?.error('Adapter health check failed', error as any);
      return { status: 'unavailable', lastCheckedAt: new Date(), details: String(error) };
    }
  }
}
