/**
 * BuildAmp Core Contracts Tests
 * Tests for contract hash calculation and integrity checking
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('Core Contracts Module', () => {
    test('calculateContractHash returns signature and files', async () => {
        const { calculateContractHash, discoverProjectPaths } = await import('../core/index.js');

        const paths = discoverProjectPaths();
        const modelsDir = path.join(process.cwd(), paths.modelsDir);

        if (fs.existsSync(modelsDir)) {
            const result = await calculateContractHash(modelsDir);

            assert.ok('signature' in result, 'should have signature');
            assert.ok('files' in result, 'should have files');
            assert.strictEqual(typeof result.signature, 'string', 'signature should be string');
            assert.strictEqual(result.signature.length, 64, 'signature should be SHA-256 hex (64 chars)');
            assert.strictEqual(typeof result.files, 'object', 'files should be object');
        }
    });

    test('calculateContractHash is deterministic', async () => {
        const { calculateContractHash, discoverProjectPaths } = await import('../core/index.js');

        const paths = discoverProjectPaths();
        const modelsDir = path.join(process.cwd(), paths.modelsDir);

        if (fs.existsSync(modelsDir)) {
            const result1 = await calculateContractHash(modelsDir);
            const result2 = await calculateContractHash(modelsDir);

            assert.strictEqual(result1.signature, result2.signature, 'same input should produce same hash');
        }
    });

    test('isContractDirty returns boolean', async () => {
        const { isContractDirty, discoverProjectPaths } = await import('../core/index.js');

        const paths = discoverProjectPaths();
        const modelsDir = path.join(process.cwd(), paths.modelsDir);
        const contractsPath = path.join(process.cwd(), paths.elmGlueDir, 'contracts.json');

        if (fs.existsSync(modelsDir)) {
            const isDirty = await isContractDirty(modelsDir, contractsPath);
            assert.strictEqual(typeof isDirty, 'boolean', 'isContractDirty should return boolean');
        }
    });

    test('getContractStatus returns detailed status', async () => {
        const { getContractStatus, discoverProjectPaths } = await import('../core/index.js');

        const paths = discoverProjectPaths();
        const modelsDir = path.join(process.cwd(), paths.modelsDir);
        const contractsPath = path.join(process.cwd(), paths.elmGlueDir, 'contracts.json');

        if (fs.existsSync(modelsDir)) {
            const status = await getContractStatus(modelsDir, contractsPath);

            assert.ok('isDirty' in status, 'should have isDirty');
            assert.ok('message' in status, 'should have message');
            assert.ok('reason' in status, 'should have reason');
            assert.strictEqual(typeof status.isDirty, 'boolean');
            assert.strictEqual(typeof status.message, 'string');
            assert.strictEqual(typeof status.reason, 'string');
        }
    });

    test('getContractStatus reports missing contracts.json', async () => {
        const { getContractStatus, discoverProjectPaths } = await import('../core/index.js');

        const paths = discoverProjectPaths();
        const modelsDir = path.join(process.cwd(), paths.modelsDir);
        const nonExistentPath = '/tmp/nonexistent-contracts-12345.json';

        if (fs.existsSync(modelsDir)) {
            const status = await getContractStatus(modelsDir, nonExistentPath);

            assert.strictEqual(status.isDirty, true, 'missing contracts.json should be dirty');
            assert.strictEqual(status.reason, 'missing_contract', 'reason should be missing_contract');
        }
    });

    test('getRustFiles returns array of file paths', async () => {
        const { getRustFiles, discoverProjectPaths } = await import('../core/index.js');

        const paths = discoverProjectPaths();
        const modelsDir = path.join(process.cwd(), paths.modelsDir);

        if (fs.existsSync(modelsDir)) {
            const files = await getRustFiles(modelsDir);

            assert.ok(Array.isArray(files), 'should return an array');

            for (const file of files) {
                assert.ok(file.endsWith('.rs'), 'all files should be .rs files');
            }
        }
    });

    test('verifyContractIntegrity returns boolean', async () => {
        const { verifyContractIntegrity, discoverProjectPaths } = await import('../core/index.js');

        const paths = discoverProjectPaths();
        const modelsDir = path.join(process.cwd(), paths.modelsDir);
        const contractsPath = path.join(process.cwd(), paths.elmGlueDir, 'contracts.json');

        if (fs.existsSync(modelsDir)) {
            // Disabled mode should always return true
            const result = await verifyContractIntegrity(modelsDir, contractsPath, { enabled: false });
            assert.strictEqual(result, true, 'disabled check should return true');
        }
    });

    test('getContractInfo returns contract metadata', async () => {
        const { getContractInfo, discoverProjectPaths } = await import('../core/index.js');

        const paths = discoverProjectPaths();
        const contractsPath = path.join(process.cwd(), paths.elmGlueDir, 'contracts.json');

        const info = getContractInfo(contractsPath);

        assert.ok('exists' in info, 'should have exists field');
        assert.strictEqual(typeof info.exists, 'boolean');

        if (info.exists && !info.error) {
            assert.ok('modelHash' in info, 'should have modelHash if exists');
            assert.ok('generatedAt' in info, 'should have generatedAt if exists');
        }
    });
});

describe('Contract Hash Edge Cases', () => {
    test('handles empty models directory', async () => {
        const { calculateContractHash } = await import('../core/index.js');

        // Create a temp directory with no .rs files
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'buildamp-test-'));

        try {
            const result = await calculateContractHash(tempDir);

            assert.ok('signature' in result);
            assert.ok('files' in result);
            assert.deepStrictEqual(result.files, {}, 'empty dir should have no files');
        } finally {
            fs.rmdirSync(tempDir, { recursive: true });
        }
    });

    test('handles non-existent directory gracefully', async () => {
        const { calculateContractHash } = await import('../core/index.js');

        const result = await calculateContractHash('/nonexistent/path/12345');

        assert.ok('signature' in result);
        assert.ok('files' in result);
    });
});
