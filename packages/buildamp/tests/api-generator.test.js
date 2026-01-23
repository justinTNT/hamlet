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
    convertElmApiToGeneratorFormat,
    // Backend API module generation
    generateElmBackend,
    generateBackendTypeAlias,
    generateBackendEncoder,
    generateBackendDecoder,
    collectBackendTypes,
    sortTypesByDependency,
    generateFieldEncoder,
    generateFieldDecoder,
    camelToSnake,
    lcFirst
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

// =============================================================================
// BACKEND API MODULE GENERATION TESTS
// =============================================================================

describe('Backend API - Helper Functions', () => {
    test('camelToSnake converts camelCase to snake_case', () => {
        assert.strictEqual(camelToSnake('itemId'), 'item_id');
        assert.strictEqual(camelToSnake('authorName'), 'author_name');
        assert.strictEqual(camelToSnake('freshGuestId'), 'fresh_guest_id');
        assert.strictEqual(camelToSnake('id'), 'id');
        assert.strictEqual(camelToSnake('host'), 'host');
    });

    test('lcFirst lowercases the first character', () => {
        assert.strictEqual(lcFirst('SubmitCommentReq'), 'submitCommentReq');
        assert.strictEqual(lcFirst('FeedItem'), 'feedItem');
        assert.strictEqual(lcFirst('A'), 'a');
    });
});

describe('Backend API - Type Alias Generation', () => {
    test('generateBackendTypeAlias creates empty type', () => {
        const result = generateBackendTypeAlias('EmptyReq', []);
        assert.strictEqual(result, 'type alias EmptyReq =\n    {}');
    });

    test('generateBackendTypeAlias creates single-field type', () => {
        const fields = [{ camelName: 'host', elmType: 'String' }];
        const result = generateBackendTypeAlias('GetFeedReq', fields);

        assert.ok(result.includes('type alias GetFeedReq ='));
        assert.ok(result.includes('{ host : String'));
        assert.ok(result.includes('}'));
    });

    test('generateBackendTypeAlias creates multi-field type', () => {
        const fields = [
            { camelName: 'id', elmType: 'String' },
            { camelName: 'itemId', elmType: 'String' },
            { camelName: 'parentId', elmType: 'Maybe String' },
            { camelName: 'timestamp', elmType: 'Int' }
        ];
        const result = generateBackendTypeAlias('CommentItem', fields);

        assert.ok(result.includes('type alias CommentItem ='));
        assert.ok(result.includes('{ id : String'));
        assert.ok(result.includes(', itemId : String'));
        assert.ok(result.includes(', parentId : Maybe String'));
        assert.ok(result.includes(', timestamp : Int'));
    });

    test('generateBackendTypeAlias uses camelName over name', () => {
        const fields = [
            { name: 'item_id', camelName: 'itemId', elmType: 'String' }
        ];
        const result = generateBackendTypeAlias('TestReq', fields);

        assert.ok(result.includes('itemId : String'));
        assert.ok(!result.includes('item_id'));
    });
});

describe('Backend API - Field Encoders', () => {
    test('generateFieldEncoder handles String type', () => {
        const result = generateFieldEncoder('String', 'struct.host');
        assert.ok(result.includes('Json.Encode.string'));
        assert.ok(result.includes('struct.host'));
    });

    test('generateFieldEncoder handles Int type', () => {
        const result = generateFieldEncoder('Int', 'struct.count');
        assert.ok(result.includes('Json.Encode.int'));
    });

    test('generateFieldEncoder handles Float type', () => {
        const result = generateFieldEncoder('Float', 'struct.price');
        assert.ok(result.includes('Json.Encode.float'));
    });

    test('generateFieldEncoder handles Bool type', () => {
        const result = generateFieldEncoder('Bool', 'struct.active');
        assert.ok(result.includes('Json.Encode.bool'));
    });

    test('generateFieldEncoder handles Maybe String type', () => {
        const result = generateFieldEncoder('Maybe String', 'struct.parentId');
        assert.ok(result.includes('Maybe.withDefault Json.Encode.null'));
        assert.ok(result.includes('Maybe.map'));
        assert.ok(result.includes('Json.Encode.string'));
    });

    test('generateFieldEncoder handles List String type', () => {
        const result = generateFieldEncoder('List String', 'struct.tags');
        assert.ok(result.includes('Json.Encode.list'));
        assert.ok(result.includes('Json.Encode.string'));
    });

    test('generateFieldEncoder handles List with custom type', () => {
        const result = generateFieldEncoder('List CommentItem', 'struct.comments');
        assert.ok(result.includes('Json.Encode.list'));
        assert.ok(result.includes('commentItemEncoder'));
    });

    test('generateFieldEncoder handles custom types', () => {
        const result = generateFieldEncoder('CommentItem', 'struct.comment');
        assert.ok(result.includes('commentItemEncoder'));
    });
});

describe('Backend API - Field Decoders', () => {
    test('generateFieldDecoder handles String type', () => {
        const result = generateFieldDecoder('String');
        assert.ok(result.includes('Json.Decode.string'));
    });

    test('generateFieldDecoder handles Int type', () => {
        const result = generateFieldDecoder('Int');
        assert.ok(result.includes('Json.Decode.int'));
    });

    test('generateFieldDecoder handles Bool type', () => {
        const result = generateFieldDecoder('Bool');
        assert.ok(result.includes('Json.Decode.bool'));
    });

    test('generateFieldDecoder handles Maybe String type', () => {
        const result = generateFieldDecoder('Maybe String');
        assert.ok(result.includes('Json.Decode.nullable'));
        assert.ok(result.includes('Json.Decode.string'));
    });

    test('generateFieldDecoder handles List String type', () => {
        const result = generateFieldDecoder('List String');
        assert.ok(result.includes('Json.Decode.list'));
        assert.ok(result.includes('Json.Decode.string'));
    });

    test('generateFieldDecoder handles custom types', () => {
        const result = generateFieldDecoder('MicroblogItem');
        assert.ok(result.includes('microblogItemDecoder'));
    });
});

describe('Backend API - Encoder Generation', () => {
    test('generateBackendEncoder creates encoder for empty type', () => {
        const result = generateBackendEncoder('EmptyReq', []);

        assert.ok(result.includes('emptyReqEncoder : EmptyReq -> Json.Encode.Value'));
        assert.ok(result.includes('Json.Encode.object []'));
    });

    test('generateBackendEncoder creates encoder with snake_case keys', () => {
        const fields = [
            { camelName: 'itemId', elmType: 'String' },
            { camelName: 'authorName', elmType: 'String' }
        ];
        const result = generateBackendEncoder('CommentItem', fields);

        assert.ok(result.includes('commentItemEncoder : CommentItem -> Json.Encode.Value'));
        assert.ok(result.includes('"item_id"'));
        assert.ok(result.includes('"author_name"'));
        assert.ok(result.includes('struct.itemId'));
        assert.ok(result.includes('struct.authorName'));
    });

    test('generateBackendEncoder handles Maybe fields', () => {
        const fields = [
            { camelName: 'parentId', elmType: 'Maybe String' }
        ];
        const result = generateBackendEncoder('TestReq', fields);

        assert.ok(result.includes('"parent_id"'));
        assert.ok(result.includes('Maybe.withDefault Json.Encode.null'));
    });

    test('generateBackendEncoder handles List fields with custom encoder', () => {
        const fields = [
            { camelName: 'comments', elmType: 'List CommentItem' }
        ];
        const result = generateBackendEncoder('TestRes', fields);

        assert.ok(result.includes('Json.Encode.list'));
        assert.ok(result.includes('commentItemEncoder'));
    });
});

describe('Backend API - Decoder Generation', () => {
    test('generateBackendDecoder creates decoder for empty type', () => {
        const result = generateBackendDecoder('EmptyReq', []);

        assert.ok(result.includes('emptyReqDecoder : Json.Decode.Decoder EmptyReq'));
        assert.ok(result.includes('Json.Decode.succeed EmptyReq'));
    });

    test('generateBackendDecoder uses andThen pattern', () => {
        const fields = [
            { camelName: 'host', elmType: 'String' },
            { camelName: 'id', elmType: 'String' }
        ];
        const result = generateBackendDecoder('GetItemReq', fields);

        assert.ok(result.includes('getItemReqDecoder : Json.Decode.Decoder GetItemReq'));
        assert.ok(result.includes('Json.Decode.succeed GetItemReq'));
        assert.ok(result.includes('|> Json.Decode.andThen'));
        assert.ok(result.includes('Json.Decode.field "host"'));
        assert.ok(result.includes('Json.Decode.field "id"'));
    });

    test('generateBackendDecoder uses snake_case field names', () => {
        const fields = [
            { camelName: 'itemId', elmType: 'String' },
            { camelName: 'authorName', elmType: 'String' }
        ];
        const result = generateBackendDecoder('CommentItem', fields);

        assert.ok(result.includes('"item_id"'));
        assert.ok(result.includes('"author_name"'));
    });

    test('generateBackendDecoder handles Maybe fields with nullable', () => {
        const fields = [
            { camelName: 'parentId', elmType: 'Maybe String' }
        ];
        const result = generateBackendDecoder('TestReq', fields);

        assert.ok(result.includes('Json.Decode.nullable'));
    });

    test('generateBackendDecoder handles List fields', () => {
        const fields = [
            { camelName: 'items', elmType: 'List FeedItem' }
        ];
        const result = generateBackendDecoder('GetFeedRes', fields);

        assert.ok(result.includes('Json.Decode.list'));
        assert.ok(result.includes('feedItemDecoder'));
    });
});

describe('Backend API - Type Collection', () => {
    test('collectBackendTypes renames Request to Req suffix', () => {
        const apis = [{
            name: 'GetFeed',
            request: { fields: [{ camelName: 'host', elmType: 'String' }] }
        }];
        const types = collectBackendTypes(apis);

        assert.ok(types.has('GetFeedReq'));
        assert.strictEqual(types.get('GetFeedReq').kind, 'request');
    });

    test('collectBackendTypes renames Response to Res suffix', () => {
        const apis = [{
            name: 'GetFeed',
            request: { fields: [] },
            response: { fields: [{ camelName: 'items', elmType: 'List FeedItem' }] }
        }];
        const types = collectBackendTypes(apis);

        assert.ok(types.has('GetFeedRes'));
        assert.strictEqual(types.get('GetFeedRes').kind, 'response');
    });

    test('collectBackendTypes renames ServerContext to Data suffix', () => {
        const apis = [{
            name: 'SubmitComment',
            request: { fields: [] },
            serverContext: { fields: [{ camelName: 'freshGuestId', elmType: 'String' }] }
        }];
        const types = collectBackendTypes(apis);

        assert.ok(types.has('SubmitCommentData'));
        assert.strictEqual(types.get('SubmitCommentData').kind, 'serverContext');
    });

    test('collectBackendTypes preserves helper type names', () => {
        const apis = [{
            name: 'GetFeed',
            request: { fields: [] },
            helperTypes: [{ name: 'FeedItem', fields: [{ camelName: 'id', elmType: 'String' }] }]
        }];
        const types = collectBackendTypes(apis);

        assert.ok(types.has('FeedItem'));
        assert.strictEqual(types.get('FeedItem').kind, 'helper');
    });

    test('collectBackendTypes deduplicates helper types', () => {
        const apis = [
            {
                name: 'GetFeed',
                request: { fields: [] },
                helperTypes: [{ name: 'FeedItem', fields: [{ camelName: 'id', elmType: 'String' }] }]
            },
            {
                name: 'GetItemsByTag',
                request: { fields: [] },
                helperTypes: [{ name: 'FeedItem', fields: [{ camelName: 'id', elmType: 'String' }] }]
            }
        ];
        const types = collectBackendTypes(apis);

        // FeedItem should only appear once
        const feedItemCount = Array.from(types.keys()).filter(k => k === 'FeedItem').length;
        assert.strictEqual(feedItemCount, 1);
    });
});

describe('Backend API - Dependency Sorting', () => {
    test('sortTypesByDependency puts dependencies first', () => {
        const types = new Map([
            ['GetFeedRes', { name: 'GetFeedRes', fields: [{ elmType: 'List FeedItem' }] }],
            ['FeedItem', { name: 'FeedItem', fields: [{ elmType: 'String' }] }]
        ]);
        const sorted = sortTypesByDependency(types);

        const feedItemIndex = sorted.findIndex(t => t.name === 'FeedItem');
        const getFeedResIndex = sorted.findIndex(t => t.name === 'GetFeedRes');

        assert.ok(feedItemIndex < getFeedResIndex, 'FeedItem should come before GetFeedRes');
    });

    test('sortTypesByDependency handles nested dependencies', () => {
        const types = new Map([
            ['GetItemRes', { name: 'GetItemRes', fields: [{ elmType: 'MicroblogItem' }] }],
            ['MicroblogItem', { name: 'MicroblogItem', fields: [{ elmType: 'List CommentItem' }] }],
            ['CommentItem', { name: 'CommentItem', fields: [{ elmType: 'String' }] }]
        ]);
        const sorted = sortTypesByDependency(types);

        const commentIndex = sorted.findIndex(t => t.name === 'CommentItem');
        const microblogIndex = sorted.findIndex(t => t.name === 'MicroblogItem');
        const getItemIndex = sorted.findIndex(t => t.name === 'GetItemRes');

        assert.ok(commentIndex < microblogIndex, 'CommentItem should come before MicroblogItem');
        assert.ok(microblogIndex < getItemIndex, 'MicroblogItem should come before GetItemRes');
    });

    test('sortTypesByDependency handles types with no dependencies', () => {
        const types = new Map([
            ['TypeA', { name: 'TypeA', fields: [{ elmType: 'String' }] }],
            ['TypeB', { name: 'TypeB', fields: [{ elmType: 'Int' }] }]
        ]);
        const sorted = sortTypesByDependency(types);

        assert.strictEqual(sorted.length, 2);
    });
});

describe('Backend API - Full Module Generation', () => {
    test('generateElmBackend creates complete module', () => {
        const apis = [{
            name: 'GetFeed',
            request: { fields: [{ camelName: 'host', elmType: 'String' }] },
            response: { fields: [{ camelName: 'items', elmType: 'List String' }] },
            helperTypes: []
        }];
        const result = generateElmBackend(apis);

        // Module declaration
        assert.ok(result.includes('module BuildAmp.Api exposing'));

        // Imports
        assert.ok(result.includes('import Json.Decode'));
        assert.ok(result.includes('import Json.Encode'));

        // Helper functions
        assert.ok(result.includes('resultEncoder'));
        assert.ok(result.includes('resultDecoder'));

        // Types
        assert.ok(result.includes('type alias GetFeedReq'));
        assert.ok(result.includes('type alias GetFeedRes'));

        // Encoders
        assert.ok(result.includes('getFeedReqEncoder'));
        assert.ok(result.includes('getFeedResEncoder'));

        // Decoders
        assert.ok(result.includes('getFeedReqDecoder'));
        assert.ok(result.includes('getFeedResDecoder'));
    });

    test('generateElmBackend includes all exported names', () => {
        const apis = [{
            name: 'SubmitComment',
            request: { fields: [] },
            response: { fields: [] },
            serverContext: { fields: [{ camelName: 'freshId', elmType: 'String' }] },
            helperTypes: []
        }];
        const result = generateElmBackend(apis);

        // Check exports
        assert.ok(result.includes('SubmitCommentReq'));
        assert.ok(result.includes('SubmitCommentRes'));
        assert.ok(result.includes('SubmitCommentData'));
        assert.ok(result.includes('submitCommentReqEncoder'));
        assert.ok(result.includes('submitCommentResEncoder'));
        assert.ok(result.includes('submitCommentDataEncoder'));
        assert.ok(result.includes('submitCommentReqDecoder'));
        assert.ok(result.includes('submitCommentResDecoder'));
        assert.ok(result.includes('submitCommentDataDecoder'));
    });

    test('generateElmBackend generates valid Elm syntax', () => {
        const apis = [{
            name: 'Test',
            request: {
                fields: [
                    { camelName: 'itemId', elmType: 'String' },
                    { camelName: 'parentId', elmType: 'Maybe String' }
                ]
            },
            response: { fields: [] },
            helperTypes: []
        }];
        const result = generateElmBackend(apis);

        // Check proper Elm list syntax (no leading commas)
        assert.ok(!result.includes('( ,'), 'Should not have leading commas in exposing');

        // Check proper record syntax
        assert.ok(result.includes('{ itemId : String'), 'Should have proper record field syntax');
        assert.ok(result.includes(', parentId : Maybe String'), 'Should have comma-prefixed additional fields');
    });
});

describe('Backend API - Wire Format Compatibility', () => {
    test('Maybe fields encode with Json.Encode.null for Nothing', () => {
        const fields = [
            { camelName: 'parentId', elmType: 'Maybe String' }
        ];
        const result = generateBackendEncoder('TestReq', fields);

        // Should use Maybe.withDefault Json.Encode.null pattern
        assert.ok(result.includes('Maybe.withDefault Json.Encode.null'),
            'Maybe fields should encode Nothing as null');
        assert.ok(result.includes('Maybe.map'),
            'Maybe fields should use Maybe.map for Just values');
    });

    test('List fields encode with Json.Encode.list', () => {
        const fields = [
            { camelName: 'tags', elmType: 'List String' },
            { camelName: 'items', elmType: 'List FeedItem' }
        ];
        const result = generateBackendEncoder('TestReq', fields);

        // Should use Json.Encode.list
        assert.ok(result.includes('Json.Encode.list'), 'Should use Json.Encode.list');
        // For List String, should use Json.Encode.string
        assert.ok(result.includes('Json.Encode.list (Json.Encode.string)'),
            'List String should encode with Json.Encode.string');
        // For List FeedItem, should use custom encoder
        assert.ok(result.includes('Json.Encode.list (feedItemEncoder)'),
            'List CustomType should use custom encoder');
    });

    test('Nested custom types reference correct encoder names', () => {
        const fields = [
            { camelName: 'item', elmType: 'MicroblogItem' },
            { camelName: 'comments', elmType: 'List CommentItem' }
        ];
        const result = generateBackendEncoder('GetItemRes', fields);

        // Custom types should use lowercase encoder names
        assert.ok(result.includes('microblogItemEncoder'), 'Should reference microblogItemEncoder');
        assert.ok(result.includes('commentItemEncoder'), 'Should reference commentItemEncoder');
    });

    test('Decoder field order matches type alias field order', () => {
        // This is important for the decoder to work correctly with the type constructor
        const fields = [
            { camelName: 'id', elmType: 'String' },
            { camelName: 'name', elmType: 'String' },
            { camelName: 'count', elmType: 'Int' }
        ];
        const result = generateBackendDecoder('TestItem', fields);

        // Fields should be decoded in order
        const idIndex = result.indexOf('"id"');
        const nameIndex = result.indexOf('"name"');
        const countIndex = result.indexOf('"count"');

        assert.ok(idIndex < nameIndex, 'id should be decoded before name');
        assert.ok(nameIndex < countIndex, 'name should be decoded before count');
    });

    test('Decoder uses nullable for Maybe types (not maybe helper)', () => {
        const fields = [
            { camelName: 'optionalField', elmType: 'Maybe String' }
        ];
        const result = generateBackendDecoder('TestReq', fields);

        // Should use Json.Decode.nullable, not a custom maybe decoder
        assert.ok(result.includes('Json.Decode.nullable'),
            'Maybe fields should use Json.Decode.nullable');
    });

    test('Encoder produces object with all fields (not conditional)', () => {
        const fields = [
            { camelName: 'required', elmType: 'String' },
            { camelName: 'optional', elmType: 'Maybe String' }
        ];
        const result = generateBackendEncoder('TestReq', fields);

        // Both fields should always be in the encoded object
        assert.ok(result.includes('"required"'), 'Required field should be in encoder');
        assert.ok(result.includes('"optional"'), 'Optional field should also be in encoder');

        // Should use Json.Encode.object with a list, not conditional encoding
        assert.ok(result.includes('Json.Encode.object'), 'Should use Json.Encode.object');
    });
});
