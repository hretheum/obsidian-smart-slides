export interface CacheEntry<T> {
    value: T;
    timestamp: number;
    ttl: number; // time to live in milliseconds
    size: number; // approximate size in bytes
}

export interface CacheConfig {
    maxSize: number; // maximum cache size in bytes
    defaultTTL: number; // default TTL in milliseconds
    cleanupInterval: number; // cleanup interval in milliseconds
}

export class CacheManager {
    private cache: Map<string, CacheEntry<any>> = new Map();
    private currentSize = 0;
    private cleanupTimer?: NodeJS.Timeout;
    
    constructor(private config: CacheConfig = {
        maxSize: 50 * 1024 * 1024, // 50MB
        defaultTTL: 30 * 60 * 1000, // 30 minutes
        cleanupInterval: 5 * 60 * 1000 // 5 minutes
    }) {
        this.startCleanupTimer();
    }
    
    async get<T>(key: string, factory?: () => Promise<T>): Promise<T | null> {
        const entry = this.cache.get(key);
        
        // Check if entry exists and is not expired
        if (entry && !this.isExpired(entry)) {
            return entry.value as T;
        }
        
        // Remove expired entry
        if (entry) {
            this.delete(key);
        }
        
        // Use factory function if provided
        if (factory) {
            try {
                const value = await factory();
                this.set(key, value);
                return value;
            } catch (error) {
                console.error(`[CacheManager] Factory function failed for key ${key}:`, error);
                return null;
            }
        }
        
        return null;
    }
    
    set<T>(key: string, value: T, ttl?: number): void {
        const size = this.estimateSize(value);
        const entry: CacheEntry<T> = {
            value,
            timestamp: Date.now(),
            ttl: ttl || this.config.defaultTTL,
            size
        };
        
        // Remove existing entry to update size calculation
        if (this.cache.has(key)) {
            this.delete(key);
        }
        
        // Check if adding this entry would exceed max size
        if (this.currentSize + size > this.config.maxSize) {
            this.evictLRU(size);
        }
        
        this.cache.set(key, entry);
        this.currentSize += size;
    }
    
    delete(key: string): boolean {
        const entry = this.cache.get(key);
        if (entry) {
            this.currentSize -= entry.size;
            return this.cache.delete(key);
        }
        return false;
    }
    
    has(key: string): boolean {
        const entry = this.cache.get(key);
        return entry ? !this.isExpired(entry) : false;
    }
    
    clear(): void {
        this.cache.clear();
        this.currentSize = 0;
    }
    
    getStats() {
        const now = Date.now();
        let expiredCount = 0;
        let activeCount = 0;
        
        for (const entry of this.cache.values()) {
            if (this.isExpired(entry)) {
                expiredCount++;
            } else {
                activeCount++;
            }
        }
        
        return {
            totalEntries: this.cache.size,
            activeEntries: activeCount,
            expiredEntries: expiredCount,
            currentSize: this.currentSize,
            maxSize: this.config.maxSize,
            utilization: (this.currentSize / this.config.maxSize) * 100
        };
    }
    
    private isExpired(entry: CacheEntry<any>): boolean {
        return Date.now() > entry.timestamp + entry.ttl;
    }
    
    private estimateSize(value: any): number {
        try {
            // Rough estimation - serialize and get byte length
            const json = JSON.stringify(value);
            return new Blob([json]).size;
        } catch {
            // Fallback for non-serializable objects
            return 1024; // 1KB default
        }
    }
    
    private evictLRU(requiredSpace: number): void {
        // Sort entries by timestamp (oldest first)
        const entries = Array.from(this.cache.entries()).sort((a, b) => 
            a[1].timestamp - b[1].timestamp
        );
        
        let freedSpace = 0;
        const keysToDelete: string[] = [];
        
        for (const [key, entry] of entries) {
            keysToDelete.push(key);
            freedSpace += entry.size;
            
            // Stop when we have enough space
            if (freedSpace >= requiredSpace) {
                break;
            }
        }
        
        // Remove selected entries
        keysToDelete.forEach(key => this.delete(key));
        
        console.log(`[CacheManager] Evicted ${keysToDelete.length} entries, freed ${freedSpace} bytes`);
    }
    
    private startCleanupTimer(): void {
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.config.cleanupInterval);
    }
    
    private cleanup(): void {
        const initialSize = this.cache.size;
        const expiredKeys: string[] = [];
        
        for (const [key, entry] of this.cache.entries()) {
            if (this.isExpired(entry)) {
                expiredKeys.push(key);
            }
        }
        
        expiredKeys.forEach(key => this.delete(key));
        
        if (expiredKeys.length > 0) {
            console.log(`[CacheManager] Cleaned up ${expiredKeys.length} expired entries (${initialSize} -> ${this.cache.size})`);
        }
    }
    
    // Cleanup method to be called on plugin unload
    destroy(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }
        this.clear();
    }
}