/**
 * SQL Generator Tests
 * Tests for SQL schema generation from Rust models
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('SQL Generator', () => {
    test('generateSqlMigrations function exists', async () => {
        const { generateSqlMigrations } = await import('../lib/generators/sql.js');
        assert.ok(typeof generateSqlMigrations === 'function', 'generateSqlMigrations should be a function');
    });

    test('module exports default function', async () => {
        const sqlModule = await import('../lib/generators/sql.js');
        assert.ok(typeof sqlModule.default === 'function', 'default export should be a function');
    });
});

describe('Rust Type to SQL Mapping', () => {
    // Import the module to access internal functions via a test helper
    // Since rustTypeToSql is not exported, we'll test via parseRustStruct output

    test('parses struct with DatabaseId field', async () => {
        const { parseRustStructForTest } = await import('../lib/generators/sql.js');

        const rustCode = `
pub struct User {
    pub id: DatabaseId<String>,
    pub name: String,
}`;
        const structs = parseRustStructForTest(rustCode, 'user.rs');

        assert.strictEqual(structs.length, 1);
        assert.strictEqual(structs[0].name, 'User');
        assert.strictEqual(structs[0].tableName, 'user');

        const idField = structs[0].fields.find(f => f.name === 'id');
        assert.ok(idField, 'should have id field');
        assert.strictEqual(idField.sqlType, 'TEXT');
        assert.ok(idField.constraints.includes('PRIMARY KEY'));
        assert.ok(idField.isPrimaryKey);
    });

    test('parses struct with Timestamp field', async () => {
        const { parseRustStructForTest } = await import('../lib/generators/sql.js');

        const rustCode = `
pub struct Event {
    pub id: DatabaseId<String>,
    pub created_at: Timestamp,
}`;
        const structs = parseRustStructForTest(rustCode, 'event.rs');

        const tsField = structs[0].fields.find(f => f.name === 'created_at');
        assert.ok(tsField, 'should have created_at field');
        assert.strictEqual(tsField.sqlType, 'BIGINT');
        assert.ok(tsField.isTimestamp);
    });

    test('parses struct with Option field', async () => {
        const { parseRustStructForTest } = await import('../lib/generators/sql.js');

        const rustCode = `
pub struct Post {
    pub id: DatabaseId<String>,
    pub description: Option<String>,
}`;
        const structs = parseRustStructForTest(rustCode, 'post.rs');

        const optField = structs[0].fields.find(f => f.name === 'description');
        assert.ok(optField, 'should have description field');
        assert.strictEqual(optField.sqlType, 'TEXT');
        assert.ok(optField.isOptional);
        // Optional fields should NOT have NOT NULL constraint
        assert.ok(!optField.constraints.includes('NOT NULL'), 'optional field should not have NOT NULL');
    });

    test('parses struct with required String field', async () => {
        const { parseRustStructForTest } = await import('../lib/generators/sql.js');

        const rustCode = `
pub struct Item {
    pub id: DatabaseId<String>,
    pub title: String,
}`;
        const structs = parseRustStructForTest(rustCode, 'item.rs');

        const titleField = structs[0].fields.find(f => f.name === 'title');
        assert.ok(titleField, 'should have title field');
        assert.strictEqual(titleField.sqlType, 'TEXT');
        assert.ok(titleField.constraints.includes('NOT NULL'), 'required String should have NOT NULL');
    });

    test('parses struct with i32 field', async () => {
        const { parseRustStructForTest } = await import('../lib/generators/sql.js');

        const rustCode = `
pub struct Counter {
    pub id: DatabaseId<String>,
    pub count: i32,
}`;
        const structs = parseRustStructForTest(rustCode, 'counter.rs');

        const countField = structs[0].fields.find(f => f.name === 'count');
        assert.ok(countField, 'should have count field');
        assert.strictEqual(countField.sqlType, 'INTEGER');
    });

    test('parses struct with Vec field', async () => {
        const { parseRustStructForTest } = await import('../lib/generators/sql.js');

        const rustCode = `
pub struct Article {
    pub id: DatabaseId<String>,
    pub tags: Vec<String>,
}`;
        const structs = parseRustStructForTest(rustCode, 'article.rs');

        const tagsField = structs[0].fields.find(f => f.name === 'tags');
        assert.ok(tagsField, 'should have tags field');
        assert.strictEqual(tagsField.sqlType, 'JSONB');
    });
});

describe('Table Name Generation', () => {
    test('converts CamelCase to snake_case (singular)', async () => {
        const { parseRustStructForTest } = await import('../lib/generators/sql.js');

        const testCases = [
            { struct: 'User', expected: 'user' },
            { struct: 'BlogPost', expected: 'blog_post' },
            { struct: 'ItemComment', expected: 'item_comment' },
            { struct: 'MicroblogItem', expected: 'microblog_item' },
        ];

        for (const { struct, expected } of testCases) {
            const rustCode = `pub struct ${struct} { pub id: DatabaseId<String>, }`;
            const structs = parseRustStructForTest(rustCode, 'test.rs');
            assert.strictEqual(structs[0].tableName, expected, `${struct} should become ${expected}`);
        }
    });
});

describe('CREATE TABLE Generation', () => {
    test('generates valid CREATE TABLE statement', async () => {
        const { generateCreateTableForTest } = await import('../lib/generators/sql.js');

        const struct = {
            name: 'User',
            tableName: 'user',
            filename: 'user.rs',
            fields: [
                { name: 'id', sqlType: 'TEXT', constraints: ['PRIMARY KEY', "DEFAULT gen_random_uuid()"], isPrimaryKey: true },
                { name: 'name', sqlType: 'TEXT', constraints: ['NOT NULL'] },
                { name: 'email', sqlType: 'TEXT', constraints: [] },
            ]
        };

        const result = generateCreateTableForTest(struct, []);

        assert.ok(result.sql.includes('CREATE TABLE user'), 'should have CREATE TABLE');
        assert.ok(result.sql.includes('id TEXT PRIMARY KEY'), 'should have primary key');
        assert.ok(result.sql.includes('name TEXT NOT NULL'), 'should have NOT NULL field');
        assert.ok(result.sql.includes('email TEXT'), 'should have optional field');
        assert.ok(result.sql.includes('host TEXT NOT NULL'), 'should add host column');
        assert.ok(result.sql.includes('created_at TIMESTAMP'), 'should add created_at');
        assert.ok(result.sql.includes('idx_user_host'), 'should create host index');
    });

    test('does not duplicate standard columns if already present', async () => {
        const { generateCreateTableForTest } = await import('../lib/generators/sql.js');

        const struct = {
            name: 'Event',
            tableName: 'event',
            filename: 'event.rs',
            fields: [
                { name: 'id', sqlType: 'TEXT', constraints: ['PRIMARY KEY'] },
                { name: 'host', sqlType: 'TEXT', constraints: ['NOT NULL'] },
                { name: 'created_at', sqlType: 'BIGINT', constraints: ['NOT NULL'] },
            ]
        };

        const result = generateCreateTableForTest(struct, []);

        // Count occurrences of 'host' - should only appear once in columns (plus once in index name)
        const hostMatches = result.sql.match(/host TEXT/g);
        assert.strictEqual(hostMatches?.length, 1, 'host should appear only once as column');
    });
});

describe('Foreign Key Detection', () => {
    test('detects simple foreign key reference', async () => {
        const { generateCreateTableForTest } = await import('../lib/generators/sql.js');

        const struct = {
            name: 'Comment',
            tableName: 'comment',
            filename: 'comment.rs',
            fields: [
                { name: 'id', sqlType: 'TEXT', constraints: ['PRIMARY KEY'] },
                { name: 'user_id', sqlType: 'TEXT', constraints: ['NOT NULL'] },
                { name: 'text', sqlType: 'TEXT', constraints: ['NOT NULL'] },
            ]
        };

        const knownTables = ['users', 'comments', 'posts'];
        const result = generateCreateTableForTest(struct, knownTables);

        assert.ok(result.sql.includes('FOREIGN KEY (user_id) REFERENCES users(id)'), 'should generate FK constraint');
        assert.strictEqual(result.foreignKeys.length, 1);
        assert.strictEqual(result.foreignKeys[0].column, 'user_id');
        assert.strictEqual(result.foreignKeys[0].referencedTable, 'users');
    });

    test('detects foreign key to prefixed table', async () => {
        const { generateCreateTableForTest } = await import('../lib/generators/sql.js');

        const struct = {
            name: 'ItemComment',
            tableName: 'item_comment',
            filename: 'item_comment.rs',
            fields: [
                { name: 'id', sqlType: 'TEXT', constraints: ['PRIMARY KEY'] },
                { name: 'item_id', sqlType: 'TEXT', constraints: ['NOT NULL'] },
            ]
        };

        // item_id should find microblog_item (singular)
        const knownTables = ['microblog_item', 'item_comment'];
        const result = generateCreateTableForTest(struct, knownTables);

        assert.ok(result.sql.includes('FOREIGN KEY (item_id) REFERENCES microblog_item(id)'), 'should find prefixed table');
        assert.strictEqual(result.foreignKeys[0].referencedTable, 'microblog_item');
    });

    test('warns when referenced table not found', async () => {
        const { generateCreateTableForTest } = await import('../lib/generators/sql.js');

        const struct = {
            name: 'Orphan',
            tableName: 'orphan',
            filename: 'orphan.rs',
            fields: [
                { name: 'id', sqlType: 'TEXT', constraints: ['PRIMARY KEY'] },
                { name: 'nonexistent_id', sqlType: 'TEXT', constraints: ['NOT NULL'] },
            ]
        };

        const knownTables = ['orphans'];
        const result = generateCreateTableForTest(struct, knownTables);

        assert.ok(!result.sql.includes('FOREIGN KEY'), 'should not generate FK for missing table');
        assert.strictEqual(result.warnings.length, 1);
        assert.ok(result.warnings[0].includes('nonexistent_id'), 'warning should mention the field');
    });

    test('ignores primary key id field', async () => {
        const { generateCreateTableForTest } = await import('../lib/generators/sql.js');

        const struct = {
            name: 'Simple',
            tableName: 'simple',
            filename: 'simple.rs',
            fields: [
                { name: 'id', sqlType: 'TEXT', constraints: ['PRIMARY KEY'] },
            ]
        };

        const result = generateCreateTableForTest(struct, ['simples']);

        assert.strictEqual(result.foreignKeys.length, 0, 'id should not be treated as FK');
        assert.strictEqual(result.warnings.length, 0);
    });
});

describe('Schema Introspection', () => {
    test('generateSchemaIntrospection function exists', async () => {
        const { generateSchemaIntrospection } = await import('../lib/generators/sql.js');
        assert.ok(typeof generateSchemaIntrospection === 'function');
    });
});

describe('Full Schema Generation', () => {
    test('generates schema header', async () => {
        const { generateSchemaForTest } = await import('../lib/generators/sql.js');

        const structs = [{
            name: 'Test',
            tableName: 'test',
            filename: 'test.rs',
            fields: [{ name: 'id', sqlType: 'TEXT', constraints: ['PRIMARY KEY'] }]
        }];

        const result = generateSchemaForTest(structs);

        assert.ok(result.schema.includes('BuildAmp Generated Schema'), 'should have header');
        assert.ok(result.schema.includes('DO NOT EDIT'), 'should have warning');
    });

    test('generates multiple tables', async () => {
        const { generateSchemaForTest } = await import('../lib/generators/sql.js');

        const structs = [
            { name: 'User', tableName: 'user', filename: 'user.rs', fields: [{ name: 'id', sqlType: 'TEXT', constraints: ['PRIMARY KEY'] }] },
            { name: 'Post', tableName: 'post', filename: 'post.rs', fields: [{ name: 'id', sqlType: 'TEXT', constraints: ['PRIMARY KEY'] }] },
        ];

        const result = generateSchemaForTest(structs);

        assert.ok(result.schema.includes('CREATE TABLE user'), 'should have user table');
        assert.ok(result.schema.includes('CREATE TABLE post'), 'should have post table');
    });

    test('collects foreign keys across tables', async () => {
        const { generateSchemaForTest } = await import('../lib/generators/sql.js');

        const structs = [
            { name: 'User', tableName: 'user', filename: 'user.rs', fields: [
                { name: 'id', sqlType: 'TEXT', constraints: ['PRIMARY KEY'] }
            ]},
            { name: 'Post', tableName: 'post', filename: 'post.rs', fields: [
                { name: 'id', sqlType: 'TEXT', constraints: ['PRIMARY KEY'] },
                { name: 'user_id', sqlType: 'TEXT', constraints: ['NOT NULL'] }
            ]},
        ];

        const result = generateSchemaForTest(structs);

        assert.strictEqual(result.foreignKeys.length, 1);
        assert.strictEqual(result.foreignKeys[0].table, 'post');
        assert.strictEqual(result.foreignKeys[0].column, 'user_id');
        assert.strictEqual(result.foreignKeys[0].referencedTable, 'user');
    });
});
