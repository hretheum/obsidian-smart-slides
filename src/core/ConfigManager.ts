import { Result, ok, err } from '../types/Result';

export interface ConfigStorage {
  read(): Promise<unknown | null>;
  write(data: unknown): Promise<void>;
}

export interface ConfigManagerOptions<TConfig> {
  defaultConfig: TConfig;
  migrate: (data: unknown) => Result<TConfig>;
  environment?: string;
  envOverrides?: Partial<TConfig> | ((env: string) => Partial<TConfig>);
}

/**
 * Simple configuration manager with validation, defaults, migrations, and env overrides.
 */
export class ConfigManager<TConfig extends Record<string, any>> {
  private currentConfig: TConfig;
  private readonly defaultConfig: TConfig;
  private readonly migrate: (data: unknown) => Result<TConfig>;
  private readonly environment: string;
  private readonly envOverrides?: Partial<TConfig> | ((env: string) => Partial<TConfig>);

  constructor(private readonly storage: ConfigStorage, options: ConfigManagerOptions<TConfig>) {
    this.defaultConfig = options.defaultConfig;
    this.migrate = options.migrate;
    this.environment = options.environment ?? (process.env.NODE_ENV || 'development');
    this.envOverrides = options.envOverrides;
    this.currentConfig = this.applyEnvOverrides(this.defaultConfig);
  }

  /** Loads config from storage, applies migration/validation, defaults and env overrides. */
  async load(): Promise<Result<TConfig>> {
    const raw = await this.storage.read();
    if (raw == null) {
      const cfg = this.applyEnvOverrides(this.defaultConfig);
      this.currentConfig = cfg;
      return ok(cfg);
    }
    const migrated = this.migrate(raw);
    if (!migrated.ok) {
      return migrated;
    }
    const merged = { ...this.defaultConfig, ...migrated.value } as TConfig;
    const finalCfg = this.applyEnvOverrides(merged);
    this.currentConfig = finalCfg;
    return ok(finalCfg);
  }

  /** Saves current config to storage. */
  async save(): Promise<Result<void>> {
    try {
      await this.storage.write(this.currentConfig);
      return ok(undefined);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  /** Returns current in-memory config. Call load() first. */
  get(): TConfig {
    return this.currentConfig;
  }

  /** Updates config with a partial and saves. */
  async update(partial: Partial<TConfig>): Promise<Result<TConfig>> {
    const next = { ...this.currentConfig, ...partial } as TConfig;
    // validate via migrate to ensure consistent schema
    const validated = this.migrate(next);
    if (!validated.ok) {
      return validated;
    }
    this.currentConfig = this.applyEnvOverrides(validated.value);
    const saved = await this.save();
    if (!saved.ok) return saved as unknown as Result<TConfig>;
    return ok(this.currentConfig);
  }

  /** Applies environment-specific overrides if provided. */
  private applyEnvOverrides(base: TConfig): TConfig {
    const overrides =
      typeof this.envOverrides === 'function'
        ? this.envOverrides(this.environment)
        : this.envOverrides;
    if (!overrides) return base;
    return { ...base, ...overrides } as TConfig;
  }
}

/**
 * In-memory storage for testing.
 */
export class InMemoryConfigStorage implements ConfigStorage {
  private data: unknown | null = null;
  async read(): Promise<unknown | null> {
    return this.data;
  }
  async write(data: unknown): Promise<void> {
    this.data = data;
  }
}
