#!/usr/bin/env node

/**
 * Generation Tests Runner
 * 
 * Runs all code generation unit tests and integration tests
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Test configuration
 */
const TEST_CONFIG = {
    testFiles: [
        'tests/generation/database-queries.test.js',
        'tests/generation/api-routes.test.js',
        'tests/generation/browser-storage.test.js',
        'tests/generation/kv-store.test.js',
        'tests/generation/integration.test.js'
    ],
    timeout: 30000, // 30 seconds
    coverage: true
};

/**
 * Run a single test file
 */
async function runTestFile(testFile) {
    console.log(`🧪 Running ${testFile}...`);
    
    try {
        const { stdout, stderr } = await execAsync(
            `npm test -- ${testFile}`,
            { timeout: TEST_CONFIG.timeout }
        );
        
        if (stderr && !stderr.includes('PASS')) {
            console.error(`⚠️  Warnings in ${testFile}:`);
            console.error(stderr);
        }
        
        return {
            file: testFile,
            success: true,
            output: stdout
        };
        
    } catch (error) {
        console.error(`❌ Failed: ${testFile}`);
        console.error(error.message);
        
        return {
            file: testFile,
            success: false,
            error: error.message
        };
    }
}

/**
 * Run all generation tests
 */
async function runAllTests() {
    console.log('🚀 Running Hamlet Generation Tests');
    console.log('==================================');
    console.log('');
    
    // Check if test files exist
    const missingFiles = [];
    for (const testFile of TEST_CONFIG.testFiles) {
        if (!fs.existsSync(testFile)) {
            missingFiles.push(testFile);
        }
    }
    
    if (missingFiles.length > 0) {
        console.error('❌ Missing test files:');
        missingFiles.forEach(file => console.error(`   ${file}`));
        process.exit(1);
    }
    
    const results = [];
    let passed = 0;
    let failed = 0;
    
    // Run each test file
    for (const testFile of TEST_CONFIG.testFiles) {
        const result = await runTestFile(testFile);
        results.push(result);
        
        if (result.success) {
            passed++;
            console.log(`✅ ${testFile} - PASSED`);
        } else {
            failed++;
            console.log(`❌ ${testFile} - FAILED`);
        }
        console.log('');
    }
    
    // Print summary
    console.log('Test Summary');
    console.log('============');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${passed + failed}`);
    console.log('');
    
    if (failed > 0) {
        console.log('❌ Some tests failed. Check output above for details.');
        
        // Show failed tests
        const failedTests = results.filter(r => !r.success);
        console.log('');
        console.log('Failed Tests:');
        failedTests.forEach(test => {
            console.log(`   ${test.file}: ${test.error}`);
        });
        
        process.exit(1);
    } else {
        console.log('🎉 All tests passed!');
        return results;
    }
}

/**
 * Run tests with coverage
 */
async function runTestsWithCoverage() {
    console.log('📊 Running tests with coverage...');
    
    try {
        const { stdout, stderr } = await execAsync(
            'npm run test:coverage',
            { timeout: TEST_CONFIG.timeout * 2 } // Double timeout for coverage
        );
        
        console.log(stdout);
        
        if (stderr) {
            console.warn('Coverage warnings:', stderr);
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Coverage run failed:', error.message);
        return false;
    }
}

/**
 * Validate generated code before testing
 */
async function validateGeneratedCode() {
    console.log('🔍 Validating generated code...');
    
    const generatedFiles = [
        'packages/hamlet-server/generated/database-queries.js',
        'packages/hamlet-server/generated/api-routes.js',
        'packages/hamlet-server/generated/browser-storage.js',
        'packages/hamlet-server/generated/kv-store.js',
        'app/generated/StoragePorts.elm'
    ];
    
    const missingFiles = [];
    
    for (const file of generatedFiles) {
        if (!fs.existsSync(file)) {
            missingFiles.push(file);
        } else {
            // Check if file is not empty
            const content = fs.readFileSync(file, 'utf-8');
            if (content.trim().length < 100) { // Arbitrary minimum size
                console.warn(`⚠️  Generated file seems too small: ${file}`);
            }
        }
    }
    
    if (missingFiles.length > 0) {
        console.error('❌ Missing generated files:');
        missingFiles.forEach(file => console.error(`   ${file}`));
        console.error('');
        console.error('Run the generation script first:');
        console.error('   node .buildamp/generate-all.js');
        return false;
    }
    
    console.log('✅ Generated code validation passed');
    return true;
}

/**
 * Generate fresh code before testing
 */
async function generateFreshCode() {
    console.log('🏗️  Generating fresh code for testing...');
    
    try {
        const { stdout, stderr } = await execAsync(
            'node .buildamp/generate-all.js',
            { timeout: 60000 } // 1 minute timeout
        );
        
        console.log(stdout);
        
        if (stderr) {
            console.warn('Generation warnings:', stderr);
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Code generation failed:', error.message);
        return false;
    }
}

/**
 * Print test configuration
 */
function printConfig() {
    console.log('Test Configuration:');
    console.log(`  Timeout: ${TEST_CONFIG.timeout}ms`);
    console.log(`  Coverage: ${TEST_CONFIG.coverage ? 'enabled' : 'disabled'}`);
    console.log(`  Test files: ${TEST_CONFIG.testFiles.length}`);
    TEST_CONFIG.testFiles.forEach(file => {
        console.log(`    ${file}`);
    });
    console.log('');
}

/**
 * Main test execution
 */
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log('Hamlet Generation Tests');
        console.log('=======================');
        console.log('');
        console.log('Usage:');
        console.log('  node run-generation-tests.js [options]');
        console.log('');
        console.log('Options:');
        console.log('  --generate    Generate fresh code before testing');
        console.log('  --coverage    Run with coverage report');
        console.log('  --config      Show test configuration');
        console.log('  --help        Show this help');
        console.log('');
        process.exit(0);
    }
    
    if (args.includes('--config')) {
        printConfig();
        return;
    }
    
    // Generate fresh code if requested
    if (args.includes('--generate')) {
        const generated = await generateFreshCode();
        if (!generated) {
            process.exit(1);
        }
        console.log('');
    }
    
    // Validate generated code exists
    const codeValid = await validateGeneratedCode();
    if (!codeValid) {
        process.exit(1);
    }
    console.log('');
    
    // Run tests
    if (args.includes('--coverage') && TEST_CONFIG.coverage) {
        const coverageSuccess = await runTestsWithCoverage();
        if (!coverageSuccess) {
            process.exit(1);
        }
    } else {
        await runAllTests();
    }
}

// Run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('❌ Test runner failed:', error);
        process.exit(1);
    });
}

export { runAllTests, runTestFile, validateGeneratedCode, generateFreshCode };