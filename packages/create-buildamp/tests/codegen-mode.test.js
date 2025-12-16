import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const createBuildampPath = path.join(__dirname, '..', 'index.js');

test('Codegen-only mode', async (t) => {
    const testOutputDir = path.join(__dirname, 'temp-codegen-test');
    
    await t.test('--codegen-only --dry-run shows expected output', async () => {
        const result = execSync(`node ${createBuildampPath} --codegen-only --dry-run --output ${testOutputDir}`, {
            encoding: 'utf8',
            cwd: path.join(__dirname, '..', '..')
        });
        
        assert.ok(result.includes('DRY RUN:'), 'Should show dry run message');
        assert.ok(result.includes('buildamp.wasm'), 'Should list WASM file');
        assert.ok(result.includes('buildamp.js'), 'Should list JS file');
        assert.ok(result.includes('buildamp.d.ts'), 'Should list TypeScript definitions');
        assert.ok(result.includes('infrastructure.sql'), 'Should list infrastructure SQL');
        assert.ok(result.includes('manifest.json'), 'Should list manifest');
    });
    
    await t.test('--help shows codegen-only documentation', async () => {
        const result = execSync(`node ${createBuildampPath} --help`, {
            encoding: 'utf8'
        });
        
        assert.ok(result.includes('--codegen-only'), 'Should document --codegen-only flag');
        assert.ok(result.includes('Generate WASM and types only'), 'Should describe codegen-only mode');
        assert.ok(result.includes('--output'), 'Should document --output flag');
        assert.ok(result.includes('--dry-run'), 'Should document --dry-run flag');
    });
    
    // Cleanup
    t.after(() => {
        if (fs.existsSync(testOutputDir)) {
            fs.rmSync(testOutputDir, { recursive: true, force: true });
        }
    });
    
    // Note: We don't test actual WASM generation here since it requires
    // a full Rust build environment. That would be an integration test.
});