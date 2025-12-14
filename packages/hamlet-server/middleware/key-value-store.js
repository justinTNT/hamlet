/**
 * Key-Value Store Middleware
 * Provides tenant-isolated in-memory key-value storage with TTL support
 */

class TenantKeyValueStore {
    constructor() {
        this.tenantStores = new Map(); // host -> Map<string, { value, expires_at, type }>
    }

    getOrCreateStore(host) {
        if (!this.tenantStores.has(host)) {
            this.tenantStores.set(host, new Map());
        }
        return this.tenantStores.get(host);
    }

    set(host, type, key, value, ttlSeconds = null) {
        const store = this.getOrCreateStore(host);
        const fullKey = `${type}:${key}`;
        
        store.set(fullKey, {
            value: value,
            expires_at: ttlSeconds ? Date.now() + (ttlSeconds * 1000) : null,
            type: type,
            created_at: Date.now()
        });
        
        return { success: true };
    }

    get(host, type, key) {
        const store = this.getOrCreateStore(host);
        const fullKey = `${type}:${key}`;
        const item = store.get(fullKey);
        
        if (!item) {
            return { value: null, found: false };
        }
        
        // Check expiration
        if (item.expires_at && item.expires_at < Date.now()) {
            store.delete(fullKey);
            return { value: null, found: false, expired: true };
        }
        
        return { value: item.value, found: true, type: item.type };
    }

    delete(host, type, key) {
        const store = this.getOrCreateStore(host);
        const fullKey = `${type}:${key}`;
        const existed = store.has(fullKey);
        store.delete(fullKey);
        return { success: true, existed };
    }

    stats(host = null) {
        if (host) {
            const store = this.getOrCreateStore(host);
            return {
                total_keys: store.size,
                host: host
            };
        } else {
            let totalKeys = 0;
            const tenantCounts = {};
            
            for (const [tenantHost, store] of this.tenantStores.entries()) {
                const count = store.size;
                tenantCounts[tenantHost] = count;
                totalKeys += count;
            }
            
            return {
                total_keys: totalKeys,
                tenant_count: this.tenantStores.size,
                per_tenant: tenantCounts
            };
        }
    }
}

export default function createKeyValueStore(server) {
    console.log('🗃️  Setting up key-value store');
    
    const kvStore = new TenantKeyValueStore();
    
    // Add KV API routes
    server.app.post('/kv/:type/:key', (req, res) => {
        const { type, key } = req.params;
        const { value, ttl } = req.body;
        const host = req.tenant?.host || 'localhost';
        
        try {
            const result = kvStore.set(host, type, key, value, ttl);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    server.app.get('/kv/:type/:key', (req, res) => {
        const { type, key } = req.params;
        const host = req.tenant?.host || 'localhost';
        
        try {
            const result = kvStore.get(host, type, key);
            if (result.found) {
                res.json(result);
            } else {
                res.status(404).json(result);
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    const kvService = {
        store: kvStore,
        get: (host, type, key) => kvStore.get(host, type, key),
        set: (host, type, key, value, ttl) => kvStore.set(host, type, key, value, ttl),
        stats: (host) => kvStore.stats(host),
        
        cleanup: async () => {
            console.log('🧹 Cleaning up key-value store');
        }
    };
    
    server.registerService('kv', kvService);
    return kvService;
}