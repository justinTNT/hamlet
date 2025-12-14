import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

describe('API Route Generation', () => {
    let app;
    let mockWasmService;
    let mockServer;

    beforeEach(() => {
        app = express();
        app.use(express.json());

        mockWasmService = {
            handle_submitcomment_req: jest.fn(),
            handle_getfeed_req: jest.fn(),
            handle_submititem_req: jest.fn(),
            handle_gettags_req: jest.fn()
        };

        mockServer = {
            app,
            getService: jest.fn().mockReturnValue(mockWasmService)
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

    describe('parseApiAnnotations', () => {
        test('extracts API path from buildamp_api annotation', async () => {
            const content = `
#[buildamp_api(path = "SubmitComment")]
pub struct SubmitCommentReq {
    pub comment: String,
    pub item_id: i32,
}`;

            const apiModule = await import('../../.buildamp/generation/api_routes.js');
            const { parseApiAnnotations } = apiModule;
            const annotations = parseApiAnnotations(content, 'comments.rs');
            
            expect(annotations).toHaveLength(1);
            expect(annotations[0]).toMatchObject({
                struct_name: 'SubmitCommentReq',
                path: 'SubmitComment',
                filename: 'comments'
            });
        });

        test('parses field validation annotations', () => {
            const content = `
#[buildamp_api(path = "SubmitItem")]
pub struct SubmitItemReq {
    #[required]
    pub title: String,
    
    #[optional]
    pub description: Option<String>,
    
    #[validate(min_length = 3)]
    pub category: String,
}`;

            const apiModule = await import('../../.buildamp/generation/api_routes.js');
            const { parseApiAnnotations } = apiModule;
            const annotations = parseApiAnnotations(content, 'items.rs');
            
            expect(annotations[0].fields).toHaveLength(3);
            expect(annotations[0].fields[0]).toMatchObject({
                name: 'title',
                required: true
            });
        });

        test('extracts context injection annotations', () => {
            const content = `
#[buildamp_api(path = "GetFeed", inject_context = ["host", "user_id"])]
pub struct GetFeedReq {
    pub page: i32,
}`;

            const apiModule = await import('../../.buildamp/generation/api_routes.js');
            const { parseApiAnnotations } = apiModule;
            const annotations = parseApiAnnotations(content, 'feed.rs');
            
            expect(annotations[0].inject_context).toContain('host');
            expect(annotations[0].inject_context).toContain('user_id');
        });
    });

    describe('route generation', () => {
        beforeEach(async () => {
            // Import and register the generated routes
            const { default: registerApiRoutes } = await import('../../packages/hamlet-server/generated/api-routes.js');
            registerApiRoutes(mockServer);
        });

        test('POST /api/SubmitComment route exists and handles requests', async () => {
            mockWasmService.handle_submitcomment_req.mockResolvedValue({ 
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

            expect(mockWasmService.handle_submitcomment_req).toHaveBeenCalledWith(
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

        test('field validation works for required fields', async () => {
            const response = await request(app)
                .post('/api/SubmitItem')
                .send({
                    // Missing required 'title' field
                    description: 'Test description'
                })
                .expect(400);

            expect(response.body).toMatchObject({
                error: 'title is required'
            });

            expect(mockWasmService.handle_submititem_req).not.toHaveBeenCalled();
        });

        test('context injection works correctly', async () => {
            mockWasmService.handle_getfeed_req.mockResolvedValue({ 
                items: [],
                total: 0
            });

            await request(app)
                .post('/api/GetFeed')
                .send({ page: 1 })
                .expect(200);

            expect(mockWasmService.handle_getfeed_req).toHaveBeenCalledWith(
                expect.objectContaining({
                    page: 1,
                    host: 'test.example.com' // Injected from context
                }),
                expect.any(Object)
            );
        });

        test('tenant isolation is enforced', async () => {
            mockWasmService.handle_gettags_req.mockResolvedValue({ tags: [] });

            // Override tenant for this test
            app.use((req, res, next) => {
                req.tenant = { host: 'different.example.com' };
                req.context.host = 'different.example.com';
                next();
            });

            await request(app)
                .post('/api/GetTags')
                .send({})
                .expect(200);

            expect(mockWasmService.handle_gettags_req).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    tenant: 'different.example.com'
                })
            );
        });
    });

    describe('error handling', () => {
        beforeEach(async () => {
            const { default: registerApiRoutes } = await import('../../packages/hamlet-server/generated/api-routes.js');
            registerApiRoutes(mockServer);
        });

        test('WASM service errors are handled gracefully', async () => {
            mockWasmService.handle_submitcomment_req.mockRejectedValue(
                new Error('WASM execution failed')
            );

            const response = await request(app)
                .post('/api/SubmitComment')
                .send({
                    comment: 'Test comment',
                    item_id: 456
                })
                .expect(400);

            expect(response.body).toMatchObject({
                error: 'WASM execution failed'
            });
        });

        test('malformed JSON requests are rejected', async () => {
            const response = await request(app)
                .post('/api/SubmitComment')
                .set('Content-Type', 'application/json')
                .send('invalid json')
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });

        test('missing tenant context is handled', async () => {
            // Override middleware to remove tenant
            app.use((req, res, next) => {
                req.tenant = null;
                req.context = null;
                next();
            });

            const response = await request(app)
                .post('/api/SubmitComment')
                .send({ comment: 'test', item_id: 123 })
                .expect(200); // Should default to 'localhost'

            expect(mockWasmService.handle_submitcomment_req).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    tenant: 'localhost'
                })
            );
        });
    });

    describe('WASM integration', () => {
        test('correct WASM function names are called', async () => {
            const { generateWasmFunctionName } = import('../../.buildamp/generation/api_routes.js');
            
            expect(generateWasmFunctionName('SubmitCommentReq')).toBe('handle_submitcomment_req');
            expect(generateWasmFunctionName('GetFeedReq')).toBe('handle_getfeed_req');
            expect(generateWasmFunctionName('UpdateUserProfileReq')).toBe('handle_updateuserprofile_req');
        });

        test('WASM context includes all required fields', async () => {
            const { generateWasmContext } = import('../../.buildamp/generation/api_routes.js');
            
            const context = generateWasmContext('test-host', {
                user_id: 'user123',
                is_extension: true
            });

            expect(context).toMatchObject({
                host: 'test-host',
                user_id: 'user123',
                is_extension: true,
                tenant: 'test-host'
            });
        });
    });

    describe('Elm client generation', () => {
        test('generates correct Elm type definitions', () => {
            const { generateElmTypeDefinition } = import('../../.buildamp/generation/api_routes.js');
            
            const api = {
                struct_name: 'TestReq',
                fields: [
                    { name: 'title', type: 'String' },
                    { name: 'count', type: 'i32' },
                    { name: 'active', type: 'bool' }
                ]
            };

            const elmType = generateElmTypeDefinition(api);
            
            expect(elmType).toContain('type alias TestReq =');
            expect(elmType).toContain('title : String');
            expect(elmType).toContain('count : Int');
            expect(elmType).toContain('active : Bool');
        });

        test('generates correct Elm encoders', () => {
            const { generateElmEncoder } = import('../../.buildamp/generation/api_routes.js');
            
            const api = {
                struct_name: 'TestReq',
                fields: [
                    { name: 'title', type: 'String' },
                    { name: 'count', type: 'i32' }
                ]
            };

            const encoder = generateElmEncoder(api);
            
            expect(encoder).toContain('encodeTestReq : TestReq -> Json.Encode.Value');
            expect(encoder).toContain('Json.Encode.string testreq.title');
            expect(encoder).toContain('Json.Encode.int testreq.count');
        });

        test('generates correct Elm HTTP functions', () => {
            const { generateElmHttpFunction } = import('../../.buildamp/generation/api_routes.js');
            
            const api = {
                struct_name: 'SubmitCommentReq',
                path: 'SubmitComment'
            };

            const httpFunc = generateElmHttpFunction(api);
            
            expect(httpFunc).toContain('submitcomment : SubmitCommentReq -> (Result Http.Error Json.Decode.Value -> msg) -> Cmd msg');
            expect(httpFunc).toContain('url = "/api/SubmitComment"');
            expect(httpFunc).toContain('encodeSubmitCommentReq');
        });

        test('handles Rust to Elm type conversion correctly', () => {
            const { rustTypeToElmType } = import('../../.buildamp/generation/api_routes.js');
            
            expect(rustTypeToElmType('String')).toBe('String');
            expect(rustTypeToElmType('i32')).toBe('Int');
            expect(rustTypeToElmType('bool')).toBe('Bool');
            expect(rustTypeToElmType('Option<String>')).toBe('Maybe String');
            expect(rustTypeToElmType('Vec<String>')).toBe('List String');
        });

        test('generates complete Elm module', () => {
            const { generateElmApiClient } = import('../../.buildamp/generation/api_routes.js');
            
            const apis = [
                {
                    struct_name: 'TestReq',
                    path: 'Test',
                    fields: [{ name: 'data', type: 'String' }]
                }
            ];

            const elmModule = generateElmApiClient(apis);
            
            expect(elmModule).toContain('module Generated.ApiClient exposing');
            expect(elmModule).toContain('test, TestReq, encodeTestReq');
            expect(elmModule).toContain('import Http');
            expect(elmModule).toContain('import Json.Encode');
            expect(elmModule).toContain('type alias TestReq =');
            expect(elmModule).toContain('test : TestReq -> (Result Http.Error Json.Decode.Value -> msg) -> Cmd msg');
        });
    });

    describe('performance', () => {
        test('routes are registered efficiently', () => {
            const routeCount = app._router.stack.length;
            expect(routeCount).toBeGreaterThan(0);
            expect(routeCount).toBeLessThan(20); // Should be reasonable number
        });

        test('route generation is deterministic', () => {
            // Multiple generations should produce identical routes
            const { generateApiRoute } = import('../../.buildamp/generation/api_routes.js');
            
            const annotation = {
                struct_name: 'TestReq',
                path: 'Test',
                fields: [{ name: 'data', required: true }]
            };

            const route1 = generateApiRoute(annotation);
            const route2 = generateApiRoute(annotation);
            
            expect(route1).toBe(route2);
        });
    });
});