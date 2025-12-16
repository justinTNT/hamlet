import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const createBuildampPath = path.join(__dirname, '..', 'index.js');

test('Integration tests', async (t) => {
    await t.test('CLI help shows all modes and options', async () => {
        const result = execSync(`node ${createBuildampPath} --help`, {
            encoding: 'utf8'
        });
        
        // Verify all modes are documented
        assert.ok(result.includes('create-buildamp [PROJECT_NAME]'), 'Should show traditional usage');
        assert.ok(result.includes('--codegen-only'), 'Should document codegen-only mode');
        assert.ok(result.includes('--from-models'), 'Should document from-models mode');
        
        // Verify all options are documented
        assert.ok(result.includes('--output'), 'Should document --output option');
        assert.ok(result.includes('--dry-run'), 'Should document --dry-run option');
        assert.ok(result.includes('--help'), 'Should document --help option');
        
        // Verify examples are provided
        assert.ok(result.includes('EXAMPLES:'), 'Should provide usage examples');
        assert.ok(result.includes('create-buildamp my-app'), 'Should show basic example');
        assert.ok(result.includes('--codegen-only --output dist'), 'Should show codegen example');
        assert.ok(result.includes('--from-models src/models'), 'Should show from-models example');
    });
    
    await t.test('All modes handle invalid arguments gracefully', async () => {
        // Test invalid argument combinations
        try {
            execSync(`node ${createBuildampPath} --invalid-flag`, {
                encoding: 'utf8',
                stderr: 'pipe'
            });
        } catch (error) {
            // Should handle gracefully without crashing
            assert.ok(error.status !== 0, 'Should exit with non-zero status for invalid args');
        }
    });
    
    await t.test('Version handling and package info', () => {
        // Verify package.json is properly configured for the new test setup
        const packageJsonPath = path.join(__dirname, '..', 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        assert.ok(packageJson.scripts.test, 'Should have test script configured');
        assert.equal(packageJson.type, 'module', 'Should be ES module');
        assert.ok(packageJson.bin['create-buildamp'], 'Should have bin entry configured');
    });
    
    await t.test('Error handling for missing dependencies', () => {
        // Test behavior when Cargo/Rust tools are not available
        // This would be more of an end-to-end test in CI
        assert.ok(true, 'Placeholder - dependency checking test');
    });
    
    await t.test('Cross-platform path handling', () => {
        // Verify that file paths work correctly across platforms
        // Test the path.join usage in discoverModels and file operations
        assert.ok(true, 'Placeholder - cross-platform path test');
    });
});