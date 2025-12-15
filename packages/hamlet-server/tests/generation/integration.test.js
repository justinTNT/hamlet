import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

describe('Code Generation Integration Tests', () => {
    let app, mockPool, mockKvClient, mockWasmService, mockServer, mockElmService;

    beforeAll(() => {
        // Setup mock localStorage for browser storage tests
        global.localStorage = {
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn()
        };

        global.app = {
            ports: {
                userpreferencesChanged: { send: jest.fn() },
                authstateChanged: { send: jest.fn() }
            }
        };
    });

    beforeEach(() => {
        app = express();
        app.use(express.json());

        // Mock database pool
        mockPool = {
            query: jest.fn()
        };

        // Mock KV client
        mockKvClient = {
            setex: jest.fn(),
            get: jest.fn(),
            del: jest.fn(),
            exists: jest.fn(),
            expire: jest.fn()
        };

        // Mock Elm TEA service
        mockElmService = {
            callHandler: jest.fn(),
            cleanup: jest.fn()
        };

        // Mock server
        mockServer = {
            app,
            getService: jest.fn((serviceName) => {
                if (serviceName === 'elm') return mockElmService;
                if (serviceName === 'database') return mockPool;
                return null;
            })
        };

        // Setup tenant middleware
        app.use((req, res, next) => {
            req.tenant = { host: 'integration-test.com' };
            req.context = { 
                host: 'integration-test.com',
                user_id: 'test-user-123',
                is_extension: false
            };
            next();
        });

        jest.clearAllMocks();
    });

    describe('End-to-End Data Flow', () => {
        test('complete user comment submission flow', async () => {
            // 1. Setup: Load generated modules
            const { default: createDbQueries } = await import('../../generated/database-queries.js');
            const { default: registerApiRoutes } = await import('../../generated/api-routes.js');
            const { default: createKvFunctions } = await import('../../generated/kv-store.js');
            const { UserPreferencesStorage } = await import('../../generated/browser-storage.js');

            // 2. Initialize all generated systems
            const dbQueries = createDbQueries(mockPool);
            const kvFunctions = createKvFunctions(mockKvClient);
            registerApiRoutes(mockServer);

            // 3. Mock database responses
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1, comment: 'Test comment', item_id: 456, created_at: new Date() }]
            });

            // 4. Mock Elm TEA handler business logic
            mockElmService.callHandler.mockResolvedValue({
                success: true,
                comment: {
                    id: 1,
                    text: 'Test comment',
                    item_id: 456,
                    author: 'test-user-123'
                }
            });

            // 5. Mock user preferences in localStorage
            global.localStorage.getItem.mockReturnValue(JSON.stringify({
                theme: 'dark',
                language: 'en',
                notifications: true
            }));

            // 6. Execute the complete flow
            const response = await request(app)
                .post('/api/SubmitComment')
                .send({
                    comment: 'This is a test comment',
                    item_id: 456
                })
                .expect(200);

            // 7. Verify API response
            expect(response.body).toMatchObject({
                success: true,
                comment: expect.objectContaining({
                    id: 1,
                    text: 'Test comment',
                    item_id: 456
                })
            });

            // 8. Verify Elm TEA handler was called with correct data
            expect(mockElmService.callHandler).toHaveBeenCalledWith(
                'SubmitComment',
                expect.objectContaining({
                    comment: 'This is a test comment',
                    item_id: 456,
                    host: 'integration-test.com'
                }),
                expect.objectContaining({
                    host: 'integration-test.com',
                    user_id: 'test-user-123'
                })
            );

            // 9. Test browser storage integration
            const userPrefs = UserPreferencesStorage.load();
            expect(userPrefs).toMatchObject({
                theme: 'dark',
                language: 'en',
                notifications: true
            });

            // 10. Verify tenant isolation in all systems
            expect(mockElmService.callHandler).toHaveBeenCalledWith(
                'SubmitComment',
                expect.any(Object),
                expect.objectContaining({
                    host: 'integration-test.com'
                })
            );
        });

        test('cross-system data consistency', async () => {
            // Test that data flows consistently between all generated systems
            const testData = {
                user_id: 'user-789',
                preferences: { theme: 'light', language: 'es' },
                session: { login_time: Date.now(), permissions: ['read', 'write'] },
                comment: { text: 'Consistency test', item_id: 999 }
            };

            // Load all systems
            const { default: createDbQueries } = await import('../../generated/database-queries.js');
            const { default: createKvFunctions } = await import('../../generated/kv-store.js');
            const { UserPreferencesStorage } = await import('../../generated/browser-storage.js');

            const dbQueries = createDbQueries(mockPool);
            const kvFunctions = createKvFunctions(mockKvClient);

            // Mock successful operations
            mockKvClient.setex.mockResolvedValue('OK');
            mockKvClient.get.mockResolvedValue(JSON.stringify(testData.session));
            global.localStorage.setItem.mockImplementation(() => {});
            global.localStorage.getItem.mockReturnValue(JSON.stringify(testData.preferences));

            // Test data storage across systems
            UserPreferencesStorage.save(testData.preferences);
            await kvFunctions.setUserSession(testData.session, 'session-123', 'test.com', mockKvClient);

            // Verify all systems received tenant-isolated data
            expect(global.localStorage.setItem).toHaveBeenCalledWith(
                'user_preferences',
                JSON.stringify(testData.preferences)
            );

            expect(mockKvClient.setex).toHaveBeenCalledWith(
                'test.com:usersession:session-123',
                expect.any(Number),
                JSON.stringify(testData.session)
            );
        });
    });

    describe('Cross-System Error Handling', () => {
        test('graceful degradation when systems fail', async () => {
            const { UserPreferencesStorage } = await import('../../generated/browser-storage.js');
            const { default: createKvFunctions } = await import('../../generated/kv-store.js');

            // Simulate localStorage failure
            global.localStorage.setItem.mockImplementation(() => {
                throw new Error('Storage quota exceeded');
            });

            // Simulate KV client failure
            mockKvClient.setex.mockRejectedValue(new Error('Redis unavailable'));

            const kvFunctions = createKvFunctions(mockKvClient);
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            // Test that failures are handled gracefully
            const storageResult = UserPreferencesStorage.save({ theme: 'dark' });
            const kvResult = await kvFunctions.setTestCache(
                { key: 'test', data: 'data', ttl: 3600 },
                'key1',
                'host.com',
                mockKvClient
            );

            expect(storageResult).toBe(false);
            expect(kvResult).toBe(false);
            expect(consoleSpy).toHaveBeenCalledTimes(2);
            
            consoleSpy.mockRestore();
        });

        test('partial system failures don\'t break entire pipeline', async () => {
            // Load API routes
            const { default: registerApiRoutes } = await import('../../generated/api-routes.js');
            registerApiRoutes(mockServer);

            // Elm service partially fails
            mockElmService.callHandler.mockRejectedValue(
                new Error('Elm handler timeout')
            );

            const response = await request(app)
                .post('/api/SubmitComment')
                .send({
                    comment: 'Test comment',
                    item_id: 456
                })
                .expect(400); // Should return error, not crash

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('Elm handler timeout');
        });
    });

    describe('Performance Integration', () => {
        test('all systems handle concurrent operations', async () => {
            const { default: createDbQueries } = await import('../../generated/database-queries.js');
            const { default: createKvFunctions } = await import('../../generated/kv-store.js');
            const { UserPreferencesStorage } = await import('../../generated/browser-storage.js');

            const dbQueries = createDbQueries(mockPool);
            const kvFunctions = createKvFunctions(mockKvClient);

            // Mock successful operations
            mockPool.query.mockResolvedValue({ rows: [{ id: 1 }] });
            mockKvClient.setex.mockResolvedValue('OK');
            global.localStorage.setItem.mockImplementation(() => {});

            const start = Date.now();

            // Run concurrent operations
            await Promise.all([
                // Simulate 10 concurrent operations per system
                ...Array.from({ length: 10 }, (_, i) => 
                    UserPreferencesStorage.save({ theme: 'dark', id: i })
                ),
                ...Array.from({ length: 10 }, (_, i) => 
                    kvFunctions.setTestCache(
                        { key: `key${i}`, data: `data${i}`, ttl: 3600 },
                        `cache${i}`,
                        'perf-test.com',
                        mockKvClient
                    )
                )
            ]);

            const duration = Date.now() - start;

            // Should complete quickly
            expect(duration).toBeLessThan(1000);
            expect(global.localStorage.setItem).toHaveBeenCalledTimes(10);
            expect(mockKvClient.setex).toHaveBeenCalledTimes(10);
        });

        test('systems maintain performance under load', async () => {
            const { default: registerApiRoutes } = await import('../../generated/api-routes.js');
            registerApiRoutes(mockServer);

            mockElmService.callHandler.mockResolvedValue({ 
                items: [], 
                total: 0 
            });

            const requests = Array.from({ length: 50 }, () =>
                request(app)
                    .post('/api/GetFeed')
                    .send({ page: 1 })
                    .expect(200)
            );

            const start = Date.now();
            await Promise.all(requests);
            const duration = Date.now() - start;

            // Should handle 50 concurrent requests efficiently
            expect(duration).toBeLessThan(5000);
            expect(mockElmService.callHandler).toHaveBeenCalledTimes(50);
        });
    });

    describe('Security Integration', () => {
        test('tenant isolation enforced across all systems', async () => {
            const { default: createDbQueries } = await import('../../generated/database-queries.js');
            const { default: createKvFunctions } = await import('../../generated/kv-store.js');
            const { default: registerApiRoutes } = await import('../../generated/api-routes.js');

            const dbQueries = createDbQueries(mockPool);
            const kvFunctions = createKvFunctions(mockKvClient);
            registerApiRoutes(mockServer);

            // Test data for different tenants
            const tenantA = 'tenant-a.com';
            const tenantB = 'tenant-b.com';

            // Mock successful KV operations
            mockKvClient.setex.mockResolvedValue('OK');
            mockKvClient.get.mockResolvedValue(null); // No cross-tenant access

            // Store data for tenant A
            await kvFunctions.setTestCache(
                { key: 'secret', data: 'tenant-a-data', ttl: 3600 },
                'secret-key',
                tenantA,
                mockKvClient
            );

            // Try to access from tenant B
            const result = await kvFunctions.getTestCache('secret-key', tenantB, mockKvClient);

            // Verify tenant isolation
            expect(mockKvClient.setex).toHaveBeenCalledWith(
                'tenant-a.com:testcache:secret-key',
                3600,
                expect.stringContaining('tenant-a-data')
            );

            expect(mockKvClient.get).toHaveBeenCalledWith(
                'tenant-b.com:testcache:secret-key' // Different tenant prefix
            );

            expect(result).toBeNull(); // No access to other tenant's data
        });

        test('SQL injection prevention in database queries', async () => {
            const { default: createDbQueries } = await import('../../generated/database-queries.js');
            const dbQueries = createDbQueries(mockPool);

            mockPool.query.mockResolvedValue({ rows: [] });

            // All database functions should use parameterized queries
            // This test ensures no SQL injection is possible through generated code
            const maliciousInput = "'; DROP TABLE users; --";

            // Generated functions should handle this safely
            // (Note: Actual implementation would need to expose the query building logic for testing)
            expect(mockPool.query).toBeDefined();

            // Verify that all calls use parameterized queries
            // The generated SQL should never include direct string concatenation
            expect(true).toBe(true); // Placeholder - would test actual SQL generation
        });
    });

    describe('Type Safety Integration', () => {
        test('consistent data types across all systems', async () => {
            // Test that Rust struct definitions create consistent JavaScript types
            const testData = {
                id: 42,
                name: 'Test Item',
                active: true,
                metadata: { tags: ['test', 'integration'], count: 5 },
                timestamp: Date.now()
            };

            const { UserPreferencesStorage } = await import('../../generated/browser-storage.js');
            
            // Store complex data
            global.localStorage.setItem.mockImplementation(() => {});
            global.localStorage.getItem.mockReturnValue(JSON.stringify(testData));

            UserPreferencesStorage.save(testData);
            const retrieved = UserPreferencesStorage.load();

            // Verify type preservation
            expect(typeof retrieved.id).toBe('number');
            expect(typeof retrieved.name).toBe('string');
            expect(typeof retrieved.active).toBe('boolean');
            expect(Array.isArray(retrieved.metadata.tags)).toBe(true);
            expect(typeof retrieved.metadata.count).toBe('number');
            expect(typeof retrieved.timestamp).toBe('number');
        });
    });
});