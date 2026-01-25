/**
 * SQL Generator Tests
 * Tests for SQL generation including union type handling
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
    generateCreateTableForTest,
    generateSchemaForTest,
    isEnumLike,
    processUnionTypes
} from '../lib/generators/sql.js';

// =============================================================================
// isEnumLike TESTS
// =============================================================================

describe('SQL Generator - isEnumLike', () => {
    test('returns true for union with only no-arg variants', () => {
        const unionType = {
            name: 'Status',
            typeParams: [],
            variants: [
                { name: 'Active', args: [] },
                { name: 'Inactive', args: [] },
                { name: 'Pending', args: [] }
            ]
        };
        assert.strictEqual(isEnumLike(unionType), true);
    });

    test('returns false for union with variants having args', () => {
        const unionType = {
            name: 'Result',
            typeParams: [],
            variants: [
                { name: 'Ok', args: ['String'] },
                { name: 'Err', args: ['String'] }
            ]
        };
        assert.strictEqual(isEnumLike(unionType), false);
    });

    test('returns false for mixed variants (some with args, some without)', () => {
        const unionType = {
            name: 'State',
            typeParams: [],
            variants: [
                { name: 'Idle', args: [] },
                { name: 'Loading', args: [] },
                { name: 'Error', args: ['String'] }
            ]
        };
        assert.strictEqual(isEnumLike(unionType), false);
    });

    test('returns true for single no-arg variant', () => {
        const unionType = {
            name: 'Unit',
            typeParams: [],
            variants: [
                { name: 'Unit', args: [] }
            ]
        };
        assert.strictEqual(isEnumLike(unionType), true);
    });

    test('returns true for empty variants array', () => {
        const unionType = {
            name: 'Empty',
            typeParams: [],
            variants: []
        };
        assert.strictEqual(isEnumLike(unionType), true);
    });
});

// =============================================================================
// processUnionTypes TESTS
// =============================================================================

describe('SQL Generator - processUnionTypes', () => {
    test('processes union types with correct structure', () => {
        const unionTypes = [
            {
                name: 'Status',
                typeParams: [],
                variants: [
                    { name: 'Active', args: [] },
                    { name: 'Inactive', args: [] }
                ]
            }
        ];

        const result = processUnionTypes(unionTypes);

        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].name, 'Status');
        assert.strictEqual(result[0].isEnumLike, true);
        assert.deepStrictEqual(result[0].enumValues, ['Active', 'Inactive']);
    });

    test('processes multiple union types', () => {
        const unionTypes = [
            {
                name: 'Status',
                typeParams: [],
                variants: [{ name: 'Active', args: [] }]
            },
            {
                name: 'Priority',
                typeParams: [],
                variants: [
                    { name: 'Low', args: [] },
                    { name: 'High', args: [] }
                ]
            }
        ];

        const result = processUnionTypes(unionTypes);

        assert.strictEqual(result.length, 2);
        assert.strictEqual(result[0].name, 'Status');
        assert.strictEqual(result[1].name, 'Priority');
    });

    test('marks non-enum-like types correctly', () => {
        const unionTypes = [
            {
                name: 'Result',
                typeParams: [],
                variants: [
                    { name: 'Ok', args: ['String'] },
                    { name: 'Err', args: ['String'] }
                ]
            }
        ];

        const result = processUnionTypes(unionTypes);

        assert.strictEqual(result[0].isEnumLike, false);
        assert.strictEqual(result[0].enumValues, null);
    });

    test('returns empty array for empty input', () => {
        const result = processUnionTypes([]);
        assert.deepStrictEqual(result, []);
    });
});

// =============================================================================
// generateCreateTable UNION TYPE TESTS
// =============================================================================

describe('SQL Generator - CREATE TABLE with Union Types', () => {
    test('generates CHECK constraint for enum-like field', () => {
        const struct = {
            tableName: 'items',
            structName: 'Item',
            fields: [
                {
                    name: 'id',
                    rustType: 'String',
                    sqlType: 'TEXT',
                    constraints: ['PRIMARY KEY'],
                    isPrimaryKey: true
                },
                {
                    name: 'status',
                    rustType: 'Status',
                    sqlType: 'TEXT',
                    constraints: ['NOT NULL']
                }
            ]
        };

        const unionTypeMap = {
            Status: {
                name: 'Status',
                typeParams: [],
                variants: [
                    { name: 'Active', args: [] },
                    { name: 'Inactive', args: [] },
                    { name: 'Pending', args: [] }
                ]
            }
        };

        const result = generateCreateTableForTest(struct, [], unionTypeMap);

        assert.ok(result.sql.includes('CHECK'), 'should include CHECK constraint');
        assert.ok(result.sql.includes("'Active'"), 'should include Active variant');
        assert.ok(result.sql.includes("'Inactive'"), 'should include Inactive variant');
        assert.ok(result.sql.includes("'Pending'"), 'should include Pending variant');
    });

    test('does not generate CHECK for non-enum union type', () => {
        const struct = {
            tableName: 'results',
            structName: 'Result',
            fields: [
                {
                    name: 'id',
                    rustType: 'String',
                    sqlType: 'TEXT',
                    constraints: ['PRIMARY KEY'],
                    isPrimaryKey: true
                },
                {
                    name: 'value',
                    rustType: 'Result',
                    sqlType: 'TEXT',
                    constraints: ['NOT NULL']
                }
            ]
        };

        const unionTypeMap = {
            Result: {
                name: 'Result',
                typeParams: [],
                variants: [
                    { name: 'Ok', args: ['String'] },
                    { name: 'Err', args: ['String'] }
                ]
            }
        };

        const result = generateCreateTableForTest(struct, [], unionTypeMap);

        assert.ok(!result.sql.includes('CHECK'), 'should not include CHECK constraint for non-enum type');
    });

    test('handles Maybe enum type', () => {
        const struct = {
            tableName: 'items',
            structName: 'Item',
            fields: [
                {
                    name: 'id',
                    rustType: 'String',
                    sqlType: 'TEXT',
                    constraints: ['PRIMARY KEY'],
                    isPrimaryKey: true
                },
                {
                    name: 'status',
                    rustType: 'Maybe Status',
                    sqlType: 'TEXT',
                    constraints: []
                }
            ]
        };

        const unionTypeMap = {
            Status: {
                name: 'Status',
                typeParams: [],
                variants: [
                    { name: 'Active', args: [] },
                    { name: 'Inactive', args: [] }
                ]
            }
        };

        const result = generateCreateTableForTest(struct, [], unionTypeMap);

        assert.ok(result.sql.includes('CHECK'), 'should include CHECK constraint for Maybe enum type');
        assert.ok(result.sql.includes("'Active'"), 'should include Active variant');
    });

    test('handles field with no matching union type', () => {
        const struct = {
            tableName: 'items',
            structName: 'Item',
            fields: [
                {
                    name: 'id',
                    rustType: 'String',
                    sqlType: 'TEXT',
                    constraints: ['PRIMARY KEY'],
                    isPrimaryKey: true
                },
                {
                    name: 'title',
                    rustType: 'String',
                    sqlType: 'TEXT',
                    constraints: ['NOT NULL']
                }
            ]
        };

        const unionTypeMap = {};

        const result = generateCreateTableForTest(struct, [], unionTypeMap);

        assert.ok(!result.sql.includes('CHECK'), 'should not include CHECK for regular fields');
    });
});

// =============================================================================
// MULTITENANT AND SOFTDELETE CONDITIONAL COLUMNS
// =============================================================================

describe('SQL Generator - MultiTenant and SoftDelete Conditional Columns', () => {
    test('does NOT auto-add host column if model has MultiTenant field', () => {
        const struct = {
            tableName: 'posts',
            structName: 'Post',
            filename: 'Post.elm',
            isMultiTenant: true,
            isSoftDelete: false,
            multiTenantFieldName: 'host',
            softDeleteFieldName: null,
            fields: [
                {
                    name: 'id',
                    rustType: 'DatabaseId String',
                    sqlType: 'TEXT',
                    constraints: ['PRIMARY KEY'],
                    isPrimaryKey: true
                },
                {
                    name: 'host',
                    rustType: 'MultiTenant',
                    sqlType: 'TEXT',
                    constraints: ['NOT NULL'],
                    isMultiTenant: true
                },
                {
                    name: 'title',
                    rustType: 'String',
                    sqlType: 'TEXT',
                    constraints: ['NOT NULL']
                }
            ]
        };

        const result = generateCreateTableForTest(struct, [], {});

        // Count occurrences of 'host TEXT' - should be exactly 1 (from the explicit field)
        const hostMatches = result.sql.match(/host TEXT/g) || [];
        assert.strictEqual(hostMatches.length, 1, 'should have exactly one host column (from explicit field)');
    });

    test('does NOT auto-add deleted_at if model has SoftDelete field', () => {
        const struct = {
            tableName: 'posts',
            structName: 'Post',
            filename: 'Post.elm',
            isMultiTenant: false,
            isSoftDelete: true,
            multiTenantFieldName: null,
            softDeleteFieldName: 'deleted_at',
            fields: [
                {
                    name: 'id',
                    rustType: 'DatabaseId String',
                    sqlType: 'TEXT',
                    constraints: ['PRIMARY KEY'],
                    isPrimaryKey: true
                },
                {
                    name: 'deleted_at',
                    rustType: 'SoftDelete',
                    sqlType: 'BIGINT',
                    constraints: [],
                    isSoftDelete: true
                }
            ]
        };

        const result = generateCreateTableForTest(struct, [], {});

        // Count occurrences of 'deleted_at' - should be exactly 1 (from the explicit field)
        const deletedMatches = result.sql.match(/deleted_at/g) || [];
        assert.strictEqual(deletedMatches.length, 1, 'should have exactly one deleted_at column (from explicit field)');
    });

    test('auto-adds host for backward compat if no MultiTenant field', () => {
        const struct = {
            tableName: 'posts',
            structName: 'Post',
            filename: 'Post.elm',
            isMultiTenant: false,
            isSoftDelete: false,
            multiTenantFieldName: null,
            softDeleteFieldName: null,
            fields: [
                {
                    name: 'id',
                    rustType: 'DatabaseId String',
                    sqlType: 'TEXT',
                    constraints: ['PRIMARY KEY'],
                    isPrimaryKey: true
                },
                {
                    name: 'title',
                    rustType: 'String',
                    sqlType: 'TEXT',
                    constraints: ['NOT NULL']
                }
            ]
        };

        const result = generateCreateTableForTest(struct, [], {});

        // Should auto-add host column
        assert.ok(result.sql.includes('host TEXT NOT NULL'), 'should auto-add host column for backward compat');
    });

    test('does NOT auto-add deleted_at when isSoftDelete is false', () => {
        const struct = {
            tableName: 'posts',
            structName: 'Post',
            filename: 'Post.elm',
            isMultiTenant: false,
            isSoftDelete: false,
            multiTenantFieldName: null,
            softDeleteFieldName: null,
            fields: [
                {
                    name: 'id',
                    rustType: 'DatabaseId String',
                    sqlType: 'TEXT',
                    constraints: ['PRIMARY KEY'],
                    isPrimaryKey: true
                }
            ]
        };

        const result = generateCreateTableForTest(struct, [], {});

        // deleted_at is NO LONGER auto-added - models must explicitly use SoftDelete type
        assert.ok(!result.sql.includes('deleted_at'), 'should not auto-add deleted_at when not using SoftDelete');
    });

    test('generates host index only for MultiTenant models', () => {
        const structMultiTenant = {
            tableName: 'posts',
            structName: 'Post',
            filename: 'Post.elm',
            isMultiTenant: true,
            isSoftDelete: false,
            multiTenantFieldName: 'host',
            softDeleteFieldName: null,
            fields: [
                {
                    name: 'id',
                    rustType: 'DatabaseId String',
                    sqlType: 'TEXT',
                    constraints: ['PRIMARY KEY'],
                    isPrimaryKey: true
                },
                {
                    name: 'host',
                    rustType: 'MultiTenant',
                    sqlType: 'TEXT',
                    constraints: ['NOT NULL'],
                    isMultiTenant: true
                }
            ]
        };

        const result = generateCreateTableForTest(structMultiTenant, [], {});

        assert.ok(result.sql.includes('CREATE INDEX idx_posts_host'), 'should create host index for MultiTenant model');
    });

    test('generates index with actual MultiTenant field name', () => {
        const struct = {
            tableName: 'posts',
            structName: 'Post',
            filename: 'Post.elm',
            isMultiTenant: true,
            isSoftDelete: false,
            multiTenantFieldName: 'tenant',
            softDeleteFieldName: null,
            fields: [
                {
                    name: 'id',
                    rustType: 'DatabaseId String',
                    sqlType: 'TEXT',
                    constraints: ['PRIMARY KEY'],
                    isPrimaryKey: true
                },
                {
                    name: 'tenant',
                    rustType: 'MultiTenant',
                    sqlType: 'TEXT',
                    constraints: ['NOT NULL'],
                    isMultiTenant: true
                }
            ]
        };

        const result = generateCreateTableForTest(struct, [], {});

        assert.ok(result.sql.includes('CREATE INDEX idx_posts_tenant ON posts(tenant)'),
            'should create index with actual field name');
    });

    test('model with both MultiTenant and SoftDelete fields', () => {
        const struct = {
            tableName: 'posts',
            structName: 'Post',
            filename: 'Post.elm',
            isMultiTenant: true,
            isSoftDelete: true,
            multiTenantFieldName: 'host',
            softDeleteFieldName: 'deleted_at',
            fields: [
                {
                    name: 'id',
                    rustType: 'DatabaseId String',
                    sqlType: 'TEXT',
                    constraints: ['PRIMARY KEY'],
                    isPrimaryKey: true
                },
                {
                    name: 'host',
                    rustType: 'MultiTenant',
                    sqlType: 'TEXT',
                    constraints: ['NOT NULL'],
                    isMultiTenant: true
                },
                {
                    name: 'deleted_at',
                    rustType: 'SoftDelete',
                    sqlType: 'BIGINT',
                    constraints: [],
                    isSoftDelete: true
                }
            ]
        };

        const result = generateCreateTableForTest(struct, [], {});

        // Count host occurrences - should be exactly 1
        const hostMatches = result.sql.match(/host TEXT/g) || [];
        assert.strictEqual(hostMatches.length, 1, 'should have exactly one host column');

        // Count deleted_at occurrences - should be exactly 1
        const deletedMatches = result.sql.match(/deleted_at BIGINT/g) || [];
        assert.strictEqual(deletedMatches.length, 1, 'should have exactly one deleted_at column');
    });
});

// =============================================================================
// generateSchema TESTS
// =============================================================================

describe('SQL Generator - generateSchema with Union Types', () => {
    test('passes union types to CREATE TABLE generation', () => {
        const structs = [
            {
                tableName: 'tasks',
                structName: 'Task',
                fields: [
                    {
                        name: 'id',
                        rustType: 'String',
                        sqlType: 'TEXT',
                        constraints: ['PRIMARY KEY'],
                        isPrimaryKey: true
                    },
                    {
                        name: 'priority',
                        rustType: 'Priority',
                        sqlType: 'TEXT',
                        constraints: ['NOT NULL']
                    }
                ]
            }
        ];

        const unionTypes = [
            {
                name: 'Priority',
                typeParams: [],
                variants: [
                    { name: 'Low', args: [] },
                    { name: 'Medium', args: [] },
                    { name: 'High', args: [] }
                ]
            }
        ];

        const result = generateSchemaForTest(structs, unionTypes);

        assert.ok(result.schema.includes('CHECK'), 'should include CHECK constraint');
        assert.ok(result.schema.includes("'Low'"), 'should include Low variant');
        assert.ok(result.schema.includes("'Medium'"), 'should include Medium variant');
        assert.ok(result.schema.includes("'High'"), 'should include High variant');
    });

    test('works with empty union types array', () => {
        const structs = [
            {
                tableName: 'simple',
                structName: 'Simple',
                fields: [
                    {
                        name: 'id',
                        rustType: 'String',
                        sqlType: 'TEXT',
                        constraints: ['PRIMARY KEY'],
                        isPrimaryKey: true
                    }
                ]
            }
        ];

        const result = generateSchemaForTest(structs, []);

        assert.ok(result.schema.includes('CREATE TABLE'), 'should generate CREATE TABLE');
        assert.ok(!result.schema.includes('CHECK'), 'should not include CHECK without union types');
    });
});
