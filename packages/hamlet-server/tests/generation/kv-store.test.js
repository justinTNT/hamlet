import { jest } from '@jest/globals';

describe('KV Store Generation', () => {
    let mockKvClient;
    let createKvFunctions, cleanupExpiredKeys, getTenantKeys;

    beforeAll(async () => {
        const kvModule = await import('../../packages/hamlet-server/generated/kv-store.js');
        createKvFunctions = kvModule.default;
        cleanupExpiredKeys = kvModule.cleanupExpiredKeys;
        getTenantKeys = kvModule.getTenantKeys;
    });

    beforeEach(() => {
        mockKvClient = {
            setex: jest.fn(),
            get: jest.fn(),
            del: jest.fn(),
            exists: jest.fn(),
            expire: jest.fn(),
            keys: jest.fn(),
            ttl: jest.fn()
        };
    });

    describe('TestCache KV functions', () => {
        let kvFunctions;

        beforeEach(() => {
            kvFunctions = createKvFunctions(mockKvClient);
        });

        test('setTestCache stores data with tenant isolation and TTL', async () => {
            const testCache = {
                key: 'test-key',
                data: 'test-data',
                ttl: 1800 // 30 minutes
            };
            const key = 'cache123';
            const host = 'example.com';

            mockKvClient.setex.mockResolvedValue('OK');

            const result = await kvFunctions.setTestCache(testCache, key, host, mockKvClient);

            expect(mockKvClient.setex).toHaveBeenCalledWith(
                'example.com:testcache:cache123',
                1800,
                JSON.stringify(testCache)
            );
            expect(result).toBe(true);
        });

        test('setTestCache uses default TTL when not specified', async () => {
            const testCache = {
                key: 'test-key',
                data: 'test-data'
                // No TTL specified
            };

            mockKvClient.setex.mockResolvedValue('OK');

            await kvFunctions.setTestCache(testCache, 'key1', 'host.com', mockKvClient);

            expect(mockKvClient.setex).toHaveBeenCalledWith(
                'host.com:testcache:key1',
                3600, // Default 1 hour
                JSON.stringify(testCache)
            );
        });

        test('getTestCache retrieves data with tenant isolation', async () => {
            const cachedData = {
                key: 'test-key',
                data: 'cached-data',
                ttl: 1800
            };
            const key = 'cache123';
            const host = 'example.com';

            mockKvClient.get.mockResolvedValue(JSON.stringify(cachedData));

            const result = await kvFunctions.getTestCache(key, host, mockKvClient);

            expect(mockKvClient.get).toHaveBeenCalledWith('example.com:testcache:cache123');
            expect(result).toEqual(cachedData);
        });

        test('getTestCache returns null for missing data', async () => {
            mockKvClient.get.mockResolvedValue(null);

            const result = await kvFunctions.getTestCache('missing', 'host.com', mockKvClient);

            expect(result).toBeNull();
        });

        test('getTestCache handles JSON parsing errors', async () => {
            mockKvClient.get.mockResolvedValue('invalid json');
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const result = await kvFunctions.getTestCache('key', 'host.com', mockKvClient);

            expect(result).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith(
                'Error getting TestCache:',
                expect.any(Error)
            );
            
            consoleSpy.mockRestore();
        });

        test('deleteTestCache removes data with tenant isolation', async () => {
            const key = 'cache123';
            const host = 'example.com';

            mockKvClient.del.mockResolvedValue(1); // 1 key deleted

            const result = await kvFunctions.deleteTestCache(key, host, mockKvClient);

            expect(mockKvClient.del).toHaveBeenCalledWith('example.com:testcache:cache123');
            expect(result).toBe(true);
        });

        test('deleteTestCache returns false when key does not exist', async () => {
            mockKvClient.del.mockResolvedValue(0); // 0 keys deleted

            const result = await kvFunctions.deleteTestCache('missing', 'host.com', mockKvClient);

            expect(result).toBe(false);
        });

        test('existsTestCache checks existence with tenant isolation', async () => {
            const key = 'cache123';
            const host = 'example.com';

            mockKvClient.exists.mockResolvedValue(1); // Key exists

            const result = await kvFunctions.existsTestCache(key, host, mockKvClient);

            expect(mockKvClient.exists).toHaveBeenCalledWith('example.com:testcache:cache123');
            expect(result).toBe(true);
        });

        test('updateTtlTestCache updates TTL with tenant isolation', async () => {
            const key = 'cache123';
            const host = 'example.com';
            const newTtl = 7200; // 2 hours

            mockKvClient.expire.mockResolvedValue(1); // TTL updated

            const result = await kvFunctions.updateTtlTestCache(key, newTtl, host, mockKvClient);

            expect(mockKvClient.expire).toHaveBeenCalledWith('example.com:testcache:cache123', 7200);
            expect(result).toBe(true);
        });
    });

    describe('UserSession KV functions', () => {
        let kvFunctions;

        beforeEach(() => {
            kvFunctions = createKvFunctions(mockKvClient);
        });

        test('setUserSession stores session data correctly', async () => {
            const userSession = {
                user_id: 'user123',
                login_time: Date.now(),
                permissions: ['read', 'write'],
                ttl: 3600
            };
            const sessionKey = 'session_abc123';
            const host = 'app.example.com';

            mockKvClient.setex.mockResolvedValue('OK');

            const result = await kvFunctions.setUserSession(userSession, sessionKey, host, mockKvClient);

            expect(mockKvClient.setex).toHaveBeenCalledWith(
                'app.example.com:usersession:session_abc123',
                3600,
                JSON.stringify(userSession)
            );
            expect(result).toBe(true);
        });

        test('getUserSession retrieves session with correct key format', async () => {
            const sessionData = {
                user_id: 'user456',
                login_time: 1640995200000,
                permissions: ['admin'],
                ttl: 3600
            };

            mockKvClient.get.mockResolvedValue(JSON.stringify(sessionData));

            const result = await kvFunctions.getUserSession('sess_xyz', 'app.com', mockKvClient);

            expect(mockKvClient.get).toHaveBeenCalledWith('app.com:usersession:sess_xyz');
            expect(result).toEqual(sessionData);
        });
    });

    describe('tenant isolation', () => {
        test('different tenants access separate keyspaces', async () => {
            const kvFunctions = createKvFunctions(mockKvClient);
            const testData = { key: 'test', data: 'data', ttl: 3600 };

            mockKvClient.setex.mockResolvedValue('OK');

            await kvFunctions.setTestCache(testData, 'key1', 'tenant-a.com', mockKvClient);
            await kvFunctions.setTestCache(testData, 'key1', 'tenant-b.com', mockKvClient);

            expect(mockKvClient.setex).toHaveBeenNthCalledWith(
                1,
                'tenant-a.com:testcache:key1',
                3600,
                JSON.stringify(testData)
            );
            expect(mockKvClient.setex).toHaveBeenNthCalledWith(
                2,
                'tenant-b.com:testcache:key1',
                3600,
                JSON.stringify(testData)
            );
        });

        test('tenant cannot access other tenant data', async () => {
            const kvFunctions = createKvFunctions(mockKvClient);

            mockKvClient.get.mockResolvedValue(null); // Simulate no access

            const result = await kvFunctions.getTestCache('key1', 'wrong-tenant.com', mockKvClient);

            expect(mockKvClient.get).toHaveBeenCalledWith('wrong-tenant.com:testcache:key1');
            expect(result).toBeNull();
        });
    });

    describe('error handling', () => {
        let kvFunctions;

        beforeEach(() => {
            kvFunctions = createKvFunctions(mockKvClient);
        });

        test('setTestCache handles KV client errors', async () => {
            mockKvClient.setex.mockRejectedValue(new Error('Connection timeout'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const result = await kvFunctions.setTestCache(
                { key: 'test', data: 'data', ttl: 3600 },
                'key1',
                'host.com',
                mockKvClient
            );

            expect(result).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith(
                'Error setting TestCache:',
                expect.any(Error)
            );
            
            consoleSpy.mockRestore();
        });

        test('getTestCache handles network errors gracefully', async () => {
            mockKvClient.get.mockRejectedValue(new Error('Network error'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const result = await kvFunctions.getTestCache('key1', 'host.com', mockKvClient);

            expect(result).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith(
                'Error getting TestCache:',
                expect.any(Error)
            );
            
            consoleSpy.mockRestore();
        });

        test('all operations handle Redis unavailability', async () => {
            const error = new Error('Redis unavailable');
            mockKvClient.setex.mockRejectedValue(error);
            mockKvClient.get.mockRejectedValue(error);
            mockKvClient.del.mockRejectedValue(error);
            mockKvClient.exists.mockRejectedValue(error);
            mockKvClient.expire.mockRejectedValue(error);

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const results = await Promise.all([
                kvFunctions.setTestCache({ data: 'test', ttl: 3600 }, 'key', 'host', mockKvClient),
                kvFunctions.getTestCache('key', 'host', mockKvClient),
                kvFunctions.deleteTestCache('key', 'host', mockKvClient),
                kvFunctions.existsTestCache('key', 'host', mockKvClient),
                kvFunctions.updateTtlTestCache('key', 1800, 'host', mockKvClient)
            ]);

            expect(results).toEqual([false, null, false, false, false]);
            expect(consoleSpy).toHaveBeenCalledTimes(5);
            
            consoleSpy.mockRestore();
        });
    });

    describe('helper functions', () => {
        test('cleanupExpiredKeys processes tenant keys', async () => {
            const host = 'example.com';
            const tenantKeys = [
                'example.com:testcache:key1',
                'example.com:usersession:sess1',
                'example.com:testcache:key2'
            ];

            mockKvClient.keys.mockResolvedValue(tenantKeys);
            mockKvClient.ttl
                .mockResolvedValueOnce(-1) // key1 has no TTL
                .mockResolvedValueOnce(1800) // sess1 has TTL
                .mockResolvedValueOnce(-2); // key2 expired

            mockKvClient.expire.mockResolvedValue(1);

            const result = await cleanupExpiredKeys(host, mockKvClient);

            expect(mockKvClient.keys).toHaveBeenCalledWith('example.com:*');
            expect(mockKvClient.expire).toHaveBeenCalledWith('example.com:testcache:key1', 3600);
            expect(result).toBe(1); // One expired key found
        });

        test('getTenantKeys returns all keys for tenant', async () => {
            const host = 'test.com';
            const expectedKeys = [
                'test.com:testcache:cache1',
                'test.com:usersession:session1'
            ];

            mockKvClient.keys.mockResolvedValue(expectedKeys);

            const result = await getTenantKeys(host, mockKvClient);

            expect(mockKvClient.keys).toHaveBeenCalledWith('test.com:*');
            expect(result).toEqual(expectedKeys);
        });

        test('helper functions handle errors gracefully', async () => {
            const error = new Error('KV error');
            mockKvClient.keys.mockRejectedValue(error);

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const cleanupResult = await cleanupExpiredKeys('host.com', mockKvClient);
            const keysResult = await getTenantKeys('host.com', mockKvClient);

            expect(cleanupResult).toBe(0);
            expect(keysResult).toEqual([]);
            expect(consoleSpy).toHaveBeenCalledTimes(2);
            
            consoleSpy.mockRestore();
        });
    });

    describe('TTL management', () => {
        let kvFunctions;

        beforeEach(() => {
            kvFunctions = createKvFunctions(mockKvClient);
        });

        test('respects custom TTL values', async () => {
            const shortTtl = { key: 'temp', data: 'temp-data', ttl: 300 }; // 5 minutes
            const longTtl = { key: 'persistent', data: 'persistent-data', ttl: 86400 }; // 24 hours

            mockKvClient.setex.mockResolvedValue('OK');

            await kvFunctions.setTestCache(shortTtl, 'temp-key', 'host.com', mockKvClient);
            await kvFunctions.setTestCache(longTtl, 'persistent-key', 'host.com', mockKvClient);

            expect(mockKvClient.setex).toHaveBeenNthCalledWith(
                1,
                'host.com:testcache:temp-key',
                300,
                JSON.stringify(shortTtl)
            );
            expect(mockKvClient.setex).toHaveBeenNthCalledWith(
                2,
                'host.com:testcache:persistent-key',
                86400,
                JSON.stringify(longTtl)
            );
        });

        test('updateTtl works correctly', async () => {
            mockKvClient.expire.mockResolvedValue(1);

            const result = await kvFunctions.updateTtlTestCache('key1', 1800, 'host.com', mockKvClient);

            expect(mockKvClient.expire).toHaveBeenCalledWith('host.com:testcache:key1', 1800);
            expect(result).toBe(true);
        });

        test('updateTtl returns false for non-existent keys', async () => {
            mockKvClient.expire.mockResolvedValue(0); // Key doesn't exist

            const result = await kvFunctions.updateTtlTestCache('missing', 3600, 'host.com', mockKvClient);

            expect(result).toBe(false);
        });
    });

    describe('performance', () => {
        test('createKvFunctions returns same function instances', () => {
            const kvFunctions1 = createKvFunctions(mockKvClient);
            const kvFunctions2 = createKvFunctions(mockKvClient);

            // Functions should have same structure
            expect(Object.keys(kvFunctions1)).toEqual(Object.keys(kvFunctions2));
            expect(kvFunctions1.setTestCache).toBeDefined();
            expect(kvFunctions1.getUserSession).toBeDefined();
        });

        test('tenant key prefixes are consistent', () => {
            // Test that key generation is deterministic
            const host = 'consistent.com';
            const key = 'test-key';

            mockKvClient.get.mockResolvedValue(null);

            const kvFunctions = createKvFunctions(mockKvClient);
            
            // Call multiple times to ensure consistency
            kvFunctions.getTestCache(key, host, mockKvClient);
            kvFunctions.getTestCache(key, host, mockKvClient);

            expect(mockKvClient.get).toHaveBeenCalledTimes(2);
            expect(mockKvClient.get).toHaveBeenNthCalledWith(1, 'consistent.com:testcache:test-key');
            expect(mockKvClient.get).toHaveBeenNthCalledWith(2, 'consistent.com:testcache:test-key');
        });
    });
});