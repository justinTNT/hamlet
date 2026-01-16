/**
 * BuildAmp WASM Generator Tests
 * Tests for WASM compilation via wasm-pack
 */

import { test, describe, mock } from 'node:test';
import assert from 'node:assert';
import path from 'path';

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

describe('WASM Generator', () => {

    describe('wasm-pack detection', () => {
        test('detectWasmPack returns true when wasm-pack is installed', async () => {
            const { detectWasmPack } = await import('../lib/generators/wasm.js');

            // Mock exec to simulate wasm-pack --version succeeding
            const result = await detectWasmPack({
                exec: async () => ({ stdout: 'wasm-pack 0.12.1', stderr: '' })
            });

            assert.strictEqual(result, true);
        });

        test('detectWasmPack returns false when wasm-pack is not installed', async () => {
            const { detectWasmPack } = await import('../lib/generators/wasm.js');

            // Mock exec to simulate command not found
            const result = await detectWasmPack({
                exec: async () => { throw new Error('command not found: wasm-pack'); }
            });

            assert.strictEqual(result, false);
        });
    });

    describe('output directory selection', () => {
        test('getWasmOutputDir returns pkg-web for web target', async () => {
            const { getWasmOutputDir } = await import('../lib/generators/wasm.js');

            const outDir = getWasmOutputDir('web', '/project/root');
            assert.strictEqual(outDir, '/project/root/pkg-web');
        });

        test('getWasmOutputDir returns pkg-node for node target', async () => {
            const { getWasmOutputDir } = await import('../lib/generators/wasm.js');

            const outDir = getWasmOutputDir('node', '/project/root');
            assert.strictEqual(outDir, '/project/root/pkg-node');
        });

        test('getWasmOutputDir returns pkg-bundler for bundler target', async () => {
            const { getWasmOutputDir } = await import('../lib/generators/wasm.js');

            const outDir = getWasmOutputDir('bundler', '/project/root');
            assert.strictEqual(outDir, '/project/root/pkg-bundler');
        });
    });

    describe('target validation', () => {
        test('valid targets are accepted', async () => {
            const { isValidWasmTarget } = await import('../lib/generators/wasm.js');

            assert.strictEqual(isValidWasmTarget('web'), true);
            assert.strictEqual(isValidWasmTarget('node'), true);
            assert.strictEqual(isValidWasmTarget('bundler'), true);
        });

        test('invalid targets are rejected', async () => {
            const { isValidWasmTarget } = await import('../lib/generators/wasm.js');

            assert.strictEqual(isValidWasmTarget('browser'), false);
            assert.strictEqual(isValidWasmTarget('deno'), false);
            assert.strictEqual(isValidWasmTarget(''), false);
            assert.strictEqual(isValidWasmTarget(null), false);
        });
    });

    describe('generateWasm function', () => {
        test('defaults to web target', withSuppressedConsole(async () => {
            const { generateWasm } = await import('../lib/generators/wasm.js');

            let capturedCommand = null;
            const mockExec = async (cmd) => {
                capturedCommand = cmd;
                return { stdout: '', stderr: '' };
            };

            await generateWasm({
                exec: mockExec,
                projectRoot: '/test/project',
                skipDetection: true
            });

            assert.ok(capturedCommand.includes('--target web'), 'Should default to web target');
        }));

        test('respects node target option', withSuppressedConsole(async () => {
            const { generateWasm } = await import('../lib/generators/wasm.js');

            let capturedCommand = null;
            const mockExec = async (cmd) => {
                capturedCommand = cmd;
                return { stdout: '', stderr: '' };
            };

            await generateWasm({
                target: 'node',
                exec: mockExec,
                projectRoot: '/test/project',
                skipDetection: true
            });

            assert.ok(capturedCommand.includes('--target nodejs'), 'Should use nodejs target');
        }));

        test('uses correct output directory', withSuppressedConsole(async () => {
            const { generateWasm } = await import('../lib/generators/wasm.js');

            let capturedCommand = null;
            const mockExec = async (cmd) => {
                capturedCommand = cmd;
                return { stdout: '', stderr: '' };
            };

            await generateWasm({
                target: 'web',
                exec: mockExec,
                projectRoot: '/test/project',
                skipDetection: true
            });

            assert.ok(capturedCommand.includes('--out-dir'), 'Should specify output directory');
            assert.ok(capturedCommand.includes('pkg-web'), 'Should output to pkg-web for web target');
        }));

        test('returns success result on successful build', withSuppressedConsole(async () => {
            const { generateWasm } = await import('../lib/generators/wasm.js');

            const result = await generateWasm({
                exec: async () => ({ stdout: 'Build complete', stderr: '' }),
                projectRoot: '/test/project',
                skipDetection: true
            });

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.target, 'web');
            assert.ok(result.outDir.includes('pkg-web'));
        }));

        test('returns failure result on build error', withSuppressedConsole(async () => {
            const { generateWasm } = await import('../lib/generators/wasm.js');

            const result = await generateWasm({
                exec: async () => { throw new Error('cargo build failed'); },
                projectRoot: '/test/project',
                skipDetection: true
            });

            assert.strictEqual(result.success, false);
            assert.ok(result.error.includes('cargo build failed'));
        }));

        test('throws if wasm-pack not installed and skipDetection is false', withSuppressedConsole(async () => {
            const { generateWasm } = await import('../lib/generators/wasm.js');

            await assert.rejects(
                async () => generateWasm({
                    exec: async () => { throw new Error('command not found'); },
                    projectRoot: '/test/project',
                    skipDetection: false
                }),
                /wasm-pack is not installed/,
                'Should throw helpful error when wasm-pack missing'
            );
        }));
    });

    describe('wasm-pack command construction', () => {
        test('builds correct command for web target', async () => {
            const { buildWasmPackCommand } = await import('../lib/generators/wasm.js');

            const cmd = buildWasmPackCommand({
                target: 'web',
                outDir: '/project/pkg-web',
                projectRoot: '/project'
            });

            assert.ok(cmd.includes('wasm-pack build'));
            assert.ok(cmd.includes('--target web'));
            assert.ok(cmd.includes('--out-dir /project/pkg-web'));
        });

        test('builds correct command for node target', async () => {
            const { buildWasmPackCommand } = await import('../lib/generators/wasm.js');

            const cmd = buildWasmPackCommand({
                target: 'node',
                outDir: '/project/pkg-node',
                projectRoot: '/project'
            });

            // wasm-pack uses 'nodejs' not 'node' for the target flag
            assert.ok(cmd.includes('--target nodejs'));
        });

        test('includes release flag by default', async () => {
            const { buildWasmPackCommand } = await import('../lib/generators/wasm.js');

            const cmd = buildWasmPackCommand({
                target: 'web',
                outDir: '/project/pkg-web',
                projectRoot: '/project'
            });

            assert.ok(cmd.includes('--release'), 'Should build in release mode');
        });

        test('can disable release mode for debug builds', async () => {
            const { buildWasmPackCommand } = await import('../lib/generators/wasm.js');

            const cmd = buildWasmPackCommand({
                target: 'web',
                outDir: '/project/pkg-web',
                projectRoot: '/project',
                release: false
            });

            assert.ok(!cmd.includes('--release'), 'Should not include release flag');
            assert.ok(cmd.includes('--dev'), 'Should include dev flag');
        });
    });
});

describe('WASM Generator Integration', () => {
    test('generator is exported from generators index', withSuppressedConsole(async () => {
        const generators = await import('../lib/generators/index.js');

        assert.ok('generateWasm' in generators, 'generateWasm should be exported');
        assert.ok(typeof generators.generateWasm === 'function', 'generateWasm should be a function');
    }));
});
