import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { calculateContractHash } from '../lib/hash.js';

describe('Contract Hash Calculation', () => {
    const testDir = path.join(process.cwd(), 'test-models-hashing');

    beforeEach(() => {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
        // Create test directory structure
        fs.mkdirSync(path.join(testDir, 'db'), { recursive: true });
        fs.mkdirSync(path.join(testDir, 'api'), { recursive: true });
    });

    afterEach(() => {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    test('produces deterministic hash from model files', async () => {
        fs.writeFileSync(path.join(testDir, 'db', 'user.rs'), 'struct User {}');
        fs.writeFileSync(path.join(testDir, 'api', 'post.rs'), 'struct Post {}');

        const result1 = await calculateContractHash(testDir);
        const result2 = await calculateContractHash(testDir);

        expect(result1.signature).toBe(result2.signature);
        expect(result1.files['db/user.rs']).toBeDefined();
        expect(result1.files['db/user.rs']).toBeDefined();
    });

    test('hash changes when model content changes', async () => {
        const file = path.join(testDir, 'db', 'user.rs');

        fs.writeFileSync(file, 'struct User { id: i32 }');
        const result1 = await calculateContractHash(testDir);

        fs.writeFileSync(file, 'struct User { id: i64 }');
        const result2 = await calculateContractHash(testDir);

        expect(result1.signature).not.toBe(result2.signature);
        expect(result1.files['db/user.rs']).not.toBe(result2.files['db/user.rs']);
    });

    test('normalizes CRLF to LF', async () => {
        const file = path.join(testDir, 'db', 'user.rs');

        fs.writeFileSync(file, 'struct User { id: i32 }\r\n');
        const result1 = await calculateContractHash(testDir);

        fs.writeFileSync(file, 'struct User { id: i32 }\n');
        const result2 = await calculateContractHash(testDir);

        expect(result1.signature).toBe(result2.signature);
    });
});
