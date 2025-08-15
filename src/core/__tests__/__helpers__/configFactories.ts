import { InMemoryConfigStorage } from '../../ConfigManager';

export type AppConfig = {
  version: number;
  featureX: boolean;
  theme: 'light' | 'dark';
  maxItems: number;
};

export const DEFAULTS: AppConfig = {
  version: 2,
  featureX: false,
  theme: 'light',
  maxItems: 50,
};

export function makeStorage(initial?: unknown): InMemoryConfigStorage {
  const storage = new InMemoryConfigStorage();
  if (initial !== undefined) {
    // fire and forget; tests await when needed
    void storage.write(initial);
  }
  return storage;
}
