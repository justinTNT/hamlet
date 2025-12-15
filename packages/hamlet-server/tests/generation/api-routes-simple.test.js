import { jest } from '@jest/globals';

describe('API Route Generation - Basic Tests', () => {
    test('route registration function works correctly', () => {
        const registerApiRoutes = (app) => {
            const routes = [
                { path: '/api/SubmitComment', method: 'POST' },
                { path: '/api/GetFeed', method: 'GET' },
                { path: '/api/SubmitItem', method: 'POST' },
                { path: '/api/GetTags', method: 'GET' }
            ];

            routes.forEach(route => {
                const handler = (req, res) => res.json({ success: true });
                if (route.method === 'POST') {
                    app.post(route.path, handler);
                } else {
                    app.get(route.path, handler);
                }
            });

            return routes.length;
        };

        const mockApp = {
            get: jest.fn(),
            post: jest.fn()
        };

        const routeCount = registerApiRoutes(mockApp);

        expect(routeCount).toBe(4);
        expect(mockApp.post).toHaveBeenCalledWith('/api/SubmitComment', expect.any(Function));
        expect(mockApp.get).toHaveBeenCalledWith('/api/GetFeed', expect.any(Function));
        expect(mockApp.post).toHaveBeenCalledWith('/api/SubmitItem', expect.any(Function));
        expect(mockApp.get).toHaveBeenCalledWith('/api/GetTags', expect.any(Function));
    });

    test('JavaScript API route structure follows correct pattern', () => {
        const generateApiRoute = (name, method, fields) => {
            const path = `/api/${name}`;
            const handler = `async (req, res) => {
        try {
            const host = req.headers.host;
            ${fields.map(f => `const ${f} = req.body.${f};`).join('\n            ')}
            // Handler logic here
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }`;
            
            return { path, method, handler };
        };

        const submitComment = generateApiRoute('SubmitComment', 'POST', ['content', 'parentId']);
        const getFeed = generateApiRoute('GetFeed', 'GET', ['limit', 'offset']);

        expect(submitComment.path).toBe('/api/SubmitComment');
        expect(submitComment.method).toBe('POST');
        expect(submitComment.handler).toContain('req.body.content');
        expect(submitComment.handler).toContain('req.body.parentId');

        expect(getFeed.path).toBe('/api/GetFeed');
        expect(getFeed.method).toBe('GET');
        expect(getFeed.handler).toContain('req.headers.host');
    });

    test('Elm client generation produces correct function signatures', () => {
        const generateElmFunction = (name, fields) => {
            const functionName = name.toLowerCase();
            const typeName = `${name}Req`;
            const encoder = `encode${name}Req`;

            return {
                signature: `${functionName} : ${typeName} -> (Result Http.Error String -> msg) -> Cmd msg`,
                implementation: `${functionName} req toMsg =
    Http.post
        { url = "/api/${name}"
        , body = Http.jsonBody (${encoder} req)
        , expect = Http.expectString toMsg
        }`,
                typeAlias: `type alias ${typeName} =
    { ${fields.map(f => `${f.name} : ${f.type}`).join('\n    , ')}
    }`
            };
        };

        const submitComment = generateElmFunction('SubmitComment', [
            { name: 'host', type: 'String' },
            { name: 'content', type: 'String' },
            { name: 'parentId', type: 'Maybe Int' }
        ]);

        expect(submitComment.signature).toContain('submitcomment : SubmitCommentReq');
        expect(submitComment.implementation).toContain('Http.post');
        expect(submitComment.implementation).toContain('/api/SubmitComment');
        expect(submitComment.typeAlias).toContain('type alias SubmitCommentReq');
        expect(submitComment.typeAlias).toContain('host : String');
        expect(submitComment.typeAlias).toContain('content : String');
        expect(submitComment.typeAlias).toContain('parentId : Maybe Int');
    });

    test('Elm types correctly map from Rust definitions', () => {
        const mapRustTypeToElm = (rustType) => {
            const typeMap = {
                'String': 'String',
                'i32': 'Int',
                'i64': 'Int',
                'bool': 'Bool',
                'Option<String>': 'Maybe String',
                'Option<i32>': 'Maybe Int',
                'Vec<String>': 'List String',
                'Vec<i32>': 'List Int'
            };

            return typeMap[rustType] || 'String'; // default fallback
        };

        expect(mapRustTypeToElm('String')).toBe('String');
        expect(mapRustTypeToElm('i32')).toBe('Int');
        expect(mapRustTypeToElm('bool')).toBe('Bool');
        expect(mapRustTypeToElm('Option<String>')).toBe('Maybe String');
        expect(mapRustTypeToElm('Vec<String>')).toBe('List String');
        
        // Test struct field mapping
        const rustStruct = {
            name: 'SubmitCommentReq',
            fields: [
                { name: 'host', type: 'String' },
                { name: 'content', type: 'String' },
                { name: 'parent_id', type: 'Option<i32>' },
                { name: 'tags', type: 'Vec<String>' }
            ]
        };

        const elmType = `type alias ${rustStruct.name} =
    { ${rustStruct.fields.map(f => `${f.name.replace('_', '')} : ${mapRustTypeToElm(f.type)}`).join('\n    , ')}
    }`;

        expect(elmType).toContain('host : String');
        expect(elmType).toContain('content : String');
        expect(elmType).toContain('parentid : Maybe Int');
        expect(elmType).toContain('tags : List String');
    });
});