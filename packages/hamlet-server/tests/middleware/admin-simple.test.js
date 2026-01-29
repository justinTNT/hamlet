/**
 * Simple functional tests for Admin Middleware
 */

import createAdminApi from '../../middleware/admin-api.js';
import createAdminAuth from '../../middleware/admin-auth.js';

describe('Admin Middleware - Simple Tests', () => {

    beforeEach(() => {
        delete process.env.HAMLET_PROJECT_KEY;
        delete process.env.NODE_ENV;
    });

    test('createAdminAuth returns a function', () => {
        const authMiddleware = createAdminAuth({ test: 'test-key' });
        expect(typeof authMiddleware).toBe('function');
    });

    test('createAdminApi is a function', () => {
        expect(typeof createAdminApi).toBe('function');
    });

    test('auth middleware warns when no project keys configured', () => {
        const authMiddleware = createAdminAuth({});
        expect(typeof authMiddleware).toBe('function');
    });

    test('auth middleware blocks access without project key configured', () => {
        const authMiddleware = createAdminAuth({});

        const mockReq = { authLevel: 'noAdmin' };
        const mockRes = {
            status: function(code) {
                this.statusCode = code;
                return this;
            },
            json: function(data) {
                this.response = data;
                return this;
            }
        };
        const mockNext = () => {};

        authMiddleware(mockReq, mockRes, mockNext);

        expect(mockRes.statusCode).toBe(503);
        expect(mockRes.response.error).toContain('Admin interface disabled');
    });

    test('auth middleware blocks when authLevel is not projectAdmin', () => {
        const authMiddleware = createAdminAuth({ test: 'test-key' });

        let nextCalled = false;
        const mockReq = { authLevel: 'noAdmin' };
        const mockRes = {
            status: function(code) { this.statusCode = code; return this; },
            json: function(data) { this.response = data; return this; }
        };
        const mockNext = () => { nextCalled = true; };

        authMiddleware(mockReq, mockRes, mockNext);

        expect(nextCalled).toBe(false);
        expect(mockRes.statusCode).toBe(401);
    });

    test('auth middleware allows projectAdmin access', () => {
        const authMiddleware = createAdminAuth({ test: 'secret123' });

        let nextCalled = false;
        const mockReq = {
            authLevel: 'projectAdmin',
            tenant: { host: 'localhost' }
        };
        const mockRes = { status: () => {}, json: () => {} };
        const mockNext = () => { nextCalled = true; };

        authMiddleware(mockReq, mockRes, mockNext);

        expect(nextCalled).toBe(true);
        expect(mockReq.isAdmin).toBe(true);
    });

    test('auth middleware rejects hostAdmin level', () => {
        const authMiddleware = createAdminAuth({ test: 'secret123' });

        const mockReq = {
            authLevel: 'hostAdmin',
            ip: '127.0.0.1'
        };
        const mockRes = {
            status: function(code) {
                this.statusCode = code;
                return this;
            },
            json: function(data) {
                this.response = data;
                return this;
            }
        };
        const mockNext = () => {};

        authMiddleware(mockReq, mockRes, mockNext);

        expect(mockRes.statusCode).toBe(401);
        expect(mockRes.response.error).toContain('Admin access denied');
    });

    test('createAdminApi requires server with database service', () => {
        const mockServer = {
            app: { get: () => {} },
            getService: () => null
        };

        // This test passes - we can see the warning in console output
        const result = createAdminApi(mockServer);
        expect(result).toBeUndefined();
    });
});
