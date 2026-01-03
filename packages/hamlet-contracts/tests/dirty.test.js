import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { getContractStatus, updateContractHash } from '../lib/dirty.js';

describe('Contract Dirty Detection', () => {
    const testDir = path.join(process.cwd(), 'test-models-dirty');
    const contractsPath = path.join(testDir, '.hamlet-gen', 'contracts.json');

    beforeEach(() => {
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

    test('reports clean when up to date', async () => {
        fs.writeFileSync(path.join(testDir, 'db', 'user.rs'), 'struct User {}');

        // Generate initial contract
        await updateContractHash(testDir, contractsPath);

        const status = await getContractStatus(testDir, contractsPath);
        expect(status.isDirty).toBe(false);
        expect(status.reason).toBe('clean');
    });

    test('reports dirty when file modified', async () => {
        fs.writeFileSync(path.join(testDir, 'db', 'user.rs'), 'struct User {}');
        await updateContractHash(testDir, contractsPath);

        // Modify file
        fs.writeFileSync(path.join(testDir, 'db', 'user.rs'), 'struct User { field: i32 }');

        const status = await getContractStatus(testDir, contractsPath);
        expect(status.isDirty).toBe(true);
        expect(status.details.changed).toContain('db/user.rs');
    });

    test('reports dirty when file added', async () => {
        fs.writeFileSync(path.join(testDir, 'db', 'user.rs'), 'struct User {}');
        await updateContractHash(testDir, contractsPath);

        // Add file
        fs.writeFileSync(path.join(testDir, 'db', 'post.rs'), 'struct Post {}');

        const status = await getContractStatus(testDir, contractsPath);
        expect(status.isDirty).toBe(true);
        expect(status.details.added).toContain('db/post.rs');
    });

    test('reports dirty when contracts.json missing', async () => {
        fs.writeFileSync(path.join(testDir, 'db', 'user.rs'), 'struct User {}');
        // Don't generate contract

        const status = await getContractStatus(testDir, contractsPath);
        expect(status.isDirty).toBe(true);
        expect(status.reason).toBe('missing_contract');
    });
});
