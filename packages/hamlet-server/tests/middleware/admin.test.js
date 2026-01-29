/**
 * Tests for Admin Middleware
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import createAdminApi from '../../middleware/admin-api.js';
import createAdminAuth from '../../middleware/admin-auth.js';
import express from 'express';

describe('Admin Middleware', () => {
    let app;
    let mockServer;
    let mockDb;

    beforeEach(() => {
        app = express();
        app.use(express.json());

        // Mock database service
        mockDb = {
            // Legacy method-based API (still used by some endpoints)
            getGuestsByHost: jest.fn().mockResolvedValue([
                { id: 1, name: 'Test Guest' }
            ]),
            getMicroblogItemsByHost: jest.fn().mockResolvedValue([
                { id: 1, title: 'Test Item' }
            ]),
            // Direct SQL query API (used by schema-aware list endpoint)
            query: jest.fn().mockImplementation((sql, params) => {
                // Return mock data based on SQL pattern
                if (sql.includes('SELECT COUNT')) {
                    return Promise.resolve({ rows: [{ total: 1 }] });
                }
                if (sql.includes('SELECT * FROM guest')) {
                    return Promise.resolve({ rows: [{ id: 1, name: 'Test Guest', host: params[0] }] });
                }
                if (sql.includes('SELECT * FROM microblog_item')) {
                    return Promise.resolve({ rows: [{ id: 1, title: 'Test Item', host: params[0] }] });
                }
                return Promise.resolve({ rows: [] });
            })
        };

        // Mock server with database service and project keys
        mockServer = {
            app,
            config: { projectKeys: { test: 'test-key' } },
            getService: jest.fn().mockReturnValue(mockDb)
        };

        // Clear environment
        delete process.env.HAMLET_PROJECT_KEY;
    });

    describe('Admin Authentication', () => {
        test('returns 503 when no project keys configured', () => {
            const authMiddleware = createAdminAuth({});

            const req = { authLevel: 'noAdmin' };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            authMiddleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(503);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Admin interface disabled - no project keys configured'
            });
            expect(next).not.toHaveBeenCalled();
        });

        test('allows access with projectAdmin authLevel', () => {
            const authMiddleware = createAdminAuth({ test: 'test-key' });

            const req = {
                authLevel: 'projectAdmin',
                tenant: { host: 'localhost' }
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            authMiddleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(req.isAdmin).toBe(true);
        });

        test('rejects noAdmin authLevel', () => {
            const authMiddleware = createAdminAuth({ test: 'secret123' });

            const req = { authLevel: 'noAdmin' };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            authMiddleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Admin access denied',
                hint: 'Provide project key via X-Hamlet-Project-Key header'
            });
            expect(next).not.toHaveBeenCalled();
        });

        test('rejects hostAdmin authLevel for admin routes', () => {
            const authMiddleware = createAdminAuth({ test: 'secret123' });

            const req = { authLevel: 'hostAdmin' };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            authMiddleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('Admin API', () => {
        beforeEach(() => {
            // Simulate auth-resolver setting authLevel on all requests
            app.use((req, res, next) => {
                const projectKeyHeader = req.get('X-Hamlet-Project-Key');
                if (projectKeyHeader === 'test-key') {
                    req.authLevel = 'projectAdmin';
                } else {
                    req.authLevel = 'noAdmin';
                }
                next();
            });
            createAdminApi(mockServer);
        });

        test('lists resources with valid authentication', async () => {
            const response = await request(app)
                .get('/admin/api/guest')
                .set('X-Hamlet-Project-Key', 'test-key')
                .set('Host', 'test.com');

            expect(response.status).toBe(200);
            // Response now includes pagination metadata
            expect(response.body.data).toEqual([
                { id: 1, name: 'Test Guest' }
            ]);
            expect(response.body.total).toBe(1);
            // Verify query was called with the tenant host
            expect(mockDb.query).toHaveBeenCalled();
        });

        test('rejects requests without authentication', async () => {
            const response = await request(app)
                .get('/admin/api/guest')
                .set('Host', 'test.com');

            expect(response.status).toBe(401);
            expect(response.body.error).toContain('Admin access denied');
        });

        test('handles unknown resources', async () => {
            // Make the mock throw an error for unknown tables to simulate SQL error
            mockDb.query = jest.fn().mockImplementation((sql) => {
                if (sql.includes('FROM UnknownResource') || sql.includes('FROM unknown_resource')) {
                    return Promise.reject(new Error('relation "unknown_resource" does not exist'));
                }
                return Promise.resolve({ rows: [], total: 0 });
            });

            const response = await request(app)
                .get('/admin/api/UnknownResource')
                .set('X-Hamlet-Project-Key', 'test-key')
                .set('Host', 'test.com');

            // With direct SQL queries, the response is now a 500 (SQL error on unknown table)
            expect(response.status).toBe(500);
        });

        test('uses tenant isolation', async () => {
            const response = await request(app)
                .get('/admin/api/guest')
                .set('X-Hamlet-Project-Key', 'test-key')
                .set('X-Forwarded-Host', 'tenant2.com');

            expect(response.status).toBe(200);
            // Verify query was called with tenant host in params
            expect(mockDb.query).toHaveBeenCalled();
            // Check that the query includes the tenant host
            const calls = mockDb.query.mock.calls;
            const queryWithHost = calls.find(call => call[1] && call[1].includes('tenant2.com'));
            expect(queryWithHost).toBeTruthy();
        });
    });
});
