#!/usr/bin/env node

/**
 * Integration Test for Hamlet Code Generation
 * Tests the complete generation pipeline and validates outputs
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🧪 Hamlet Code Generation Integration Test');
console.log('==========================================');

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
        }
    };
}

// Test 1: Generation Pipeline
test('Generation pipeline completes successfully', () => {
    console.log('\n📊 Testing code generation...');
    try {
        execSync('npm run generate', { stdio: 'pipe' });
        return expect(true, 'Generation pipeline ran without errors').toBe(true);
    } catch (error) {
        return expect(false, 'Generation pipeline ran without errors').toBe(true);
    }
});

// Test 2: File Existence
test('Generated files exist', () => {
    console.log('\n📁 Testing generated files...');
    const files = [
        'app/horatio/server/.hamlet-gen/api-routes.js',
        'app/horatio/server/.hamlet-gen/database-queries.js',
        'app/horatio/server/.hamlet-gen/kv-store.js',
        'app/horatio/web/src/.hamlet-gen/browser-storage.js',
        'app/horatio/web/src/.hamlet-gen/ApiClient.elm',
        'app/horatio/web/src/.hamlet-gen/StoragePorts.elm'
    ];
    
    let allExist = true;
    for (const file of files) {
        const exists = expect(file, `File ${file} exists`).toExist();
        allExist = allExist && exists;
    }
    
    return allExist;
});

// Test 3: Content Quality
test('Generated content has expected structure', () => {
    console.log('\n🔍 Testing generated content...');
    
    const apiRoutes = fs.readFileSync('app/horatio/server/.hamlet-gen/api-routes.js', 'utf-8');
    const elmClient = fs.readFileSync('app/horatio/web/src/.hamlet-gen/ApiClient.elm', 'utf-8');
    
    let allValid = true;
    
    allValid &= expect(apiRoutes, 'API routes contains registerApiRoutes').toContain('registerApiRoutes');
    allValid &= expect(apiRoutes, 'API routes contains /api/ endpoints').toContain('/api/');
    allValid &= expect(elmClient, 'Elm client has module declaration').toContain('module Generated.ApiClient');
    allValid &= expect(elmClient, 'Elm client has HTTP functions').toContain('Http.post');
    
    return allValid;
});

// Test 4: Unit Tests Pass
test('Unit tests pass', () => {
    console.log('\n🧪 Testing unit tests...');
    try {
        execSync('cd packages/hamlet-server && npm test -- tests/generation/generation.test.js --no-coverage', { stdio: 'pipe' });
        return expect(true, 'Unit tests pass').toBe(true);
    } catch (error) {
        return expect(false, 'Unit tests pass').toBe(true);
    }
});

// Test 5: No Dangerous Patterns
test('No dangerous code patterns', () => {
    console.log('\n🔒 Testing security...');
    
    const dbQueries = fs.readFileSync('app/horatio/server/.hamlet-gen/database-queries.js', 'utf-8');
    
    let allSafe = true;
    
    // Should not have eval
    allSafe &= expect(!dbQueries.includes('eval('), 'No eval() functions').toBe(true);
    
    // Should have parameterized queries
    allSafe &= expect(dbQueries, 'Uses parameterized queries').toContain('pool.query(');
    allSafe &= expect(dbQueries, 'Uses parameter arrays').toContain('[host,');
    
    return allSafe;
});

// Run all tests
async function runTests() {
    console.log(`\n🚀 Running ${tests.length} integration tests...\n`);
    
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
        console.log('\n🎉 All integration tests passed!');
        console.log('🚀 Hamlet code generation is working correctly!');
    } else {
        console.log('\n⚠️ Some tests failed. Check the output above.');
        process.exit(1);
    }
}

runTests();