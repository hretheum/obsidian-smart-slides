import { ConfigManager, InMemoryConfigStorage } from '../../core/ConfigManager';
import { ok, err } from '../../types/Result';

type AppConfig = {
  version: number;
  featureX: boolean;
  theme: 'light' | 'dark';
  maxItems: number;
};

const DEFAULTS: AppConfig = {
  version: 2,
  featureX: false,
  theme: 'light',
  maxItems: 50,
};

function migrate(input: unknown) {
  if (typeof input !== 'object' || input === null) return err(new Error('Invalid config format'));
  const data = input as Partial<AppConfig>;
  const version = typeof data.version === 'number' ? data.version : 1;
  let cfg: AppConfig;
  if (version === 1) {
    cfg = {
      version: 2,
      featureX: Boolean((data as any).featureX),
      theme: ((data as any).theme === 'dark' ? 'dark' : 'light') as 'light' | 'dark',
      maxItems: typeof (data as any).maxItems === 'number' ? (data as any).maxItems : 50,
    };
  } else if (version === 2) {
    cfg = {
      version: 2,
      featureX: Boolean(data.featureX),
      theme: (data.theme === 'dark' ? 'dark' : 'light') as 'light' | 'dark',
      maxItems: typeof data.maxItems === 'number' ? data.maxItems : 50,
    };
  } else {
    return err(new Error('Unsupported config version'));
  }
  if (cfg.maxItems <= 0 || cfg.maxItems > 1000) {
    return err(new Error('maxItems out of range'));
  }
  return ok(cfg);
}

describe('ConfigManager', () => {
  test('loads defaults when storage empty and applies env overrides', async () => {
    const storage = new InMemoryConfigStorage();
    const manager = new ConfigManager<AppConfig>(storage, {
      defaultConfig: DEFAULTS,
      migrate,
      environment: 'development',
      envOverrides: (env) => (env === 'development' ? { featureX: true } : {}),
    });
    const loaded = await manager.load();
    expect(loaded.ok).toBe(true);
    expect(manager.get().featureX).toBe(true);
  });

  test('migrates v1 data to v2 and merges defaults', async () => {
    const storage = new InMemoryConfigStorage();
    await storage.write({ version: 1, featureX: true });
    const manager = new ConfigManager<AppConfig>(storage, { defaultConfig: DEFAULTS, migrate });
    const loaded = await manager.load();
    expect(loaded.ok).toBe(true);
    expect(manager.get().version).toBe(2);
    expect(manager.get().theme).toBe('light');
  });

  test('update validates, saves, and returns new config', async () => {
    const storage = new InMemoryConfigStorage();
    const manager = new ConfigManager<AppConfig>(storage, { defaultConfig: DEFAULTS, migrate });
    await manager.load();
    const updated = await manager.update({ maxItems: 99 });
    expect(updated.ok).toBe(true);
    expect(manager.get().maxItems).toBe(99);
  });

  test('invalid update is rejected', async () => {
    const storage = new InMemoryConfigStorage();
    const manager = new ConfigManager<AppConfig>(storage, { defaultConfig: DEFAULTS, migrate });
    await manager.load();
    const updated = await manager.update({ maxItems: -1 });
    expect(updated.ok).toBe(false);
  });
});
