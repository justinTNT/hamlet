import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { verifyContractIntegrity } from '../lib/integrity.js';
import { updateContractHash } from '../lib/dirty.js';

describe('Contract Integrity Check', () => {
    const testDir = path.join(process.cwd(), 'test-models-integrity');
    const contractsPath = path.join(testDir, '.hamlet-gen', 'contracts.json');
    const mockLogger = jest.fn();
    const mockExit = jest.fn();

    beforeEach(() => {
        mockLogger.mockClear();
        mockExit.mockClear();
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
        fs.mkdirSync(path.join(testDir, 'db'), { recursive: true });
        fs.mkdirSync(path.join(testDir, '.hamlet-gen'), { recursive: true });
    });

    afterEach(() => {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    // Helper to sync run
    const runVerify = async (options = {}) => {
        return verifyContractIntegrity(testDir, contractsPath, {
            logger: mockLogger,
            exitProcess: true, // we mock exit
            ...options
        });
    };

    test('passes silently when clean', async () => {
        fs.writeFileSync(path.join(testDir, 'db', 'user.rs'), 'struct User {}');
        await updateContractHash(testDir, contractsPath);

        await runVerify();

        expect(mockLogger).not.toHaveBeenCalled();
    });

    test('warns when mismatch (warn-only default)', async () => {
        fs.writeFileSync(path.join(testDir, 'db', 'user.rs'), 'struct User {}');
        await updateContractHash(testDir, contractsPath);

        // Modify file
        fs.writeFileSync(path.join(testDir, 'db', 'user.rs'), 'struct User { field: i32 }');

        // Run WITHOUT exitProcess
        await verifyContractIntegrity(testDir, contractsPath, {
            logger: mockLogger,
            exitProcess: false // Warn only
        });

        expect(mockLogger).toHaveBeenCalledWith(expect.stringContaining('Mismatch'));
    });

    test('exits when strict mode enabled', async () => {
        fs.writeFileSync(path.join(testDir, 'db', 'user.rs'), 'struct User {}');
        await updateContractHash(testDir, contractsPath);

        // Modify file
        fs.writeFileSync(path.join(testDir, 'db', 'user.rs'), 'struct User { field: i32 }');

        // Mock process.exit
        const originalExit = process.exit;
        process.exit = mockExit;

        try {
            try {
                await runVerify({ exitProcess: true });
            } catch (e) { }

            expect(mockLogger).toHaveBeenCalledWith(expect.stringContaining('Mismatch'));
            expect(mockExit).toHaveBeenCalledWith(1);
        } finally {
            process.exit = originalExit;
        }
    });
});
