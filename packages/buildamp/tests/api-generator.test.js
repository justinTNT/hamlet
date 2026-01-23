/**
 * API Generator Unit Tests
 * Tests for the API route and Elm client generation functions
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { _test } from '../lib/generators/api.js';

const {
    generateElmTypeDefinition,
    generateElmEncoder,
    generateElmHttpFunction,
    generateElmApiClient,
    generateRoute,
    generateValidationTagChecks,
    convertElmApiToGeneratorFormat
} = _test;

describe('API Generator - Elm Type Definitions', () => {
    test('generateElmTypeDefinition creates empty type', () => {
        const api = { struct_name: 'EmptyReq', fields: [] };
        const result = generateElmTypeDefinition(api);
        assert.strictEqual(result, 'type alias EmptyReq = {}');
    });

    test('generateElmTypeDefinition handles missing fields', () => {
        const api = { struct_name: 'NoFieldsReq' };
        const result = generateElmTypeDefinition(api);
        assert.strictEqual(result, 'type alias NoFieldsReq = {}');
    });

    test('generateElmTypeDefinition creates type with fields', () => {
        const api = {
            struct_name: 'GetFeedReq',
            fields: [
                { name: 'host', type: 'String', elmType: 'String' },
                { name: 'limit', type: 'Int', elmType: 'Int' },
                { name: 'offset', type: 'Maybe Int', elmType: 'Maybe Int' }
            ]
        };
        const result = generateElmTypeDefinition(api);

        assert.ok(result.includes('type alias GetFeedReq ='));
        assert.ok(result.includes('host : String'));
        assert.ok(result.includes('limit : Int'));
        assert.ok(result.includes('offset : Maybe Int'));
    });
});

describe('API Generator - Elm Encoders', () => {
    test('generateElmEncoder creates encoder for empty type', () => {
        const api = { struct_name: 'EmptyReq', fields: [] };
        const result = generateElmEncoder(api);

        assert.ok(result.includes('encodeEmptyReq : EmptyReq -> Json.Encode.Value'));
        assert.ok(result.includes('Json.Encode.object []'));
    });

    test('generateElmEncoder creates encoder with fields', () => {
        const api = {
            struct_name: 'SubmitItemReq',
            fields: [
                { name: 'title', type: 'String', elmType: 'String' },
                { name: 'count', type: 'Int', elmType: 'Int' },
                { name: 'active', type: 'Bool', elmType: 'Bool' }
            ]
        };
        const result = generateElmEncoder(api);

        assert.ok(result.includes('encodeSubmitItemReq : SubmitItemReq -> Json.Encode.Value'));
        assert.ok(result.includes('"title", Json.Encode.string'));
        assert.ok(result.includes('"count", Json.Encode.int'));
        assert.ok(result.includes('"active", Json.Encode.bool'));
    });

    test('generateElmEncoder handles float types', () => {
        const api = {
            struct_name: 'FloatReq',
            fields: [
                { name: 'price', type: 'Float', elmType: 'Float' },
                { name: 'rate', type: 'Float', elmType: 'Float' }
            ]
        };
        const result = generateElmEncoder(api);

        assert.ok(result.includes('Json.Encode.float'));
    });

    test('generateElmEncoder handles list types', () => {
        const api = {
            struct_name: 'ListReq',
            fields: [
                { name: 'tags', type: 'List String', elmType: 'List String' }
            ]
        };
        const result = generateElmEncoder(api);

        assert.ok(result.includes('Json.Encode.list Json.Encode.string'));
    });
});

describe('API Generator - Elm HTTP Functions', () => {
    test('generateElmHttpFunction creates HTTP function', () => {
        const api = {
            path: 'GetFeed',
            struct_name: 'GetFeedReq'
        };
        const result = generateElmHttpFunction(api);

        assert.ok(result.includes('getfeed :'));
        assert.ok(result.includes('GetFeedReq'));
        assert.ok(result.includes('Http.post'));
        assert.ok(result.includes('url = "/api/GetFeed"'));
        assert.ok(result.includes('encodeGetFeedReq'));
    });

    test('generateElmHttpFunction uses lowercase function name', () => {
        const api = {
            path: 'SubmitComment',
            struct_name: 'SubmitCommentReq'
        };
        const result = generateElmHttpFunction(api);

        assert.ok(result.includes('submitcomment :'));
    });
});

describe('API Generator - Elm API Client Module', () => {
    test('generateElmApiClient creates complete module', () => {
        const apis = [
            {
                path: 'GetFeed',
                struct_name: 'GetFeedReq',
                fields: [{ name: 'host', type: 'String', elmType: 'String' }]
            },
            {
                path: 'SubmitItem',
                struct_name: 'SubmitItemReq',
                fields: [{ name: 'title', type: 'String', elmType: 'String' }]
            }
        ];
        const result = generateElmApiClient(apis);

        // Module declaration
        assert.ok(result.includes('module BuildAmp.ApiClient exposing'));
        assert.ok(result.includes('getfeed, GetFeedReq, encodeGetFeedReq'));
        assert.ok(result.includes('submititem, SubmitItemReq, encodeSubmitItemReq'));

        // Imports
        assert.ok(result.includes('import Http'));
        assert.ok(result.includes('import Json.Decode'));
        assert.ok(result.includes('import Json.Encode'));

        // Type definitions
        assert.ok(result.includes('type alias GetFeedReq'));
        assert.ok(result.includes('type alias SubmitItemReq'));

        // Encoders
        assert.ok(result.includes('encodeGetFeedReq :'));
        assert.ok(result.includes('encodeSubmitItemReq :'));

        // HTTP functions
        assert.ok(result.includes('getfeed :'));
        assert.ok(result.includes('submititem :'));
    });

    test('generateElmApiClient includes cross-model imports', () => {
        const apis = [{ path: 'Test', struct_name: 'TestReq', fields: [] }];
        const dbReferences = new Set(['User', 'Post']);
        const result = generateElmApiClient(apis, dbReferences);

        assert.ok(result.includes('import BuildAmp.Db exposing (UserDb, PostDb)'));
    });

    test('generateElmApiClient has no cross-model imports when empty', () => {
        const apis = [{ path: 'Test', struct_name: 'TestReq', fields: [] }];
        const result = generateElmApiClient(apis, new Set());

        assert.ok(!result.includes('import BuildAmp.Db'));
    });
});

describe('API Generator - Express Routes', () => {
    test('generateRoute creates POST route', () => {
        const api = {
            name: 'GetFeed',
            path: 'GetFeed',
            filename: 'api/feed.elm',
            fields: []
        };
        const result = generateRoute(api);

        assert.ok(result.includes("server.app.post('/api/GetFeed'"));
        assert.ok(result.includes('async (req, res)'));
        assert.ok(result.includes("elmService.callHandler('GetFeed'"));
    });

    test('generateRoute includes validation for required fields', () => {
        const api = {
            name: 'SubmitItem',
            path: 'SubmitItem',
            filename: 'api/item.elm',
            fields: [
                { name: 'title', type: 'String', annotations: { required: true }, validationTags: {} },
                { name: 'content', type: 'String', annotations: {}, validationTags: {} }
            ]
        };
        const result = generateRoute(api);

        assert.ok(result.includes('title is required'));
        assert.ok(!result.includes('content is required'));
    });

    test('generateRoute includes host injection', () => {
        const api = {
            name: 'HostedReq',
            path: 'HostedReq',
            filename: 'api/hosted.elm',
            fields: [
                { name: 'host', type: 'String', annotations: { inject: 'host' }, validationTags: {} }
            ]
        };
        const result = generateRoute(api);

        assert.ok(result.includes('host: req.context.host'));
    });

    test('generateRoute includes error handling', () => {
        const api = {
            name: 'TestReq',
            path: 'TestReq',
            filename: 'api/test.elm',
            fields: []
        };
        const result = generateRoute(api);

        assert.ok(result.includes('try {'));
        assert.ok(result.includes('catch (error)'));
        assert.ok(result.includes('res.status(400)'));
    });
});

describe('API Generator - Validation Tags', () => {
    test('generateValidationTagChecks generates email validation', () => {
        const field = { name: 'email', validationTags: { validate: 'email' } };
        const checks = generateValidationTagChecks(field);

        assert.strictEqual(checks.length, 1);
        assert.ok(checks[0].includes('valid email'));
    });

    test('generateValidationTagChecks generates minLength validation', () => {
        const field = { name: 'password', validationTags: { minLength: 8 } };
        const checks = generateValidationTagChecks(field);

        assert.strictEqual(checks.length, 1);
        assert.ok(checks[0].includes('at least 8 characters'));
    });

    test('generateValidationTagChecks generates maxLength validation', () => {
        const field = { name: 'username', validationTags: { maxLength: 20 } };
        const checks = generateValidationTagChecks(field);

        assert.strictEqual(checks.length, 1);
        assert.ok(checks[0].includes('at most 20 characters'));
    });

    test('generateValidationTagChecks generates multiple validations', () => {
        const field = { name: 'text', validationTags: { minLength: 1, maxLength: 500 } };
        const checks = generateValidationTagChecks(field);

        assert.strictEqual(checks.length, 2);
    });

    test('generateValidationTagChecks returns empty for no tags', () => {
        const field = { name: 'plain', validationTags: {} };
        const checks = generateValidationTagChecks(field);

        assert.strictEqual(checks.length, 0);
    });
});

describe('API Generator - Elm API Conversion', () => {
    test('convertElmApiToGeneratorFormat converts basic API', () => {
        const elmApi = {
            name: 'GetFeed',
            filename: 'GetFeed.elm',
            serverContext: false,
            request: {
                name: 'GetFeedReq',
                fields: [
                    { name: 'host', elmType: 'String', annotations: {}, validationTags: {} },
                    { name: 'limit', elmType: 'Int', annotations: {}, validationTags: {} }
                ]
            }
        };
        const result = convertElmApiToGeneratorFormat(elmApi);

        assert.strictEqual(result.struct_name, 'GetFeedReq');
        assert.strictEqual(result.path, 'GetFeed');
        assert.strictEqual(result.filename, 'GetFeed.elm');
        assert.strictEqual(result.fields.length, 2);
        assert.strictEqual(result.fields[0].name, 'host');
        assert.strictEqual(result.fields[0].elmType, 'String');
        assert.strictEqual(result.fields[1].name, 'limit');
        assert.strictEqual(result.fields[1].elmType, 'Int');
    });

    test('convertElmApiToGeneratorFormat handles Maybe types', () => {
        const elmApi = {
            name: 'OptionalReq',
            filename: 'Optional.elm',
            request: {
                fields: [
                    { name: 'optional', elmType: 'Maybe String', annotations: {}, validationTags: {} }
                ]
            }
        };
        const result = convertElmApiToGeneratorFormat(elmApi);

        assert.strictEqual(result.fields[0].elmType, 'Maybe String');
    });

    test('convertElmApiToGeneratorFormat handles List types', () => {
        const elmApi = {
            name: 'ListReq',
            filename: 'List.elm',
            request: {
                fields: [
                    { name: 'items', elmType: 'List Int', annotations: {}, validationTags: {} }
                ]
            }
        };
        const result = convertElmApiToGeneratorFormat(elmApi);

        assert.strictEqual(result.fields[0].elmType, 'List Int');
    });

    test('convertElmApiToGeneratorFormat preserves server context', () => {
        const elmApi = {
            name: 'ContextReq',
            filename: 'Context.elm',
            serverContext: true,
            request: { fields: [] }
        };
        const result = convertElmApiToGeneratorFormat(elmApi);

        assert.strictEqual(result.serverContext, 'ServerContext');
    });

    test('convertElmApiToGeneratorFormat preserves original elm data', () => {
        const elmApi = {
            name: 'TestReq',
            filename: 'Test.elm',
            request: { fields: [] },
            customData: 'preserved'
        };
        const result = convertElmApiToGeneratorFormat(elmApi);

        assert.strictEqual(result._elm.customData, 'preserved');
    });

    test('convertElmApiToGeneratorFormat passes through validation tags', () => {
        const elmApi = {
            name: 'ValidatedReq',
            filename: 'Validated.elm',
            request: {
                fields: [
                    { name: 'email', elmType: 'String', annotations: {}, validationTags: { validate: 'email' } }
                ]
            }
        };
        const result = convertElmApiToGeneratorFormat(elmApi);

        assert.deepStrictEqual(result.fields[0].validationTags, { validate: 'email' });
    });
});
