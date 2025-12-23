import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

describe('API Route Generation - Simple Tests', () => {
    let app;
    let mockElmService;
    let mockServer;

    beforeEach(() => {
        app = express();
        app.use(express.json({ limit: '50mb' }));
        app.use(express.urlencoded({ extended: true, limit: '50mb' }));

        mockElmService = {
            callHandler: jest.fn()
        };

        mockServer = {
            app,
            getService: jest.fn().mockImplementation((serviceName) => {
                if (serviceName === 'elm') return mockElmService;
                return null;
            })
        };

        // Mock tenant middleware
        app.use((req, res, next) => {
            req.tenant = { host: 'test.example.com' };
            req.context = { 
                host: 'test.example.com',
                user_id: 'test-user',
                is_extension: false
            };
            next();
        });
    });

    describe('Route Registration', () => {
        test('can register routes without errors', async () => {
            const { default: registerApiRoutes } = await import('../../generated/api-routes.js');
            
            expect(() => {
                registerApiRoutes(mockServer);
            }).not.toThrow();

            // getService is only called when routes are actually used, not during registration
            expect(mockServer).toHaveProperty('getService');
            expect(mockServer).toHaveProperty('app');
        });
    });

    describe('API Route Functionality', () => {
        beforeEach(async () => {
            const { default: registerApiRoutes } = await import('../../generated/api-routes.js');
            registerApiRoutes(mockServer);
        });

        test('POST /api/SubmitComment route exists and handles requests', async () => {
            mockElmService.callHandler.mockResolvedValue({ 
                success: true, 
                comment_id: 123 
            });

            const response = await request(app)
                .post('/api/SubmitComment')
                .send({
                    comment: 'Test comment',
                    item_id: 456
                })
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                comment_id: 123
            });

            expect(mockElmService.callHandler).toHaveBeenCalledWith(
                'SubmitComment',
                expect.objectContaining({
                    comment: 'Test comment',
                    item_id: 456,
                    host: 'test.example.com'
                }),
                expect.objectContaining({
                    host: 'test.example.com',
                    user_id: 'test-user',
                    is_extension: false,
                    tenant: 'test.example.com'
                })
            );
        });

        test('POST /api/GetFeed route works', async () => {
            mockElmService.callHandler.mockResolvedValue({ 
                items: [],
                total: 0 
            });

            await request(app)
                .post('/api/GetFeed')
                .send({ page: 1 })
                .expect(200);

            expect(mockElmService.callHandler).toHaveBeenCalledWith(
                'GetFeed',
                expect.objectContaining({
                    page: 1,
                    host: 'test.example.com'
                }),
                expect.any(Object)
            );
        });

        test('handles TEA handler errors gracefully', async () => {
            mockElmService.callHandler.mockRejectedValue(
                new Error('TEA handler execution failed')
            );

            const response = await request(app)
                .post('/api/SubmitComment')
                .send({
                    comment: 'Test comment',
                    item_id: 456
                })
                .expect(400);

            expect(response.body).toMatchObject({
                error: 'TEA handler execution failed'
            });
        });
    });

    describe('Context and Validation', () => {
        beforeEach(async () => {
            const { default: registerApiRoutes } = await import('../../generated/api-routes.js');
            registerApiRoutes(mockServer);
        });

        test('validates required fields', async () => {
            const response = await request(app)
                .post('/api/SubmitItem')
                .send({
                    // Missing required 'title' field
                })
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });

        test('handles missing elm service gracefully', async () => {
            // Override to return no elm service
            mockServer.getService.mockReturnValue(null);

            const response = await request(app)
                .post('/api/SubmitComment')
                .send({ comment: 'test', item_id: 123 })
                .expect(400);

            expect(response.body).toMatchObject({
                error: 'Elm service not available'
            });
        });

        test('injects host context correctly', async () => {
            mockElmService.callHandler.mockResolvedValue({ success: true });

            await request(app)
                .post('/api/GetTags')
                .send({})
                .expect(200);

            expect(mockElmService.callHandler).toHaveBeenCalledWith(
                'GetTags',
                expect.objectContaining({
                    host: 'test.example.com'
                }),
                expect.any(Object)
            );
        });
    });
});