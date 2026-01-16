/**
 * BuildAmp Generators Tests
 * Tests that all generators are properly exported and callable
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

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

describe('Generators Exports', () => {
    test('all generators are exported from index', async () => {
        const generators = await import('../lib/generators/index.js');

        const expectedExports = [
            'generateDatabaseQueries',
            'generateApiRoutes',
            'generateBrowserStorage',
            'generateKvStore',
            'generateSSEEvents',
            'generateElmSharedModules',
            'generateElmHandlers',
            'generateAdminUi'
        ];

        for (const exportName of expectedExports) {
            assert.ok(exportName in generators, `${exportName} should be exported`);
            assert.strictEqual(typeof generators[exportName], 'function', `${exportName} should be a function`);
        }
    });

    test('generateDatabaseQueries is callable', withSuppressedConsole(async () => {
        const { generateDatabaseQueries } = await import('../lib/generators/index.js');
        // Should not throw when called - may return undefined if no models found
        const result = await generateDatabaseQueries({});
        assert.ok(result === undefined || typeof result === 'object', 'should return object or undefined');
    }));

    test('generateBrowserStorage is callable', withSuppressedConsole(async () => {
        const { generateBrowserStorage } = await import('../lib/generators/index.js');
        // Should not throw when called - may return undefined if no models found
        const result = await generateBrowserStorage({});
        assert.ok(result === undefined || typeof result === 'object', 'should return object or undefined');
    }));

    test('generateKvStore is callable', withSuppressedConsole(async () => {
        const { generateKvStore } = await import('../lib/generators/index.js');
        const result = generateKvStore({});
        assert.ok(typeof result === 'object', 'should return an object');
    }));

    test('generateSSEEvents is callable', withSuppressedConsole(async () => {
        const { generateSSEEvents } = await import('../lib/generators/index.js');
        const result = generateSSEEvents({});
        assert.ok(typeof result === 'object', 'should return an object');
    }));

    test('generateElmSharedModules is callable', withSuppressedConsole(async () => {
        const { generateElmSharedModules } = await import('../lib/generators/index.js');
        const result = await generateElmSharedModules({});
        assert.ok(Array.isArray(result), 'should return an array');
    }));

    test('generateElmHandlers is callable', withSuppressedConsole(async () => {
        const { generateElmHandlers } = await import('../lib/generators/index.js');
        const result = await generateElmHandlers({});
        assert.ok(typeof result === 'object', 'should return an object');
    }));

    test('generateAdminUi is callable', withSuppressedConsole(async () => {
        const { generateAdminUi } = await import('../lib/generators/index.js');
        const result = await generateAdminUi();
        // Admin UI generator may return undefined if successful
        assert.ok(result === undefined || typeof result === 'object', 'should return object or undefined');
    }));
});

describe('Generator Backward Compatibility', () => {
    test('shared/generation re-exports work', async () => {
        // Test that the backward-compatible re-exports work
        const sharedDb = await import('../../../shared/generation/database_queries.js');
        const sharedApi = await import('../../../shared/generation/api_routes.js');
        const sharedStorage = await import('../../../shared/generation/browser_storage.js');
        const sharedKv = await import('../../../shared/generation/kv_store.js');
        const sharedSse = await import('../../../shared/generation/sse_events.js');
        const sharedElm = await import('../../../shared/generation/elm_shared_modules.js');
        const sharedHandlers = await import('../../../shared/generation/elm_handlers.js');
        const sharedAdmin = await import('../../../shared/generation/admin_ui.js');

        assert.ok('generateDatabaseQueries' in sharedDb, 'database_queries.js should export generateDatabaseQueries');
        assert.ok('generateApiRoutes' in sharedApi, 'api_routes.js should export generateApiRoutes');
        assert.ok('generateBrowserStorage' in sharedStorage, 'browser_storage.js should export generateBrowserStorage');
        assert.ok('generateKvStore' in sharedKv, 'kv_store.js should export generateKvStore');
        assert.ok('generateSSEEvents' in sharedSse, 'sse_events.js should export generateSSEEvents');
        assert.ok('generateElmSharedModules' in sharedElm, 'elm_shared_modules.js should export generateElmSharedModules');
        assert.ok('generateElmHandlers' in sharedHandlers, 'elm_handlers.js should export generateElmHandlers');
        assert.ok('generateAdminUi' in sharedAdmin, 'admin_ui.js should export generateAdminUi');
    });

    test('shared/generation exports are functions', async () => {
        const { generateDatabaseQueries } = await import('../../../shared/generation/database_queries.js');
        const { generateApiRoutes } = await import('../../../shared/generation/api_routes.js');
        const { generateBrowserStorage } = await import('../../../shared/generation/browser_storage.js');

        assert.strictEqual(typeof generateDatabaseQueries, 'function');
        assert.strictEqual(typeof generateApiRoutes, 'function');
        assert.strictEqual(typeof generateBrowserStorage, 'function');
    });
});
