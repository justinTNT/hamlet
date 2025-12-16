#!/usr/bin/env node

/**
 * Auto-Decoration Comparison Test
 * 
 * This script tests the "naked structs" auto-decoration system by:
 * 1. Generating code with manual derives (current state)
 * 2. Generating code with auto-decoration (target state)  
 * 3. Comparing the outputs to ensure they're identical
 * 
 * This validates that auto-discovery works correctly for all model types.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const OUTPUT_DIR = 'test-decoration-comparison';

console.log('🧪 BuildAmp Auto-Decoration Comparison Test');
console.log('============================================');
console.log('');

// Clean up previous test runs
if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
}
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

/**
 * Create test models with manual decorations
 */
function createManualModels() {
    console.log('📝 Creating test models with manual decorations...');
    
    const testDir = path.join(OUTPUT_DIR, 'manual');
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(path.join(testDir, 'src/models/api'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'src/models/db'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'src/models/storage'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'src/models/events'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'src/models/sse'), { recursive: true });
    
    // API model with manual decorations
    fs.writeFileSync(path.join(testDir, 'src/models/api/test.rs'), `
use buildamp_macro::buildamp;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema, crate::BuildAmpElm)]
#[buildamp(path = "TestApi")]
pub struct TestApiReq {
    pub name: String,
    pub count: i32,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema, crate::BuildAmpElm)]
pub struct TestApiRes {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema, crate::BuildAmpElm)]
pub struct TestItem {
    pub id: String,
    pub value: Option<String>,
}
`);

    // Database model with manual decorations
    fs.writeFileSync(path.join(testDir, 'src/models/db/test.rs'), `
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema, crate::BuildAmpElm)]
pub struct TestEntity {
    pub id: i32,
    pub name: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}
`);

    // Storage model with manual decorations
    fs.writeFileSync(path.join(testDir, 'src/models/storage/test.rs'), `
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, crate::BuildAmpElm)]
pub struct TestStorage {
    pub user_id: String,
    pub preferences: TestPreferences,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, crate::BuildAmpElm)]
pub struct TestPreferences {
    pub theme: String,
    pub notifications: bool,
}
`);

    // Events model with manual decorations
    fs.writeFileSync(path.join(testDir, 'src/models/events/test.rs'), `
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, crate::BuildAmpElm)]
pub struct TestEvent {
    pub event_id: String,
    pub user_id: String,
    pub data: serde_json::Value,
}
`);

    // SSE model with manual decorations
    fs.writeFileSync(path.join(testDir, 'src/models/sse/test.rs'), `
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum TestSSEEvent {
    UserConnected { user_id: String },
    UserDisconnected { user_id: String },
    MessageSent { content: String, sender: String },
}
`);

    // Create lib.rs that uses auto-discovery
    fs.writeFileSync(path.join(testDir, 'src/lib.rs'), `
use buildamp_macro::buildamp_auto_discover_models;
buildamp_auto_discover_models!("src/models");
`);

    console.log('   ✅ Manual decoration models created');
}

/**
 * Create test models without decorations (naked structs)
 */
function createNakedModels() {
    console.log('📝 Creating test models as naked structs...');
    
    const testDir = path.join(OUTPUT_DIR, 'naked');
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(path.join(testDir, 'src/models/api'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'src/models/db'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'src/models/storage'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'src/models/events'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'src/models/sse'), { recursive: true });
    
    // API model without decorations (naked)
    fs.writeFileSync(path.join(testDir, 'src/models/api/test.rs'), `
use buildamp_macro::buildamp;

#[buildamp(path = "TestApi")]
pub struct TestApiReq {
    pub name: String,
    pub count: i32,
}

pub struct TestApiRes {
    pub success: bool,
    pub message: String,
}

pub struct TestItem {
    pub id: String,
    pub value: Option<String>,
}
`);

    // Database model without decorations (naked)
    fs.writeFileSync(path.join(testDir, 'src/models/db/test.rs'), `
pub struct TestEntity {
    pub id: i32,
    pub name: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}
`);

    // Storage model without decorations (naked)
    fs.writeFileSync(path.join(testDir, 'src/models/storage/test.rs'), `
pub struct TestStorage {
    pub user_id: String,
    pub preferences: TestPreferences,
}

pub struct TestPreferences {
    pub theme: String,
    pub notifications: bool,
}
`);

    // Events model without decorations (naked)
    fs.writeFileSync(path.join(testDir, 'src/models/events/test.rs'), `
pub struct TestEvent {
    pub event_id: String,
    pub user_id: String,
    pub data: serde_json::Value,
}
`);

    // SSE model without decorations (naked)
    fs.writeFileSync(path.join(testDir, 'src/models/sse/test.rs'), `
pub enum TestSSEEvent {
    UserConnected { user_id: String },
    UserDisconnected { user_id: String },
    MessageSent { content: String, sender: String },
}
`);

    // Create lib.rs that uses auto-discovery  
    fs.writeFileSync(path.join(testDir, 'src/lib.rs'), `
use buildamp_macro::buildamp_auto_discover_models;
buildamp_auto_discover_models!("src/models");
`);

    console.log('   ✅ Naked struct models created');
}

/**
 * Create minimal Cargo.toml for both test projects
 */
function createCargoConfig(testDir) {
    fs.writeFileSync(path.join(testDir, 'Cargo.toml'), `
[package]
name = "decoration-test"
version = "0.1.0"
edition = "2021"

[dependencies]
elm_rs = "0.2"
serde_json = "1.0"
serde = { version = "1.0", features = ["derive"] }
buildamp-macro = { path = "../../.buildamp/macros" }
utoipa = { version = "4.2", features = ["preserve_order", "preserve_path_order"] }
chrono = { version = "0.4", features = ["serde"] }
`);
}

/**
 * Test compilation and macro expansion
 */
async function testCompilation(testType, testDir) {
    console.log(`🔨 Testing ${testType} compilation...`);
    
    try {
        // Create Cargo.toml
        createCargoConfig(testDir);
        
        // Test compilation
        execSync('cargo check', { 
            cwd: testDir, 
            stdio: 'pipe' 
        });
        
        // Run cargo expand to see macro expansion
        const expandedOutput = execSync('cargo expand', { 
            cwd: testDir, 
            encoding: 'utf8',
            stdio: 'pipe'
        });
        
        // Save expanded output for comparison
        fs.writeFileSync(path.join(testDir, 'expanded.rs'), expandedOutput);
        
        console.log(`   ✅ ${testType} compilation successful`);
        return { success: true, output: expandedOutput };
        
    } catch (error) {
        console.log(`   ❌ ${testType} compilation failed:`);
        console.log(`      ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Compare the expanded outputs
 */
function compareOutputs(manualOutput, nakedOutput) {
    console.log('🔍 Comparing expanded macro outputs...');
    
    // Normalize outputs (remove whitespace differences)
    const normalizeOutput = (output) => {
        return output
            .replace(/\s+/g, ' ')  // Normalize whitespace
            .replace(/\/\*.*?\*\//g, '') // Remove comments
            .trim();
    };
    
    const normalizedManual = normalizeOutput(manualOutput);
    const normalizedNaked = normalizeOutput(nakedOutput);
    
    if (normalizedManual === normalizedNaked) {
        console.log('   ✅ Outputs are identical! Auto-decoration is working correctly.');
        return true;
    } else {
        console.log('   ❌ Outputs differ. Auto-decoration needs fixes.');
        
        // Save diff for analysis
        fs.writeFileSync(path.join(OUTPUT_DIR, 'manual_normalized.rs'), normalizedManual);
        fs.writeFileSync(path.join(OUTPUT_DIR, 'naked_normalized.rs'), normalizedNaked);
        
        // Show a sample of differences
        console.log('');
        console.log('   📊 Sample differences (first 500 chars):');
        console.log('   Manual:');
        console.log(`   ${normalizedManual.substring(0, 500)}...`);
        console.log('');
        console.log('   Naked (auto-decorated):');  
        console.log(`   ${normalizedNaked.substring(0, 500)}...`);
        
        return false;
    }
}

/**
 * Main test execution
 */
async function runDecorationTest() {
    try {
        // Setup test models
        createManualModels();
        createNakedModels();
        
        console.log('');
        
        // Test manual decorations compilation
        const manualResult = await testCompilation('manual', path.join(OUTPUT_DIR, 'manual'));
        
        // Test naked structs with auto-decoration 
        const nakedResult = await testCompilation('naked', path.join(OUTPUT_DIR, 'naked'));
        
        console.log('');
        
        // Compare results
        if (manualResult.success && nakedResult.success) {
            const outputsMatch = compareOutputs(manualResult.output, nakedResult.output);
            
            console.log('');
            console.log('📊 Test Summary:');
            console.log('===============');
            console.log(`   Manual decoration: ✅ compiled`);
            console.log(`   Auto decoration: ✅ compiled`);
            console.log(`   Outputs match: ${outputsMatch ? '✅' : '❌'}`);
            
            if (outputsMatch) {
                console.log('');
                console.log('🎉 SUCCESS: Auto-decoration system is working correctly!');
                console.log('   Naked structs produce identical output to manual decorations.');
            } else {
                console.log('');
                console.log('⚠️  NEEDS WORK: Auto-decoration system needs fixes.');
                console.log('   Check the normalized outputs in test-decoration-comparison/');
            }
            
        } else {
            console.log('');
            console.log('❌ Compilation failed - cannot compare outputs');
            if (!manualResult.success) {
                console.log(`   Manual: ${manualResult.error}`);
            }
            if (!nakedResult.success) {
                console.log(`   Naked: ${nakedResult.error}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
        process.exit(1);
    }
}

// Run the test
runDecorationTest();