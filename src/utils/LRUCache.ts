export interface CacheEntry<K, V> {
  key: K;
  value: V;
  size: number;
  expiresAt?: number;
}

export interface LRUCacheOptions {
  maxEntries?: number;
  maxSizeBytes?: number;
  defaultTtlMs?: number;
  getSize?: <K, V>(entry: CacheEntry<K, V>) => number;
  onEvict?: <K, V>(entry: CacheEntry<K, V>, reason: 'lru' | 'size' | 'ttl' | 'manual') => void;
  cleanupIntervalMs?: number;
}

export interface LRUCacheStats {
  hits: number;
  misses: number;
  evictions: number;
  sizeBytes: number;
  entries: number;
}

/**
 * Generic LRU cache with optional TTL and size budget.
 * Maintains a doubly-linked list for O(1) LRU operations.
 */
export class LRUCache<K, V> {
  private map = new Map<K, ListNode<K, V>>();
  private head?: ListNode<K, V>;
  private tail?: ListNode<K, V>;
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  private sizeBytes = 0;
  private cleanupTimer?: ReturnType<typeof setInterval>;

  private readonly maxEntries: number;
  private readonly maxSizeBytes: number;
  private readonly defaultTtlMs?: number;
  private readonly getSize: <K2, V2>(entry: CacheEntry<K2, V2>) => number;
  private readonly onEvict?: <K2, V2>(
    entry: CacheEntry<K2, V2>,
    reason: 'lru' | 'size' | 'ttl' | 'manual',
  ) => void;

  constructor(options?: LRUCacheOptions) {
    this.maxEntries = options?.maxEntries ?? Infinity;
    this.maxSizeBytes = options?.maxSizeBytes ?? Infinity;
    this.defaultTtlMs = options?.defaultTtlMs;
    this.getSize = (options?.getSize as any) ?? (() => 1);
    this.onEvict = options?.onEvict as any;

    const cleanupEvery = options?.cleanupIntervalMs ?? 0;
    if (cleanupEvery > 0) {
      this.cleanupTimer = setInterval(() => this.cleanupExpired(), cleanupEvery);
      // Do not keep Node process alive because of timer
      // @ts-ignore Node.js timers expose unref(); in browsers it is undefined
      if (typeof this.cleanupTimer.unref === 'function') {
        // @ts-ignore
        this.cleanupTimer.unref();
      }
    }
  }

  set(key: K, value: V, ttlMs?: number, sizeBytes?: number): void {
    const expiresAt = this.resolveExpiry(ttlMs);
    const existing = this.map.get(key);
    if (existing) {
      // update value and move to head
      const oldSize = existing.entry.size;
      const newEntry: CacheEntry<K, V> = {
        key,
        value,
        size: sizeBytes ?? (this.getSize as any)({ key, value, size: oldSize, expiresAt }),
        expiresAt,
      };
      existing.entry = newEntry;
      this.sizeBytes += newEntry.size - oldSize;
      this.moveToHead(existing);
    } else {
      const entry: CacheEntry<K, V> = {
        key,
        value,
        size: sizeBytes ?? (this.getSize as any)({ key, value, size: 0, expiresAt }),
        expiresAt,
      };
      const node: ListNode<K, V> = { entry };
      this.addToHead(node);
      this.map.set(key, node);
      this.sizeBytes += entry.size;
    }
    this.enforceBudgets();
  }

  get(key: K): V | undefined {
    const node = this.map.get(key);
    if (!node) {
      this.misses += 1;
      return undefined;
    }
    if (node.entry.expiresAt !== undefined && node.entry.expiresAt <= Date.now()) {
      this.evictNode(node, 'ttl');
      this.misses += 1;
      return undefined;
    }
    this.moveToHead(node);
    this.hits += 1;
    return node.entry.value;
  }

  has(key: K): boolean {
    const node = this.map.get(key);
    if (!node) return false;
    if (node.entry.expiresAt !== undefined && node.entry.expiresAt <= Date.now()) {
      this.evictNode(node, 'ttl');
      return false;
    }
    return true;
  }

  delete(key: K): boolean {
    const node = this.map.get(key);
    if (!node) return false;
    this.evictNode(node, 'manual');
    return true;
  }

  clear(): void {
    // manual evict to call onEvict for all
    for (const node of this.map.values()) {
      this.evictNode(node, 'manual');
    }
    this.head = undefined;
    this.tail = undefined;
    this.map.clear();
    this.sizeBytes = 0;
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  getStats(): LRUCacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      sizeBytes: this.sizeBytes,
      entries: this.map.size,
    };
  }

  private resolveExpiry(ttlMs?: number): number | undefined {
    const ttl = ttlMs ?? this.defaultTtlMs;
    return ttl !== undefined ? Date.now() + ttl : undefined;
  }

  private enforceBudgets(): void {
    while (this.map.size > this.maxEntries) {
      if (!this.tail) break;
      this.evictNode(this.tail, 'lru');
    }
    while (this.sizeBytes > this.maxSizeBytes) {
      if (!this.tail) break;
      this.evictNode(this.tail, 'size');
    }
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const node of Array.from(this.map.values())) {
      if (node.entry.expiresAt !== undefined && node.entry.expiresAt <= now) {
        this.evictNode(node, 'ttl');
      }
    }
  }

  private addToHead(node: ListNode<K, V>): void {
    node.prev = undefined;
    node.next = this.head;
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
  }

  private moveToHead(node: ListNode<K, V>): void {
    if (node === this.head) return;
    // unlink
    if (node.prev) node.prev.next = node.next;
    if (node.next) node.next.prev = node.prev;
    if (this.tail === node) this.tail = node.prev;
    // relink at head
    node.prev = undefined;
    node.next = this.head;
    if (this.head) this.head.prev = node;
    this.head = node;
  }

  private evictNode(node: ListNode<K, V>, reason: 'lru' | 'size' | 'ttl' | 'manual'): void {
    // unlink from list
    if (node.prev) node.prev.next = node.next;
    if (node.next) node.next.prev = node.prev;
    if (this.head === node) this.head = node.next;
    if (this.tail === node) this.tail = node.prev;
    // remove from map and update size
    const existed = this.map.delete(node.entry.key);
    if (existed) {
      this.sizeBytes -= node.entry.size;
      this.evictions += 1;
      if (this.onEvict) {
        try {
          this.onEvict(node.entry as any, reason);
        } catch {
          // ignore callbacks
        }
      }
    }
  }
}

interface ListNode<K, V> {
  entry: CacheEntry<K, V>;
  prev?: ListNode<K, V>;
  next?: ListNode<K, V>;
}
