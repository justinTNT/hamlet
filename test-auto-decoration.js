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
    fs.mkdirSync(path.join(testDir, 'app/horatio/models/api'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'app/horatio/models/db'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'app/horatio/models/storage'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'app/horatio/models/events'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'app/horatio/models/sse'), { recursive: true });
    
    // API model with manual decorations
    fs.writeFileSync(path.join(testDir, 'app/horatio/models/api/test.rs'), `
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
    fs.writeFileSync(path.join(testDir, 'app/horatio/models/db/test.rs'), `
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, utoipa::ToSchema, crate::BuildAmpElm)]
pub struct TestEntity {
    pub id: i32,
    pub name: String,
    pub created_at: String,
}
`);

    // Storage model with manual decorations
    fs.writeFileSync(path.join(testDir, 'app/horatio/models/storage/test.rs'), `
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
    fs.writeFileSync(path.join(testDir, 'app/horatio/models/events/test.rs'), `
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode, crate::BuildAmpElm)]
pub struct TestEvent {
    pub event_id: String,
    pub user_id: String,
    pub data: String,
}
`);

    // SSE model with manual decorations
    fs.writeFileSync(path.join(testDir, 'app/horatio/models/sse/test.rs'), `
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum TestSSEEvent {
    UserConnected { user_id: String },
    UserDisconnected { user_id: String },
    MessageSent { content: String, sender: String },
}
`);

    // Create src directory and lib.rs that uses auto-discovery
    fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(testDir, 'src/lib.rs'), `
use buildamp_macro::buildamp_auto_discover_models;
use wasm_bindgen::prelude::wasm_bindgen;

// Mock framework dependencies for testing
pub mod framework {
    pub mod database_infrastructure {
        use std::collections::HashMap;
        use serde_json::Value;
        
        pub struct DatabaseInfrastructure;
        
        impl DatabaseInfrastructure {
            pub fn get_events_table_sql() -> &'static str {
                "-- Mock events table SQL"
            }
            
            pub fn generate_infrastructure_manifest() -> HashMap<String, Value> {
                HashMap::new()
            }
        }
    }
}

// Mock required traits and context
pub mod elm_export {
    pub struct EndpointDefinition {
        pub endpoint: &'static str,
        pub request_type: &'static str,
        pub context_type: Option<&'static str>,
    }
    
    pub struct ElmDefinition {
        pub name: &'static str,
        pub get_def: fn() -> String,
    }
    
    pub struct ElmEncoder {
        pub name: &'static str,
        pub get_enc: fn() -> String,
    }
    
    pub struct ElmDecoder {
        pub name: &'static str,
        pub get_dec: fn() -> String,
    }
    
    pub struct ContextDefinition {
        pub type_name: &'static str,
        pub field_name: &'static str,
        pub source: &'static str,
    }
}

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct Context {
    pub user_id: Option<String>,
    pub is_extension: bool,
}

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct ServerContext {
    pub user_id: Option<String>,
}

// Mock BuildAmp traits
pub trait BuildAmpElm {}
impl<T> BuildAmpElm for T {}

pub trait BuildAmpEndpoint {}
impl<T> BuildAmpEndpoint for T {}

pub trait BuildAmpContext {}
impl<T> BuildAmpContext for T {}

buildamp_auto_discover_models!();
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
    fs.mkdirSync(path.join(testDir, 'app/horatio/models/api'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'app/horatio/models/db'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'app/horatio/models/storage'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'app/horatio/models/events'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'app/horatio/models/sse'), { recursive: true });
    
    // API model without decorations (naked)
    fs.writeFileSync(path.join(testDir, 'app/horatio/models/api/test.rs'), `
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
    fs.writeFileSync(path.join(testDir, 'app/horatio/models/db/test.rs'), `
pub struct TestEntity {
    pub id: i32,
    pub name: String,
    pub created_at: String,
}
`);

    // Storage model without decorations (naked)
    fs.writeFileSync(path.join(testDir, 'app/horatio/models/storage/test.rs'), `
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
    fs.writeFileSync(path.join(testDir, 'app/horatio/models/events/test.rs'), `
pub struct TestEvent {
    pub event_id: String,
    pub user_id: String,
    pub data: String,
}
`);

    // SSE model without decorations (naked)
    fs.writeFileSync(path.join(testDir, 'app/horatio/models/sse/test.rs'), `
pub enum TestSSEEvent {
    UserConnected { user_id: String },
    UserDisconnected { user_id: String },
    MessageSent { content: String, sender: String },
}
`);

    // Create src directory and lib.rs that uses auto-discovery  
    fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(testDir, 'src/lib.rs'), `
use buildamp_macro::buildamp_auto_discover_models;

// Mock framework dependencies for testing
pub mod framework {
    pub mod database_infrastructure {
        use std::collections::HashMap;
        use serde_json::Value;
        
        pub struct DatabaseInfrastructure;
        
        impl DatabaseInfrastructure {
            pub fn get_events_table_sql() -> &'static str {
                "-- Mock events table SQL"
            }
            
            pub fn generate_infrastructure_manifest() -> HashMap<String, Value> {
                HashMap::new()
            }
        }
    }
}

// Mock required traits and context
pub mod elm_export {
    pub struct EndpointDefinition {
        pub endpoint: &'static str,
        pub request_type: &'static str,
        pub context_type: Option<&'static str>,
    }
    
    pub struct ElmDefinition {
        pub name: &'static str,
        pub get_def: fn() -> String,
    }
    
    pub struct ElmEncoder {
        pub name: &'static str,
        pub get_enc: fn() -> String,
    }
    
    pub struct ElmDecoder {
        pub name: &'static str,
        pub get_dec: fn() -> String,
    }
    
    pub struct ContextDefinition {
        pub type_name: &'static str,
        pub field_name: &'static str,
        pub source: &'static str,
    }
}

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct Context {
    pub user_id: Option<String>,
    pub is_extension: bool,
}

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct ServerContext {
    pub user_id: Option<String>,
}

// Mock BuildAmp traits
pub trait BuildAmpElm {}
impl<T> BuildAmpElm for T {}

pub trait BuildAmpEndpoint {}
impl<T> BuildAmpEndpoint for T {}

pub trait BuildAmpContext {}
impl<T> BuildAmpContext for T {}

buildamp_auto_discover_models!();
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
wasm-bindgen = "0.2"
inventory = "0.3"
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