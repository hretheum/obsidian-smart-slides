import { LRUCache } from '../../utils/LRUCache';

describe('LRUCache', () => {
  test('evicts least recently used when maxEntries exceeded', () => {
    const cache = new LRUCache<string, number>({ maxEntries: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a'); // a is most recent, b is least
    cache.set('c', 3); // should evict b
    expect(cache.has('b')).toBe(false);
    expect(cache.has('a')).toBe(true);
    expect(cache.has('c')).toBe(true);
  });

  test('respects TTL expiration on get/has', async () => {
    const cache = new LRUCache<string, string>({});
    cache.set('t', 'x', 10);
    expect(cache.get('t')).toBe('x');
    await new Promise((r) => setTimeout(r, 12));
    expect(cache.get('t')).toBeUndefined();
    expect(cache.has('t')).toBe(false);
  });

  test('enforces maxSizeBytes with getSize', () => {
    const cache = new LRUCache<string, string>({
      maxSizeBytes: 5,
      getSize: (e) => e.value.length,
    });
    cache.set('a', 'aa'); // size 2
    cache.set('b', 'bbb'); // size 3, total 5
    cache.set('c', 'cccc'); // size 4, should evict from tail until <=5
    expect(cache.has('a')).toBe(false); // a likely evicted first
    expect(cache.has('b') || cache.has('c')).toBe(true);
  });

  test('cleanupIntervalMs evicts expired entries in background', async () => {
    const cache = new LRUCache<string, string>({ defaultTtlMs: 5, cleanupIntervalMs: 5 });
    cache.set('x', '1');
    await new Promise((r) => setTimeout(r, 12));
    // expired and should be removed by cleaner
    expect(cache.has('x')).toBe(false);
  });

  test('stats update for hits/misses/evictions', () => {
    const cache = new LRUCache<string, number>({ maxEntries: 1 });
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1); // hit
    expect(cache.get('b')).toBeUndefined(); // miss
    cache.set('c', 3); // evict a due to maxEntries
    const s = cache.getStats();
    expect(s.hits).toBeGreaterThanOrEqual(1);
    expect(s.misses).toBeGreaterThanOrEqual(1);
    expect(s.evictions).toBeGreaterThanOrEqual(1);
    expect(s.entries).toBe(1);
  });
});
