/**
 * Integration Tests
 *
 * End-to-end tests that exercise the full generation pipeline:
 * Elm models → Generators → Output files
 *
 * These tests create temporary directories with Elm model files,
 * run the generators, and verify the output files are created
 * with expected content.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import generators
import { generateDatabaseQueries } from '../lib/generators/db.js';
import { generateApiRoutes } from '../lib/generators/api.js';
import { generateBrowserStorage } from '../lib/generators/storage.js';
import { generateKvStore } from '../lib/generators/kv.js';
import { generateSSEEvents } from '../lib/generators/sse.js';
import { generateSqlMigrations, generateSchemaIntrospection } from '../lib/generators/sql.js';
import { createPaths } from '../lib/generators/shared-paths.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test directory (absolute path to avoid findProjectRoot issues)
const tempDir = path.resolve(__dirname, 'tmp-integration-test');

// Suppress console output during tests
function suppressConsole() {
    const original = {
        log: console.log,
        warn: console.warn,
        error: console.error
    };
    console.log = () => {};
    console.warn = () => {};
    console.error = () => {};
    return () => {
        console.log = original.log;
        console.warn = original.warn;
        console.error = original.error;
    };
}

// Helper to create Elm model files
function createElmModels(baseDir) {
    // Create directory structure
    const dirs = [
        path.join(baseDir, 'models', 'Schema'),
        path.join(baseDir, 'models', 'Api'),
        path.join(baseDir, 'models', 'Kv'),
        path.join(baseDir, 'models', 'Sse'),
        path.join(baseDir, 'models', 'Storage'),
        path.join(baseDir, 'models', 'Framework'),
        path.join(baseDir, 'models'),
        path.join(baseDir, 'sql', 'migrations'),
    ];

    for (const dir of dirs) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Create Framework types (required imports)
    fs.writeFileSync(path.join(baseDir, 'models', 'Framework', 'Schema.elm'), `
module Interface.Schema exposing (..)

type alias DatabaseId a = a
type alias Timestamp = Int
type alias RichContent = String
type alias ForeignKey parent child = child
type alias Host = String
`);

    fs.writeFileSync(path.join(baseDir, 'models', 'Framework', 'Api.elm'), `
module Interface.Api exposing (..)

type alias Inject a = a
`);

    // Create Schema (DB) model
    fs.writeFileSync(path.join(baseDir, 'models', 'Schema', 'TestItem.elm'), `
module Schema.TestItem exposing (TestItem)

import Interface.Schema exposing (DatabaseId, Timestamp)

type alias TestItem =
    { id : DatabaseId String
    , title : String
    , content : Maybe String
    , viewCount : Int
    , isPublished : Bool
    , createdAt : Timestamp
    }
`);

    fs.writeFileSync(path.join(baseDir, 'models', 'Schema', 'TestComment.elm'), `
module Schema.TestComment exposing (TestComment)

import Interface.Schema exposing (DatabaseId, ForeignKey, Timestamp)

type alias TestComment =
    { id : DatabaseId String
    , itemId : ForeignKey TestItem String
    , authorName : String
    , text : String
    , createdAt : Timestamp
    }
`);

    // Create API model
    fs.writeFileSync(path.join(baseDir, 'models', 'Api', 'GetItems.elm'), `
module Api.GetItems exposing (..)

import Interface.Api exposing (..)

type alias Request =
    { host : Inject String
    , limit : Int
    }

type alias Response =
    { items : List ItemSummary
    }

type alias ItemSummary =
    { id : String
    , title : String
    }
`);

    fs.writeFileSync(path.join(baseDir, 'models', 'Api', 'CreateItem.elm'), `
module Api.CreateItem exposing (..)

import Interface.Api exposing (..)

type alias Request =
    { host : Inject String
    , title : String
    , content : Maybe String
    }

type alias Response =
    { id : String
    , success : Bool
    }
`);

    // Create KV model
    fs.writeFileSync(path.join(baseDir, 'models', 'Kv', 'CachedItems.elm'), `
module Kv.CachedItems exposing (..)

type alias CachedItems =
    { cacheKey : String
    , itemIds : List String
    , ttl : Int
    }
`);

    // Create SSE model
    fs.writeFileSync(path.join(baseDir, 'models', 'Sse', 'ItemCreatedEvent.elm'), `
module Sse.ItemCreatedEvent exposing (..)

type alias ItemCreatedEvent =
    { itemId : String
    , title : String
    , timestamp : Int
    }
`);

    fs.writeFileSync(path.join(baseDir, 'models', 'Sse', 'ItemDeletedEvent.elm'), `
module Sse.ItemDeletedEvent exposing (..)

type alias ItemDeletedEvent =
    { itemId : String
    , timestamp : Int
    }
`);

    // Create Storage model
    fs.writeFileSync(path.join(baseDir, 'models', 'Storage', 'UserPrefs.elm'), `
module Storage.UserPrefs exposing (..)

type alias UserPrefs =
    { theme : String
    , fontSize : Int
    , showNotifications : Bool
    }
`);
}

// Setup test environment
function setup() {
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
    createElmModels(tempDir);
}

// Cleanup test environment
function cleanup() {
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

// Helper to create paths config for test
function createTestConfig() {
    return createPaths({
        src: path.join(tempDir, 'models'),
        dest: tempDir
    });
}

describe('Integration Tests - Database Generation', () => {
    test('generates database-queries.js from Schema models', async () => {
        const restore = suppressConsole();
        setup();
        try {
            const paths = createTestConfig();
            const result = await generateDatabaseQueries({ paths });

            // Check result
            assert.ok(result, 'Should return result object');
            assert.ok(result.structs >= 2, `Should find at least 2 structs, got ${result.structs}`);

            // Check output file exists
            const outputFile = path.join(paths.serverGlueDir, 'database-queries.js');
            assert.ok(fs.existsSync(outputFile), 'database-queries.js should be created');

            // Check content
            const content = fs.readFileSync(outputFile, 'utf-8');
            assert.ok(content.includes('insertTestItem'), 'Should have insertTestItem function');
            assert.ok(content.includes('getTestItemById'), 'Should have getTestItemById function');
            assert.ok(content.includes('insertTestComment'), 'Should have insertTestComment function');
        } finally {
            cleanup();
            restore();
        }
    });

    test('generates Database.elm from Schema models', async () => {
        const restore = suppressConsole();
        setup();
        try {
            const paths = createTestConfig();
            // Import generateElmSharedModules which generates Database.elm
            const { generateElmSharedModules } = await import('../lib/generators/elm.js');
            await generateElmSharedModules({ paths });

            // Check Elm output
            const elmFile = path.join(paths.serverGlueDir, 'BuildAmp', 'Database.elm');
            assert.ok(fs.existsSync(elmFile), `Database.elm should be created at ${elmFile}`);

            const content = fs.readFileSync(elmFile, 'utf-8');
            assert.ok(content.includes('module BuildAmp.Database'), 'Should have module declaration');
            assert.ok(content.includes('type alias TestItem') || content.includes('TestItem'), 'Should have TestItem type');
            assert.ok(content.includes('type alias TestComment') || content.includes('TestComment'), 'Should have TestComment type');
        } finally {
            cleanup();
            restore();
        }
    });
});

describe('Integration Tests - SQL Generation', () => {
    test('generates schema.sql from Schema models', async () => {
        const restore = suppressConsole();
        setup();
        try {
            const paths = createTestConfig();
            await generateSqlMigrations({ paths });

            // Check output file
            const outputFile = path.join(tempDir, 'sql', 'migrations', 'schema.sql');
            assert.ok(fs.existsSync(outputFile), 'schema.sql should be created');

            const content = fs.readFileSync(outputFile, 'utf-8');
            assert.ok(content.includes('CREATE TABLE test_item'), 'Should have test_item table');
            assert.ok(content.includes('CREATE TABLE test_comment'), 'Should have test_comment table');
            assert.ok(content.includes('FOREIGN KEY'), 'Should have foreign key constraint');
        } finally {
            cleanup();
            restore();
        }
    });

    test('generates schema.json introspection', async () => {
        const restore = suppressConsole();
        setup();
        try {
            const paths = createTestConfig();
            await generateSchemaIntrospection({ paths });

            // Check output file
            const outputFile = path.join(paths.serverGlueDir, 'schema.json');
            assert.ok(fs.existsSync(outputFile), 'schema.json should be created');

            const content = fs.readFileSync(outputFile, 'utf-8');
            const schema = JSON.parse(content);

            assert.ok(schema.tables, 'Should have tables object');
            assert.ok(schema.tables.test_item, 'Should have test_item table');
            assert.ok(schema.tables.test_comment, 'Should have test_comment table');
        } finally {
            cleanup();
            restore();
        }
    });
});

describe('Integration Tests - API Generation', () => {
    test('generates api-routes.js from Api models', async () => {
        const restore = suppressConsole();
        setup();
        try {
            const paths = createTestConfig();
            const result = await generateApiRoutes({ paths });

            // Check result
            assert.ok(result, 'Should return result object');

            // Check output file
            const outputFile = path.join(paths.serverGlueDir, 'api-routes.js');
            assert.ok(fs.existsSync(outputFile), 'api-routes.js should be created');

            const content = fs.readFileSync(outputFile, 'utf-8');
            assert.ok(content.includes("server.app.post('/api/GetItems'"), 'Should have GetItems route');
            assert.ok(content.includes("server.app.post('/api/CreateItem'"), 'Should have CreateItem route');
        } finally {
            cleanup();
            restore();
        }
    });

    test('generates ApiClient.elm from Api models', async () => {
        const restore = suppressConsole();
        setup();
        try {
            const paths = createTestConfig();
            await generateApiRoutes({ paths });

            // Check Elm output
            const elmFile = path.join(paths.webGlueDir, 'ApiClient.elm');
            assert.ok(fs.existsSync(elmFile), 'ApiClient.elm should be created');

            const content = fs.readFileSync(elmFile, 'utf-8');
            assert.ok(content.includes('module BuildAmp.ApiClient'), 'Should have module declaration');
            assert.ok(content.includes('getitems'), 'Should have getitems function');
            assert.ok(content.includes('createitem'), 'Should have createitem function');
            assert.ok(content.includes('Http.post'), 'Should use Http.post');
        } finally {
            cleanup();
            restore();
        }
    });
});

describe('Integration Tests - KV Store Generation', () => {
    test('generates kv-store.js from Kv models', async () => {
        const restore = suppressConsole();
        setup();
        try {
            const paths = createTestConfig();
            const result = generateKvStore({ paths });

            // Check result
            assert.ok(result, 'Should return result object');
            assert.strictEqual(result.models, 1, 'Should find 1 KV model');

            // Check output file
            const outputFile = path.join(paths.serverGlueDir, 'kv-store.js');
            assert.ok(fs.existsSync(outputFile), 'kv-store.js should be created');

            const content = fs.readFileSync(outputFile, 'utf-8');
            assert.ok(content.includes('setCachedItems'), 'Should have setCachedItems function');
            assert.ok(content.includes('getCachedItems'), 'Should have getCachedItems function');
            assert.ok(content.includes('deleteCachedItems'), 'Should have deleteCachedItems function');
        } finally {
            cleanup();
            restore();
        }
    });
});

describe('Integration Tests - SSE Generation', () => {
    test('generates sse-connection.js from Sse models', async () => {
        const restore = suppressConsole();
        setup();
        try {
            const paths = createTestConfig();
            const result = generateSSEEvents({ paths });

            // Check result
            assert.ok(result, 'Should return result object');
            assert.strictEqual(result.models, 2, 'Should find 2 SSE models');

            // Check JS output
            const jsFile = path.join(paths.serverGlueDir, 'sse-connection.js');
            assert.ok(fs.existsSync(jsFile), 'sse-connection.js should be created');

            const jsContent = fs.readFileSync(jsFile, 'utf-8');
            assert.ok(jsContent.includes('setupSSE'), 'Should have setupSSE function');
            assert.ok(jsContent.includes('EventSource'), 'Should use EventSource');
        } finally {
            cleanup();
            restore();
        }
    });

    test('generates ServerSentEvents.elm from Sse models', async () => {
        const restore = suppressConsole();
        setup();
        try {
            const paths = createTestConfig();
            generateSSEEvents({ paths });

            // Check Elm output
            const elmFile = path.join(paths.webGlueDir, 'ServerSentEvents.elm');
            assert.ok(fs.existsSync(elmFile), 'ServerSentEvents.elm should be created');

            const content = fs.readFileSync(elmFile, 'utf-8');
            assert.ok(content.includes('module BuildAmp.ServerSentEvents'), 'Should have module declaration');
            assert.ok(content.includes('type alias ItemCreatedEvent'), 'Should have ItemCreatedEvent type');
            assert.ok(content.includes('type alias ItemDeletedEvent'), 'Should have ItemDeletedEvent type');
            assert.ok(content.includes('decodeItemCreatedEvent'), 'Should have decoder');
        } finally {
            cleanup();
            restore();
        }
    });
});

describe('Integration Tests - Storage Generation', () => {
    test('generates browser-storage.js from Storage models', async () => {
        const restore = suppressConsole();
        setup();
        try {
            const paths = createTestConfig();
            const result = generateBrowserStorage({ paths });

            // Check result
            assert.ok(result, 'Should return result object');
            assert.strictEqual(result.models, 1, 'Should find 1 storage model');

            // Check JS output
            const jsFile = path.join(paths.webGlueDir, 'browser-storage.js');
            assert.ok(fs.existsSync(jsFile), 'browser-storage.js should be created');

            const jsContent = fs.readFileSync(jsFile, 'utf-8');
            assert.ok(jsContent.includes('class UserPrefsStorage'), 'Should have UserPrefsStorage class');
            assert.ok(jsContent.includes('localStorage'), 'Should use localStorage');
            assert.ok(jsContent.includes('connectStoragePorts'), 'Should have connectStoragePorts');
        } finally {
            cleanup();
            restore();
        }
    });

    test('generates StoragePorts.elm from Storage models', async () => {
        const restore = suppressConsole();
        setup();
        try {
            const paths = createTestConfig();
            generateBrowserStorage({ paths });

            // Check Elm ports
            const portsFile = path.join(paths.webGlueDir, 'StoragePorts.elm');
            assert.ok(fs.existsSync(portsFile), 'StoragePorts.elm should be created');

            const content = fs.readFileSync(portsFile, 'utf-8');
            assert.ok(content.includes('port module StoragePorts'), 'Should be port module');
            assert.ok(content.includes('port saveUserPrefs'), 'Should have saveUserPrefs port');
            assert.ok(content.includes('port loadUserPrefs'), 'Should have loadUserPrefs port');
        } finally {
            cleanup();
            restore();
        }
    });
});

describe('Integration Tests - Error Handling', () => {
    test('handles empty model directories gracefully', async () => {
        const restore = suppressConsole();
        // Setup with empty shared directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        fs.mkdirSync(path.join(tempDir, 'models'), { recursive: true });
        fs.mkdirSync(path.join(tempDir, 'models'), { recursive: true });

        try {
            const paths = createTestConfig();

            // Run generators with no models
            const kvResult = generateKvStore({ paths });
            const sseResult = generateSSEEvents({ paths });
            const storageResult = generateBrowserStorage({ paths });

            // Should return empty results, not throw
            assert.strictEqual(kvResult.models, 0, 'KV should find 0 models');
            assert.strictEqual(sseResult.models, 0, 'SSE should find 0 models');
            assert.strictEqual(storageResult.models, 0, 'Storage should find 0 models');
        } finally {
            cleanup();
            restore();
        }
    });
});

describe('Integration Tests - Cross-Model References', () => {
    test('foreign key references are detected in schema.json', async () => {
        const restore = suppressConsole();
        setup();
        try {
            const paths = createTestConfig();

            // Generate schema introspection
            await generateSchemaIntrospection({ paths });

            const schemaFile = path.join(paths.serverGlueDir, 'schema.json');
            const schema = JSON.parse(fs.readFileSync(schemaFile, 'utf-8'));

            // TestComment should reference TestItem
            const commentTable = schema.tables.test_comment;
            assert.ok(commentTable, 'Should have test_comment table');
            assert.ok(commentTable.foreignKeys, 'Should have foreignKeys');

            const itemFk = commentTable.foreignKeys.find(fk => fk.references.table === 'test_item');
            assert.ok(itemFk, 'Should have foreign key to test_item');
            assert.strictEqual(itemFk.column, 'item_id', 'FK column should be item_id');
        } finally {
            cleanup();
            restore();
        }
    });
});
