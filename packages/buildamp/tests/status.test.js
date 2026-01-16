/**
 * BuildAmp Status Command Tests
 * Tests for the `buildamp status` command
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Helper to create temp directories for testing
function createTempDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'buildamp-status-test-'));
}

// Helper to clean up temp directories
function cleanupTempDir(dir) {
    fs.rmSync(dir, { recursive: true, force: true });
}

// Suppress console output during tests
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

describe('Status Command', () => {

    describe('getStatus function', () => {
        test('returns object with expected top-level fields', withSuppressedConsole(async () => {
            const { getStatus } = await import('../lib/orchestrator.js');
            const tempDir = createTempDir();

            try {
                const contractsPath = path.join(tempDir, 'contracts.json');
                fs.writeFileSync(contractsPath, JSON.stringify({
                    modelHash: 'abc123',
                    files: {},
                    generatedAt: '2026-01-16T12:00:00Z'
                }));

                const result = await getStatus({
                    contractsPath,
                    modelsDir: tempDir
                });

                assert.ok('appName' in result, 'Should have appName field');
                assert.ok('models' in result, 'Should have models field');
                assert.ok('wasm' in result, 'Should have wasm field');
            } finally {
                cleanupTempDir(tempDir);
            }
        }));

        test('models status shows clean when contract matches', withSuppressedConsole(async () => {
            const { getStatus } = await import('../lib/orchestrator.js');
            const tempDir = createTempDir();

            try {
                // Create a models directory with a rust file
                const modelsDir = path.join(tempDir, 'models');
                const apiDir = path.join(modelsDir, 'api');
                fs.mkdirSync(apiDir, { recursive: true });
                fs.writeFileSync(path.join(apiDir, 'comment.rs'), 'pub struct Comment {}');

                // Calculate hash and create matching contract
                const { calculateContractHash } = await import('../core/contracts.js');
                const { signature } = await calculateContractHash(modelsDir);

                const contractsPath = path.join(tempDir, 'contracts.json');
                fs.writeFileSync(contractsPath, JSON.stringify({
                    modelHash: signature,
                    files: { 'api/comment.rs': signature },
                    generatedAt: '2026-01-16T12:00:00Z'
                }));

                const result = await getStatus({
                    contractsPath,
                    modelsDir
                });

                assert.strictEqual(result.models.isDirty, false, 'Models should be clean');
                assert.strictEqual(result.models.reason, 'clean', 'Reason should be clean');
            } finally {
                cleanupTempDir(tempDir);
            }
        }));

        test('models status shows dirty when contract differs', withSuppressedConsole(async () => {
            const { getStatus } = await import('../lib/orchestrator.js');
            const tempDir = createTempDir();

            try {
                const contractsPath = path.join(tempDir, 'contracts.json');
                fs.writeFileSync(contractsPath, JSON.stringify({
                    modelHash: 'old-hash',
                    files: { 'api/comment.rs': 'old-file-hash' },
                    generatedAt: '2026-01-16T12:00:00Z'
                }));

                // Create models dir with different content
                const modelsDir = path.join(tempDir, 'models');
                const apiDir = path.join(modelsDir, 'api');
                fs.mkdirSync(apiDir, { recursive: true });
                fs.writeFileSync(path.join(apiDir, 'comment.rs'), 'pub struct Comment { id: i32 }');

                const result = await getStatus({
                    contractsPath,
                    modelsDir
                });

                assert.strictEqual(result.models.isDirty, true, 'Models should be dirty');
            } finally {
                cleanupTempDir(tempDir);
            }
        }));

        test('models status includes changed files list', withSuppressedConsole(async () => {
            const { getStatus } = await import('../lib/orchestrator.js');
            const tempDir = createTempDir();

            try {
                const contractsPath = path.join(tempDir, 'contracts.json');
                fs.writeFileSync(contractsPath, JSON.stringify({
                    modelHash: 'old-hash',
                    files: { 'api/comment.rs': 'old-hash' },
                    generatedAt: '2026-01-16T12:00:00Z'
                }));

                const modelsDir = path.join(tempDir, 'models');
                const apiDir = path.join(modelsDir, 'api');
                fs.mkdirSync(apiDir, { recursive: true });
                fs.writeFileSync(path.join(apiDir, 'comment.rs'), 'pub struct Comment { modified: bool }');

                const result = await getStatus({
                    contractsPath,
                    modelsDir
                });

                assert.ok(result.models.details, 'Should have details');
                assert.ok(result.models.details.changed, 'Should have changed files');
                assert.ok(result.models.details.changed.includes('api/comment.rs'), 'Should list changed file');
            } finally {
                cleanupTempDir(tempDir);
            }
        }));
    });

    describe('WASM status (mtime-based)', () => {
        test('wasm status includes web and node targets', withSuppressedConsole(async () => {
            const { getStatus } = await import('../lib/orchestrator.js');
            const tempDir = createTempDir();

            try {
                // Create models dir with .rs file
                const modelsDir = path.join(tempDir, 'models');
                fs.mkdirSync(modelsDir, { recursive: true });
                fs.writeFileSync(path.join(modelsDir, 'model.rs'), 'struct Model {}');

                // Create contracts.json (for model contract status)
                const contractsPath = path.join(tempDir, 'contracts.json');
                fs.writeFileSync(contractsPath, JSON.stringify({
                    modelHash: 'abc123',
                    files: {}
                }));

                const result = await getStatus({
                    contractsPath,
                    modelsDir,
                    projectRoot: tempDir
                });

                assert.ok('web' in result.wasm, 'Should have web status');
                assert.ok('node' in result.wasm, 'Should have node status');
            } finally {
                cleanupTempDir(tempDir);
            }
        }));

        test('wasm web shows current when wasm is newer than model', withSuppressedConsole(async () => {
            const { getStatus } = await import('../lib/orchestrator.js');
            const tempDir = createTempDir();

            try {
                // Create models dir with old .rs file
                const modelsDir = path.join(tempDir, 'models');
                fs.mkdirSync(modelsDir, { recursive: true });
                const modelFile = path.join(modelsDir, 'model.rs');
                fs.writeFileSync(modelFile, 'struct Model {}');
                const oldTime = new Date(Date.now() - 10000);
                fs.utimesSync(modelFile, oldTime, oldTime);

                // Create WASM output with newer timestamp
                const webDir = path.join(tempDir, 'pkg-web');
                fs.mkdirSync(webDir, { recursive: true });
                fs.writeFileSync(path.join(webDir, 'proto_rust_bg.wasm'), 'wasm');

                const contractsPath = path.join(tempDir, 'contracts.json');
                fs.writeFileSync(contractsPath, JSON.stringify({
                    modelHash: 'abc123',
                    files: {}
                }));

                const result = await getStatus({
                    contractsPath,
                    modelsDir,
                    projectRoot: tempDir
                });

                assert.strictEqual(result.wasm.web.isDirty, false, 'Web should be current');
                assert.strictEqual(result.wasm.web.reason, 'current', 'Reason should be current');
            } finally {
                cleanupTempDir(tempDir);
            }
        }));

        test('wasm node shows stale when model is newer than wasm', withSuppressedConsole(async () => {
            const { getStatus } = await import('../lib/orchestrator.js');
            const tempDir = createTempDir();

            try {
                // Create WASM output with old timestamp
                const nodeDir = path.join(tempDir, 'pkg-node');
                fs.mkdirSync(nodeDir, { recursive: true });
                const wasmFile = path.join(nodeDir, 'proto_rust_bg.wasm');
                fs.writeFileSync(wasmFile, 'wasm');
                const oldTime = new Date(Date.now() - 10000);
                fs.utimesSync(wasmFile, oldTime, oldTime);

                // Create models dir with newer .rs file
                const modelsDir = path.join(tempDir, 'models');
                fs.mkdirSync(modelsDir, { recursive: true });
                fs.writeFileSync(path.join(modelsDir, 'model.rs'), 'struct Model {}');

                const contractsPath = path.join(tempDir, 'contracts.json');
                fs.writeFileSync(contractsPath, JSON.stringify({
                    modelHash: 'abc123',
                    files: {}
                }));

                const result = await getStatus({
                    contractsPath,
                    modelsDir,
                    projectRoot: tempDir
                });

                assert.strictEqual(result.wasm.node.isDirty, true, 'Node should be stale');
                assert.strictEqual(result.wasm.node.reason, 'stale', 'Reason should be stale');
            } finally {
                cleanupTempDir(tempDir);
            }
        }));

        test('wasm shows never_built when wasm files missing', withSuppressedConsole(async () => {
            const { getStatus } = await import('../lib/orchestrator.js');
            const tempDir = createTempDir();

            try {
                // Create models dir with .rs file
                const modelsDir = path.join(tempDir, 'models');
                fs.mkdirSync(modelsDir, { recursive: true });
                fs.writeFileSync(path.join(modelsDir, 'model.rs'), 'struct Model {}');

                // No WASM output dirs

                const contractsPath = path.join(tempDir, 'contracts.json');
                fs.writeFileSync(contractsPath, JSON.stringify({
                    modelHash: 'abc123',
                    files: {}
                }));

                const result = await getStatus({
                    contractsPath,
                    modelsDir,
                    projectRoot: tempDir
                });

                assert.strictEqual(result.wasm.web.isDirty, true, 'Web should be dirty');
                assert.strictEqual(result.wasm.web.reason, 'never_built', 'Should be never_built');
                assert.strictEqual(result.wasm.node.isDirty, true, 'Node should be dirty');
                assert.strictEqual(result.wasm.node.reason, 'never_built', 'Should be never_built');
            } finally {
                cleanupTempDir(tempDir);
            }
        }));

        test('wasm status includes wasmMtime when built', withSuppressedConsole(async () => {
            const { getStatus } = await import('../lib/orchestrator.js');
            const tempDir = createTempDir();

            try {
                // Create models dir with old .rs file
                const modelsDir = path.join(tempDir, 'models');
                fs.mkdirSync(modelsDir, { recursive: true });
                const modelFile = path.join(modelsDir, 'model.rs');
                fs.writeFileSync(modelFile, 'struct Model {}');
                const oldTime = new Date(Date.now() - 10000);
                fs.utimesSync(modelFile, oldTime, oldTime);

                // Create WASM output
                const webDir = path.join(tempDir, 'pkg-web');
                fs.mkdirSync(webDir, { recursive: true });
                fs.writeFileSync(path.join(webDir, 'proto_rust_bg.wasm'), 'wasm');

                const contractsPath = path.join(tempDir, 'contracts.json');
                fs.writeFileSync(contractsPath, JSON.stringify({
                    modelHash: 'abc123',
                    files: {}
                }));

                const result = await getStatus({
                    contractsPath,
                    modelsDir,
                    projectRoot: tempDir
                });

                assert.ok(result.wasm.web.wasmMtime instanceof Date, 'wasmMtime should be a Date');
            } finally {
                cleanupTempDir(tempDir);
            }
        }));
    });

    describe('suggested commands', () => {
        test('suggests gen command when models dirty', withSuppressedConsole(async () => {
            const { getStatus } = await import('../lib/orchestrator.js');
            const tempDir = createTempDir();

            try {
                const contractsPath = path.join(tempDir, 'contracts.json');
                fs.writeFileSync(contractsPath, JSON.stringify({
                    modelHash: 'old-hash',
                    files: {}
                }));

                const modelsDir = path.join(tempDir, 'models');
                const apiDir = path.join(modelsDir, 'api');
                fs.mkdirSync(apiDir, { recursive: true });
                fs.writeFileSync(path.join(apiDir, 'test.rs'), 'pub struct Test {}');

                const result = await getStatus({
                    contractsPath,
                    modelsDir
                });

                assert.ok(result.suggestions, 'Should have suggestions');
                assert.ok(result.suggestions.length > 0, 'Should have at least one suggestion');
                assert.ok(
                    result.suggestions.some(s => s.includes('buildamp gen')),
                    'Should suggest buildamp gen'
                );
            } finally {
                cleanupTempDir(tempDir);
            }
        }));

        test('suggests gen:wasm when WASM stale', withSuppressedConsole(async () => {
            const { getStatus } = await import('../lib/orchestrator.js');
            const tempDir = createTempDir();

            try {
                // Create WASM output with old timestamp
                const webDir = path.join(tempDir, 'pkg-web');
                fs.mkdirSync(webDir, { recursive: true });
                const wasmFile = path.join(webDir, 'proto_rust_bg.wasm');
                fs.writeFileSync(wasmFile, 'wasm');
                const oldTime = new Date(Date.now() - 10000);
                fs.utimesSync(wasmFile, oldTime, oldTime);

                // Create models dir with newer .rs file
                const modelsDir = path.join(tempDir, 'models');
                fs.mkdirSync(modelsDir, { recursive: true });
                fs.writeFileSync(path.join(modelsDir, 'model.rs'), 'struct Model {}');

                const contractsPath = path.join(tempDir, 'contracts.json');
                fs.writeFileSync(contractsPath, JSON.stringify({
                    modelHash: 'abc123',
                    files: {}
                }));

                const result = await getStatus({
                    contractsPath,
                    modelsDir,
                    projectRoot: tempDir
                });

                assert.ok(result.suggestions, 'Should have suggestions');
                assert.ok(
                    result.suggestions.some(s => s.includes('gen:wasm')),
                    'Should suggest gen:wasm'
                );
            } finally {
                cleanupTempDir(tempDir);
            }
        }));

        test('no suggestions when everything current', withSuppressedConsole(async () => {
            const { getStatus } = await import('../lib/orchestrator.js');
            const tempDir = createTempDir();

            try {
                // Create models dir with old .rs file (or empty)
                const modelsDir = path.join(tempDir, 'models');
                fs.mkdirSync(modelsDir, { recursive: true });
                const modelFile = path.join(modelsDir, 'model.rs');
                fs.writeFileSync(modelFile, 'struct Model {}');
                const oldTime = new Date(Date.now() - 10000);
                fs.utimesSync(modelFile, oldTime, oldTime);

                // Create WASM outputs with newer timestamps
                const webDir = path.join(tempDir, 'pkg-web');
                const nodeDir = path.join(tempDir, 'pkg-node');
                fs.mkdirSync(webDir, { recursive: true });
                fs.mkdirSync(nodeDir, { recursive: true });
                fs.writeFileSync(path.join(webDir, 'proto_rust_bg.wasm'), 'wasm');
                fs.writeFileSync(path.join(nodeDir, 'proto_rust_bg.wasm'), 'wasm');

                // Create matching contracts.json
                const { calculateContractHash } = await import('../core/contracts.js');
                const { signature } = await calculateContractHash(modelsDir);

                const contractsPath = path.join(tempDir, 'contracts.json');
                fs.writeFileSync(contractsPath, JSON.stringify({
                    modelHash: signature,
                    files: {},
                    generatedAt: '2026-01-16T12:00:00Z'
                }));

                const result = await getStatus({
                    contractsPath,
                    modelsDir,
                    projectRoot: tempDir
                });

                assert.ok(result.suggestions.length === 0, 'Should have no suggestions when current');
            } finally {
                cleanupTempDir(tempDir);
            }
        }));
    });

    describe('generatedAt timestamp', () => {
        test('includes generatedAt in models status', withSuppressedConsole(async () => {
            const { getStatus } = await import('../lib/orchestrator.js');
            const tempDir = createTempDir();

            try {
                const contractsPath = path.join(tempDir, 'contracts.json');
                fs.writeFileSync(contractsPath, JSON.stringify({
                    modelHash: 'abc123',
                    files: {},
                    generatedAt: '2026-01-16T12:00:00Z'
                }));

                const result = await getStatus({
                    contractsPath,
                    modelsDir: tempDir
                });

                assert.strictEqual(result.models.generatedAt, '2026-01-16T12:00:00Z');
            } finally {
                cleanupTempDir(tempDir);
            }
        }));
    });

    describe('missing contracts.json', () => {
        test('handles missing contracts.json gracefully', withSuppressedConsole(async () => {
            const { getStatus } = await import('../lib/orchestrator.js');
            const tempDir = createTempDir();

            try {
                const contractsPath = path.join(tempDir, 'nonexistent.json');

                const result = await getStatus({
                    contractsPath,
                    modelsDir: tempDir
                });

                assert.strictEqual(result.models.isDirty, true, 'Should be dirty');
                assert.strictEqual(result.models.reason, 'missing_contract', 'Should indicate missing');
            } finally {
                cleanupTempDir(tempDir);
            }
        }));
    });
});

describe('status() orchestrator function', () => {
    test('status function exists and is callable', withSuppressedConsole(async () => {
        const { status } = await import('../lib/orchestrator.js');

        assert.ok(typeof status === 'function', 'status should be a function');
    }));

    test('status returns result object', withSuppressedConsole(async () => {
        const { status } = await import('../lib/orchestrator.js');

        const result = await status();

        assert.ok(typeof result === 'object', 'status should return an object');
    }));
});
