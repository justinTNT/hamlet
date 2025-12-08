import { jest } from '@jest/globals';

// Mock crypto for UUID generation
const mockCrypto = {
  randomUUID: jest.fn(() => 'test-uuid-123')
};
global.crypto = mockCrypto;

// Import the TenantKeyValueStore class (we'll need to extract it from server.js)
// For now, let's define it inline for testing
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

    list(host, prefix) {
        const store = this.getOrCreateStore(host);
        const results = [];
        
        for (const [fullKey, item] of store.entries()) {
            // Check expiration
            if (item.expires_at && item.expires_at < Date.now()) {
                store.delete(fullKey);
                continue;
            }
            
            if (fullKey.startsWith(prefix)) {
                results.push({
                    key: fullKey,
                    value: item.value,
                    type: item.type,
                    created_at: item.created_at
                });
            }
        }
        
        return results;
    }

    cleanup(host) {
        const store = this.getOrCreateStore(host);
        let cleaned = 0;
        
        for (const [fullKey, item] of store.entries()) {
            if (item.expires_at && item.expires_at < Date.now()) {
                store.delete(fullKey);
                cleaned++;
            }
        }
        
        return { cleaned };
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

describe('TenantKeyValueStore', () => {
    let kvStore;

    beforeEach(() => {
        kvStore = new TenantKeyValueStore();
        jest.clearAllMocks();
    });

    describe('Basic Operations', () => {
        test('should set and get a value', () => {
            const result = kvStore.set('example.com', 'UserPreferences', 'user123', { theme: 'dark' });
            expect(result.success).toBe(true);

            const retrieved = kvStore.get('example.com', 'UserPreferences', 'user123');
            expect(retrieved.found).toBe(true);
            expect(retrieved.value).toEqual({ theme: 'dark' });
            expect(retrieved.type).toBe('UserPreferences');
        });

        test('should return not found for missing key', () => {
            const result = kvStore.get('example.com', 'UserPreferences', 'missing');
            expect(result.found).toBe(false);
            expect(result.value).toBeNull();
        });

        test('should delete a key', () => {
            kvStore.set('example.com', 'UserPreferences', 'user123', { theme: 'dark' });
            
            const deleteResult = kvStore.delete('example.com', 'UserPreferences', 'user123');
            expect(deleteResult.success).toBe(true);
            expect(deleteResult.existed).toBe(true);

            const getResult = kvStore.get('example.com', 'UserPreferences', 'user123');
            expect(getResult.found).toBe(false);
        });

        test('should indicate when deleting non-existent key', () => {
            const result = kvStore.delete('example.com', 'UserPreferences', 'missing');
            expect(result.success).toBe(true);
            expect(result.existed).toBe(false);
        });
    });

    describe('Tenant Isolation', () => {
        test('should isolate data by tenant host', () => {
            kvStore.set('tenant1.com', 'UserPreferences', 'user123', { theme: 'dark' });
            kvStore.set('tenant2.com', 'UserPreferences', 'user123', { theme: 'light' });

            const tenant1Result = kvStore.get('tenant1.com', 'UserPreferences', 'user123');
            const tenant2Result = kvStore.get('tenant2.com', 'UserPreferences', 'user123');

            expect(tenant1Result.value.theme).toBe('dark');
            expect(tenant2Result.value.theme).toBe('light');
        });

        test('should not leak data between tenants', () => {
            kvStore.set('tenant1.com', 'UserPreferences', 'user123', { theme: 'dark' });

            const tenant2Result = kvStore.get('tenant2.com', 'UserPreferences', 'user123');
            expect(tenant2Result.found).toBe(false);
        });

        test('should provide separate stats per tenant', () => {
            kvStore.set('tenant1.com', 'UserPreferences', 'user1', { theme: 'dark' });
            kvStore.set('tenant1.com', 'SessionCache', 'session1', { data: 'test' });
            kvStore.set('tenant2.com', 'UserPreferences', 'user2', { theme: 'light' });

            const tenant1Stats = kvStore.stats('tenant1.com');
            const tenant2Stats = kvStore.stats('tenant2.com');
            const globalStats = kvStore.stats();

            expect(tenant1Stats.total_keys).toBe(2);
            expect(tenant1Stats.host).toBe('tenant1.com');
            expect(tenant2Stats.total_keys).toBe(1);
            expect(tenant2Stats.host).toBe('tenant2.com');

            expect(globalStats.total_keys).toBe(3);
            expect(globalStats.tenant_count).toBe(2);
            expect(globalStats.per_tenant['tenant1.com']).toBe(2);
            expect(globalStats.per_tenant['tenant2.com']).toBe(1);
        });
    });

    describe('TTL and Expiration', () => {
        test('should respect TTL and expire keys', async () => {
            const originalDateNow = Date.now;
            let mockTime = 1000000;
            Date.now = jest.fn(() => mockTime);

            // Set a key with 1 second TTL
            kvStore.set('example.com', 'SessionCache', 'session123', { data: 'test' }, 1);

            // Should be found immediately
            let result = kvStore.get('example.com', 'SessionCache', 'session123');
            expect(result.found).toBe(true);

            // Advance time by 1.5 seconds
            mockTime += 1500;

            // Should now be expired
            result = kvStore.get('example.com', 'SessionCache', 'session123');
            expect(result.found).toBe(false);
            expect(result.expired).toBe(true);

            // Restore original Date.now
            Date.now = originalDateNow;
        });

        test('should handle keys without TTL', () => {
            kvStore.set('example.com', 'UserPreferences', 'user123', { theme: 'dark' });

            const result = kvStore.get('example.com', 'UserPreferences', 'user123');
            expect(result.found).toBe(true);
            expect(result.value.theme).toBe('dark');
        });

        test('should clean up expired keys', () => {
            const originalDateNow = Date.now;
            let mockTime = 1000000;
            Date.now = jest.fn(() => mockTime);

            // Set keys with different TTLs
            kvStore.set('example.com', 'SessionCache', 'session1', { data: 'test1' }, 1);
            kvStore.set('example.com', 'SessionCache', 'session2', { data: 'test2' }, 3);
            kvStore.set('example.com', 'UserPreferences', 'user1', { theme: 'dark' }); // No TTL

            // Advance time by 2 seconds
            mockTime += 2000;

            const cleanupResult = kvStore.cleanup('example.com');
            expect(cleanupResult.cleaned).toBe(1); // Only session1 should be cleaned

            // Verify session1 is gone, session2 and user1 remain
            expect(kvStore.get('example.com', 'SessionCache', 'session1').found).toBe(false);
            expect(kvStore.get('example.com', 'SessionCache', 'session2').found).toBe(true);
            expect(kvStore.get('example.com', 'UserPreferences', 'user1').found).toBe(true);

            Date.now = originalDateNow;
        });
    });

    describe('Prefix Listing', () => {
        test('should list keys by prefix', () => {
            kvStore.set('example.com', 'UserPreferences', 'user1', { theme: 'dark' });
            kvStore.set('example.com', 'UserPreferences', 'user2', { theme: 'light' });
            kvStore.set('example.com', 'SessionCache', 'session1', { data: 'test' });

            const userPrefResults = kvStore.list('example.com', 'UserPreferences:');
            const sessionResults = kvStore.list('example.com', 'SessionCache:');

            expect(userPrefResults.length).toBe(2);
            expect(sessionResults.length).toBe(1);

            // Check that results have correct structure
            const userResult = userPrefResults[0];
            expect(userResult.key).toMatch(/^UserPreferences:/);
            expect(userResult.type).toBe('UserPreferences');
            expect(userResult.value).toBeDefined();
            expect(userResult.created_at).toBeDefined();
        });

        test('should exclude expired keys from listing', () => {
            const originalDateNow = Date.now;
            let mockTime = 1000000;
            Date.now = jest.fn(() => mockTime);

            kvStore.set('example.com', 'SessionCache', 'session1', { data: 'test1' }, 1);
            kvStore.set('example.com', 'SessionCache', 'session2', { data: 'test2' }, 3);

            // Advance time to expire session1
            mockTime += 1500;

            const results = kvStore.list('example.com', 'SessionCache:');
            expect(results.length).toBe(1);
            expect(results[0].key).toBe('SessionCache:session2');

            Date.now = originalDateNow;
        });

        test('should respect tenant isolation in listing', () => {
            kvStore.set('tenant1.com', 'UserPreferences', 'user1', { theme: 'dark' });
            kvStore.set('tenant2.com', 'UserPreferences', 'user1', { theme: 'light' });

            const tenant1Results = kvStore.list('tenant1.com', 'UserPreferences:');
            const tenant2Results = kvStore.list('tenant2.com', 'UserPreferences:');

            expect(tenant1Results.length).toBe(1);
            expect(tenant2Results.length).toBe(1);
            expect(tenant1Results[0].value.theme).toBe('dark');
            expect(tenant2Results[0].value.theme).toBe('light');
        });
    });

    describe('Type Safety', () => {
        test('should handle different value types', () => {
            const stringValue = 'test string';
            const numberValue = 42;
            const objectValue = { key: 'value', nested: { data: true } };
            const arrayValue = [1, 2, 3];

            kvStore.set('example.com', 'TestType', 'string', stringValue);
            kvStore.set('example.com', 'TestType', 'number', numberValue);
            kvStore.set('example.com', 'TestType', 'object', objectValue);
            kvStore.set('example.com', 'TestType', 'array', arrayValue);

            expect(kvStore.get('example.com', 'TestType', 'string').value).toBe(stringValue);
            expect(kvStore.get('example.com', 'TestType', 'number').value).toBe(numberValue);
            expect(kvStore.get('example.com', 'TestType', 'object').value).toEqual(objectValue);
            expect(kvStore.get('example.com', 'TestType', 'array').value).toEqual(arrayValue);
        });

        test('should maintain type information', () => {
            kvStore.set('example.com', 'UserPreferences', 'user1', { theme: 'dark' });
            kvStore.set('example.com', 'SessionCache', 'session1', { data: 'test' });

            const prefResult = kvStore.get('example.com', 'UserPreferences', 'user1');
            const sessionResult = kvStore.get('example.com', 'SessionCache', 'session1');

            expect(prefResult.type).toBe('UserPreferences');
            expect(sessionResult.type).toBe('SessionCache');
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty host gracefully', () => {
            const result = kvStore.set('', 'TestType', 'key', 'value');
            expect(result.success).toBe(true);

            const retrieved = kvStore.get('', 'TestType', 'key');
            expect(retrieved.found).toBe(true);
            expect(retrieved.value).toBe('value');
        });

        test('should handle special characters in keys', () => {
            const specialKey = 'user:123@example.com/test';
            kvStore.set('example.com', 'UserPreferences', specialKey, { theme: 'dark' });

            const result = kvStore.get('example.com', 'UserPreferences', specialKey);
            expect(result.found).toBe(true);
            expect(result.value.theme).toBe('dark');
        });

        test('should handle null and undefined values', () => {
            kvStore.set('example.com', 'TestType', 'null', null);
            kvStore.set('example.com', 'TestType', 'undefined', undefined);

            const nullResult = kvStore.get('example.com', 'TestType', 'null');
            const undefinedResult = kvStore.get('example.com', 'TestType', 'undefined');

            expect(nullResult.found).toBe(true);
            expect(nullResult.value).toBeNull();
            expect(undefinedResult.found).toBe(true);
            expect(undefinedResult.value).toBeUndefined();
        });
    });
});