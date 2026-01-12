/**
 * Elm-rs based type generation
 * Uses the Rust elm_rs crate to generate complete Elm types with encoders/decoders
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate Rust program that exports all API types to Elm
 */
function generateRustExporter() {
    return `
use elm_rs::{Elm, ElmDecode, ElmEncode};

// Import all API types
use proto_rust::models::api::feed::*;
use proto_rust::models::api::comment::*;
use proto_rust::models::api::tags::*;
use proto_rust::models::api::item::*;

fn main() {
    // Generate Api.Backend module with all types and codecs
    let mut backend_buffer = Vec::new();
    elm_rs::export!("Api.Backend", &mut backend_buffer, {
        encoders: [
            // Feed types
            GetFeedReq,
            GetFeedRes,
            FeedItem,
            MicroblogItem,
            SubmitItemReq,
            SubmitItemRes,
            SubmitItemData,
            
            // Comment types
            SubmitCommentReq,
            SubmitCommentRes,
            ItemComment,
            
            // Tag types
            GetTagsReq,
            GetTagsRes,
            
            // Item types
            GetItemReq,
            GetItemRes,
        ],
        decoders: [
            // Feed types
            GetFeedReq,
            GetFeedRes,
            FeedItem,
            MicroblogItem,
            SubmitItemReq,
            SubmitItemRes,
            SubmitItemData,
            
            // Comment types
            SubmitCommentReq,
            SubmitCommentRes,
            ItemComment,
            
            // Tag types
            GetTagsReq,
            GetTagsRes,
            
            // Item types
            GetItemReq,
            GetItemRes,
        ],
    }).unwrap();
    
    let backend_content = String::from_utf8(backend_buffer).unwrap();
    std::fs::write("api-backend-generated.elm", backend_content).unwrap();
    
    // Generate Api.Schema module for frontend
    let mut schema_buffer = Vec::new();
    elm_rs::export!("Api.Schema", &mut schema_buffer, {
        encoders: [
            // Only types needed by frontend
            GetFeedReq,
            GetFeedRes,
            FeedItem,
            MicroblogItem,
            SubmitItemReq,
            SubmitItemRes,
            SubmitCommentReq,
            SubmitCommentRes,
            ItemComment,
            GetTagsReq,
            GetTagsRes,
            GetItemReq,
            GetItemRes,
        ],
        decoders: [
            GetFeedReq,
            GetFeedRes,
            FeedItem,
            MicroblogItem,
            SubmitItemReq,
            SubmitItemRes,
            SubmitCommentReq,
            SubmitCommentRes,
            ItemComment,
            GetTagsReq,
            GetTagsRes,
            GetItemReq,
            GetItemRes,
        ],
    }).unwrap();
    
    let schema_content = String::from_utf8(schema_buffer).unwrap();
    std::fs::write("api-schema-generated.elm", schema_content).unwrap();
    
    println!("Generated Api.Backend and Api.Schema with complete types and codecs");
}
`;
}

/**
 * Run elm-rs generation via cargo
 */
export async function generateElmTypes(projectPaths) {
    console.log('🦀 Generating Elm types via elm-rs...');
    
    const monorepoRoot = path.resolve(__dirname, '../..');
    
    try {
        // Create temporary Rust project for generation
        const tempDir = path.join(monorepoRoot, '.elm-rs-gen');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Create Cargo.toml
        const cargoToml = `[package]
name = "elm_rs_generator"
version = "0.1.0"
edition = "2021"

[dependencies]
elm_rs = "0.2"
proto-rust = { path = ".." }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
`;
        fs.writeFileSync(path.join(tempDir, 'Cargo.toml'), cargoToml);
        
        // Create src directory and main.rs
        const srcDir = path.join(tempDir, 'src');
        if (!fs.existsSync(srcDir)) {
            fs.mkdirSync(srcDir);
        }
        fs.writeFileSync(path.join(srcDir, 'main.rs'), generateRustExporter());
        
        // Run cargo to generate Elm types
        console.log('   🔨 Building elm-rs generator...');
        execSync('cargo build --release', {
            cwd: tempDir,
            stdio: 'inherit'
        });
        
        console.log('   🚀 Running elm-rs generator...');
        execSync('./target/release/elm_rs_generator', {
            cwd: tempDir,
            stdio: 'inherit'
        });
        
        // Copy generated files to appropriate locations
        const backendGenerated = fs.readFileSync(path.join(tempDir, 'api-backend-generated.elm'), 'utf8');
        const schemaGenerated = fs.readFileSync(path.join(tempDir, 'api-schema-generated.elm'), 'utf8');
        
        // Write Api.Backend.elm
        const backendPath = path.join(monorepoRoot, 'app/horatio/server/src/Api/Backend.elm');
        fs.writeFileSync(backendPath, backendGenerated);
        console.log(`   ✅ Generated ${backendPath}`);
        
        // Write Api.Schema.elm
        const schemaPath = path.join(monorepoRoot, 'app/horatio/web/src/Api/Schema.elm');
        fs.writeFileSync(schemaPath, schemaGenerated);
        console.log(`   ✅ Generated ${schemaPath}`);
        
        // Clean up temp directory
        fs.rmSync(tempDir, { recursive: true, force: true });
        
        return {
            success: true,
            backendPath,
            schemaPath
        };
        
    } catch (error) {
        console.error('   ❌ elm-rs generation failed:', error);
        throw error;
    }
}

// Test if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
    generateElmTypes({}).then(() => {
        console.log('✨ elm-rs generation completed successfully!');
    }).catch(error => {
        console.error('Failed:', error);
        process.exit(1);
    });
}