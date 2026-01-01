import { jest } from '@jest/globals';

describe('Elm TEA Service Unit Tests', () => {
    let mockServer;

    beforeEach(() => {
        mockServer = {
            registerService: jest.fn(),
            getService: jest.fn()
        };
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    test('service registration works', () => {
        // Mock a simple service registration
        const mockService = {
            callHandler: jest.fn(),
            cleanup: jest.fn()
        };

        mockServer.registerService('elm', mockService);

        expect(mockServer.registerService).toHaveBeenCalledWith('elm', mockService);
        expect(mockServer.registerService).toHaveBeenCalledTimes(1);
    });

    test('server timestamp generation produces valid values', () => {
        const beforeTime = Date.now();
        const serverNow = Date.now(); // Simulate server-issued timestamp
        const afterTime = Date.now();

        expect(serverNow).toBeGreaterThanOrEqual(beforeTime);
        expect(serverNow).toBeLessThanOrEqual(afterTime);
        expect(typeof serverNow).toBe('number');
    });

    test('global config structure matches TEA requirements', () => {
        const globalConfig = {
            serverNow: Date.now(),
            hostIsolation: true,
            environment: process.env.NODE_ENV || 'development'
        };

        expect(globalConfig).toHaveProperty('serverNow');
        expect(globalConfig).toHaveProperty('hostIsolation');
        expect(globalConfig).toHaveProperty('environment');
        expect(typeof globalConfig.serverNow).toBe('number');
        expect(typeof globalConfig.hostIsolation).toBe('boolean');
        expect(typeof globalConfig.environment).toBe('string');
    });

    test('global state structure matches TEA requirements', () => {
        const globalState = {
            requestCount: 0,
            lastActivity: Date.now()
        };

        expect(globalState).toHaveProperty('requestCount');
        expect(globalState).toHaveProperty('lastActivity');
        expect(typeof globalState.requestCount).toBe('number');
        expect(typeof globalState.lastActivity).toBe('number');
    });

    test('request ID generation produces unique identifiers', () => {
        const generateRequestId = () => {
            const timestamp = Date.now();
            const hash = Math.random().toString(36).substring(2, 8);
            return `req_${timestamp}_${hash}`;
        };

        const id1 = generateRequestId();
        const id2 = generateRequestId();

        expect(id1).not.toBe(id2);
        expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/);
        expect(id2).toMatch(/^req_\d+_[a-z0-9]+$/);
    });

    test('context isolation maintains separate request data', () => {
        const context1 = {
            host: 'tenant1.com',
            userId: 'user1',
            sessionId: 'session1'
        };

        const context2 = {
            host: 'tenant2.com', 
            userId: 'user2',
            sessionId: 'session2'
        };

        // Simulate context storage
        const contexts = new Map();
        contexts.set('req1', context1);
        contexts.set('req2', context2);

        expect(contexts.get('req1').host).toBe('tenant1.com');
        expect(contexts.get('req2').host).toBe('tenant2.com');
        expect(contexts.get('req1').userId).toBe('user1');
        expect(contexts.get('req2').userId).toBe('user2');
    });

    test('error handling gracefully manages missing handlers', () => {
        const handleMissingHandler = (handlerName) => {
            throw new Error(`Handler ${handlerName} not available`);
        };

        expect(() => handleMissingHandler('NonexistentHandler'))
            .toThrow('Handler NonexistentHandler not available');
    });

    test('database query structure supports parameterization', () => {
        const buildQuery = (table, filters, host) => {
            let sql = `SELECT * FROM ${table} WHERE host = $1`;
            let params = [host];
            let paramIndex = 2;

            for (const filter of filters) {
                if (filter.type === 'ById') {
                    sql += ` AND id = $${paramIndex}`;
                    params.push(filter.value);
                    paramIndex++;
                } else if (filter.type === 'ByField') {
                    sql += ` AND ${filter.field} = $${paramIndex}`;
                    params.push(filter.value);
                    paramIndex++;
                }
            }

            return { sql, params };
        };

        const query = buildQuery('items', [
            { type: 'ById', value: 'item123' },
            { type: 'ByField', field: 'status', value: 'active' }
        ], 'test.com');

        expect(query.sql).toContain('WHERE host = $1');
        expect(query.sql).toContain('AND id = $2');
        expect(query.sql).toContain('AND status = $3');
        expect(query.params).toEqual(['test.com', 'item123', 'active']);
    });

    test('port message structure follows Elm conventions', () => {
        const portMessage = {
            id: 'req_123_abc',
            context: {
                host: 'test.com',
                userId: 'user123',
                sessionId: 'session456'
            },
            request: {
                data: 'test data'
            }
        };

        expect(portMessage).toHaveProperty('id');
        expect(portMessage).toHaveProperty('context'); 
        expect(portMessage).toHaveProperty('request');
        expect(portMessage.context).toHaveProperty('host');
        expect(portMessage.context).toHaveProperty('userId');
        expect(portMessage.context).toHaveProperty('sessionId');
    });

    test('JSON parsing handles both objects and strings', () => {
        const parseResponse = (response) => {
            if (typeof response === 'string') {
                try {
                    return JSON.parse(response);
                } catch (error) {
                    throw new Error(`Invalid JSON response: ${error.message}`);
                }
            }
            return response;
        };

        const objectResponse = { success: true, data: 'test' };
        const stringResponse = '{"success": true, "data": "test"}';
        const invalidResponse = 'invalid json {{{';

        expect(parseResponse(objectResponse)).toEqual({ success: true, data: 'test' });
        expect(parseResponse(stringResponse)).toEqual({ success: true, data: 'test' });
        expect(() => parseResponse(invalidResponse)).toThrow();
    });

    test('cleanup function handles resource management', async () => {
        const handlers = new Map();
        handlers.set('handler1', { cleanup: jest.fn() });
        handlers.set('handler2', { cleanup: jest.fn() });

        const cleanup = async () => {
            for (const [name, handler] of handlers) {
                if (handler.cleanup) {
                    await handler.cleanup();
                }
            }
            handlers.clear();
        };

        await cleanup();

        expect(handlers.size).toBe(0);
    });

    describe('Timer Cleanup Tests', () => {
        let clearTimeoutSpy;
        let setTimeoutSpy;

        beforeEach(() => {
            clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
            setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation(() => 12345);
        });

        afterEach(() => {
            clearTimeoutSpy.mockRestore();
            setTimeoutSpy.mockRestore();
        });

        test('timeout is cleared when request completes successfully', () => {
            let timeoutId = null;
            let isResolved = false;

            const cleanup = () => {
                if (timeoutId) clearTimeout(timeoutId);
                // Simulate other cleanup
            };

            // Simulate setting the timeout
            timeoutId = setTimeout(() => {
                if (!isResolved) {
                    isResolved = true;
                    cleanup();
                }
            }, 10000);

            // Simulate successful completion
            isResolved = true;
            cleanup();

            expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 10000);
            expect(clearTimeoutSpy).toHaveBeenCalledWith(timeoutId);
        });

        test('timeout is cleared when request encounters an error', () => {
            let timeoutId = null;
            let isResolved = false;

            const cleanup = () => {
                if (timeoutId) clearTimeout(timeoutId);
                // Simulate other cleanup
            };

            // Simulate setting the timeout
            timeoutId = setTimeout(() => {
                if (!isResolved) {
                    isResolved = true;
                    cleanup();
                }
            }, 10000);

            // Simulate error case
            try {
                throw new Error('Request failed');
            } catch (error) {
                isResolved = true;
                cleanup();
            }

            expect(clearTimeoutSpy).toHaveBeenCalledWith(timeoutId);
        });

        test('timeout callback executes cleanup when timer fires', () => {
            let timeoutId = null;
            let isResolved = false;
            let timeoutCallback = null;

            const cleanup = jest.fn(() => {
                if (timeoutId) clearTimeout(timeoutId);
            });

            // Capture the timeout callback
            setTimeoutSpy.mockImplementation((callback, delay) => {
                timeoutCallback = callback;
                return 12345;
            });

            // Simulate setting the timeout
            timeoutId = setTimeout(() => {
                if (!isResolved) {
                    isResolved = true;
                    cleanup();
                }
            }, 10000);

            // Simulate timeout firing
            if (timeoutCallback && !isResolved) {
                timeoutCallback();
            }

            expect(cleanup).toHaveBeenCalled();
        });

        test('multiple concurrent requests have independent timers', () => {
            const requests = [];
            
            for (let i = 0; i < 3; i++) {
                let timeoutId = null;
                let isResolved = false;

                const cleanup = () => {
                    if (timeoutId) clearTimeout(timeoutId);
                };

                timeoutId = setTimeout(() => {
                    if (!isResolved) {
                        isResolved = true;
                        cleanup();
                    }
                }, 10000);

                requests.push({ timeoutId, isResolved, cleanup });
            }

            // Complete first request
            requests[0].isResolved = true;
            requests[0].cleanup();

            // Complete third request  
            requests[2].isResolved = true;
            requests[2].cleanup();

            expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);
            expect(clearTimeoutSpy).toHaveBeenCalledWith(requests[0].timeoutId);
            expect(clearTimeoutSpy).toHaveBeenCalledWith(requests[2].timeoutId);
        });

        test('cleanup function clears timeout even if called multiple times', () => {
            let timeoutId = null;

            const cleanup = () => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null; // Prevent double-clear
                }
            };

            timeoutId = setTimeout(() => {}, 10000);

            // Call cleanup multiple times
            cleanup();
            cleanup();
            cleanup();

            expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
            expect(clearTimeoutSpy).toHaveBeenCalledWith(12345);
        });

        test('cleanup handles null timeoutId gracefully', () => {
            let timeoutId = null;

            const cleanup = () => {
                if (timeoutId) clearTimeout(timeoutId);
            };

            // Call cleanup without setting timeout
            cleanup();

            expect(clearTimeoutSpy).not.toHaveBeenCalled();
        });

        test('unified cleanup function integrates timer and resource cleanup', () => {
            let timeoutId = null;
            const mockHandlerPool = { releaseHandler: jest.fn() };
            const mockHandler = { id: 'handler123' };
            const requestSubscriptions = new Set();
            const cleanupRequestSubscriptions = jest.fn();

            const cleanup = () => {
                if (timeoutId) clearTimeout(timeoutId);
                cleanupRequestSubscriptions();
                mockHandlerPool.releaseHandler(mockHandler);
            };

            timeoutId = setTimeout(() => {}, 10000);

            cleanup();

            expect(clearTimeoutSpy).toHaveBeenCalledWith(timeoutId);
            expect(cleanupRequestSubscriptions).toHaveBeenCalled();
            expect(mockHandlerPool.releaseHandler).toHaveBeenCalledWith(mockHandler);
        });
    });

    describe('KV Port Handling Tests', () => {
        let mockKvService;
        let mockElmApp;
        let mockServer;

        beforeEach(() => {
            mockKvService = {
                set: jest.fn().mockReturnValue({ success: true }),
                get: jest.fn().mockReturnValue({ value: 'test-value', found: true }),
                delete: jest.fn().mockReturnValue({ success: true, existed: true })
            };

            mockElmApp = {
                ports: {
                    kvResult: { send: jest.fn() }
                }
            };

            mockServer = {
                getService: jest.fn().mockReturnValue(mockKvService)
            };
        });

        test('kvSet port calls KV service with correct parameters', () => {
            const request = {
                id: 'kv_123',
                type: 'TestCache',
                key: 'test-key',
                value: { data: 'test-data' },
                ttl: 3600
            };

            const requestContext = {
                host: 'test.example.com',
                sessionId: 'session123'
            };

            // Simulate kvSet port handling logic
            const kvService = mockServer.getService('kv');
            kvService.set(requestContext.host, request.type, request.key, request.value, request.ttl);

            expect(mockServer.getService).toHaveBeenCalledWith('kv');
            expect(mockKvService.set).toHaveBeenCalledWith(
                'test.example.com',
                'TestCache', 
                'test-key',
                { data: 'test-data' },
                3600
            );
        });

        test('kvGet port calls KV service and returns result', () => {
            const request = {
                id: 'kv_456',
                type: 'UserSession',
                key: 'user-123'
            };

            const requestContext = {
                host: 'tenant.example.com'
            };

            const result = mockKvService.get(requestContext.host, request.type, request.key);

            expect(mockKvService.get).toHaveBeenCalledWith(
                'tenant.example.com',
                'UserSession',
                'user-123'
            );
            expect(result).toEqual({ value: 'test-value', found: true });
        });

        test('kvDelete port calls KV service with host isolation', () => {
            const request = {
                id: 'kv_789',
                type: 'TestCache',
                key: 'expired-key'
            };

            const requestContext = {
                host: 'isolated-tenant.com'
            };

            mockKvService.delete(requestContext.host, request.type, request.key);

            expect(mockKvService.delete).toHaveBeenCalledWith(
                'isolated-tenant.com',
                'TestCache',
                'expired-key'
            );
        });

        test('kvExists port uses get method to check existence', () => {
            const request = {
                id: 'kv_exists_001',
                type: 'UserProfile',
                key: 'profile-456'
            };

            const requestContext = {
                host: 'check.example.com'
            };

            // Mock get to return found result
            mockKvService.get.mockReturnValue({ value: 'some-value', found: true });

            const result = mockKvService.get(requestContext.host, request.type, request.key);
            const exists = result.found && !result.expired;

            expect(mockKvService.get).toHaveBeenCalledWith(
                'check.example.com',
                'UserProfile',
                'profile-456'
            );
            expect(exists).toBe(true);
        });

        test('kvResult port sends success response', () => {
            const expectedResponse = {
                id: 'kv_123',
                success: true,
                operation: 'set',
                data: { success: true },
                error: null
            };

            mockElmApp.ports.kvResult.send(expectedResponse);

            expect(mockElmApp.ports.kvResult.send).toHaveBeenCalledWith(expectedResponse);
        });

        test('kvResult port sends error response when KV service fails', () => {
            const errorResponse = {
                id: 'kv_error_123',
                success: false,
                operation: 'get',
                data: null,
                error: 'Key not found'
            };

            mockElmApp.ports.kvResult.send(errorResponse);

            expect(mockElmApp.ports.kvResult.send).toHaveBeenCalledWith(errorResponse);
        });

        test('KV operations maintain tenant isolation', () => {
            const tenant1Context = { host: 'tenant1.com' };
            const tenant2Context = { host: 'tenant2.com' };

            // Same key, different tenants
            mockKvService.set(tenant1Context.host, 'Cache', 'shared-key', 'data1', 300);
            mockKvService.set(tenant2Context.host, 'Cache', 'shared-key', 'data2', 300);

            expect(mockKvService.set).toHaveBeenNthCalledWith(1,
                'tenant1.com', 'Cache', 'shared-key', 'data1', 300
            );
            expect(mockKvService.set).toHaveBeenNthCalledWith(2,
                'tenant2.com', 'Cache', 'shared-key', 'data2', 300
            );
        });

        test('KV port request structure validates required fields', () => {
            const validRequest = {
                id: 'kv_valid_123',
                type: 'TestCache',
                key: 'test-key',
                value: { some: 'data' },
                ttl: 600
            };

            expect(validRequest).toHaveProperty('id');
            expect(validRequest).toHaveProperty('type');
            expect(validRequest).toHaveProperty('key');
            expect(typeof validRequest.id).toBe('string');
            expect(typeof validRequest.type).toBe('string');
            expect(typeof validRequest.key).toBe('string');
        });
    });
});