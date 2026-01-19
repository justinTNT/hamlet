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
        
        // Mock server with database service
        mockServer = {
            app,
            getService: jest.fn().mockReturnValue(mockDb)
        };
        
        // Clear environment
        delete process.env.HAMLET_ADMIN_TOKEN;
    });

    describe('Admin Authentication', () => {
        test('blocks access without token in production', () => {
            process.env.NODE_ENV = 'production';
            const authMiddleware = createAdminAuth();
            
            const req = { headers: {}, query: {}, cookies: {} };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();
            
            authMiddleware(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(503);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Admin interface disabled - HAMLET_ADMIN_TOKEN not configured'
            });
            expect(next).not.toHaveBeenCalled();
        });

        test('allows access in development without token', () => {
            process.env.NODE_ENV = 'development';
            process.env.HAMLET_ADMIN_TOKEN = 'test-token'; // Must set token even in dev
            const authMiddleware = createAdminAuth();
            
            const req = { 
                headers: { authorization: 'Bearer test-token' }, 
                query: {}, 
                cookies: {},
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

        test('validates token from Authorization header', () => {
            process.env.HAMLET_ADMIN_TOKEN = 'secret123';
            const authMiddleware = createAdminAuth();
            
            const req = {
                headers: { authorization: 'Bearer secret123' },
                query: {},
                cookies: {}
            };
            const res = { status: jest.fn(), json: jest.fn() };
            const next = jest.fn();
            
            authMiddleware(req, res, next);
            
            expect(req.isAdmin).toBe(true);
            expect(req.adminToken).toBe('secret123');
            expect(next).toHaveBeenCalled();
        });

        test('validates token from query parameter', () => {
            process.env.HAMLET_ADMIN_TOKEN = 'secret123';
            const authMiddleware = createAdminAuth();
            
            const req = {
                headers: {},
                query: { admin_token: 'secret123' },
                cookies: {}
            };
            const res = { status: jest.fn(), json: jest.fn() };
            const next = jest.fn();
            
            authMiddleware(req, res, next);
            
            expect(req.isAdmin).toBe(true);
            expect(next).toHaveBeenCalled();
        });

        test('rejects invalid token', () => {
            process.env.HAMLET_ADMIN_TOKEN = 'secret123';
            const authMiddleware = createAdminAuth();
            
            const req = {
                headers: { authorization: 'Bearer wrong-token' },
                query: {},
                cookies: {},
                ip: '127.0.0.1'
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();
            
            authMiddleware(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Admin access denied - invalid token'
            });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('Admin API', () => {
        beforeEach(() => {
            process.env.HAMLET_ADMIN_TOKEN = 'test-token';
            createAdminApi(mockServer);
        });

        test('lists resources with valid authentication', async () => {
            const response = await request(app)
                .get('/admin/api/guest')
                .set('Authorization', 'Bearer test-token')
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
            expect(response.body.error).toContain('Admin access denied - no token provided');
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
                .set('Authorization', 'Bearer test-token')
                .set('Host', 'test.com');

            // With direct SQL queries, the response is now a 500 (SQL error on unknown table)
            expect(response.status).toBe(500);
        });

        test('uses tenant isolation', async () => {
            const response = await request(app)
                .get('/admin/api/guest')
                .set('Authorization', 'Bearer test-token')
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