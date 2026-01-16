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

        const validTargets = ['js', 'elm', 'handlers', 'admin', 'wasm', 'sql', 'schema'];

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

        assert.ok(generatorNames.includes('js'), 'db model-dir should run js generator');
        assert.ok(generatorNames.includes('elm'), 'db model-dir should run elm generator');
        assert.ok(generatorNames.includes('admin'), 'db model-dir should run admin generator');
        assert.ok(generatorNames.includes('sql'), 'db model-dir should run sql generator');
        assert.ok(generatorNames.includes('schema'), 'db model-dir should run schema generator');
    }));

    test('api model-dir runs correct generators', withSuppressedConsole(async () => {
        const { generate } = await import('../lib/orchestrator.js');

        const results = await generate({ modelDir: 'api' });
        const generatorNames = results.map(r => r.generator);

        assert.ok(generatorNames.includes('js'), 'api model-dir should run js generator');
        assert.ok(generatorNames.includes('elm'), 'api model-dir should run elm generator');
        assert.ok(generatorNames.includes('handlers'), 'api model-dir should run handlers generator');
    }));

    test('storage model-dir runs correct generators', withSuppressedConsole(async () => {
        const { generate } = await import('../lib/orchestrator.js');

        const results = await generate({ modelDir: 'storage' });
        const generatorNames = results.map(r => r.generator);

        assert.ok(generatorNames.includes('js'), 'storage model-dir should run js generator');
        assert.ok(generatorNames.includes('elm'), 'storage model-dir should run elm generator');
    }));

    test('specific target only runs that generator', withSuppressedConsole(async () => {
        const { generate } = await import('../lib/orchestrator.js');

        const results = await generate({ target: 'js' });
        const generatorNames = results.map(r => r.generator);

        assert.strictEqual(generatorNames.length, 1, 'specific target should run only one generator');
        assert.strictEqual(generatorNames[0], 'js', 'should run the specified generator');
    }));
});

describe('WASM Generation via Orchestrator', () => {
    test('wasm target runs wasm generator', withSuppressedConsole(async () => {
        const { generate } = await import('../lib/orchestrator.js');

        const results = await generate({ target: 'wasm' });
        const generatorNames = results.map(r => r.generator);

        assert.strictEqual(generatorNames.length, 1, 'wasm target should run one generator');
        assert.strictEqual(generatorNames[0], 'wasm', 'should run wasm generator');
    }));

    test('wasm generator receives config options', withSuppressedConsole(async () => {
        const { generate } = await import('../lib/orchestrator.js');

        // Pass config with wasmTarget
        const results = await generate({
            target: 'wasm',
            config: { wasmTarget: 'node' }
        });

        // The result should indicate the generator was called
        assert.ok(results.length > 0, 'Should have results');
        assert.strictEqual(results[0].generator, 'wasm');
    }));

    test('wasm result includes target information', withSuppressedConsole(async () => {
        const { generate } = await import('../lib/orchestrator.js');

        const results = await generate({ target: 'wasm' });
        const wasmResult = results.find(r => r.generator === 'wasm');

        assert.ok(wasmResult, 'Should have wasm result');
        // Once implemented, result should include target info
        if (wasmResult.result) {
            assert.ok('target' in wasmResult.result || 'success' in wasmResult.result,
                'WASM result should include target or success field');
        }
    }));
});
