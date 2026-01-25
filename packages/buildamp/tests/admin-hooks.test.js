/**
 * Admin Hooks Generator Tests
 * Tests for admin hook validation and config generation
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { _test } from '../lib/generators/elm.js';

const { validateCondition, validateValue, validateRowRef } = _test;

// ============================================================================
// validateRowRef Tests
// ============================================================================

describe('Admin Hooks - validateRowRef', () => {
    test('accepts Before with OnUpdate trigger', () => {
        const errors = validateRowRef('Before', 'OnUpdate');
        assert.strictEqual(errors.length, 0);
    });

    test('accepts After with OnUpdate trigger', () => {
        const errors = validateRowRef('After', 'OnUpdate');
        assert.strictEqual(errors.length, 0);
    });

    test('accepts After with OnInsert trigger', () => {
        const errors = validateRowRef('After', 'OnInsert');
        assert.strictEqual(errors.length, 0);
    });

    test('rejects Before with OnInsert trigger', () => {
        const errors = validateRowRef('Before', 'OnInsert');
        assert.strictEqual(errors.length, 1);
        assert.ok(errors[0].includes('OnInsert cannot reference Before'));
    });

    test('accepts Before with OnDelete trigger', () => {
        const errors = validateRowRef('Before', 'OnDelete');
        assert.strictEqual(errors.length, 0);
    });

    test('rejects After with OnDelete trigger', () => {
        const errors = validateRowRef('After', 'OnDelete');
        assert.strictEqual(errors.length, 1);
        assert.ok(errors[0].includes('OnDelete cannot reference After'));
    });

    test('rejects invalid row reference', () => {
        const errors = validateRowRef('Current', 'OnUpdate');
        assert.strictEqual(errors.length, 1);
        assert.ok(errors[0].includes('must be Before or After'));
    });
});

// ============================================================================
// validateValue Tests
// ============================================================================

describe('Admin Hooks - validateValue', () => {
    test('accepts valid Const value', () => {
        const value = { type: 'Const', value: 'published' };
        const errors = validateValue(value, 'OnUpdate');
        assert.strictEqual(errors.length, 0);
    });

    test('rejects Const without value', () => {
        const value = { type: 'Const' };
        const errors = validateValue(value, 'OnUpdate');
        assert.strictEqual(errors.length, 1);
        assert.ok(errors[0].includes('Const value missing'));
    });

    test('accepts valid Field value with After ref', () => {
        const value = { type: 'Field', ref: 'After', field: 'status' };
        const errors = validateValue(value, 'OnUpdate');
        assert.strictEqual(errors.length, 0);
    });

    test('accepts valid Field value with Before ref', () => {
        const value = { type: 'Field', ref: 'Before', field: 'status' };
        const errors = validateValue(value, 'OnUpdate');
        assert.strictEqual(errors.length, 0);
    });

    test('rejects Field without ref', () => {
        const value = { type: 'Field', field: 'status' };
        const errors = validateValue(value, 'OnUpdate');
        assert.ok(errors.some(e => e.includes('missing row reference')));
    });

    test('rejects Field without field name', () => {
        const value = { type: 'Field', ref: 'After' };
        const errors = validateValue(value, 'OnUpdate');
        assert.ok(errors.some(e => e.includes('missing field name')));
    });

    test('rejects Field with Before ref on OnInsert trigger', () => {
        const value = { type: 'Field', ref: 'Before', field: 'status' };
        const errors = validateValue(value, 'OnInsert');
        assert.strictEqual(errors.length, 1);
        assert.ok(errors[0].includes('OnInsert cannot reference Before'));
    });

    test('rejects Field with After ref on OnDelete trigger', () => {
        const value = { type: 'Field', ref: 'After', field: 'status' };
        const errors = validateValue(value, 'OnDelete');
        assert.strictEqual(errors.length, 1);
        assert.ok(errors[0].includes('OnDelete cannot reference After'));
    });

    test('rejects unknown value type', () => {
        const value = { type: 'Variable', name: 'x' };
        const errors = validateValue(value, 'OnUpdate');
        assert.strictEqual(errors.length, 1);
        assert.ok(errors[0].includes('Unknown value type'));
    });

    test('rejects null value', () => {
        const errors = validateValue(null, 'OnUpdate');
        assert.strictEqual(errors.length, 1);
        assert.ok(errors[0].includes('Value missing type'));
    });
});

// ============================================================================
// validateCondition Tests
// ============================================================================

describe('Admin Hooks - validateCondition (Eq/Neq)', () => {
    test('accepts valid Eq condition', () => {
        const condition = {
            type: 'Eq',
            left: { type: 'Field', ref: 'After', field: 'status' },
            right: { type: 'Const', value: 'published' }
        };
        const errors = validateCondition(condition, 'OnUpdate');
        assert.strictEqual(errors.length, 0);
    });

    test('accepts valid Neq condition', () => {
        const condition = {
            type: 'Neq',
            left: { type: 'Field', ref: 'Before', field: 'status' },
            right: { type: 'Field', ref: 'After', field: 'status' }
        };
        const errors = validateCondition(condition, 'OnUpdate');
        assert.strictEqual(errors.length, 0);
    });

    test('rejects Eq without left operand', () => {
        const condition = {
            type: 'Eq',
            right: { type: 'Const', value: 'published' }
        };
        const errors = validateCondition(condition, 'OnUpdate');
        assert.ok(errors.some(e => e.includes('missing left operand')));
    });

    test('rejects Eq without right operand', () => {
        const condition = {
            type: 'Eq',
            left: { type: 'Field', ref: 'After', field: 'status' }
        };
        const errors = validateCondition(condition, 'OnUpdate');
        assert.ok(errors.some(e => e.includes('missing right operand')));
    });

    test('propagates value validation errors', () => {
        const condition = {
            type: 'Eq',
            left: { type: 'Field', ref: 'Before', field: 'status' },
            right: { type: 'Const', value: 'published' }
        };
        const errors = validateCondition(condition, 'OnInsert');
        assert.strictEqual(errors.length, 1);
        assert.ok(errors[0].includes('OnInsert cannot reference Before'));
    });
});

describe('Admin Hooks - validateCondition (IsNull/IsNotNull)', () => {
    test('accepts valid IsNull condition', () => {
        const condition = {
            type: 'IsNull',
            ref: 'Before',
            field: 'deleted_at'
        };
        const errors = validateCondition(condition, 'OnUpdate');
        assert.strictEqual(errors.length, 0);
    });

    test('accepts valid IsNotNull condition', () => {
        const condition = {
            type: 'IsNotNull',
            ref: 'After',
            field: 'published_at'
        };
        const errors = validateCondition(condition, 'OnUpdate');
        assert.strictEqual(errors.length, 0);
    });

    test('rejects IsNull without ref', () => {
        const condition = {
            type: 'IsNull',
            field: 'deleted_at'
        };
        const errors = validateCondition(condition, 'OnUpdate');
        assert.ok(errors.some(e => e.includes('missing row reference')));
    });

    test('rejects IsNull without field', () => {
        const condition = {
            type: 'IsNull',
            ref: 'After'
        };
        const errors = validateCondition(condition, 'OnUpdate');
        assert.ok(errors.some(e => e.includes('missing field name')));
    });

    test('validates row ref for trigger type', () => {
        const condition = {
            type: 'IsNull',
            ref: 'After',
            field: 'deleted_at'
        };
        const errors = validateCondition(condition, 'OnDelete');
        assert.strictEqual(errors.length, 1);
        assert.ok(errors[0].includes('OnDelete cannot reference After'));
    });
});

describe('Admin Hooks - validateCondition (And/Or)', () => {
    test('accepts valid And condition', () => {
        const condition = {
            type: 'And',
            left: {
                type: 'Neq',
                left: { type: 'Field', ref: 'Before', field: 'status' },
                right: { type: 'Field', ref: 'After', field: 'status' }
            },
            right: {
                type: 'Eq',
                left: { type: 'Field', ref: 'After', field: 'status' },
                right: { type: 'Const', value: 'published' }
            }
        };
        const errors = validateCondition(condition, 'OnUpdate');
        assert.strictEqual(errors.length, 0);
    });

    test('accepts valid Or condition', () => {
        const condition = {
            type: 'Or',
            left: {
                type: 'Eq',
                left: { type: 'Field', ref: 'After', field: 'status' },
                right: { type: 'Const', value: 'published' }
            },
            right: {
                type: 'Eq',
                left: { type: 'Field', ref: 'After', field: 'status' },
                right: { type: 'Const', value: 'featured' }
            }
        };
        const errors = validateCondition(condition, 'OnInsert');
        assert.strictEqual(errors.length, 0);
    });

    test('rejects And without left condition', () => {
        const condition = {
            type: 'And',
            right: {
                type: 'Eq',
                left: { type: 'Field', ref: 'After', field: 'status' },
                right: { type: 'Const', value: 'published' }
            }
        };
        const errors = validateCondition(condition, 'OnUpdate');
        assert.ok(errors.some(e => e.includes('missing left condition')));
    });

    test('rejects Or without right condition', () => {
        const condition = {
            type: 'Or',
            left: {
                type: 'Eq',
                left: { type: 'Field', ref: 'After', field: 'status' },
                right: { type: 'Const', value: 'published' }
            }
        };
        const errors = validateCondition(condition, 'OnUpdate');
        assert.ok(errors.some(e => e.includes('missing right condition')));
    });

    test('propagates nested condition errors', () => {
        const condition = {
            type: 'And',
            left: {
                type: 'Eq',
                left: { type: 'Field', ref: 'Before', field: 'status' },
                right: { type: 'Const', value: 'draft' }
            },
            right: {
                type: 'Eq',
                left: { type: 'Field', ref: 'After', field: 'status' },
                right: { type: 'Const', value: 'published' }
            }
        };
        // OnInsert cannot reference Before
        const errors = validateCondition(condition, 'OnInsert');
        assert.strictEqual(errors.length, 1);
        assert.ok(errors[0].includes('OnInsert cannot reference Before'));
    });
});

describe('Admin Hooks - validateCondition (Edge Cases)', () => {
    test('rejects null condition', () => {
        const errors = validateCondition(null, 'OnUpdate');
        assert.strictEqual(errors.length, 1);
        assert.ok(errors[0].includes('Condition missing type'));
    });

    test('rejects condition without type', () => {
        const condition = { left: {}, right: {} };
        const errors = validateCondition(condition, 'OnUpdate');
        assert.strictEqual(errors.length, 1);
        assert.ok(errors[0].includes('Condition missing type'));
    });

    test('rejects unknown condition type', () => {
        const condition = { type: 'GreaterThan', left: {}, right: {} };
        const errors = validateCondition(condition, 'OnUpdate');
        assert.strictEqual(errors.length, 1);
        assert.ok(errors[0].includes('Unknown condition type'));
    });

    test('validates deeply nested conditions', () => {
        const condition = {
            type: 'And',
            left: {
                type: 'Or',
                left: {
                    type: 'Eq',
                    left: { type: 'Field', ref: 'After', field: 'a' },
                    right: { type: 'Const', value: '1' }
                },
                right: {
                    type: 'Eq',
                    left: { type: 'Field', ref: 'After', field: 'b' },
                    right: { type: 'Const', value: '2' }
                }
            },
            right: {
                type: 'IsNotNull',
                ref: 'After',
                field: 'c'
            }
        };
        const errors = validateCondition(condition, 'OnInsert');
        assert.strictEqual(errors.length, 0);
    });
});
