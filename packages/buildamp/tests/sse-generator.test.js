/**
 * SSE Generator Unit Tests
 * Tests for Server-Sent Events Elm and JavaScript generation
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { _test } from '../lib/generators/sse.js';

const {
    generateElmType,
    generateElmDecoder,
    generateSSEHelpers,
    generateSSEModule,
    generateSSEJavaScript
} = _test;

// Sample SSE model for testing
const sampleModel = {
    name: 'NewItemEvent',
    eventName: 'new_item',
    fields: [
        { name: 'itemId', type: 'String', isOptional: false },
        { name: 'title', type: 'String', isOptional: false },
        { name: 'timestamp', type: 'i64', isOptional: false }
    ]
};

describe('SSE Generator - Elm Type Generation', () => {
    test('generateElmType creates type alias', () => {
        const result = generateElmType(sampleModel);

        assert.ok(result.includes('type alias NewItemEvent ='));
    });

    test('generateElmType includes String fields', () => {
        const result = generateElmType(sampleModel);

        assert.ok(result.includes('itemId : String'));
        assert.ok(result.includes('title : String'));
    });

    test('generateElmType converts i64 to Int', () => {
        const result = generateElmType(sampleModel);

        assert.ok(result.includes('timestamp : Int'));
    });

    test('generateElmType handles float types', () => {
        const model = {
            name: 'FloatEvent',
            fields: [
                { name: 'price', type: 'f64', isOptional: false },
                { name: 'rate', type: 'f32', isOptional: false }
            ]
        };
        const result = generateElmType(model);

        assert.ok(result.includes('price : Float'));
        assert.ok(result.includes('rate : Float'));
    });

    test('generateElmType handles bool type', () => {
        const model = {
            name: 'BoolEvent',
            fields: [{ name: 'active', type: 'bool', isOptional: false }]
        };
        const result = generateElmType(model);

        assert.ok(result.includes('active : Bool'));
    });

    test('generateElmType handles Vec<String> type', () => {
        const model = {
            name: 'ListEvent',
            fields: [{ name: 'tags', type: 'Vec<String>', isOptional: false }]
        };
        const result = generateElmType(model);

        assert.ok(result.includes('tags : List String'));
    });

    test('generateElmType handles optional fields', () => {
        const model = {
            name: 'OptionalEvent',
            fields: [
                { name: 'name', type: 'String', isOptional: true },
                { name: 'count', type: 'i64', isOptional: true }
            ]
        };
        const result = generateElmType(model);

        assert.ok(result.includes('name : Maybe String'));
        assert.ok(result.includes('count : Maybe Int'));
    });
});

describe('SSE Generator - Elm Decoder Generation', () => {
    test('generateElmDecoder creates decoder function', () => {
        const result = generateElmDecoder(sampleModel);

        assert.ok(result.includes('decodeNewItemEvent : Decode.Decoder NewItemEvent'));
    });

    test('generateElmDecoder uses Decode.succeed', () => {
        const result = generateElmDecoder(sampleModel);

        assert.ok(result.includes('Decode.succeed NewItemEvent'));
    });

    test('generateElmDecoder uses andMap for fields', () => {
        const result = generateElmDecoder(sampleModel);

        assert.ok(result.includes('|> andMap (Decode.field "itemId" Decode.string)'));
        assert.ok(result.includes('|> andMap (Decode.field "title" Decode.string)'));
        assert.ok(result.includes('|> andMap (Decode.field "timestamp" Decode.int)'));
    });

    test('generateElmDecoder handles float decoders', () => {
        const model = {
            name: 'FloatEvent',
            fields: [{ name: 'value', type: 'f64', isOptional: false }]
        };
        const result = generateElmDecoder(model);

        assert.ok(result.includes('Decode.float'));
    });

    test('generateElmDecoder handles bool decoder', () => {
        const model = {
            name: 'BoolEvent',
            fields: [{ name: 'active', type: 'bool', isOptional: false }]
        };
        const result = generateElmDecoder(model);

        assert.ok(result.includes('Decode.bool'));
    });

    test('generateElmDecoder handles list decoder', () => {
        const model = {
            name: 'ListEvent',
            fields: [{ name: 'items', type: 'Vec<String>', isOptional: false }]
        };
        const result = generateElmDecoder(model);

        assert.ok(result.includes('(Decode.list Decode.string)'));
    });

    test('generateElmDecoder handles optional decoder', () => {
        const model = {
            name: 'OptionalEvent',
            fields: [{ name: 'value', type: 'String', isOptional: true }]
        };
        const result = generateElmDecoder(model);

        assert.ok(result.includes('(Decode.maybe Decode.string)'));
    });
});

describe('SSE Generator - SSE Helpers Generation', () => {
    const models = [
        { name: 'NewItemEvent', eventName: 'new_item', fields: [] },
        { name: 'UpdateEvent', eventName: 'update', fields: [] }
    ];

    test('generateSSEHelpers creates SSEEvent union type', () => {
        const result = generateSSEHelpers(models);

        assert.ok(result.includes('type SSEEvent'));
        assert.ok(result.includes('= UnknownEvent String'));
    });

    test('generateSSEHelpers includes all event variants', () => {
        const result = generateSSEHelpers(models);

        assert.ok(result.includes('| NewItemEventEvent NewItemEvent'));
        assert.ok(result.includes('| UpdateEventEvent UpdateEvent'));
    });

    test('generateSSEHelpers creates decodeSSEEvent function', () => {
        const result = generateSSEHelpers(models);

        assert.ok(result.includes('decodeSSEEvent : String -> Decode.Value -> Result Decode.Error SSEEvent'));
    });

    test('generateSSEHelpers includes event type cases', () => {
        const result = generateSSEHelpers(models);

        assert.ok(result.includes('"new_item" -> Decode.map NewItemEventEvent decodeNewItemEvent'));
        assert.ok(result.includes('"update" -> Decode.map UpdateEventEvent decodeUpdateEvent'));
    });

    test('generateSSEHelpers handles unknown events', () => {
        const result = generateSSEHelpers(models);

        assert.ok(result.includes('_ -> Ok (UnknownEvent eventType)'));
    });

});

describe('SSE Generator - Complete Module Generation', () => {
    const models = [
        {
            name: 'TestEvent',
            eventName: 'test',
            fields: [{ name: 'id', type: 'String', isOptional: false }]
        }
    ];

    test('generateSSEModule creates module declaration', () => {
        const result = generateSSEModule(models);

        assert.ok(result.includes('module BuildAmp.ServerSentEvents exposing (..)'));
    });

    test('generateSSEModule imports Json.Decode', () => {
        const result = generateSSEModule(models);

        assert.ok(result.includes('import Json.Decode as Decode'));
    });

    test('generateSSEModule includes andMap helper', () => {
        const result = generateSSEModule(models);

        assert.ok(result.includes('andMap : Decoder a -> Decoder (a -> b) -> Decoder b'));
        assert.ok(result.includes('Decode.map2 (|>)'));
    });

    test('generateSSEModule includes type definitions section', () => {
        const result = generateSSEModule(models);

        assert.ok(result.includes('-- EVENT TYPES'));
        assert.ok(result.includes('type alias TestEvent'));
    });

    test('generateSSEModule includes decoders section', () => {
        const result = generateSSEModule(models);

        assert.ok(result.includes('-- EVENT DECODERS'));
        assert.ok(result.includes('decodeTestEvent'));
    });

});

describe('SSE Generator - JavaScript Generation', () => {
    const models = [sampleModel];

    test('generateSSEJavaScript creates setupSSE function', () => {
        const result = generateSSEJavaScript(models);

        assert.ok(result.includes('export function setupSSE(app, baseUrl'));
    });

    test('generateSSEJavaScript checks for app and ports', () => {
        const result = generateSSEJavaScript(models);

        assert.ok(result.includes('if (!app || !app.ports || !app.ports.sseSubscription)'));
    });

    test('generateSSEJavaScript creates EventSource', () => {
        const result = generateSSEJavaScript(models);

        assert.ok(result.includes('eventSource = new EventSource(config.url || baseUrl)'));
    });

    test('generateSSEJavaScript handles onopen', () => {
        const result = generateSSEJavaScript(models);

        assert.ok(result.includes('eventSource.onopen = function(event)'));
    });

    test('generateSSEJavaScript handles onerror', () => {
        const result = generateSSEJavaScript(models);

        assert.ok(result.includes('eventSource.onerror = function(event)'));
    });

    test('generateSSEJavaScript handles onmessage', () => {
        const result = generateSSEJavaScript(models);

        assert.ok(result.includes('eventSource.onmessage = function(event)'));
        assert.ok(result.includes('JSON.parse(event.data)'));
    });

    test('generateSSEJavaScript closes existing connection', () => {
        const result = generateSSEJavaScript(models);

        assert.ok(result.includes('if (eventSource)'));
        assert.ok(result.includes('eventSource.close()'));
    });

    test('generateSSEJavaScript handles page unload', () => {
        const result = generateSSEJavaScript(models);

        assert.ok(result.includes("window.addEventListener('beforeunload'"));
    });

    test('generateSSEJavaScript has do not edit warning', () => {
        const result = generateSSEJavaScript(models);

        assert.ok(result.includes('DO NOT EDIT THIS FILE MANUALLY'));
    });
});

describe('SSE Generator - Edge Cases', () => {
    test('handles event with single field', () => {
        const model = {
            name: 'SimpleEvent',
            eventName: 'simple',
            fields: [{ name: 'value', type: 'String', isOptional: false }]
        };

        const typeResult = generateElmType(model);
        const decoderResult = generateElmDecoder(model);

        assert.ok(typeResult.includes('type alias SimpleEvent'));
        assert.ok(decoderResult.includes('decodeSimpleEvent'));
    });

    test('handles event with many fields', () => {
        const model = {
            name: 'ComplexEvent',
            eventName: 'complex',
            fields: [
                { name: 'field1', type: 'String', isOptional: false },
                { name: 'field2', type: 'i64', isOptional: false },
                { name: 'field3', type: 'bool', isOptional: false },
                { name: 'field4', type: 'f64', isOptional: false },
                { name: 'field5', type: 'Vec<String>', isOptional: true }
            ]
        };

        const typeResult = generateElmType(model);

        assert.ok(typeResult.includes('field1 : String'));
        assert.ok(typeResult.includes('field2 : Int'));
        assert.ok(typeResult.includes('field3 : Bool'));
        assert.ok(typeResult.includes('field4 : Float'));
        assert.ok(typeResult.includes('field5 : Maybe (List String)'));
    });

    test('handles empty models array for helpers', () => {
        const result = generateSSEHelpers([]);

        assert.ok(result.includes('type SSEEvent'));
        assert.ok(result.includes('= UnknownEvent String'));
    });

    test('handles unknown type fallback', () => {
        const model = {
            name: 'UnknownTypeEvent',
            fields: [{ name: 'data', type: 'CustomType', isOptional: false }]
        };

        const result = generateElmType(model);

        // Unknown types should default to String
        assert.ok(result.includes('data : String'));
    });
});
