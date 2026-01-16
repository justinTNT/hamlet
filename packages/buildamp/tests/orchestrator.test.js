/**
 * BuildAmp Orchestrator Tests
 * Tests for generation orchestration logic
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

describe('BuildAmp Orchestrator', () => {
    test('unknown model-dir throws error', withSuppressedConsole(async () => {
        const { generate } = await import('../lib/orchestrator.js');

        await assert.rejects(
            async () => generate({ modelDir: 'unknown-dir' }),
            /Unknown model directory/,
            'Should reject unknown model directories'
        );
    }));

    test('unknown target throws error', withSuppressedConsole(async () => {
        const { generate } = await import('../lib/orchestrator.js');

        await assert.rejects(
            async () => generate({ target: 'nonexistent-target' }),
            /Unknown target/,
            'Should reject unknown targets'
        );
    }));

    test('valid targets are accepted', withSuppressedConsole(async () => {
        const { generate } = await import('../lib/orchestrator.js');

        const validTargets = ['db', 'api', 'storage', 'kv', 'sse', 'elm', 'handlers', 'admin', 'wasm'];

        for (const target of validTargets) {
            // Each target should not throw an "Unknown target" error
            try {
                await generate({ target });
            } catch (error) {
                assert.ok(
                    !error.message.includes('Unknown target'),
                    `Target '${target}' should be recognized`
                );
            }
        }
    }));

    test('valid model directories are accepted', withSuppressedConsole(async () => {
        const { generate } = await import('../lib/orchestrator.js');

        const validModelDirs = ['db', 'api', 'storage', 'kv', 'sse', 'events', 'config'];

        for (const modelDir of validModelDirs) {
            try {
                await generate({ modelDir });
            } catch (error) {
                assert.ok(
                    !error.message.includes('Unknown model directory'),
                    `Model directory '${modelDir}' should be recognized`
                );
            }
        }
    }));

    test('generate returns results array', withSuppressedConsole(async () => {
        const { generate } = await import('../lib/orchestrator.js');

        // Run with a specific target to get predictable results
        const results = await generate({ target: 'wasm' });

        assert.ok(Array.isArray(results), 'generate should return an array');
        assert.ok(results.length > 0, 'results should have at least one entry');

        // Each result should have generator, success, and either result or error
        for (const result of results) {
            assert.ok('generator' in result, 'result should have generator field');
            assert.ok('success' in result, 'result should have success field');
        }
    }));

    test('status function exists and returns', withSuppressedConsole(async () => {
        const { status } = await import('../lib/orchestrator.js');

        assert.ok(typeof status === 'function', 'status should be a function');

        const result = await status();
        assert.ok(typeof result === 'object', 'status should return an object');
    }));
});

describe('Generator Mapping Logic', () => {
    test('db model-dir runs correct generators', withSuppressedConsole(async () => {
        const { generate } = await import('../lib/orchestrator.js');

        const results = await generate({ modelDir: 'db' });
        const generatorNames = results.map(r => r.generator);

        assert.ok(generatorNames.includes('db'), 'db model-dir should run db generator');
        assert.ok(generatorNames.includes('elm'), 'db model-dir should run elm generator');
        assert.ok(generatorNames.includes('admin'), 'db model-dir should run admin generator');
    }));

    test('api model-dir runs correct generators', withSuppressedConsole(async () => {
        const { generate } = await import('../lib/orchestrator.js');

        const results = await generate({ modelDir: 'api' });
        const generatorNames = results.map(r => r.generator);

        assert.ok(generatorNames.includes('api'), 'api model-dir should run api generator');
        assert.ok(generatorNames.includes('elm'), 'api model-dir should run elm generator');
        assert.ok(generatorNames.includes('handlers'), 'api model-dir should run handlers generator');
    }));

    test('storage model-dir runs correct generators', withSuppressedConsole(async () => {
        const { generate } = await import('../lib/orchestrator.js');

        const results = await generate({ modelDir: 'storage' });
        const generatorNames = results.map(r => r.generator);

        assert.ok(generatorNames.includes('storage'), 'storage model-dir should run storage generator');
        assert.ok(generatorNames.includes('elm'), 'storage model-dir should run elm generator');
    }));

    test('specific target only runs that generator', withSuppressedConsole(async () => {
        const { generate } = await import('../lib/orchestrator.js');

        const results = await generate({ target: 'db' });
        const generatorNames = results.map(r => r.generator);

        assert.strictEqual(generatorNames.length, 1, 'specific target should run only one generator');
        assert.strictEqual(generatorNames[0], 'db', 'should run the specified generator');
    }));
});
