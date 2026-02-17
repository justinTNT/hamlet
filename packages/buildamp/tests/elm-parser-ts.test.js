/**
 * Tree-Sitter Elm Parser Tests
 * Tests for the AST-based Elm parser
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import {
    parseElmSource,
    parseElmSchemaFile,
    parseElmSchemaDir,
    parseElmApiDir,
    parseApiModule,
    parseElmKvDir,
    parseElmStorageDir,
    parseElmSseDir,
    _test
} from '../core/elm-parser-ts.js';

const {
    camelToSnake,
    typeNameToTableName,
    elmTypeToSql,
    extractForeignKeyTable,
    parseTypeExpression,
    parseGenericModule,
    elmTypeToSchemaFormat
} = _test;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

describe('Elm Parser TS - Utility Functions', () => {
    test('camelToSnake converts camelCase to snake_case', () => {
        assert.strictEqual(camelToSnake('createdAt'), 'created_at');
        assert.strictEqual(camelToSnake('userId'), 'user_id');
        assert.strictEqual(camelToSnake('firstName'), 'first_name');
    });

    test('camelToSnake handles single words', () => {
        assert.strictEqual(camelToSnake('name'), 'name');
        assert.strictEqual(camelToSnake('id'), 'id');
    });

    test('typeNameToTableName converts PascalCase to snake_case', () => {
        assert.strictEqual(typeNameToTableName('MicroblogItem'), 'microblog_item');
        assert.strictEqual(typeNameToTableName('User'), 'user');
        assert.strictEqual(typeNameToTableName('GuestSession'), 'guest_session');
    });
});

// =============================================================================
// SQL TYPE MAPPING
// =============================================================================

describe('Elm Parser TS - SQL Type Mapping', () => {
    test('maps DatabaseId to TEXT PRIMARY KEY', () => {
        const result = elmTypeToSql('DatabaseId User', 'id');
        assert.strictEqual(result.sqlType, 'TEXT');
        assert.ok(result.constraints.includes('PRIMARY KEY'));
        assert.ok(result.constraints.some(c => c.includes('gen_random_uuid')));
    });

    test('maps Timestamp to BIGINT', () => {
        const result = elmTypeToSql('Timestamp', 'created_at');
        assert.strictEqual(result.sqlType, 'BIGINT');
        assert.ok(result.constraints.includes('NOT NULL'));
    });

    test('maps Host to TEXT NOT NULL', () => {
        const result = elmTypeToSql('Host', 'host');
        assert.strictEqual(result.sqlType, 'TEXT');
        assert.ok(result.constraints.includes('NOT NULL'));
    });

    test('maps String to TEXT', () => {
        const result = elmTypeToSql('String', 'name');
        assert.strictEqual(result.sqlType, 'TEXT');
        assert.ok(result.constraints.includes('NOT NULL'));
    });

    test('maps Int to INTEGER', () => {
        const result = elmTypeToSql('Int', 'count');
        assert.strictEqual(result.sqlType, 'INTEGER');
    });

    test('maps Float to DOUBLE PRECISION', () => {
        const result = elmTypeToSql('Float', 'price');
        assert.strictEqual(result.sqlType, 'DOUBLE PRECISION');
    });

    test('maps Bool to BOOLEAN', () => {
        const result = elmTypeToSql('Bool', 'active');
        assert.strictEqual(result.sqlType, 'BOOLEAN');
    });

    test('maps Maybe type to nullable', () => {
        const result = elmTypeToSql('Maybe String', 'bio');
        assert.strictEqual(result.sqlType, 'TEXT');
        assert.strictEqual(result.constraints.length, 0); // No NOT NULL
    });

    test('maps List to JSONB array', () => {
        const result = elmTypeToSql('List String', 'tags');
        assert.strictEqual(result.sqlType, 'JSONB');
        assert.ok(result.constraints.some(c => c.includes("'[]'")));
    });

    test('maps ForeignKey to TEXT NOT NULL', () => {
        const result = elmTypeToSql('ForeignKey User String', 'user_id');
        assert.strictEqual(result.sqlType, 'TEXT');
        assert.ok(result.constraints.includes('NOT NULL'));
    });

    test('maps RichContent to JSONB', () => {
        const result = elmTypeToSql('RichContent', 'content');
        assert.strictEqual(result.sqlType, 'JSONB');
        assert.ok(result.constraints.includes('NOT NULL'));
    });
});

// =============================================================================
// FOREIGN KEY EXTRACTION
// =============================================================================

describe('Elm Parser TS - Foreign Key Extraction', () => {
    test('extracts table from ForeignKey type', () => {
        assert.strictEqual(extractForeignKeyTable('ForeignKey User String'), 'user');
        assert.strictEqual(extractForeignKeyTable('ForeignKey MicroblogItem String'), 'microblog_item');
    });

    test('returns null for non-ForeignKey types', () => {
        assert.strictEqual(extractForeignKeyTable('String'), null);
        assert.strictEqual(extractForeignKeyTable('Maybe Int'), null);
    });
});

// =============================================================================
// TYPE ALIAS PARSING
// =============================================================================

describe('Elm Parser TS - Type Alias Parsing', () => {
    test('parses simple record type alias', () => {
        const source = `
module Test exposing (..)

type alias User =
    { id : String
    , name : String
    }
`;
        const result = parseElmSource(source);
        assert.strictEqual(result.typeAliases.length, 1);
        assert.strictEqual(result.typeAliases[0].name, 'User');
        assert.strictEqual(result.typeAliases[0].isRecord, true);
        assert.strictEqual(result.typeAliases[0].fields.length, 2);
    });

    test('parses multiple type aliases', () => {
        const source = `
module Test exposing (..)

type alias User =
    { id : String
    }

type alias Post =
    { title : String
    }
`;
        const result = parseElmSource(source);
        assert.strictEqual(result.typeAliases.length, 2);
        assert.strictEqual(result.typeAliases[0].name, 'User');
        assert.strictEqual(result.typeAliases[1].name, 'Post');
    });

    test('parses framework types in fields', () => {
        const source = `
module Schema.Post exposing (..)

type alias Post =
    { id : DatabaseId Post
    , host : Host
    , authorId : ForeignKey User String
    , createdAt : Timestamp
    }
`;
        const result = parseElmSource(source);
        const post = result.typeAliases[0];

        assert.strictEqual(post.fields.find(f => f.name === 'id').elmType, 'DatabaseId Post');
        assert.strictEqual(post.fields.find(f => f.name === 'host').elmType, 'Host');
        assert.strictEqual(post.fields.find(f => f.name === 'authorId').elmType, 'ForeignKey User String');
        assert.strictEqual(post.fields.find(f => f.name === 'createdAt').elmType, 'Timestamp');
    });

    test('parses Maybe and List types', () => {
        const source = `
module Test exposing (..)

type alias User =
    { bio : Maybe String
    , tags : List String
    }
`;
        const result = parseElmSource(source);
        const fields = result.typeAliases[0].fields;

        assert.strictEqual(fields.find(f => f.name === 'bio').elmType, 'Maybe String');
        assert.strictEqual(fields.find(f => f.name === 'tags').elmType, 'List String');
    });

    test('handles nested records', () => {
        const source = `
module Test exposing (..)

type alias User =
    { name : String
    , address : { street : String, city : String }
    }
`;
        const result = parseElmSource(source);
        const address = result.typeAliases[0].fields.find(f => f.name === 'address');

        assert.ok(address.elmType.includes('street'));
        assert.ok(address.elmType.includes('city'));
    });
});

// =============================================================================
// UNION TYPE PARSING
// =============================================================================

describe('Elm Parser TS - Union Type Parsing', () => {
    test('parses simple union type', () => {
        const source = `
module Test exposing (..)

type Visibility
    = Public
    | Private
    | Unlisted
`;
        const result = parseElmSource(source);
        assert.strictEqual(result.unionTypes.length, 1);

        const visibility = result.unionTypes[0];
        assert.strictEqual(visibility.name, 'Visibility');
        assert.strictEqual(visibility.variants.length, 3);
        assert.deepStrictEqual(visibility.variants.map(v => v.name), ['Public', 'Private', 'Unlisted']);
    });

    test('parses union type with arguments', () => {
        const source = `
module Test exposing (..)

type Status
    = Draft
    | Published Int
    | Error String
`;
        const result = parseElmSource(source);
        const status = result.unionTypes[0];

        assert.strictEqual(status.variants.find(v => v.name === 'Draft').args.length, 0);
        assert.strictEqual(status.variants.find(v => v.name === 'Published').args[0], 'Int');
        assert.strictEqual(status.variants.find(v => v.name === 'Error').args[0], 'String');
    });

    test('parses union type with multiple arguments', () => {
        const source = `
module Test exposing (..)

type Event
    = Click Int Int
    | Input String Bool
`;
        const result = parseElmSource(source);
        const event = result.unionTypes[0];

        assert.strictEqual(event.variants.find(v => v.name === 'Click').args.length, 2);
        assert.strictEqual(event.variants.find(v => v.name === 'Input').args.length, 2);
    });

    test('parses union type with type parameters', () => {
        const source = `
module Test exposing (..)

type Maybe a
    = Just a
    | Nothing
`;
        const result = parseElmSource(source);
        const maybe = result.unionTypes[0];

        assert.strictEqual(maybe.name, 'Maybe');
        assert.deepStrictEqual(maybe.typeParams, ['a']);
    });

    test('parses multiple union types', () => {
        const source = `
module Test exposing (..)

type Color = Red | Green | Blue

type Size = Small | Medium | Large
`;
        const result = parseElmSource(source);
        assert.strictEqual(result.unionTypes.length, 2);
    });
});

// =============================================================================
// MODULE NAME PARSING
// =============================================================================

describe('Elm Parser TS - Module Name Parsing', () => {
    test('extracts simple module name', () => {
        const source = 'module User exposing (..)';
        const result = parseElmSource(source);
        assert.strictEqual(result.moduleName, 'User');
    });

    test('extracts qualified module name', () => {
        const source = 'module Schema.MicroblogItem exposing (..)';
        const result = parseElmSource(source);
        assert.strictEqual(result.moduleName, 'Schema.MicroblogItem');
    });

    test('extracts deeply nested module name', () => {
        const source = 'module Api.Handlers.GetFeed exposing (..)';
        const result = parseElmSource(source);
        assert.strictEqual(result.moduleName, 'Api.Handlers.GetFeed');
    });
});

// =============================================================================
// SCHEMA FILE PARSING
// =============================================================================

describe('Elm Parser TS - Schema File Parsing', () => {
    const testDir = path.join(process.cwd(), 'tmp-test-elm-parser-ts');

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

    test('parseElmSchemaFile returns generator-compatible format', () => {
        const filePath = path.join(testDir, 'Post.elm');
        fs.writeFileSync(filePath, `
module Schema.Post exposing (..)

type alias Post =
    { id : DatabaseId Post
    , host : Host
    , title : String
    , authorId : ForeignKey User String
    , createdAt : Timestamp
    }
`);

        const result = parseElmSchemaFile(filePath);
        assert.strictEqual(result.length, 1);

        const post = result[0];
        assert.strictEqual(post.name, 'Post');
        assert.strictEqual(post.tableName, 'post');
        assert.strictEqual(post.fields.length, 5);

        // Check field format
        const idField = post.fields.find(f => f.name === 'id');
        assert.strictEqual(idField.rustType, 'DatabaseId Post');
        assert.strictEqual(idField.sqlType, 'TEXT');
        assert.strictEqual(idField.isPrimaryKey, true);

        const fkField = post.fields.find(f => f.name === 'author_id');
        assert.strictEqual(fkField.isForeignKey, true);
        assert.strictEqual(fkField.referencedTable, 'user');
    });

    test('parseElmSchemaDir parses all files', () => {
        fs.writeFileSync(path.join(testDir, 'Post.elm'), `
module Schema.Post exposing (..)
type alias Post = { id : String }
`);
        fs.writeFileSync(path.join(testDir, 'User.elm'), `
module Schema.User exposing (..)
type alias User = { id : String }
`);

        const result = parseElmSchemaDir(testDir);
        assert.strictEqual(result.length, 2);
    });

    test('parseElmSchemaDir skips Schema.elm', () => {
        fs.writeFileSync(path.join(testDir, 'Post.elm'), `
module Schema.Post exposing (..)
type alias Post = { id : String }
`);
        fs.writeFileSync(path.join(testDir, 'Schema.elm'), `
module Schema exposing (..)
type alias Schema = { version : Int }
`);

        const result = parseElmSchemaDir(testDir);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].name, 'Post');
    });

    test('parseElmSchemaFile returns empty array for non-existent file', () => {
        const result = parseElmSchemaFile('/nonexistent/path.elm');
        assert.deepStrictEqual(result, []);
    });
});

// =============================================================================
// API PARSING
// =============================================================================

describe('Elm Parser TS - API Parsing', () => {
    test('parseApiModule extracts endpoint info', () => {
        const source = `
module Api.GetFeed exposing (..)

type alias Request =
    { page : Int
    , limit : Int
    }

type alias Response =
    { items : List Item
    }
`;
        const result = parseApiModule(source, 'GetFeed.elm');

        assert.strictEqual(result.name, 'GetFeed');
        assert.strictEqual(result.moduleName, 'Api.GetFeed');
        assert.ok(result.request);
        assert.ok(result.response);
        assert.strictEqual(result.request.fields.length, 2);
    });

    test('parseApiModule extracts server context', () => {
        const source = `
module Api.CreatePost exposing (..)

type alias Request = { title : String }
type alias Response = { id : String }
type alias ServerContext = { userId : String }
`;
        const result = parseApiModule(source, 'CreatePost.elm');

        assert.ok(result.serverContext);
        assert.strictEqual(result.serverContext.fields[0].camelName, 'userId');
    });

    test('parseApiModule returns null for non-API module', () => {
        const source = `
module User exposing (..)
type alias User = { id : String }
`;
        const result = parseApiModule(source, 'User.elm');
        assert.strictEqual(result, null);
    });

    test('parseApiModule includes union types', () => {
        const source = `
module Api.GetStatus exposing (..)

type alias Request = { id : String }
type alias Response = { status : Status }

type Status
    = Active
    | Inactive
`;
        const result = parseApiModule(source, 'GetStatus.elm');

        assert.strictEqual(result.unionTypes.length, 1);
        assert.strictEqual(result.unionTypes[0].name, 'Status');
    });

    test('parseApiModule parses Upload (Accept "image/*") annotation', () => {
        const source = `
module Api.UploadImage exposing (..)

import Interface.Api exposing (Upload, Accept)

type alias Request =
    { file : Upload (Accept "image/*")
    }

type alias Response =
    { id : String
    , url : String
    }
`;
        const result = parseApiModule(source, 'UploadImage.elm');

        assert.ok(result);
        assert.strictEqual(result.name, 'UploadImage');
        assert.strictEqual(result.request.fields.length, 1);

        const fileField = result.request.fields[0];
        assert.strictEqual(fileField.camelName, 'file');
        assert.ok(fileField.annotations.upload, 'Should have upload annotation');
        assert.strictEqual(fileField.annotations.accept, 'image/*', 'Should extract accept mime pattern');
    });
});

// =============================================================================
// GENERIC MODEL PARSING
// =============================================================================

describe('Elm Parser TS - Generic Model Parsing', () => {
    test('parseGenericModule parses KV model', () => {
        const source = `
module Kv.SessionData exposing (..)

type alias SessionData =
    { userId : String
    , token : String
    , expiresAt : Int
    }
`;
        const result = parseGenericModule(source, 'SessionData.elm', 'Kv');

        assert.strictEqual(result.name, 'SessionData');
        assert.strictEqual(result.storageKey, 'session_data');
        assert.strictEqual(result.fields.length, 3);
    });

    test('parseGenericModule converts types to schema format', () => {
        const source = `
module Storage.Preferences exposing (..)

type alias Preferences =
    { theme : String
    , notifications : Bool
    , tags : List String
    , lastSeen : Maybe Int
    }
`;
        const result = parseGenericModule(source, 'Preferences.elm', 'Storage');

        const fields = result.fields;
        assert.strictEqual(fields.find(f => f.camelName === 'theme').type, 'String');
        assert.strictEqual(fields.find(f => f.camelName === 'notifications').type, 'bool');
        assert.strictEqual(fields.find(f => f.camelName === 'tags').type, 'Vec<String>');
        assert.strictEqual(fields.find(f => f.camelName === 'lastSeen').type, 'Option<i64>');
    });

    test('parseGenericModule includes union types', () => {
        const source = `
module Sse.Events exposing (..)

type alias Event =
    { data : String
    }

type EventType
    = Message
    | Ping
    | Error
`;
        const result = parseGenericModule(source, 'Events.elm', 'Sse');

        assert.strictEqual(result.unionTypes.length, 1);
        assert.strictEqual(result.unionTypes[0].name, 'EventType');
    });
});

// =============================================================================
// DIRECTORY PARSING
// =============================================================================

describe('Elm Parser TS - Directory Parsing', () => {
    const testDir = path.join(process.cwd(), 'tmp-test-elm-parser-ts-dirs');

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

    test('parseElmKvDir parses KV models', () => {
        fs.writeFileSync(path.join(testDir, 'Session.elm'), `
module Kv.Session exposing (..)
type alias Session = { token : String }
`);

        const result = parseElmKvDir(testDir);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].name, 'Session');
    });

    test('parseElmStorageDir parses Storage models', () => {
        fs.writeFileSync(path.join(testDir, 'Preferences.elm'), `
module Storage.Preferences exposing (..)
type alias Preferences = { theme : String }
`);

        const result = parseElmStorageDir(testDir);
        assert.strictEqual(result.length, 1);
    });

    test('parseElmSseDir parses SSE models', () => {
        fs.writeFileSync(path.join(testDir, 'Events.elm'), `
module Sse.Events exposing (..)
type alias Events = { data : String }
`);

        const result = parseElmSseDir(testDir);
        assert.strictEqual(result.length, 1);
    });

    test('parseElmApiDir parses API modules', () => {
        fs.writeFileSync(path.join(testDir, 'GetFeed.elm'), `
module Api.GetFeed exposing (..)
type alias Request = { page : Int }
type alias Response = { items : List String }
`);

        const result = parseElmApiDir(testDir);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].name, 'GetFeed');
    });

    test('directory parsers return empty array for non-existent dir', () => {
        assert.deepStrictEqual(parseElmKvDir('/nonexistent'), []);
        assert.deepStrictEqual(parseElmStorageDir('/nonexistent'), []);
        assert.deepStrictEqual(parseElmSseDir('/nonexistent'), []);
        assert.deepStrictEqual(parseElmApiDir('/nonexistent'), []);
    });

    test('directory parsers skip Framework files', () => {
        fs.writeFileSync(path.join(testDir, 'Session.elm'), `
module Kv.Session exposing (..)
type alias Session = { token : String }
`);
        fs.writeFileSync(path.join(testDir, 'Framework.elm'), `
module Kv.Framework exposing (..)
type alias Framework = { internal : String }
`);

        const result = parseElmKvDir(testDir);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].name, 'Session');
    });
});

// =============================================================================
// SCHEMA FORMAT CONVERSION
// =============================================================================

describe('Elm Parser TS - Schema Format Conversion', () => {
    test('converts basic types', () => {
        assert.strictEqual(elmTypeToSchemaFormat('String'), 'String');
        assert.strictEqual(elmTypeToSchemaFormat('Int'), 'i64');
        assert.strictEqual(elmTypeToSchemaFormat('Float'), 'f64');
        assert.strictEqual(elmTypeToSchemaFormat('Bool'), 'bool');
    });

    test('converts Maybe types', () => {
        assert.strictEqual(elmTypeToSchemaFormat('Maybe String'), 'Option<String>');
        assert.strictEqual(elmTypeToSchemaFormat('Maybe Int'), 'Option<i64>');
    });

    test('converts List types', () => {
        assert.strictEqual(elmTypeToSchemaFormat('List String'), 'Vec<String>');
        assert.strictEqual(elmTypeToSchemaFormat('List Int'), 'Vec<i64>');
    });

    test('converts Dict types', () => {
        assert.strictEqual(elmTypeToSchemaFormat('Dict String String'), 'HashMap<String, String>');
    });
});

// =============================================================================
// MULTITENANT AND SOFTDELETE DETECTION
// =============================================================================

describe('Elm Parser TS - MultiTenant and SoftDelete Detection', () => {
    test('maps MultiTenant to TEXT NOT NULL', () => {
        const result = elmTypeToSql('MultiTenant', 'host');
        assert.strictEqual(result.sqlType, 'TEXT');
        assert.ok(result.constraints.includes('NOT NULL'));
    });

    test('maps SoftDelete to nullable BIGINT', () => {
        const result = elmTypeToSql('SoftDelete', 'deleted_at');
        assert.strictEqual(result.sqlType, 'BIGINT');
        assert.strictEqual(result.constraints.length, 0); // nullable
    });

    test('detects MultiTenant field and sets model isMultiTenant flag', () => {
        const filePath = path.join(process.cwd(), 'tmp-test-multitenant.elm');
        fs.writeFileSync(filePath, `
module Schema.Post exposing (..)

type alias Post =
    { id : DatabaseId Post
    , host : MultiTenant
    , title : String
    }
`);
        try {
            const result = parseElmSchemaFile(filePath);
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].isMultiTenant, true);
            assert.strictEqual(result[0].multiTenantFieldName, 'host');
        } finally {
            fs.unlinkSync(filePath);
        }
    });

    test('detects SoftDelete field and sets model isSoftDelete flag', () => {
        const filePath = path.join(process.cwd(), 'tmp-test-softdelete.elm');
        fs.writeFileSync(filePath, `
module Schema.Post exposing (..)

type alias Post =
    { id : DatabaseId Post
    , deletedAt : SoftDelete
    }
`);
        try {
            const result = parseElmSchemaFile(filePath);
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].isSoftDelete, true);
            assert.strictEqual(result[0].softDeleteFieldName, 'deleted_at');
        } finally {
            fs.unlinkSync(filePath);
        }
    });

    test('stores actual field name for MultiTenant field', () => {
        const filePath = path.join(process.cwd(), 'tmp-test-tenant.elm');
        fs.writeFileSync(filePath, `
module Schema.Post exposing (..)

type alias Post =
    { id : DatabaseId Post
    , tenant : MultiTenant
    }
`);
        try {
            const result = parseElmSchemaFile(filePath);
            assert.strictEqual(result[0].multiTenantFieldName, 'tenant');
        } finally {
            fs.unlinkSync(filePath);
        }
    });

    test('stores actual field name for SoftDelete field', () => {
        const filePath = path.join(process.cwd(), 'tmp-test-removedat.elm');
        fs.writeFileSync(filePath, `
module Schema.Post exposing (..)

type alias Post =
    { id : DatabaseId Post
    , removedAt : SoftDelete
    }
`);
        try {
            const result = parseElmSchemaFile(filePath);
            assert.strictEqual(result[0].softDeleteFieldName, 'removed_at');
        } finally {
            fs.unlinkSync(filePath);
        }
    });

    test('model without MultiTenant/SoftDelete has flags = false', () => {
        const filePath = path.join(process.cwd(), 'tmp-test-plain.elm');
        fs.writeFileSync(filePath, `
module Schema.Post exposing (..)

type alias Post =
    { id : DatabaseId Post
    , title : String
    }
`);
        try {
            const result = parseElmSchemaFile(filePath);
            assert.strictEqual(result[0].isMultiTenant, false);
            assert.strictEqual(result[0].isSoftDelete, false);
            assert.strictEqual(result[0].multiTenantFieldName, null);
            assert.strictEqual(result[0].softDeleteFieldName, null);
        } finally {
            fs.unlinkSync(filePath);
        }
    });

    test('field has isMultiTenant flag set', () => {
        const filePath = path.join(process.cwd(), 'tmp-test-field-mt.elm');
        fs.writeFileSync(filePath, `
module Schema.Post exposing (..)

type alias Post =
    { id : DatabaseId Post
    , host : MultiTenant
    }
`);
        try {
            const result = parseElmSchemaFile(filePath);
            const hostField = result[0].fields.find(f => f.name === 'host');
            assert.strictEqual(hostField.isMultiTenant, true);
        } finally {
            fs.unlinkSync(filePath);
        }
    });

    test('field has isSoftDelete flag set', () => {
        const filePath = path.join(process.cwd(), 'tmp-test-field-sd.elm');
        fs.writeFileSync(filePath, `
module Schema.Post exposing (..)

type alias Post =
    { id : DatabaseId Post
    , deletedAt : SoftDelete
    }
`);
        try {
            const result = parseElmSchemaFile(filePath);
            const deletedField = result[0].fields.find(f => f.name === 'deleted_at');
            assert.strictEqual(deletedField.isSoftDelete, true);
        } finally {
            fs.unlinkSync(filePath);
        }
    });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Elm Parser TS - Edge Cases', () => {
    test('handles empty module', () => {
        const source = 'module Empty exposing (..)';
        const result = parseElmSource(source);

        assert.strictEqual(result.moduleName, 'Empty');
        assert.strictEqual(result.typeAliases.length, 0);
        assert.strictEqual(result.unionTypes.length, 0);
    });

    test('handles module with only imports', () => {
        const source = `
module Test exposing (..)

import Json.Decode as Decode
import Html exposing (..)
`;
        const result = parseElmSource(source);
        assert.strictEqual(result.typeAliases.length, 0);
    });

    test('handles comments in type definitions', () => {
        const source = `
module Test exposing (..)

{-| User type -}
type alias User =
    { id : String -- Primary key
    , name : String {- Full name -}
    }
`;
        const result = parseElmSource(source);
        assert.strictEqual(result.typeAliases.length, 1);
        assert.strictEqual(result.typeAliases[0].fields.length, 2);
    });

    test('handles type alias with generic parameter', () => {
        const source = `
module Test exposing (..)

type alias Named a =
    { name : String
    , value : a
    }
`;
        const result = parseElmSource(source);
        assert.strictEqual(result.typeAliases.length, 1);
    });
});
