#!/usr/bin/env node

/**
 * Verification Test for Hamlet Admin UI Generation
 * Tests the admin UI generation pipeline and validates outputs
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('🧪 Hamlet Admin UI Generation Verification Test');
console.log('===============================================');

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

// Test 1: Admin UI Generation Pipeline
test('Admin UI generation completes successfully', () => {
    console.log('\n👑 Testing admin UI generation...');
    try {
        const output = execSync('npx hamlet gen', { stdio: 'pipe', encoding: 'utf8' });
        const success = output.includes('Admin UI Generation') && output.includes('app/horatio/admin/src/Generated/Resources.elm');
        return expect(success, 'Admin UI generation ran without errors').toBe(true);
    } catch (error) {
        console.log('Generation error:', error.message);
        return expect(false, 'Admin UI generation ran without errors').toBe(true);
    }
});

// Test 2: Generated Admin Files Exist
test('Generated admin files exist', () => {
    console.log('\n📁 Testing generated admin files...');
    const files = [
        path.join(rootDir, 'app/horatio/admin/src/Generated/Resources.elm'),
        path.join(rootDir, 'app/horatio/admin/package.json'),
        path.join(rootDir, 'app/horatio/admin/src/Main.elm')
    ];
    
    let allExist = true;
    for (const file of files) {
        const exists = expect(file, `File ${file} exists`).toExist();
        allExist = allExist && exists;
    }
    
    return allExist;
});

// Test 3: Generated Resources.elm Content Quality
test('Generated Resources.elm has expected structure', () => {
    console.log('\n🔍 Testing generated Resources.elm content...');
    
    const resourcesPath = path.join(rootDir, 'app/horatio/admin/src/Generated/Resources.elm');
    if (!fs.existsSync(resourcesPath)) {
        return expect(false, 'Resources.elm exists').toBe(true);
    }
    
    const resourcesContent = fs.readFileSync(resourcesPath, 'utf-8');
    
    let allValid = true;
    
    // Basic Elm module structure
    allValid &= expect(resourcesContent, 'Has proper Elm module declaration').toContain('module Generated.Resources exposing (..)');
    allValid &= expect(resourcesContent, 'Has Resource type definition').toContain('type Resource');
    allValid &= expect(resourcesContent, 'Has resourceToString function').toContain('resourceToString : Resource -> String');
    
    // Database model coverage
    allValid &= expect(resourcesContent, 'Includes Guest model').toContain('Guest');
    allValid &= expect(resourcesContent, 'Includes ItemComment model').toContain('ItemComment');
    allValid &= expect(resourcesContent, 'Includes Tag model').toContain('Tag');
    
    // Form generation
    allValid &= expect(resourcesContent, 'Has form field generation').toContain('getFieldsFor');
    allValid &= expect(resourcesContent, 'Has FormModel type').toContain('type alias FormModel');
    allValid &= expect(resourcesContent, 'Has viewForm function').toContain('viewForm : FormModel');
    
    // Table generation
    allValid &= expect(resourcesContent, 'Has table view generation').toContain('viewTable : TableConfig');
    allValid &= expect(resourcesContent, 'Has specific table views').toContain('viewItemCommentTable');
    allValid &= expect(resourcesContent, 'Has table row views').toContain('viewItemCommentRow');
    
    return allValid;
});

// Test 4: Critical Field Coverage
test('ItemComment includes text field (the original issue)', () => {
    console.log('\n📝 Testing ItemComment text field inclusion...');
    
    const resourcesPath = 'app/horatio/admin/src/Generated/Resources.elm';
    if (!fs.existsSync(resourcesPath)) {
        return expect(false, 'Resources.elm exists').toBe(true);
    }
    
    const resourcesContent = fs.readFileSync(resourcesPath, 'utf-8');
    
    let allValid = true;
    
    // Check that ItemComment form includes text field
    allValid &= expect(resourcesContent, 'ItemComment form includes text field').toContain('{ name = "text"');
    
    // Check that ItemComment table includes text field header
    allValid &= expect(resourcesContent, 'ItemComment table includes Text header').toContain('th [] [ text "Text" ]');
    
    // Check that ItemComment table row includes text field data
    allValid &= expect(resourcesContent, 'ItemComment table row includes text data').toContain('getStringField "text" item');
    
    return allValid;
});

// Test 5: Proper Field Filtering
test('Proper field filtering (exclude JSONB, infrastructure fields)', () => {
    console.log('\n🔒 Testing field filtering...');
    
    const resourcesPath = 'app/horatio/admin/src/Generated/Resources.elm';
    if (!fs.existsSync(resourcesPath)) {
        return expect(false, 'Resources.elm exists').toBe(true);
    }
    
    const resourcesContent = fs.readFileSync(resourcesPath, 'utf-8');
    
    let allValid = true;
    
    // Should NOT include infrastructure fields in forms
    allValid &= expect(!resourcesContent.includes('{ name = "host"'), 'Forms exclude host field').toBe(true);
    allValid &= expect(!resourcesContent.includes('{ name = "updated_at"'), 'Forms exclude updated_at field').toBe(true);
    allValid &= expect(!resourcesContent.includes('{ name = "deleted_at"'), 'Forms exclude deleted_at field').toBe(true);
    
    // Should include created_at in tables but not forms
    allValid &= expect(resourcesContent, 'Tables include created_at for reference').toContain('th [] [ text "Created At" ]');
    allValid &= expect(!resourcesContent.includes('{ name = "created_at"'), 'Forms exclude created_at field').toBe(true);
    
    return allValid;
});

// Test 6: Admin UI Builds Successfully
test('Admin UI builds without errors', () => {
    console.log('\n🏗️  Testing admin UI build...');
    try {
        const adminDir = path.join(rootDir, 'app/horatio/admin');
        const output = execSync(`cd ${adminDir} && npm run build`, { stdio: 'pipe', encoding: 'utf8' });
        const success = output.includes('Success!') && output.includes('built in');
        
        // Also check that dist files were created
        const distExists = fs.existsSync(path.join(adminDir, 'dist/index.html'));
        
        return expect(success && distExists, 'Admin UI builds successfully and creates dist files').toBe(true);
    } catch (error) {
        console.log('Build error:', error.message);
        return expect(false, 'Admin UI builds successfully').toBe(true);
    }
});

// Test 7: Admin Generation Script Integration
test('Admin generation integrates with main generation script', () => {
    console.log('\n🔗 Testing integration with main generation...');
    
    // Check the new hamlet-cli generation orchestrator
    const orchestratorPath = path.join(__dirname, '../packages/hamlet-cli/lib/generation-orchestrator.js');
    if (!fs.existsSync(orchestratorPath)) {
        return expect(false, 'Generation orchestrator exists').toBe(true);
    }
    
    const orchestratorContent = fs.readFileSync(orchestratorPath, 'utf-8');
    
    let allValid = true;
    
    // Check that admin generation is imported and called
    allValid &= expect(orchestratorContent, 'Imports admin generation function').toContain('generateAdminUi');
    allValid &= expect(orchestratorContent, 'Calls admin generation in pipeline').toContain('await generators.generateAdminUi()');
    allValid &= expect(orchestratorContent, 'Has admin phase documentation').toContain('Admin UI Generation');
    
    return allValid;
});

// Test 8: Code Generation Quality
test('Generated code follows Elm conventions', () => {
    console.log('\n📐 Testing Elm code quality...');
    
    const resourcesPath = 'app/horatio/admin/src/Generated/Resources.elm';
    if (!fs.existsSync(resourcesPath)) {
        return expect(false, 'Resources.elm exists').toBe(true);
    }
    
    const resourcesContent = fs.readFileSync(resourcesPath, 'utf-8');
    
    let allValid = true;
    
    // Check for proper Elm boolean syntax (not JavaScript)
    allValid &= expect(resourcesContent, 'Uses Elm True/False not JavaScript true/false').toContain('True');
    allValid &= expect(resourcesContent, 'Uses Elm True/False not JavaScript true/false').toContain('False');
    allValid &= expect(!resourcesContent.includes(' = true'), 'No JavaScript boolean syntax').toBe(true);
    allValid &= expect(!resourcesContent.includes(' = false'), 'No JavaScript boolean syntax').toBe(true);
    
    // Check for proper Elm function syntax
    allValid &= expect(resourcesContent, 'Uses proper Elm type annotations').toContain(' : ');
    allValid &= expect(resourcesContent, 'Has proper Elm case expressions').toContain('case ');
    
    // Check that generated code has reasonable line count (not empty generation)
    const lineCount = resourcesContent.split('\n').length;
    allValid &= expect(lineCount, 'Generated file has substantial content').toBeGreaterThan(200);
    
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
        console.log('👑 Hamlet admin UI generation is working correctly!');
        console.log('🚀 "Rust once, UI never" principle achieved for admin interfaces!');
    } else {
        console.log('\n⚠️ Some tests failed. Check the output above.');
        process.exit(1);
    }
}

runTests();