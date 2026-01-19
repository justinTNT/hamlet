/**
 * Union Type Generator Tests
 * Tests for Elm union type code generation
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
    generateUnionTypeDefinition,
    generateUnionEncoder,
    generateUnionDecoder,
    generateUnionTypeCode,
    generateAllUnionTypes,
    _test
} from '../lib/generators/union-types.js';

const { elmTypeToEncoder, elmTypeToDecoder } = _test;

// =============================================================================
// TYPE TO ENCODER/DECODER HELPERS
// =============================================================================

describe('Union Types - Type Helpers', () => {
    test('elmTypeToEncoder handles basic types', () => {
        assert.strictEqual(elmTypeToEncoder('String'), 'Json.Encode.string');
        assert.strictEqual(elmTypeToEncoder('Int'), 'Json.Encode.int');
        assert.strictEqual(elmTypeToEncoder('Float'), 'Json.Encode.float');
        assert.strictEqual(elmTypeToEncoder('Bool'), 'Json.Encode.bool');
    });

    test('elmTypeToEncoder handles Maybe types', () => {
        const result = elmTypeToEncoder('Maybe String');
        assert.ok(result.includes('Maybe.map'));
        assert.ok(result.includes('Json.Encode.string'));
    });

    test('elmTypeToEncoder handles List types', () => {
        const result = elmTypeToEncoder('List Int');
        assert.ok(result.includes('Json.Encode.list'));
        assert.ok(result.includes('Json.Encode.int'));
    });

    test('elmTypeToEncoder handles custom types', () => {
        assert.strictEqual(elmTypeToEncoder('Status'), 'statusEncoder');
        assert.strictEqual(elmTypeToEncoder('MyCustomType'), 'myCustomTypeEncoder');
    });

    test('elmTypeToDecoder handles basic types', () => {
        assert.strictEqual(elmTypeToDecoder('String'), 'Json.Decode.string');
        assert.strictEqual(elmTypeToDecoder('Int'), 'Json.Decode.int');
        assert.strictEqual(elmTypeToDecoder('Float'), 'Json.Decode.float');
        assert.strictEqual(elmTypeToDecoder('Bool'), 'Json.Decode.bool');
    });

    test('elmTypeToDecoder handles Maybe types', () => {
        const result = elmTypeToDecoder('Maybe String');
        assert.ok(result.includes('Json.Decode.maybe'));
    });

    test('elmTypeToDecoder handles List types', () => {
        const result = elmTypeToDecoder('List Int');
        assert.ok(result.includes('Json.Decode.list'));
    });

    test('elmTypeToDecoder handles custom types', () => {
        assert.strictEqual(elmTypeToDecoder('Status'), 'statusDecoder');
    });
});

// =============================================================================
// TYPE DEFINITION GENERATION
// =============================================================================

describe('Union Types - Type Definition', () => {
    test('generates simple union type', () => {
        const unionType = {
            name: 'Color',
            typeParams: [],
            variants: [
                { name: 'Red', args: [] },
                { name: 'Green', args: [] },
                { name: 'Blue', args: [] }
            ]
        };

        const result = generateUnionTypeDefinition(unionType);

        assert.ok(result.includes('type Color'));
        assert.ok(result.includes('= Red'));
        assert.ok(result.includes('| Green'));
        assert.ok(result.includes('| Blue'));
    });

    test('generates union type with args', () => {
        const unionType = {
            name: 'Result',
            typeParams: [],
            variants: [
                { name: 'Ok', args: ['String'] },
                { name: 'Err', args: ['Int'] }
            ]
        };

        const result = generateUnionTypeDefinition(unionType);

        assert.ok(result.includes('= Ok String'));
        assert.ok(result.includes('| Err Int'));
    });

    test('generates union type with multiple args', () => {
        const unionType = {
            name: 'Point',
            typeParams: [],
            variants: [
                { name: 'Point2D', args: ['Int', 'Int'] },
                { name: 'Point3D', args: ['Int', 'Int', 'Int'] }
            ]
        };

        const result = generateUnionTypeDefinition(unionType);

        assert.ok(result.includes('= Point2D Int Int'));
        assert.ok(result.includes('| Point3D Int Int Int'));
    });

    test('generates union type with type parameters', () => {
        const unionType = {
            name: 'Maybe',
            typeParams: ['a'],
            variants: [
                { name: 'Just', args: ['a'] },
                { name: 'Nothing', args: [] }
            ]
        };

        const result = generateUnionTypeDefinition(unionType);

        assert.ok(result.includes('type Maybe a'));
    });
});

// =============================================================================
// ENCODER GENERATION
// =============================================================================

describe('Union Types - Encoder', () => {
    test('generates encoder for simple variants', () => {
        const unionType = {
            name: 'Status',
            typeParams: [],
            variants: [
                { name: 'Active', args: [] },
                { name: 'Inactive', args: [] }
            ]
        };

        const result = generateUnionEncoder(unionType);

        assert.ok(result.includes('statusEncoder : Status -> Json.Encode.Value'));
        assert.ok(result.includes('case value of'));
        assert.ok(result.includes('Active ->'));
        assert.ok(result.includes('"tag", Json.Encode.string "Active"'));
        assert.ok(result.includes('Inactive ->'));
    });

    test('generates encoder for single-arg variants', () => {
        const unionType = {
            name: 'Message',
            typeParams: [],
            variants: [
                { name: 'Text', args: ['String'] },
                { name: 'Number', args: ['Int'] }
            ]
        };

        const result = generateUnionEncoder(unionType);

        assert.ok(result.includes('Text value0 ->'));
        assert.ok(result.includes('"value", Json.Encode.string value0'));
        assert.ok(result.includes('Number value0 ->'));
        assert.ok(result.includes('"value", Json.Encode.int value0'));
    });

    test('generates encoder for multi-arg variants', () => {
        const unionType = {
            name: 'Coord',
            typeParams: [],
            variants: [
                { name: 'XY', args: ['Int', 'Int'] }
            ]
        };

        const result = generateUnionEncoder(unionType);

        assert.ok(result.includes('XY value0 value1 ->'));
        assert.ok(result.includes('Json.Encode.list identity'));
        assert.ok(result.includes('Json.Encode.int value0'));
        assert.ok(result.includes('Json.Encode.int value1'));
    });

    test('returns null for generic types', () => {
        const unionType = {
            name: 'Maybe',
            typeParams: ['a'],
            variants: [
                { name: 'Just', args: ['a'] },
                { name: 'Nothing', args: [] }
            ]
        };

        const result = generateUnionEncoder(unionType);

        assert.strictEqual(result, null);
    });
});

// =============================================================================
// DECODER GENERATION
// =============================================================================

describe('Union Types - Decoder', () => {
    test('generates decoder for simple variants', () => {
        const unionType = {
            name: 'Status',
            typeParams: [],
            variants: [
                { name: 'Active', args: [] },
                { name: 'Inactive', args: [] }
            ]
        };

        const result = generateUnionDecoder(unionType);

        assert.ok(result.includes('statusDecoder : Json.Decode.Decoder Status'));
        assert.ok(result.includes('Json.Decode.field "tag" Json.Decode.string'));
        assert.ok(result.includes('"Active" ->'));
        assert.ok(result.includes('Json.Decode.succeed Active'));
        assert.ok(result.includes('"Inactive" ->'));
    });

    test('generates decoder for single-arg variants', () => {
        const unionType = {
            name: 'Message',
            typeParams: [],
            variants: [
                { name: 'Text', args: ['String'] }
            ]
        };

        const result = generateUnionDecoder(unionType);

        assert.ok(result.includes('"Text" ->'));
        assert.ok(result.includes('Json.Decode.map Text'));
        assert.ok(result.includes('Json.Decode.field "value"'));
    });

    test('generates decoder for multi-arg variants', () => {
        const unionType = {
            name: 'Coord',
            typeParams: [],
            variants: [
                { name: 'XY', args: ['Int', 'Int'] }
            ]
        };

        const result = generateUnionDecoder(unionType);

        assert.ok(result.includes('"XY" ->'));
        assert.ok(result.includes('Json.Decode.succeed XY'));
        assert.ok(result.includes('Json.Decode.index 0'));
        assert.ok(result.includes('Json.Decode.index 1'));
    });

    test('generates fallback for unknown variants', () => {
        const unionType = {
            name: 'Status',
            typeParams: [],
            variants: [{ name: 'Active', args: [] }]
        };

        const result = generateUnionDecoder(unionType);

        assert.ok(result.includes('_ ->'));
        assert.ok(result.includes('Json.Decode.fail'));
        assert.ok(result.includes('Unknown Status variant'));
    });

    test('returns null for generic types', () => {
        const unionType = {
            name: 'Result',
            typeParams: ['err', 'ok'],
            variants: []
        };

        const result = generateUnionDecoder(unionType);

        assert.strictEqual(result, null);
    });
});

// =============================================================================
// COMPLETE CODE GENERATION
// =============================================================================

describe('Union Types - Complete Code', () => {
    test('generateUnionTypeCode includes all parts', () => {
        const unionType = {
            name: 'Status',
            typeParams: [],
            variants: [
                { name: 'Active', args: [] },
                { name: 'Pending', args: ['String'] }
            ]
        };

        const result = generateUnionTypeCode(unionType);

        // Type definition
        assert.ok(result.includes('type Status'));

        // Encoder
        assert.ok(result.includes('statusEncoder : Status'));

        // Decoder
        assert.ok(result.includes('statusDecoder : Json.Decode.Decoder Status'));
    });

    test('generateAllUnionTypes handles multiple types', () => {
        const unionTypes = [
            {
                name: 'Color',
                typeParams: [],
                variants: [
                    { name: 'Red', args: [] },
                    { name: 'Blue', args: [] }
                ]
            },
            {
                name: 'Size',
                typeParams: [],
                variants: [
                    { name: 'Small', args: [] },
                    { name: 'Large', args: [] }
                ]
            }
        ];

        const result = generateAllUnionTypes(unionTypes);

        assert.ok(result.includes('type Color'));
        assert.ok(result.includes('type Size'));
        assert.ok(result.includes('colorEncoder'));
        assert.ok(result.includes('sizeEncoder'));
        assert.ok(result.includes('colorDecoder'));
        assert.ok(result.includes('sizeDecoder'));
    });

    test('generateAllUnionTypes skips generic types', () => {
        const unionTypes = [
            {
                name: 'Status',
                typeParams: [],
                variants: [{ name: 'Active', args: [] }]
            },
            {
                name: 'Maybe',
                typeParams: ['a'],
                variants: [
                    { name: 'Just', args: ['a'] },
                    { name: 'Nothing', args: [] }
                ]
            }
        ];

        const result = generateAllUnionTypes(unionTypes);

        assert.ok(result.includes('statusEncoder'));
        // Generic Maybe should still have definition but not encoder
        assert.ok(result.includes('type Maybe a'));
    });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Union Types - Edge Cases', () => {
    test('handles empty variants array', () => {
        const unionType = {
            name: 'Empty',
            typeParams: [],
            variants: []
        };

        const result = generateUnionTypeCode(unionType);

        assert.ok(result.includes('type Empty'));
    });

    test('handles variant with complex type arg', () => {
        const unionType = {
            name: 'Data',
            typeParams: [],
            variants: [
                { name: 'Items', args: ['List String'] }
            ]
        };

        const encoder = generateUnionEncoder(unionType);
        const decoder = generateUnionDecoder(unionType);

        assert.ok(encoder.includes('Json.Encode.list'));
        assert.ok(decoder.includes('Json.Decode.list'));
    });

    test('handles variant with Maybe arg', () => {
        const unionType = {
            name: 'Optional',
            typeParams: [],
            variants: [
                { name: 'Value', args: ['Maybe Int'] }
            ]
        };

        const encoder = generateUnionEncoder(unionType);
        const decoder = generateUnionDecoder(unionType);

        assert.ok(encoder.includes('Maybe.map'));
        assert.ok(decoder.includes('Json.Decode.maybe'));
    });
});
