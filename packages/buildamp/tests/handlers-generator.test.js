/**
 * Elm Handlers Generator Unit Tests
 * Tests for TEA handler scaffolding generation
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { _test } from '../lib/generators/handlers.js';

const {
    generateHandlerContent,
    shouldRegenerateHandler,
    generatePlaceholderResponse,
    generateResponseEncoder
} = _test;

// Sample endpoint for testing
const sampleEndpoint = {
    name: 'GetFeed',
    requestType: 'GetFeedReq',
    responseType: 'GetFeedRes'
};

describe('Handlers Generator - Handler Content', () => {
    test('generateHandlerContent creates port module', () => {
        const result = generateHandlerContent(sampleEndpoint);

        assert.ok(result.includes('port module Api.Handlers.GetFeedHandlerTEA exposing (main)'));
    });

    test('generateHandlerContent includes module description', () => {
        const result = generateHandlerContent(sampleEndpoint);

        assert.ok(result.includes('{-| GetFeed Handler - TEA Architecture'));
        assert.ok(result.includes('Business Logic:'));
    });

    test('generateHandlerContent imports Api.Backend', () => {
        const result = generateHandlerContent(sampleEndpoint);

        assert.ok(result.includes('import Api.Backend exposing (GetFeedReq, GetFeedRes)'));
    });

    test('generateHandlerContent imports Generated.Database', () => {
        const result = generateHandlerContent(sampleEndpoint);

        assert.ok(result.includes('import Generated.Database as DB'));
    });

    test('generateHandlerContent imports Generated.Events', () => {
        const result = generateHandlerContent(sampleEndpoint);

        assert.ok(result.includes('import Generated.Events as Events'));
    });

    test('generateHandlerContent imports Generated.Services', () => {
        const result = generateHandlerContent(sampleEndpoint);

        assert.ok(result.includes('import Generated.Services as Services'));
    });

    test('generateHandlerContent includes Model type', () => {
        const result = generateHandlerContent(sampleEndpoint);

        assert.ok(result.includes('type alias Model ='));
        assert.ok(result.includes('stage : Stage'));
        assert.ok(result.includes('request : Maybe GetFeedReq'));
        assert.ok(result.includes('context : Maybe Context'));
        assert.ok(result.includes('globalConfig : GlobalConfig'));
        assert.ok(result.includes('globalState : GlobalState'));
    });

    test('generateHandlerContent includes Stage type', () => {
        const result = generateHandlerContent(sampleEndpoint);

        assert.ok(result.includes('type Stage'));
        assert.ok(result.includes('= Idle'));
        assert.ok(result.includes('| Processing'));
        assert.ok(result.includes('| Complete GetFeedRes'));
        assert.ok(result.includes('| Failed String'));
    });

    test('generateHandlerContent includes Context type', () => {
        const result = generateHandlerContent(sampleEndpoint);

        assert.ok(result.includes('type alias Context ='));
        assert.ok(result.includes('host : String'));
        assert.ok(result.includes('userId : Maybe String'));
        assert.ok(result.includes('sessionId : Maybe String'));
    });

    test('generateHandlerContent includes Msg type', () => {
        const result = generateHandlerContent(sampleEndpoint);

        assert.ok(result.includes('type Msg'));
        assert.ok(result.includes('= HandleRequest RequestBundle'));
        assert.ok(result.includes('| ProcessingComplete GetFeedRes'));
    });

    test('generateHandlerContent includes RequestBundle type', () => {
        const result = generateHandlerContent(sampleEndpoint);

        assert.ok(result.includes('type alias RequestBundle ='));
        assert.ok(result.includes('request : Encode.Value'));
        assert.ok(result.includes('context : Encode.Value'));
        assert.ok(result.includes('globalConfig : Encode.Value'));
        assert.ok(result.includes('globalState : Encode.Value'));
    });

    test('generateHandlerContent includes init function', () => {
        const result = generateHandlerContent(sampleEndpoint);

        assert.ok(result.includes('init : Flags -> ( Model, Cmd Msg )'));
        assert.ok(result.includes('stage = Idle'));
    });

    test('generateHandlerContent includes update function', () => {
        const result = generateHandlerContent(sampleEndpoint);

        assert.ok(result.includes('update : Msg -> Model -> ( Model, Cmd Msg )'));
        assert.ok(result.includes('case msg of'));
        assert.ok(result.includes('HandleRequest bundle ->'));
        assert.ok(result.includes('ProcessingComplete result ->'));
    });

    test('generateHandlerContent includes processRequest function', () => {
        const result = generateHandlerContent(sampleEndpoint);

        assert.ok(result.includes('processRequest : GetFeedReq -> Cmd Msg'));
    });

    test('generateHandlerContent includes decodeRequest function', () => {
        const result = generateHandlerContent(sampleEndpoint);

        assert.ok(result.includes('decodeRequest : RequestBundle -> Result String ( GetFeedReq, Context )'));
    });

    test('generateHandlerContent includes contextDecoder', () => {
        const result = generateHandlerContent(sampleEndpoint);

        assert.ok(result.includes('contextDecoder : Decode.Decoder Context'));
    });

    test('generateHandlerContent includes response encoder', () => {
        const result = generateHandlerContent(sampleEndpoint);

        assert.ok(result.includes('encodeGetFeedRes : GetFeedRes -> Encode.Value'));
    });

    test('generateHandlerContent includes error encoder', () => {
        const result = generateHandlerContent(sampleEndpoint);

        assert.ok(result.includes('encodeError : String -> Encode.Value'));
    });

    test('generateHandlerContent includes ports', () => {
        const result = generateHandlerContent(sampleEndpoint);

        assert.ok(result.includes('port handleRequest : (RequestBundle -> msg) -> Sub msg'));
        assert.ok(result.includes('port complete : Encode.Value -> Cmd msg'));
    });

    test('generateHandlerContent includes main function', () => {
        const result = generateHandlerContent(sampleEndpoint);

        assert.ok(result.includes('main : Program Flags Model Msg'));
        assert.ok(result.includes('Platform.worker'));
    });

    test('generateHandlerContent includes updateWithResponse', () => {
        const result = generateHandlerContent(sampleEndpoint);

        assert.ok(result.includes('updateWithResponse : Msg -> Model -> ( Model, Cmd Msg )'));
    });

    test('generateHandlerContent includes subscriptions', () => {
        const result = generateHandlerContent(sampleEndpoint);

        assert.ok(result.includes('subscriptions : Model -> Sub Msg'));
        assert.ok(result.includes('handleRequest HandleRequest'));
    });

    test('generateHandlerContent includes server timestamp helper', () => {
        const result = generateHandlerContent(sampleEndpoint);

        assert.ok(result.includes('getServerTimestamp : GlobalConfig -> Int'));
        assert.ok(result.includes('config.serverNow'));
    });
});

describe('Handlers Generator - Placeholder Response', () => {
    test('generatePlaceholderResponse creates Debug.todo', () => {
        const result = generatePlaceholderResponse(sampleEndpoint);

        assert.ok(result.includes('Debug.todo'));
        assert.ok(result.includes('Implement GetFeed handler'));
    });

    test('generatePlaceholderResponse uses endpoint name', () => {
        const endpoint = { name: 'SubmitItem', responseType: 'SubmitItemRes' };
        const result = generatePlaceholderResponse(endpoint);

        assert.ok(result.includes('Implement SubmitItem handler'));
    });
});

describe('Handlers Generator - Response Encoder', () => {
    test('generateResponseEncoder uses Backend encoder', () => {
        const result = generateResponseEncoder(sampleEndpoint);

        assert.ok(result.includes('Api.Backend.getFeedResEncoder response'));
    });

    test('generateResponseEncoder uses correct encoder name case', () => {
        const endpoint = { responseType: 'SubmitCommentRes' };
        const result = generateResponseEncoder(endpoint);

        // First letter lowercase + 'Encoder'
        assert.ok(result.includes('submitCommentResEncoder'));
    });
});

describe('Handlers Generator - Regeneration Logic', () => {
    const testDir = path.join(process.cwd(), 'tmp-test-handlers');
    const mockPaths = {
        serverElmDir: testDir
    };

    test.beforeEach(() => {
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
    });

    test.afterEach(() => {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    test('shouldRegenerateHandler returns true for old empty GlobalConfig', () => {
        const handlerPath = path.join(testDir, 'TestHandler.elm');
        fs.writeFileSync(handlerPath, `
            type alias GlobalConfig = {}
            type alias GlobalState = { foo : String }
        `);

        const result = shouldRegenerateHandler(handlerPath, mockPaths);

        assert.strictEqual(result, true);
    });

    test('shouldRegenerateHandler returns true for old empty GlobalState', () => {
        const handlerPath = path.join(testDir, 'TestHandler.elm');
        fs.writeFileSync(handlerPath, `
            type alias GlobalConfig = { foo : String }
            type alias GlobalState = {}
        `);

        const result = shouldRegenerateHandler(handlerPath, mockPaths);

        assert.strictEqual(result, true);
    });

    test('shouldRegenerateHandler returns true for legacy pattern', () => {
        const handlerPath = path.join(testDir, 'TestHandler.elm');
        fs.writeFileSync(handlerPath, `
            handleGetFeed : GetFeedReq -> GetFeedRes
            handleGetFeed req = Debug.todo ""
        `);

        const result = shouldRegenerateHandler(handlerPath, mockPaths);

        assert.strictEqual(result, true);
    });

    test('shouldRegenerateHandler returns true for old TEA pattern', () => {
        const handlerPath = path.join(testDir, 'TestHandler.elm');
        fs.writeFileSync(handlerPath, `
            type alias GetFeedReqBundle = {}
            import DatabaseService
        `);

        const result = shouldRegenerateHandler(handlerPath, mockPaths);

        assert.strictEqual(result, true);
    });

    test('shouldRegenerateHandler returns true for missing DB import', () => {
        const handlerPath = path.join(testDir, 'TestHandler.elm');
        fs.writeFileSync(handlerPath, `
            -- Uses DB but doesn't import it correctly
            DB.findItems query
            import Generated.Database
        `);

        const result = shouldRegenerateHandler(handlerPath, mockPaths);

        assert.strictEqual(result, true);
    });

    test('shouldRegenerateHandler returns true for non-existent file', () => {
        const handlerPath = path.join(testDir, 'NonExistent.elm');

        const result = shouldRegenerateHandler(handlerPath, mockPaths);

        // Should return true on error
        assert.strictEqual(result, true);
    });
});

describe('Handlers Generator - Different Endpoints', () => {
    test('handles SubmitItem endpoint', () => {
        const endpoint = {
            name: 'SubmitItem',
            requestType: 'SubmitItemReq',
            responseType: 'SubmitItemRes'
        };
        const result = generateHandlerContent(endpoint);

        assert.ok(result.includes('port module Api.Handlers.SubmitItemHandlerTEA'));
        assert.ok(result.includes('import Api.Backend exposing (SubmitItemReq, SubmitItemRes)'));
        assert.ok(result.includes('request : Maybe SubmitItemReq'));
        assert.ok(result.includes('| Complete SubmitItemRes'));
    });

    test('handles GetTags endpoint', () => {
        const endpoint = {
            name: 'GetTags',
            requestType: 'GetTagsReq',
            responseType: 'GetTagsRes'
        };
        const result = generateHandlerContent(endpoint);

        assert.ok(result.includes('port module Api.Handlers.GetTagsHandlerTEA'));
        assert.ok(result.includes('processRequest : GetTagsReq -> Cmd Msg'));
    });

    test('handles SubmitComment endpoint', () => {
        const endpoint = {
            name: 'SubmitComment',
            requestType: 'SubmitCommentReq',
            responseType: 'SubmitCommentRes'
        };
        const result = generateHandlerContent(endpoint);

        assert.ok(result.includes('port module Api.Handlers.SubmitCommentHandlerTEA'));
        assert.ok(result.includes('encodeSubmitCommentRes'));
    });
});

describe('Handlers Generator - Code Quality', () => {
    test('handler includes TODO comments for customization', () => {
        const result = generateHandlerContent(sampleEndpoint);

        assert.ok(result.includes('TODO:'));
        assert.ok(result.includes('TODO: Customize the stages'));
        assert.ok(result.includes('TODO: Add database queries'));
        assert.ok(result.includes('TODO: Implement your business logic'));
    });

    test('handler includes example patterns', () => {
        const result = generateHandlerContent(sampleEndpoint);

        assert.ok(result.includes('DB.findItems'));
        assert.ok(result.includes('Services.get'));
        assert.ok(result.includes('Events.pushEvent'));
    });

    test('handler uses proper Elm formatting', () => {
        const result = generateHandlerContent(sampleEndpoint);

        // Check for proper indentation
        assert.ok(result.includes('    { stage'));
        assert.ok(result.includes('    , request'));

        // Check for proper type signatures
        assert.ok(result.includes(' : '));
        assert.ok(result.includes(' -> '));
    });
});
