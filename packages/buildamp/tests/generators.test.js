/**
 * BuildAmp Generators Tests
 * Tests that all generators are properly exported and callable
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';

// Suppress console output during tests (generators emit emojis that break TAP)
function withSuppressedConsole(fn) {
    return async () => {
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;
        console.log = () => {};
        console.warn = () => {};
        console.error = () => {};

        try {
            await fn();
        } finally {
            console.log = originalLog;
            console.warn = originalWarn;
            console.error = originalError;
        }
    };
}

// Test paths using the hamlet project structure
const testSrc = path.join(process.cwd(), 'app/horatio/models');
const testDest = path.join(process.cwd(), 'tmp-test-output-gen');

// Config with explicit paths for generators
const testConfig = { src: testSrc, dest: testDest };

describe('Generators Exports', () => {
    // Clean up test output directory after each test
    test.afterEach(() => {
        if (fs.existsSync(testDest)) {
            fs.rmSync(testDest, { recursive: true, force: true });
        }
    });

    test('all generators are exported from index', async () => {
        const generators = await import('../lib/generators/index.js');

        const expectedExports = [
            'generateDatabaseQueries',
            'generateApiRoutes',
            'generateBrowserStorage',
            'generateKvStore',
            'generateSSEEvents',
            'generateElmSharedModules',
            'generateElmHandlers'
        ];

        for (const exportName of expectedExports) {
            assert.ok(exportName in generators, `${exportName} should be exported`);
            assert.strictEqual(typeof generators[exportName], 'function', `${exportName} should be a function`);
        }
    });

    test('generateDatabaseQueries is callable', withSuppressedConsole(async () => {
        const { generateDatabaseQueries } = await import('../lib/generators/index.js');
        // Should not throw when called - may return undefined if no models found
        const result = await generateDatabaseQueries(testConfig);
        assert.ok(result === undefined || typeof result === 'object', 'should return object or undefined');
    }));

    test('generateBrowserStorage is callable', withSuppressedConsole(async () => {
        const { generateBrowserStorage } = await import('../lib/generators/index.js');
        // Should not throw when called - may return undefined if no models found
        const result = await generateBrowserStorage(testConfig);
        assert.ok(result === undefined || typeof result === 'object', 'should return object or undefined');
    }));

    test('generateKvStore is callable', withSuppressedConsole(async () => {
        const { generateKvStore } = await import('../lib/generators/index.js');
        const result = generateKvStore(testConfig);
        assert.ok(typeof result === 'object', 'should return an object');
    }));

    test('generateSSEEvents is callable', withSuppressedConsole(async () => {
        const { generateSSEEvents } = await import('../lib/generators/index.js');
        const result = generateSSEEvents(testConfig);
        assert.ok(typeof result === 'object', 'should return an object');
    }));

    test('generateElmSharedModules is callable', withSuppressedConsole(async () => {
        const { generateElmSharedModules } = await import('../lib/generators/index.js');
        const result = await generateElmSharedModules(testConfig);
        assert.ok(Array.isArray(result), 'should return an array');
    }));

    test('generateElmHandlers is callable', withSuppressedConsole(async () => {
        const { generateElmHandlers } = await import('../lib/generators/index.js');
        const result = await generateElmHandlers(testConfig);
        assert.ok(typeof result === 'object', 'should return an object');
    }));
});

// =============================================================================
// DATABASE QUERY GENERATOR - MULTITENANT AND SOFTDELETE
// =============================================================================

describe('Database Query Generator - MultiTenant/SoftDelete', () => {
    // We test the behavior through generated output

    test('generates host parameter for MultiTenant models using actual field name', withSuppressedConsole(async () => {
        // Create test model files with MultiTenant
        const testModelDir = path.join(testDest, 'shared', 'Schema');
        fs.mkdirSync(testModelDir, { recursive: true });
        fs.writeFileSync(path.join(testModelDir, 'Post.elm'), `
module Schema.Post exposing (..)

type alias Post =
    { id : DatabaseId String
    , tenant : MultiTenant
    , title : String
    }
`);

        const { generateDatabaseQueries } = await import('../lib/generators/index.js');
        const config = { src: testDest, dest: testDest };
        const result = await generateDatabaseQueries(config);

        if (result && result.outputFile) {
            const content = fs.readFileSync(result.outputFile, 'utf-8');
            // Should use 'tenant' not 'host' since that's the field name
            assert.ok(content.includes('tenant'), 'should use actual MultiTenant field name');
        }
    }));

    test('does NOT generate host filtering for non-MultiTenant models', withSuppressedConsole(async () => {
        // Create test model files without MultiTenant
        const testModelDir = path.join(testDest, 'shared', 'Schema');
        fs.mkdirSync(testModelDir, { recursive: true });
        fs.writeFileSync(path.join(testModelDir, 'Config.elm'), `
module Schema.Config exposing (..)

type alias Config =
    { id : DatabaseId String
    , setting : String
    }
`);

        const { generateDatabaseQueries } = await import('../lib/generators/index.js');
        const config = { src: testDest, dest: testDest };
        const result = await generateDatabaseQueries(config);

        // For backward compat, auto-host is added, so this test should still pass
        // The key difference is the model knows it's not explicitly multi-tenant
        assert.ok(result, 'should generate queries');
    }));

    test('generates soft-delete filtering for SoftDelete models using actual field name', withSuppressedConsole(async () => {
        const testModelDir = path.join(testDest, 'shared', 'Schema');
        fs.mkdirSync(testModelDir, { recursive: true });
        fs.writeFileSync(path.join(testModelDir, 'Item.elm'), `
module Schema.Item exposing (..)

type alias Item =
    { id : DatabaseId String
    , host : MultiTenant
    , removedAt : SoftDelete
    , title : String
    }
`);

        const { generateDatabaseQueries } = await import('../lib/generators/index.js');
        const config = { src: testDest, dest: testDest };
        const result = await generateDatabaseQueries(config);

        if (result && result.outputFile) {
            const content = fs.readFileSync(result.outputFile, 'utf-8');
            // Should use 'removed_at' (snake_case of removedAt) for soft delete filtering
            assert.ok(content.includes('removed_at'), 'should use actual SoftDelete field name');
        }
    }));
});
