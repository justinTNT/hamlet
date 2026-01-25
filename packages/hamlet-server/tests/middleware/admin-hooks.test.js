/**
 * Admin Hooks Middleware Tests
 * Tests for condition evaluation and hook triggering logic
 */

import { evaluateCondition, evaluateValue } from '../../middleware/admin-api.js';

// ============================================================================
// evaluateValue Tests
// ============================================================================

describe('Admin Hooks - evaluateValue', () => {
    describe('Const values', () => {
        test('returns the constant value', () => {
            const value = { type: 'Const', value: 'published' };
            expect(evaluateValue(value, null, null)).toBe('published');
        });

        test('returns numeric constant as-is', () => {
            const value = { type: 'Const', value: '42' };
            expect(evaluateValue(value, null, null)).toBe('42');
        });

        test('returns empty string constant', () => {
            const value = { type: 'Const', value: '' };
            expect(evaluateValue(value, null, null)).toBe('');
        });
    });

    describe('Field values', () => {
        const before = { id: '1', status: 'draft', count: 5 };
        const after = { id: '1', status: 'published', count: 10 };

        test('reads field from After row', () => {
            const value = { type: 'Field', ref: 'After', field: 'status' };
            expect(evaluateValue(value, before, after)).toBe('published');
        });

        test('reads field from Before row', () => {
            const value = { type: 'Field', ref: 'Before', field: 'status' };
            expect(evaluateValue(value, before, after)).toBe('draft');
        });

        test('converts number to string', () => {
            const value = { type: 'Field', ref: 'After', field: 'count' };
            expect(evaluateValue(value, before, after)).toBe('10');
        });

        test('returns null for missing field', () => {
            const value = { type: 'Field', ref: 'After', field: 'nonexistent' };
            expect(evaluateValue(value, before, after)).toBe(null);
        });

        test('returns null when Before row is null', () => {
            const value = { type: 'Field', ref: 'Before', field: 'status' };
            expect(evaluateValue(value, null, after)).toBe(null);
        });

        test('returns null when After row is null', () => {
            const value = { type: 'Field', ref: 'After', field: 'status' };
            expect(evaluateValue(value, before, null)).toBe(null);
        });

        test('returns null for null field value', () => {
            const afterWithNull = { ...after, status: null };
            const value = { type: 'Field', ref: 'After', field: 'status' };
            expect(evaluateValue(value, before, afterWithNull)).toBe(null);
        });

        test('returns null for undefined field value', () => {
            const afterWithUndefined = { ...after, status: undefined };
            const value = { type: 'Field', ref: 'After', field: 'status' };
            expect(evaluateValue(value, before, afterWithUndefined)).toBe(null);
        });

        test('converts boolean to string', () => {
            const afterWithBool = { ...after, active: true };
            const value = { type: 'Field', ref: 'After', field: 'active' };
            expect(evaluateValue(value, before, afterWithBool)).toBe('true');
        });
    });

    describe('Edge cases', () => {
        test('returns null for null value', () => {
            expect(evaluateValue(null, {}, {})).toBe(null);
        });

        test('returns null for undefined value', () => {
            expect(evaluateValue(undefined, {}, {})).toBe(null);
        });

        test('returns null for unknown value type', () => {
            const value = { type: 'Unknown', data: 'test' };
            expect(evaluateValue(value, {}, {})).toBe(null);
        });
    });
});

// ============================================================================
// evaluateCondition Tests
// ============================================================================

describe('Admin Hooks - evaluateCondition', () => {
    const before = { id: '1', status: 'draft', removed: 'false', count: 5 };
    const after = { id: '1', status: 'published', removed: 'true', count: 10 };

    describe('No condition', () => {
        test('returns true when condition is null', () => {
            expect(evaluateCondition(null, before, after)).toBe(true);
        });

        test('returns true when condition is undefined', () => {
            expect(evaluateCondition(undefined, before, after)).toBe(true);
        });
    });

    describe('Eq condition', () => {
        test('returns true when values are equal', () => {
            const condition = {
                type: 'Eq',
                left: { type: 'Field', ref: 'After', field: 'status' },
                right: { type: 'Const', value: 'published' }
            };
            expect(evaluateCondition(condition, before, after)).toBe(true);
        });

        test('returns false when values are not equal', () => {
            const condition = {
                type: 'Eq',
                left: { type: 'Field', ref: 'After', field: 'status' },
                right: { type: 'Const', value: 'draft' }
            };
            expect(evaluateCondition(condition, before, after)).toBe(false);
        });

        test('compares two field values', () => {
            const condition = {
                type: 'Eq',
                left: { type: 'Field', ref: 'Before', field: 'id' },
                right: { type: 'Field', ref: 'After', field: 'id' }
            };
            expect(evaluateCondition(condition, before, after)).toBe(true);
        });
    });

    describe('Neq condition', () => {
        test('returns true when values are different', () => {
            const condition = {
                type: 'Neq',
                left: { type: 'Field', ref: 'Before', field: 'status' },
                right: { type: 'Field', ref: 'After', field: 'status' }
            };
            expect(evaluateCondition(condition, before, after)).toBe(true);
        });

        test('returns false when values are equal', () => {
            const condition = {
                type: 'Neq',
                left: { type: 'Field', ref: 'Before', field: 'id' },
                right: { type: 'Field', ref: 'After', field: 'id' }
            };
            expect(evaluateCondition(condition, before, after)).toBe(false);
        });
    });

    describe('IsNull condition', () => {
        test('returns true when field is null', () => {
            const afterWithNull = { ...after, deleted_at: null };
            const condition = { type: 'IsNull', ref: 'After', field: 'deleted_at' };
            expect(evaluateCondition(condition, before, afterWithNull)).toBe(true);
        });

        test('returns true when field is undefined', () => {
            const condition = { type: 'IsNull', ref: 'After', field: 'nonexistent' };
            expect(evaluateCondition(condition, before, after)).toBe(true);
        });

        test('returns true when row is null', () => {
            const condition = { type: 'IsNull', ref: 'Before', field: 'status' };
            expect(evaluateCondition(condition, null, after)).toBe(true);
        });

        test('returns false when field has value', () => {
            const condition = { type: 'IsNull', ref: 'After', field: 'status' };
            expect(evaluateCondition(condition, before, after)).toBe(false);
        });
    });

    describe('IsNotNull condition', () => {
        test('returns true when field has value', () => {
            const condition = { type: 'IsNotNull', ref: 'After', field: 'status' };
            expect(evaluateCondition(condition, before, after)).toBe(true);
        });

        test('returns false when field is null', () => {
            const afterWithNull = { ...after, deleted_at: null };
            const condition = { type: 'IsNotNull', ref: 'After', field: 'deleted_at' };
            expect(evaluateCondition(condition, before, afterWithNull)).toBe(false);
        });

        test('returns false when row is null', () => {
            const condition = { type: 'IsNotNull', ref: 'Before', field: 'status' };
            expect(evaluateCondition(condition, null, after)).toBe(false);
        });
    });

    describe('And condition', () => {
        test('returns true when both conditions are true', () => {
            const condition = {
                type: 'And',
                left: {
                    type: 'Eq',
                    left: { type: 'Field', ref: 'After', field: 'status' },
                    right: { type: 'Const', value: 'published' }
                },
                right: {
                    type: 'Eq',
                    left: { type: 'Field', ref: 'After', field: 'removed' },
                    right: { type: 'Const', value: 'true' }
                }
            };
            expect(evaluateCondition(condition, before, after)).toBe(true);
        });

        test('returns false when left condition is false', () => {
            const condition = {
                type: 'And',
                left: {
                    type: 'Eq',
                    left: { type: 'Field', ref: 'After', field: 'status' },
                    right: { type: 'Const', value: 'draft' }
                },
                right: {
                    type: 'Eq',
                    left: { type: 'Field', ref: 'After', field: 'removed' },
                    right: { type: 'Const', value: 'true' }
                }
            };
            expect(evaluateCondition(condition, before, after)).toBe(false);
        });

        test('returns false when right condition is false', () => {
            const condition = {
                type: 'And',
                left: {
                    type: 'Eq',
                    left: { type: 'Field', ref: 'After', field: 'status' },
                    right: { type: 'Const', value: 'published' }
                },
                right: {
                    type: 'Eq',
                    left: { type: 'Field', ref: 'After', field: 'removed' },
                    right: { type: 'Const', value: 'false' }
                }
            };
            expect(evaluateCondition(condition, before, after)).toBe(false);
        });
    });

    describe('Or condition', () => {
        test('returns true when both conditions are true', () => {
            const condition = {
                type: 'Or',
                left: {
                    type: 'Eq',
                    left: { type: 'Field', ref: 'After', field: 'status' },
                    right: { type: 'Const', value: 'published' }
                },
                right: {
                    type: 'Eq',
                    left: { type: 'Field', ref: 'After', field: 'removed' },
                    right: { type: 'Const', value: 'true' }
                }
            };
            expect(evaluateCondition(condition, before, after)).toBe(true);
        });

        test('returns true when only left condition is true', () => {
            const condition = {
                type: 'Or',
                left: {
                    type: 'Eq',
                    left: { type: 'Field', ref: 'After', field: 'status' },
                    right: { type: 'Const', value: 'published' }
                },
                right: {
                    type: 'Eq',
                    left: { type: 'Field', ref: 'After', field: 'removed' },
                    right: { type: 'Const', value: 'false' }
                }
            };
            expect(evaluateCondition(condition, before, after)).toBe(true);
        });

        test('returns true when only right condition is true', () => {
            const condition = {
                type: 'Or',
                left: {
                    type: 'Eq',
                    left: { type: 'Field', ref: 'After', field: 'status' },
                    right: { type: 'Const', value: 'draft' }
                },
                right: {
                    type: 'Eq',
                    left: { type: 'Field', ref: 'After', field: 'removed' },
                    right: { type: 'Const', value: 'true' }
                }
            };
            expect(evaluateCondition(condition, before, after)).toBe(true);
        });

        test('returns false when both conditions are false', () => {
            const condition = {
                type: 'Or',
                left: {
                    type: 'Eq',
                    left: { type: 'Field', ref: 'After', field: 'status' },
                    right: { type: 'Const', value: 'draft' }
                },
                right: {
                    type: 'Eq',
                    left: { type: 'Field', ref: 'After', field: 'removed' },
                    right: { type: 'Const', value: 'false' }
                }
            };
            expect(evaluateCondition(condition, before, after)).toBe(false);
        });
    });

    describe('Complex nested conditions', () => {
        test('evaluates deeply nested And/Or conditions', () => {
            // (status == 'published' AND removed == 'true') OR (status == 'featured')
            const condition = {
                type: 'Or',
                left: {
                    type: 'And',
                    left: {
                        type: 'Eq',
                        left: { type: 'Field', ref: 'After', field: 'status' },
                        right: { type: 'Const', value: 'published' }
                    },
                    right: {
                        type: 'Eq',
                        left: { type: 'Field', ref: 'After', field: 'removed' },
                        right: { type: 'Const', value: 'true' }
                    }
                },
                right: {
                    type: 'Eq',
                    left: { type: 'Field', ref: 'After', field: 'status' },
                    right: { type: 'Const', value: 'featured' }
                }
            };
            expect(evaluateCondition(condition, before, after)).toBe(true);
        });

        test('evaluates field change detection (before != after)', () => {
            const condition = {
                type: 'Neq',
                left: { type: 'Field', ref: 'Before', field: 'removed' },
                right: { type: 'Field', ref: 'After', field: 'removed' }
            };
            expect(evaluateCondition(condition, before, after)).toBe(true);
        });

        test('evaluates changedTo pattern (changed AND equals value)', () => {
            // removed changed AND removed == 'true'
            const condition = {
                type: 'And',
                left: {
                    type: 'Neq',
                    left: { type: 'Field', ref: 'Before', field: 'removed' },
                    right: { type: 'Field', ref: 'After', field: 'removed' }
                },
                right: {
                    type: 'Eq',
                    left: { type: 'Field', ref: 'After', field: 'removed' },
                    right: { type: 'Const', value: 'true' }
                }
            };
            expect(evaluateCondition(condition, before, after)).toBe(true);
        });
    });

    describe('Edge cases', () => {
        test('returns false for unknown condition type', () => {
            const condition = { type: 'GreaterThan', left: {}, right: {} };
            expect(evaluateCondition(condition, before, after)).toBe(false);
        });

        test('handles OnInsert scenario (before is null)', () => {
            const condition = {
                type: 'Eq',
                left: { type: 'Field', ref: 'After', field: 'status' },
                right: { type: 'Const', value: 'published' }
            };
            expect(evaluateCondition(condition, null, after)).toBe(true);
        });

        test('handles OnDelete scenario (after is null)', () => {
            const condition = {
                type: 'Eq',
                left: { type: 'Field', ref: 'Before', field: 'status' },
                right: { type: 'Const', value: 'draft' }
            };
            expect(evaluateCondition(condition, before, null)).toBe(true);
        });
    });
});

// ============================================================================
// Trigger-specific scenarios
// ============================================================================

describe('Admin Hooks - Trigger Scenarios', () => {
    describe('OnInsert (before = null, after = new row)', () => {
        const after = { id: '1', status: 'draft', host: 'example.com' };

        test('fires when new record matches condition', () => {
            const condition = {
                type: 'Eq',
                left: { type: 'Field', ref: 'After', field: 'status' },
                right: { type: 'Const', value: 'draft' }
            };
            expect(evaluateCondition(condition, null, after)).toBe(true);
        });

        test('does not fire when new record does not match', () => {
            const condition = {
                type: 'Eq',
                left: { type: 'Field', ref: 'After', field: 'status' },
                right: { type: 'Const', value: 'published' }
            };
            expect(evaluateCondition(condition, null, after)).toBe(false);
        });
    });

    describe('OnUpdate (before = old row, after = new row)', () => {
        const before = { id: '1', status: 'draft', removed: 'false' };
        const after = { id: '1', status: 'published', removed: 'true' };

        test('detects field value change', () => {
            const condition = {
                type: 'Neq',
                left: { type: 'Field', ref: 'Before', field: 'status' },
                right: { type: 'Field', ref: 'After', field: 'status' }
            };
            expect(evaluateCondition(condition, before, after)).toBe(true);
        });

        test('detects specific transition', () => {
            // status changed from draft to published
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
            expect(evaluateCondition(condition, before, after)).toBe(true);
        });
    });

    describe('OnDelete (before = deleted row, after = null)', () => {
        const before = { id: '1', status: 'published', important: 'true' };

        test('fires based on deleted record properties', () => {
            const condition = {
                type: 'Eq',
                left: { type: 'Field', ref: 'Before', field: 'important' },
                right: { type: 'Const', value: 'true' }
            };
            expect(evaluateCondition(condition, before, null)).toBe(true);
        });

        test('can check if After is null (always true for delete)', () => {
            const condition = { type: 'IsNull', ref: 'After', field: 'id' };
            expect(evaluateCondition(condition, before, null)).toBe(true);
        });
    });
});
