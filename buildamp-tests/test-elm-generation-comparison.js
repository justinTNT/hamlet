#!/usr/bin/env node

/**
 * Elm Generation Comparison Test
 * 
 * This script tests that both generation workflows produce identical Elm output:
 * 1. Main project: npm run generate
 * 2. create-buildamp: node packages/create-buildamp/index.js --codegen-only
 * 
 * This validates the unified generation logic works correctly across both tools.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const OUTPUT_DIR = 'test-elm-generation-comparison';

console.log('🧪 BuildAmp Elm Generation Comparison Test');
console.log('==========================================');
console.log('');

// Clean up previous test runs
if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
}
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

/**
 * Run main project generation and capture Elm outputs
 */
function runMainProjectGeneration() {
    console.log('🔨 Running main project generation (npm run generate)...');
    
    try {
        // Run main project generation
        execSync('npm run generate', { 
            stdio: 'pipe',
            encoding: 'utf8'
        });
        
        // Copy generated Elm files
        const mainOutputDir = path.join(OUTPUT_DIR, 'main-project');
        fs.mkdirSync(mainOutputDir, { recursive: true });
        
        // Copy app/generated/*.elm files
        if (fs.existsSync('app/generated')) {
            const generatedFiles = fs.readdirSync('app/generated')
                .filter(file => file.endsWith('.elm'));
            
            for (const file of generatedFiles) {
                fs.copyFileSync(
                    path.join('app/generated', file),
                    path.join(mainOutputDir, file)
                );
            }
        }
        
        // Copy horatio server generated files
        const serverGeneratedPath = 'app/horatio/server/generated';
        if (fs.existsSync(serverGeneratedPath)) {
            const serverOutputDir = path.join(mainOutputDir, 'server');
            fs.mkdirSync(serverOutputDir, { recursive: true });
            
            const serverFiles = fs.readdirSync(serverGeneratedPath)
                .filter(file => file.endsWith('.elm'));
            
            for (const file of serverFiles) {
                fs.copyFileSync(
                    path.join(serverGeneratedPath, file),
                    path.join(serverOutputDir, file)
                );
            }
        }
        
        console.log('   ✅ Main project generation completed');
        return { success: true };
        
    } catch (error) {
        console.log('   ❌ Main project generation failed:');
        console.log(`      ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Run create-buildamp generation and capture Elm outputs
 */
function runCreateBuildampGeneration() {
    console.log('🔨 Running create-buildamp generation...');
    
    const testOutput = path.join(OUTPUT_DIR, 'create-buildamp-output');
    
    try {
        // Run create-buildamp generation
        execSync(`node packages/create-buildamp/index.js --codegen-only --output ${testOutput}`, {
            stdio: 'pipe',
            encoding: 'utf8'
        });
        
        // Copy generated Elm files
        const createOutputDir = path.join(OUTPUT_DIR, 'create-buildamp');
        fs.mkdirSync(createOutputDir, { recursive: true });
        
        // Copy app/generated/*.elm files
        const appGeneratedPath = path.join(testOutput, 'app/generated');
        if (fs.existsSync(appGeneratedPath)) {
            const generatedFiles = fs.readdirSync(appGeneratedPath)
                .filter(file => file.endsWith('.elm'));
            
            for (const file of generatedFiles) {
                fs.copyFileSync(
                    path.join(appGeneratedPath, file),
                    path.join(createOutputDir, file)
                );
            }
        }
        
        // Copy horatio server generated files
        const serverGeneratedPath = path.join(testOutput, 'app/horatio/server/generated');
        if (fs.existsSync(serverGeneratedPath)) {
            const serverOutputDir = path.join(createOutputDir, 'server');
            fs.mkdirSync(serverOutputDir, { recursive: true });
            
            const serverFiles = fs.readdirSync(serverGeneratedPath)
                .filter(file => file.endsWith('.elm'));
            
            for (const file of serverFiles) {
                fs.copyFileSync(
                    path.join(serverGeneratedPath, file),
                    path.join(createOutputDir, file)
                );
            }
        }
        
        console.log('   ✅ create-buildamp generation completed');
        return { success: true };
        
    } catch (error) {
        console.log('   ❌ create-buildamp generation failed:');
        console.log(`      ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Compare generated Elm files between both workflows
 */
function compareElmOutputs() {
    console.log('🔍 Comparing generated Elm files...');
    
    const mainDir = path.join(OUTPUT_DIR, 'main-project');
    const createDir = path.join(OUTPUT_DIR, 'create-buildamp');
    
    if (!fs.existsSync(mainDir) || !fs.existsSync(createDir)) {
        console.log('   ❌ Missing output directories for comparison');
        return false;
    }
    
    // Get all Elm files from both directories
    const getElmFiles = (dir) => {
        const files = new Set();
        
        if (fs.existsSync(dir)) {
            // Root level files
            const rootFiles = fs.readdirSync(dir)
                .filter(file => file.endsWith('.elm'));
            rootFiles.forEach(file => files.add(file));
            
            // Server files
            const serverDir = path.join(dir, 'server');
            if (fs.existsSync(serverDir)) {
                const serverFiles = fs.readdirSync(serverDir)
                    .filter(file => file.endsWith('.elm'));
                serverFiles.forEach(file => files.add(`server/${file}`));
            }
        }
        
        return Array.from(files);
    };
    
    const mainFiles = getElmFiles(mainDir);
    const createFiles = getElmFiles(createDir);
    
    // Check if same files exist
    const allFiles = new Set([...mainFiles, ...createFiles]);
    let allMatch = true;
    const differences = [];
    
    console.log(`   📊 Comparing ${allFiles.size} Elm files...`);
    
    for (const file of allFiles) {
        const mainFile = path.join(mainDir, file);
        const createFile = path.join(createDir, file);
        
        const mainExists = fs.existsSync(mainFile);
        const createExists = fs.existsSync(createFile);
        
        if (!mainExists && !createExists) {
            continue; // Skip if neither exists
        }
        
        if (!mainExists) {
            differences.push(`   ❌ ${file}: Missing in main project`);
            allMatch = false;
            continue;
        }
        
        if (!createExists) {
            differences.push(`   ❌ ${file}: Missing in create-buildamp`);
            allMatch = false;
            continue;
        }
        
        // Compare file contents
        const mainContent = fs.readFileSync(mainFile, 'utf8');
        const createContent = fs.readFileSync(createFile, 'utf8');
        
        if (mainContent === createContent) {
            console.log(`   ✅ ${file}: Identical`);
        } else {
            differences.push(`   ❌ ${file}: Content differs`);
            allMatch = false;
            
            // Save diff files for analysis
            fs.writeFileSync(path.join(OUTPUT_DIR, `${file.replace('/', '_')}_main.elm`), mainContent);
            fs.writeFileSync(path.join(OUTPUT_DIR, `${file.replace('/', '_')}_create.elm`), createContent);
        }
    }
    
    console.log('');
    
    if (allMatch) {
        console.log('   🎉 All Elm files are identical between both workflows!');
        console.log('   ✅ Unified generation logic is working correctly.');
    } else {
        console.log('   ⚠️  Differences found between workflows:');
        differences.forEach(diff => console.log(diff));
        console.log('');
        console.log(`   📁 Diff files saved to: ${OUTPUT_DIR}/`);
    }
    
    return allMatch;
}

/**
 * Main test execution
 */
async function runElmGenerationTest() {
    try {
        // Run both generation workflows
        const mainResult = runMainProjectGeneration();
        console.log('');
        const createResult = runCreateBuildampGeneration();
        
        console.log('');
        
        if (mainResult.success && createResult.success) {
            const outputsMatch = compareElmOutputs();
            
            console.log('');
            console.log('📊 Test Summary:');
            console.log('===============');
            console.log(`   Main project generation: ✅ completed`);
            console.log(`   create-buildamp generation: ✅ completed`);
            console.log(`   Elm outputs match: ${outputsMatch ? '✅' : '❌'}`);
            
            if (outputsMatch) {
                console.log('');
                console.log('🎉 SUCCESS: Both workflows generate identical Elm code!');
                console.log('   The unified generation logic is working correctly.');
            } else {
                console.log('');
                console.log('⚠️  NEEDS WORK: Workflows generate different Elm output.');
                console.log('   Check the diff files for specific differences.');
            }
            
        } else {
            console.log('');
            console.log('❌ Generation failed - cannot compare outputs');
            if (!mainResult.success) {
                console.log(`   Main: ${mainResult.error}`);
            }
            if (!createResult.success) {
                console.log(`   create-buildamp: ${createResult.error}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
        process.exit(1);
    }
}

// Run the test
runElmGenerationTest();