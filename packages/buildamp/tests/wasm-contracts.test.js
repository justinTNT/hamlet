/**
 * BuildAmp WASM Mtime Tests
 * Tests for mtime-based WASM build tracking (simple make-style incremental builds)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Helper to create temp directories for testing
function createTempDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'buildamp-wasm-mtime-'));
}

// Helper to clean up temp directories
function cleanupTempDir(dir) {
    fs.rmSync(dir, { recursive: true, force: true });
}

// Helper to suppress console output during tests
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

describe('WASM Mtime Functions', () => {

    describe('getNewestModelMtime', () => {
        test('returns null for non-existent directory', async () => {
            const { getNewestModelMtime } = await import('../lib/generators/wasm.js');
            const result = getNewestModelMtime('/nonexistent/path');
            assert.strictEqual(result, null);
        });

        test('returns null for empty directory', async () => {
            const { getNewestModelMtime } = await import('../lib/generators/wasm.js');
            const tempDir = createTempDir();

            try {
                const result = getNewestModelMtime(tempDir);
                assert.strictEqual(result, null);
            } finally {
                cleanupTempDir(tempDir);
            }
        });

        test('returns mtime of single .rs file', async () => {
            const { getNewestModelMtime } = await import('../lib/generators/wasm.js');
            const tempDir = createTempDir();

            try {
                const rsFile = path.join(tempDir, 'model.rs');
                fs.writeFileSync(rsFile, 'pub struct Model {}');

                const result = getNewestModelMtime(tempDir);
                assert.ok(result instanceof Date);
            } finally {
                cleanupTempDir(tempDir);
            }
        });

        test('returns newest mtime among multiple .rs files', async () => {
            const { getNewestModelMtime } = await import('../lib/generators/wasm.js');
            const tempDir = createTempDir();

            try {
                // Create old file
                const oldFile = path.join(tempDir, 'old.rs');
                fs.writeFileSync(oldFile, 'pub struct Old {}');

                // Set old file to past
                const pastTime = new Date(Date.now() - 10000);
                fs.utimesSync(oldFile, pastTime, pastTime);

                // Create new file (will have current time)
                const newFile = path.join(tempDir, 'new.rs');
                fs.writeFileSync(newFile, 'pub struct New {}');

                const result = getNewestModelMtime(tempDir);
                const newFileMtime = fs.statSync(newFile).mtime;

                // Result should be the newer file's mtime
                assert.ok(result >= newFileMtime);
            } finally {
                cleanupTempDir(tempDir);
            }
        });

        test('searches recursively in subdirectories', async () => {
            const { getNewestModelMtime } = await import('../lib/generators/wasm.js');
            const tempDir = createTempDir();

            try {
                // Create subdirectory structure
                const subDir = path.join(tempDir, 'api', 'models');
                fs.mkdirSync(subDir, { recursive: true });

                const rsFile = path.join(subDir, 'nested.rs');
                fs.writeFileSync(rsFile, 'pub struct Nested {}');

                const result = getNewestModelMtime(tempDir);
                assert.ok(result instanceof Date);
            } finally {
                cleanupTempDir(tempDir);
            }
        });

        test('ignores non-.rs files', async () => {
            const { getNewestModelMtime } = await import('../lib/generators/wasm.js');
            const tempDir = createTempDir();

            try {
                // Create non-.rs files only
                fs.writeFileSync(path.join(tempDir, 'readme.md'), '# Readme');
                fs.writeFileSync(path.join(tempDir, 'config.toml'), '[config]');

                const result = getNewestModelMtime(tempDir);
                assert.strictEqual(result, null);
            } finally {
                cleanupTempDir(tempDir);
            }
        });
    });

    describe('getWasmMtime', () => {
        test('returns null for non-existent output directory', async () => {
            const { getWasmMtime } = await import('../lib/generators/wasm.js');
            const result = getWasmMtime('/nonexistent/pkg-web');
            assert.strictEqual(result, null);
        });

        test('returns null when wasm file does not exist', async () => {
            const { getWasmMtime } = await import('../lib/generators/wasm.js');
            const tempDir = createTempDir();

            try {
                // Directory exists but no .wasm file
                const result = getWasmMtime(tempDir);
                assert.strictEqual(result, null);
            } finally {
                cleanupTempDir(tempDir);
            }
        });

        test('returns mtime of proto_rust_bg.wasm file', async () => {
            const { getWasmMtime } = await import('../lib/generators/wasm.js');
            const tempDir = createTempDir();

            try {
                // Create the expected wasm file
                const wasmFile = path.join(tempDir, 'proto_rust_bg.wasm');
                fs.writeFileSync(wasmFile, 'fake wasm content');

                const result = getWasmMtime(tempDir);
                assert.ok(result instanceof Date);
            } finally {
                cleanupTempDir(tempDir);
            }
        });
    });

    describe('checkWasmStatus', () => {
        test('returns needsRebuild=true with reason never_built when no wasm exists', async () => {
            const { checkWasmStatus } = await import('../lib/generators/wasm.js');
            const tempDir = createTempDir();

            try {
                const modelsDir = path.join(tempDir, 'models');
                const outDir = path.join(tempDir, 'pkg-web');
                fs.mkdirSync(modelsDir, { recursive: true });
                fs.writeFileSync(path.join(modelsDir, 'model.rs'), 'struct Model {}');

                const status = checkWasmStatus(modelsDir, outDir);

                assert.strictEqual(status.needsRebuild, true);
                assert.strictEqual(status.reason, 'never_built');
                assert.strictEqual(status.wasmMtime, null);
            } finally {
                cleanupTempDir(tempDir);
            }
        });

        test('returns needsRebuild=false with reason no_models when no models exist', async () => {
            const { checkWasmStatus } = await import('../lib/generators/wasm.js');
            const tempDir = createTempDir();

            try {
                const modelsDir = path.join(tempDir, 'models');
                const outDir = path.join(tempDir, 'pkg-web');
                fs.mkdirSync(modelsDir, { recursive: true });
                fs.mkdirSync(outDir, { recursive: true });
                fs.writeFileSync(path.join(outDir, 'proto_rust_bg.wasm'), 'wasm');

                const status = checkWasmStatus(modelsDir, outDir);

                assert.strictEqual(status.needsRebuild, false);
                assert.strictEqual(status.reason, 'no_models');
                assert.strictEqual(status.modelMtime, null);
            } finally {
                cleanupTempDir(tempDir);
            }
        });

        test('returns needsRebuild=true with reason stale when model is newer than wasm', async () => {
            const { checkWasmStatus } = await import('../lib/generators/wasm.js');
            const tempDir = createTempDir();

            try {
                const modelsDir = path.join(tempDir, 'models');
                const outDir = path.join(tempDir, 'pkg-web');
                fs.mkdirSync(modelsDir, { recursive: true });
                fs.mkdirSync(outDir, { recursive: true });

                // Create wasm file with old timestamp
                const wasmFile = path.join(outDir, 'proto_rust_bg.wasm');
                fs.writeFileSync(wasmFile, 'wasm');
                const oldTime = new Date(Date.now() - 10000);
                fs.utimesSync(wasmFile, oldTime, oldTime);

                // Create model with newer timestamp
                const modelFile = path.join(modelsDir, 'model.rs');
                fs.writeFileSync(modelFile, 'struct Model {}');

                const status = checkWasmStatus(modelsDir, outDir);

                assert.strictEqual(status.needsRebuild, true);
                assert.strictEqual(status.reason, 'stale');
            } finally {
                cleanupTempDir(tempDir);
            }
        });

        test('returns needsRebuild=false with reason current when wasm is newer than model', async () => {
            const { checkWasmStatus } = await import('../lib/generators/wasm.js');
            const tempDir = createTempDir();

            try {
                const modelsDir = path.join(tempDir, 'models');
                const outDir = path.join(tempDir, 'pkg-web');
                fs.mkdirSync(modelsDir, { recursive: true });
                fs.mkdirSync(outDir, { recursive: true });

                // Create model with old timestamp
                const modelFile = path.join(modelsDir, 'model.rs');
                fs.writeFileSync(modelFile, 'struct Model {}');
                const oldTime = new Date(Date.now() - 10000);
                fs.utimesSync(modelFile, oldTime, oldTime);

                // Create wasm file with newer timestamp
                const wasmFile = path.join(outDir, 'proto_rust_bg.wasm');
                fs.writeFileSync(wasmFile, 'wasm');

                const status = checkWasmStatus(modelsDir, outDir);

                assert.strictEqual(status.needsRebuild, false);
                assert.strictEqual(status.reason, 'current');
            } finally {
                cleanupTempDir(tempDir);
            }
        });
    });
});

describe('WASM Generator with Mtime', () => {

    describe('incremental builds', () => {
        test('skips build when WASM is current', withSuppressedConsole(async () => {
            const { generateWasm } = await import('../lib/generators/wasm.js');
            const tempDir = createTempDir();

            try {
                // Setup directories
                const modelsDir = path.join(tempDir, 'app', 'horatio', 'models');
                const outDir = path.join(tempDir, 'pkg-web');
                fs.mkdirSync(modelsDir, { recursive: true });
                fs.mkdirSync(outDir, { recursive: true });

                // Create Cargo.toml
                fs.writeFileSync(path.join(tempDir, 'Cargo.toml'), '[package]\nname = "test"');

                // Create model with old timestamp
                const modelFile = path.join(modelsDir, 'model.rs');
                fs.writeFileSync(modelFile, 'struct Model {}');
                const oldTime = new Date(Date.now() - 10000);
                fs.utimesSync(modelFile, oldTime, oldTime);

                // Create wasm file with newer timestamp
                const wasmFile = path.join(outDir, 'proto_rust_bg.wasm');
                fs.writeFileSync(wasmFile, 'wasm');

                let wasmPackCalled = false;
                const mockExec = async () => {
                    wasmPackCalled = true;
                    return { stdout: '', stderr: '' };
                };

                const result = await generateWasm({
                    wasmTarget: 'web',
                    projectRoot: tempDir,
                    modelsDir: modelsDir,
                    exec: mockExec,
                    skipDetection: true
                });

                assert.strictEqual(wasmPackCalled, false, 'Should not call wasm-pack');
                assert.strictEqual(result.skipped, true, 'Result should indicate skipped');
            } finally {
                cleanupTempDir(tempDir);
            }
        }));

        test('builds when WASM is stale', withSuppressedConsole(async () => {
            const { generateWasm } = await import('../lib/generators/wasm.js');
            const tempDir = createTempDir();

            try {
                // Setup directories
                const modelsDir = path.join(tempDir, 'app', 'horatio', 'models');
                const outDir = path.join(tempDir, 'pkg-web');
                fs.mkdirSync(modelsDir, { recursive: true });
                fs.mkdirSync(outDir, { recursive: true });

                // Create Cargo.toml
                fs.writeFileSync(path.join(tempDir, 'Cargo.toml'), '[package]\nname = "test"');

                // Create wasm file with old timestamp
                const wasmFile = path.join(outDir, 'proto_rust_bg.wasm');
                fs.writeFileSync(wasmFile, 'wasm');
                const oldTime = new Date(Date.now() - 10000);
                fs.utimesSync(wasmFile, oldTime, oldTime);

                // Create model with newer timestamp
                const modelFile = path.join(modelsDir, 'model.rs');
                fs.writeFileSync(modelFile, 'struct Model {}');

                let wasmPackCalled = false;
                const mockExec = async () => {
                    wasmPackCalled = true;
                    return { stdout: '', stderr: '' };
                };

                const result = await generateWasm({
                    wasmTarget: 'web',
                    projectRoot: tempDir,
                    modelsDir: modelsDir,
                    exec: mockExec,
                    skipDetection: true
                });

                assert.strictEqual(wasmPackCalled, true, 'Should call wasm-pack');
                assert.strictEqual(result.skipped, undefined, 'Result should not be skipped');
            } finally {
                cleanupTempDir(tempDir);
            }
        }));

        test('builds when WASM never built', withSuppressedConsole(async () => {
            const { generateWasm } = await import('../lib/generators/wasm.js');
            const tempDir = createTempDir();

            try {
                // Setup directories
                const modelsDir = path.join(tempDir, 'app', 'horatio', 'models');
                fs.mkdirSync(modelsDir, { recursive: true });

                // Create Cargo.toml
                fs.writeFileSync(path.join(tempDir, 'Cargo.toml'), '[package]\nname = "test"');

                // Create model (no wasm output exists)
                const modelFile = path.join(modelsDir, 'model.rs');
                fs.writeFileSync(modelFile, 'struct Model {}');

                let wasmPackCalled = false;
                const mockExec = async () => {
                    wasmPackCalled = true;
                    return { stdout: '', stderr: '' };
                };

                const result = await generateWasm({
                    wasmTarget: 'web',
                    projectRoot: tempDir,
                    modelsDir: modelsDir,
                    exec: mockExec,
                    skipDetection: true
                });

                assert.strictEqual(wasmPackCalled, true, 'Should call wasm-pack for first build');
                assert.strictEqual(result.success, true);
            } finally {
                cleanupTempDir(tempDir);
            }
        }));

        test('force flag bypasses mtime check', withSuppressedConsole(async () => {
            const { generateWasm } = await import('../lib/generators/wasm.js');
            const tempDir = createTempDir();

            try {
                // Setup directories
                const modelsDir = path.join(tempDir, 'app', 'horatio', 'models');
                const outDir = path.join(tempDir, 'pkg-web');
                fs.mkdirSync(modelsDir, { recursive: true });
                fs.mkdirSync(outDir, { recursive: true });

                // Create Cargo.toml
                fs.writeFileSync(path.join(tempDir, 'Cargo.toml'), '[package]\nname = "test"');

                // Create model with old timestamp
                const modelFile = path.join(modelsDir, 'model.rs');
                fs.writeFileSync(modelFile, 'struct Model {}');
                const oldTime = new Date(Date.now() - 10000);
                fs.utimesSync(modelFile, oldTime, oldTime);

                // Create wasm file with newer timestamp (normally would skip)
                const wasmFile = path.join(outDir, 'proto_rust_bg.wasm');
                fs.writeFileSync(wasmFile, 'wasm');

                let wasmPackCalled = false;
                const mockExec = async () => {
                    wasmPackCalled = true;
                    return { stdout: '', stderr: '' };
                };

                await generateWasm({
                    wasmTarget: 'web',
                    projectRoot: tempDir,
                    modelsDir: modelsDir,
                    force: true,  // Force rebuild
                    exec: mockExec,
                    skipDetection: true
                });

                assert.strictEqual(wasmPackCalled, true, 'Should call wasm-pack with force');
            } finally {
                cleanupTempDir(tempDir);
            }
        }));

        test('uses custom checkStatus function when provided', withSuppressedConsole(async () => {
            const { generateWasm } = await import('../lib/generators/wasm.js');
            const tempDir = createTempDir();

            try {
                fs.writeFileSync(path.join(tempDir, 'Cargo.toml'), '[package]\nname = "test"');

                let customCheckCalled = false;
                const mockCheckStatus = () => {
                    customCheckCalled = true;
                    return { needsRebuild: false, reason: 'current' };
                };

                const mockExec = async () => ({ stdout: '', stderr: '' });

                await generateWasm({
                    wasmTarget: 'web',
                    projectRoot: tempDir,
                    exec: mockExec,
                    skipDetection: true,
                    checkStatus: mockCheckStatus
                });

                assert.strictEqual(customCheckCalled, true, 'Should use custom checkStatus');
            } finally {
                cleanupTempDir(tempDir);
            }
        }));
    });
});
