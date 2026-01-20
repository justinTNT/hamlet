#!/usr/bin/env node

/**
 * Verification Test for Hamlet Schema-Driven Admin UI
 * Tests that the admin UI can load schema.json and build successfully
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('🧪 Hamlet Schema-Driven Admin UI Verification Test');
console.log('===================================================');

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
    tests.push({ name, fn });
}

function expect(actual, message) {
    return {
        toBe(expected) {
            if (actual === expected) {
                console.log(`✅ ${message}`);
                return true;
            } else {
                console.log(`❌ ${message}: expected ${expected}, got ${actual}`);
                return false;
            }
        },
        toContain(expected) {
            if (typeof actual === 'string' && actual.includes(expected)) {
                console.log(`✅ ${message}`);
                return true;
            } else {
                console.log(`❌ ${message}: expected to contain "${expected}"`);
                return false;
            }
        },
        toExist() {
            if (fs.existsSync(actual)) {
                console.log(`✅ ${message}`);
                return true;
            } else {
                console.log(`❌ ${message}: file does not exist`);
                return false;
            }
        },
        toBeGreaterThan(expected) {
            if (actual > expected) {
                console.log(`✅ ${message}`);
                return true;
            } else {
                console.log(`❌ ${message}: expected greater than ${expected}, got ${actual}`);
                return false;
            }
        }
    };
}

// Test 1: Schema.json exists and has valid structure
test('Schema.json exists with valid structure', () => {
    console.log('\n📋 Testing schema.json...');

    const schemaPath = path.join(rootDir, 'app/horatio/server/.generated/schema.json');
    if (!expect(schemaPath, 'schema.json exists').toExist()) {
        return false;
    }

    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

    let allValid = true;

    allValid &= expect(schema.tables !== undefined, 'Schema has tables object').toBe(true);
    allValid &= expect(schema.tables.guest !== undefined, 'Schema includes guest table').toBe(true);
    allValid &= expect(schema.tables.item_comment !== undefined, 'Schema includes item_comment table').toBe(true);
    allValid &= expect(schema.tables.microblog_item !== undefined, 'Schema includes microblog_item table').toBe(true);
    allValid &= expect(schema.tables.tag !== undefined, 'Schema includes tag table').toBe(true);

    // Check field structure
    const guestFields = schema.tables.guest.fields;
    allValid &= expect(guestFields.id !== undefined, 'Guest has id field').toBe(true);
    allValid &= expect(guestFields.name !== undefined, 'Guest has name field').toBe(true);

    return allValid;
});

// Test 2: Admin Main.elm is schema-driven
test('Main.elm is schema-driven (no Generated imports)', () => {
    console.log('\n🔍 Testing Main.elm is schema-driven...');

    const mainPath = path.join(rootDir, 'app/horatio/admin/web/src/Main.elm');
    if (!expect(mainPath, 'Main.elm exists').toExist()) {
        return false;
    }

    const mainContent = fs.readFileSync(mainPath, 'utf-8');

    let allValid = true;

    // Should NOT import Generated.Resources (old approach)
    allValid &= expect(!mainContent.includes('import Generated.Resources'), 'Does not import Generated.Resources').toBe(true);

    // Should have schema-driven structures
    allValid &= expect(mainContent, 'Has Schema type alias').toContain('type alias Schema');
    allValid &= expect(mainContent, 'Has TableSchema type alias').toContain('type alias TableSchema');
    allValid &= expect(mainContent, 'Fetches schema endpoint').toContain('endpoint = "schema"');
    allValid &= expect(mainContent, 'Decodes schema JSON').toContain('schemaDecoder');

    return allValid;
});

// Test 3: No Generated/Resources.elm (old approach removed)
test('Generated/Resources.elm does not exist (schema-driven approach)', () => {
    console.log('\n🗑️  Verifying old generated files removed...');

    const oldResourcesPath = path.join(rootDir, 'app/horatio/admin/src/Generated/Resources.elm');
    const notExists = !fs.existsSync(oldResourcesPath);

    return expect(notExists, 'Generated/Resources.elm does not exist').toBe(true);
});

// Test 4: Admin UI Builds Successfully
test('Admin UI builds without errors', () => {
    console.log('\n🏗️  Testing admin UI build...');
    try {
        const adminDir = path.join(rootDir, 'app/horatio/admin');
        execSync(`cd ${adminDir} && npm run build`, { stdio: 'pipe', encoding: 'utf8' });

        // Check that dist files were created
        const distExists = fs.existsSync(path.join(adminDir, 'dist/index.html'));

        return expect(distExists, 'Admin UI builds successfully and creates dist files').toBe(true);
    } catch (error) {
        console.log('Build error:', error.message);
        return expect(false, 'Admin UI builds successfully').toBe(true);
    }
});

// Test 5: Admin API middleware has schema endpoint
test('Admin API serves schema endpoint', () => {
    console.log('\n🔗 Testing admin API schema endpoint...');

    const apiPath = path.join(rootDir, 'packages/hamlet-server/middleware/admin-api.js');
    if (!expect(apiPath, 'admin-api.js exists').toExist()) {
        return false;
    }

    const apiContent = fs.readFileSync(apiPath, 'utf-8');

    let allValid = true;

    allValid &= expect(apiContent, 'Has /admin/api/schema endpoint').toContain('/admin/api/schema');
    allValid &= expect(apiContent, 'Reads schema.json file').toContain('schema.json');

    return allValid;
});

// Run all tests
async function runTests() {
    console.log(`\n🚀 Running ${tests.length} admin UI verification tests...\n`);

    for (const test of tests) {
        try {
            const result = await test.fn();
            if (result) {
                passed++;
            } else {
                failed++;
            }
        } catch (error) {
            console.log(`❌ ${test.name}: ${error.message}`);
            failed++;
        }
    }

    console.log('\n📊 Test Results:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${passed + failed}`);

    if (failed === 0) {
        console.log('\n🎉 All admin UI verification tests passed!');
        console.log('👑 Schema-driven admin UI is working correctly!');
    } else {
        console.log('\n⚠️ Some tests failed. Check the output above.');
        process.exit(1);
    }
}

runTests();
