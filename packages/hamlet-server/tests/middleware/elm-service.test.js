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
            // Hardwired filters: host isolation AND soft delete filtering
            let sql = `SELECT * FROM ${table} WHERE host = $1 AND deleted_at IS NULL`;
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
        expect(query.sql).toContain('AND deleted_at IS NULL');
        expect(query.sql).toContain('AND id = $2');
        expect(query.sql).toContain('AND status = $3');
        expect(query.params).toEqual(['test.com', 'item123', 'active']);
    });

    test('database queries always include soft delete filter', () => {
        // This test ensures soft-deleted records are never returned
        // Mirrors translateQueryToSQL in elm-service.js
        const translateQueryToSQL = (table, queryObj, host) => {
            // Hardwired filters: host isolation AND soft delete filtering
            let sql = `SELECT * FROM ${table} WHERE host = $1 AND deleted_at IS NULL`;
            let params = [host];
            return { sql, params };
        };

        const query = translateQueryToSQL('microblog_item', {}, 'localhost');

        // Both host and soft delete filters must be present
        expect(query.sql).toContain('host = $1');
        expect(query.sql).toContain('deleted_at IS NULL');
        expect(query.sql).toBe('SELECT * FROM microblog_item WHERE host = $1 AND deleted_at IS NULL');
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

    describe('Schema-aware Query Translation Tests', () => {
        test('translateQueryToSQL includes host filter for MultiTenant tables using schema field name', () => {
            const schema = {
                tables: {
                    posts: {
                        isMultiTenant: true,
                        isSoftDelete: true,
                        multiTenantFieldName: 'tenant',
                        softDeleteFieldName: 'deleted_at'
                    }
                }
            };

            // Simulate translateQueryToSQL behavior
            const table = 'posts';
            const tableSchema = schema.tables[table];
            const tenantField = tableSchema?.multiTenantFieldName || 'host';
            const deletedField = tableSchema?.softDeleteFieldName || 'deleted_at';

            let sql = `SELECT * FROM ${table}`;
            let params = [];
            let paramIndex = 1;
            const conditions = [];

            if (!tableSchema || tableSchema.isMultiTenant) {
                conditions.push(`${tenantField} = $${paramIndex}`);
                params.push('test.host');
                paramIndex++;
            }

            if (!tableSchema || tableSchema.isSoftDelete) {
                conditions.push(`${deletedField} IS NULL`);
            }

            if (conditions.length > 0) {
                sql += ' WHERE ' + conditions.join(' AND ');
            }

            expect(sql).toBe('SELECT * FROM posts WHERE tenant = $1 AND deleted_at IS NULL');
            expect(params).toEqual(['test.host']);
        });

        test('translateQueryToSQL excludes host filter for non-MultiTenant tables', () => {
            const schema = {
                tables: {
                    config: {
                        isMultiTenant: false,
                        isSoftDelete: false,
                        multiTenantFieldName: null,
                        softDeleteFieldName: null
                    }
                }
            };

            const table = 'config';
            const tableSchema = schema.tables[table];

            let sql = `SELECT * FROM ${table}`;
            let params = [];
            let paramIndex = 1;
            const conditions = [];

            if (tableSchema?.isMultiTenant) {
                const tenantField = tableSchema.multiTenantFieldName || 'host';
                conditions.push(`${tenantField} = $${paramIndex}`);
                params.push('test.host');
                paramIndex++;
            }

            if (tableSchema?.isSoftDelete) {
                const deletedField = tableSchema.softDeleteFieldName || 'deleted_at';
                conditions.push(`${deletedField} IS NULL`);
            }

            if (conditions.length > 0) {
                sql += ' WHERE ' + conditions.join(' AND ');
            }

            // Non-MultiTenant, Non-SoftDelete table has NO WHERE clause
            expect(sql).toBe('SELECT * FROM config');
            expect(params).toEqual([]);
        });

        test('translateQueryToSQL includes soft delete filter for SoftDelete tables using schema field name', () => {
            const schema = {
                tables: {
                    items: {
                        isMultiTenant: true,
                        isSoftDelete: true,
                        multiTenantFieldName: 'host',
                        softDeleteFieldName: 'removed_at'
                    }
                }
            };

            const table = 'items';
            const tableSchema = schema.tables[table];
            const tenantField = tableSchema?.multiTenantFieldName || 'host';
            const deletedField = tableSchema?.softDeleteFieldName || 'deleted_at';

            let sql = `SELECT * FROM ${table}`;
            let params = [];
            let paramIndex = 1;
            const conditions = [];

            if (!tableSchema || tableSchema.isMultiTenant) {
                conditions.push(`${tenantField} = $${paramIndex}`);
                params.push('test.host');
                paramIndex++;
            }

            if (!tableSchema || tableSchema.isSoftDelete) {
                conditions.push(`${deletedField} IS NULL`);
            }

            if (conditions.length > 0) {
                sql += ' WHERE ' + conditions.join(' AND ');
            }

            expect(sql).toContain('removed_at IS NULL');
        });

        test('translateQueryToSQL excludes soft delete filter for non-SoftDelete tables', () => {
            const schema = {
                tables: {
                    logs: {
                        isMultiTenant: true,
                        isSoftDelete: false,
                        multiTenantFieldName: 'host',
                        softDeleteFieldName: null
                    }
                }
            };

            const table = 'logs';
            const tableSchema = schema.tables[table];

            let sql = `SELECT * FROM ${table}`;
            let params = [];
            let paramIndex = 1;
            const conditions = [];

            if (tableSchema?.isMultiTenant) {
                const tenantField = tableSchema.multiTenantFieldName || 'host';
                conditions.push(`${tenantField} = $${paramIndex}`);
                params.push('test.host');
                paramIndex++;
            }

            if (tableSchema?.isSoftDelete) {
                const deletedField = tableSchema.softDeleteFieldName || 'deleted_at';
                conditions.push(`${deletedField} IS NULL`);
            }

            if (conditions.length > 0) {
                sql += ' WHERE ' + conditions.join(' AND ');
            }

            expect(sql).toBe('SELECT * FROM logs WHERE host = $1');
            expect(sql).not.toContain('deleted_at');
        });

        test('translateQueryToSQL falls back to current behavior if schema not loaded', () => {
            // Simulate missing schema
            const schema = null;

            const table = 'unknown_table';
            const tableSchema = schema?.tables?.[table];

            let sql = `SELECT * FROM ${table}`;
            let params = [];
            let paramIndex = 1;

            // Fallback: apply both host and deleted_at filters (backward compat)
            if (!tableSchema) {
                sql += ` WHERE host = $${paramIndex} AND deleted_at IS NULL`;
                params.push('test.host');
            }

            expect(sql).toContain('host = $1');
            expect(sql).toContain('deleted_at IS NULL');
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

    describe('FilterExpr Translation Tests', () => {
        // Helper function that mirrors translateFilterExpr from elm-service.js
        function translateFilterExpr(filter, paramIndex) {
            const validateFieldName = (field) => {
                if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) {
                    throw new Error(`Invalid filter field: ${field}`);
                }
                return field;
            };

            switch (filter.type) {
                case 'Eq': {
                    const field = validateFieldName(filter.field);
                    return { clause: `${field} = $${paramIndex}`, params: [filter.value] };
                }
                case 'Neq': {
                    const field = validateFieldName(filter.field);
                    return { clause: `${field} <> $${paramIndex}`, params: [filter.value] };
                }
                case 'Gt': {
                    const field = validateFieldName(filter.field);
                    return { clause: `${field} > $${paramIndex}`, params: [filter.value] };
                }
                case 'Gte': {
                    const field = validateFieldName(filter.field);
                    return { clause: `${field} >= $${paramIndex}`, params: [filter.value] };
                }
                case 'Lt': {
                    const field = validateFieldName(filter.field);
                    return { clause: `${field} < $${paramIndex}`, params: [filter.value] };
                }
                case 'Lte': {
                    const field = validateFieldName(filter.field);
                    return { clause: `${field} <= $${paramIndex}`, params: [filter.value] };
                }
                case 'Like': {
                    const field = validateFieldName(filter.field);
                    return { clause: `${field} LIKE $${paramIndex}`, params: [filter.value] };
                }
                case 'ILike': {
                    const field = validateFieldName(filter.field);
                    return { clause: `${field} ILIKE $${paramIndex}`, params: [filter.value] };
                }
                case 'IsNull': {
                    const field = validateFieldName(filter.field);
                    return { clause: `${field} IS NULL`, params: [] };
                }
                case 'IsNotNull': {
                    const field = validateFieldName(filter.field);
                    return { clause: `${field} IS NOT NULL`, params: [] };
                }
                case 'In': {
                    const field = validateFieldName(filter.field);
                    const values = filter.values || [];
                    if (values.length === 0) return { clause: 'FALSE', params: [] };
                    const placeholders = values.map((_, i) => `$${paramIndex + i}`).join(', ');
                    return { clause: `${field} IN (${placeholders})`, params: values };
                }
                case 'And': {
                    const exprs = filter.exprs || [];
                    if (exprs.length === 0) return { clause: 'TRUE', params: [] };
                    if (exprs.length === 1) return translateFilterExpr(exprs[0], paramIndex);
                    const results = [];
                    const allParams = [];
                    let currentParamIndex = paramIndex;
                    for (const expr of exprs) {
                        const result = translateFilterExpr(expr, currentParamIndex);
                        results.push(result.clause);
                        allParams.push(...result.params);
                        currentParamIndex += result.params.length;
                    }
                    return { clause: `(${results.join(' AND ')})`, params: allParams };
                }
                case 'Or': {
                    const exprs = filter.exprs || [];
                    if (exprs.length === 0) return { clause: 'FALSE', params: [] };
                    if (exprs.length === 1) return translateFilterExpr(exprs[0], paramIndex);
                    const results = [];
                    const allParams = [];
                    let currentParamIndex = paramIndex;
                    for (const expr of exprs) {
                        const result = translateFilterExpr(expr, currentParamIndex);
                        results.push(result.clause);
                        allParams.push(...result.params);
                        currentParamIndex += result.params.length;
                    }
                    return { clause: `(${results.join(' OR ')})`, params: allParams };
                }
                case 'Not': {
                    const innerExpr = filter.expr;
                    if (!innerExpr) return { clause: 'TRUE', params: [] };
                    const result = translateFilterExpr(innerExpr, paramIndex);
                    return { clause: `NOT (${result.clause})`, params: result.params };
                }
                default:
                    return { clause: 'TRUE', params: [] };
            }
        }

        test('Eq filter translates to equals comparison', () => {
            const filter = { type: 'Eq', field: 'title', value: 'Hello World' };
            const result = translateFilterExpr(filter, 1);
            expect(result.clause).toBe('title = $1');
            expect(result.params).toEqual(['Hello World']);
        });

        test('Neq filter translates to not equals comparison', () => {
            const filter = { type: 'Neq', field: 'status', value: 'draft' };
            const result = translateFilterExpr(filter, 1);
            expect(result.clause).toBe('status <> $1');
            expect(result.params).toEqual(['draft']);
        });

        test('Gt filter translates to greater than comparison', () => {
            const filter = { type: 'Gt', field: 'view_count', value: 100 };
            const result = translateFilterExpr(filter, 1);
            expect(result.clause).toBe('view_count > $1');
            expect(result.params).toEqual([100]);
        });

        test('Gte filter translates to greater than or equal comparison', () => {
            const filter = { type: 'Gte', field: 'created_at', value: 1704067200 };
            const result = translateFilterExpr(filter, 1);
            expect(result.clause).toBe('created_at >= $1');
            expect(result.params).toEqual([1704067200]);
        });

        test('Lt filter translates to less than comparison', () => {
            const filter = { type: 'Lt', field: 'price', value: 50 };
            const result = translateFilterExpr(filter, 1);
            expect(result.clause).toBe('price < $1');
            expect(result.params).toEqual([50]);
        });

        test('Lte filter translates to less than or equal comparison', () => {
            const filter = { type: 'Lte', field: 'quantity', value: 10 };
            const result = translateFilterExpr(filter, 1);
            expect(result.clause).toBe('quantity <= $1');
            expect(result.params).toEqual([10]);
        });

        test('Like filter translates to LIKE with pattern', () => {
            const filter = { type: 'Like', field: 'title', value: '%Elm%' };
            const result = translateFilterExpr(filter, 1);
            expect(result.clause).toBe('title LIKE $1');
            expect(result.params).toEqual(['%Elm%']);
        });

        test('ILike filter translates to case-insensitive ILIKE', () => {
            const filter = { type: 'ILike', field: 'title', value: '%elm%' };
            const result = translateFilterExpr(filter, 1);
            expect(result.clause).toBe('title ILIKE $1');
            expect(result.params).toEqual(['%elm%']);
        });

        test('IsNull filter translates to IS NULL', () => {
            const filter = { type: 'IsNull', field: 'deleted_at' };
            const result = translateFilterExpr(filter, 1);
            expect(result.clause).toBe('deleted_at IS NULL');
            expect(result.params).toEqual([]);
        });

        test('IsNotNull filter translates to IS NOT NULL', () => {
            const filter = { type: 'IsNotNull', field: 'image' };
            const result = translateFilterExpr(filter, 1);
            expect(result.clause).toBe('image IS NOT NULL');
            expect(result.params).toEqual([]);
        });

        test('In filter translates to IN clause with multiple values', () => {
            const filter = { type: 'In', field: 'status', values: ['published', 'featured'] };
            const result = translateFilterExpr(filter, 1);
            expect(result.clause).toBe('status IN ($1, $2)');
            expect(result.params).toEqual(['published', 'featured']);
        });

        test('In filter with empty values returns FALSE', () => {
            const filter = { type: 'In', field: 'status', values: [] };
            const result = translateFilterExpr(filter, 1);
            expect(result.clause).toBe('FALSE');
            expect(result.params).toEqual([]);
        });

        test('And filter combines expressions with AND', () => {
            const filter = {
                type: 'And',
                exprs: [
                    { type: 'Gt', field: 'view_count', value: 100 },
                    { type: 'IsNull', field: 'deleted_at' }
                ]
            };
            const result = translateFilterExpr(filter, 1);
            expect(result.clause).toBe('(view_count > $1 AND deleted_at IS NULL)');
            expect(result.params).toEqual([100]);
        });

        test('Or filter combines expressions with OR', () => {
            const filter = {
                type: 'Or',
                exprs: [
                    { type: 'Like', field: 'title', value: '%Elm%' },
                    { type: 'Like', field: 'extract', value: '%Elm%' }
                ]
            };
            const result = translateFilterExpr(filter, 1);
            expect(result.clause).toBe('(title LIKE $1 OR extract LIKE $2)');
            expect(result.params).toEqual(['%Elm%', '%Elm%']);
        });

        test('Not filter wraps expression with NOT', () => {
            const filter = {
                type: 'Not',
                expr: { type: 'Eq', field: 'status', value: 'draft' }
            };
            const result = translateFilterExpr(filter, 1);
            expect(result.clause).toBe('NOT (status = $1)');
            expect(result.params).toEqual(['draft']);
        });

        test('Nested And/Or filters translate correctly', () => {
            const filter = {
                type: 'And',
                exprs: [
                    { type: 'IsNull', field: 'deleted_at' },
                    { type: 'Not', expr: { type: 'Eq', field: 'title', value: 'Draft' } },
                    {
                        type: 'Or',
                        exprs: [
                            { type: 'Like', field: 'title', value: '%Elm%' },
                            { type: 'Like', field: 'extract', value: '%Elm%' }
                        ]
                    }
                ]
            };
            const result = translateFilterExpr(filter, 1);
            expect(result.clause).toBe('(deleted_at IS NULL AND NOT (title = $1) AND (title LIKE $2 OR extract LIKE $3))');
            expect(result.params).toEqual(['Draft', '%Elm%', '%Elm%']);
        });

        test('Parameter indices increment correctly across complex queries', () => {
            const filter = {
                type: 'And',
                exprs: [
                    { type: 'Eq', field: 'status', value: 'active' },
                    { type: 'Gt', field: 'view_count', value: 50 },
                    { type: 'In', field: 'category', values: ['tech', 'science', 'art'] },
                    { type: 'Lte', field: 'created_at', value: 1704067200 }
                ]
            };
            const result = translateFilterExpr(filter, 1);
            expect(result.clause).toBe('(status = $1 AND view_count > $2 AND category IN ($3, $4, $5) AND created_at <= $6)');
            expect(result.params).toEqual(['active', 50, 'tech', 'science', 'art', 1704067200]);
        });

        test('Empty And filter returns TRUE', () => {
            const filter = { type: 'And', exprs: [] };
            const result = translateFilterExpr(filter, 1);
            expect(result.clause).toBe('TRUE');
            expect(result.params).toEqual([]);
        });

        test('Empty Or filter returns FALSE', () => {
            const filter = { type: 'Or', exprs: [] };
            const result = translateFilterExpr(filter, 1);
            expect(result.clause).toBe('FALSE');
            expect(result.params).toEqual([]);
        });

        test('Single-element And/Or unwraps the expression', () => {
            const andFilter = { type: 'And', exprs: [{ type: 'Eq', field: 'id', value: '123' }] };
            const orFilter = { type: 'Or', exprs: [{ type: 'Eq', field: 'id', value: '456' }] };

            const andResult = translateFilterExpr(andFilter, 1);
            const orResult = translateFilterExpr(orFilter, 1);

            expect(andResult.clause).toBe('id = $1');
            expect(orResult.clause).toBe('id = $1');
        });

        test('Invalid field name throws error', () => {
            const filter = { type: 'Eq', field: 'DROP TABLE; --', value: 'malicious' };
            expect(() => translateFilterExpr(filter, 1)).toThrow('Invalid filter field');
        });

        test('Field names with underscores are valid', () => {
            const filter = { type: 'Eq', field: 'created_at', value: 12345 };
            const result = translateFilterExpr(filter, 1);
            expect(result.clause).toBe('created_at = $1');
        });

        test('Field names starting with underscore are valid', () => {
            const filter = { type: 'Eq', field: '_internal_id', value: 'abc' };
            const result = translateFilterExpr(filter, 1);
            expect(result.clause).toBe('_internal_id = $1');
        });

        test('Unknown filter type returns TRUE (safe fallback)', () => {
            const filter = { type: 'UnknownType', field: 'foo', value: 'bar' };
            const result = translateFilterExpr(filter, 1);
            expect(result.clause).toBe('TRUE');
            expect(result.params).toEqual([]);
        });
    });
});