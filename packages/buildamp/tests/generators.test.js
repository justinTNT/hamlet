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

