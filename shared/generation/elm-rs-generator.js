/**
 * Elm-rs based type generation
 * Uses the Rust elm_rs crate to generate complete Elm types with encoders/decoders
 *
 * Auto-discovers types from Rust API models - no hardcoded business models!
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getGenerationPaths } from './shared-paths.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse a Rust file and extract all types with elm_rs derives
 * Returns { moduleName, types: string[] }
 */
function parseRustApiFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const moduleName = path.basename(filePath, '.rs');
    const types = [];

    // Match structs with elm_rs derives
    // Pattern: #[derive(...elm_rs::Elm...)] ... pub struct TypeName
    const deriveRegex = /#\[derive\([^\]]*elm_rs::(Elm|ElmEncode|ElmDecode)[^\]]*\)\][\s\S]*?pub struct\s+(\w+)/g;
    let match;
    while ((match = deriveRegex.exec(content)) !== null) {
        const typeName = match[2];
        if (!types.includes(typeName)) {
            types.push(typeName);
        }
    }

    // Also match types from #[buildamp] macro (generates Req types)
    const buildampRegex = /#\[buildamp\(path\s*=\s*"(\w+)"[^\)]*\)\][\s\S]*?pub struct\s+(\w+)/g;
    while ((match = buildampRegex.exec(content)) !== null) {
        const endpointName = match[1];
        const structName = match[2];
        // buildamp generates {EndpointName}Req from the struct
        if (!types.includes(structName)) {
            types.push(structName);
        }
    }

    return { moduleName, types };
}

/**
 * Discover all API types from Rust files
 */
function discoverApiTypes(apiModelsDir) {
    const modules = [];

    if (!fs.existsSync(apiModelsDir)) {
        console.warn(`   ⚠️  API models directory not found: ${apiModelsDir}`);
        return modules;
    }

    const files = fs.readdirSync(apiModelsDir)
        .filter(f => f.endsWith('.rs') && f !== 'mod.rs');

    for (const file of files) {
        const filePath = path.join(apiModelsDir, file);
        const parsed = parseRustApiFile(filePath);
        if (parsed.types.length > 0) {
            modules.push(parsed);
        }
    }

    return modules;
}

/**
 * Generate Rust program that exports all discovered API types to Elm
 */
function generateRustExporter(modules) {
    // Generate use statements
    const useStatements = modules
        .map(m => `use proto_rust::models::api::${m.moduleName}::*;`)
        .join('\n');

    // Collect all types
    const allTypes = modules.flatMap(m => m.types);
    const typeList = allTypes.join(',\n            ');

    return `
use elm_rs::{Elm, ElmDecode, ElmEncode};

// Auto-discovered API types
${useStatements}

fn main() {
    // Generate Api.Backend module with all types and codecs
    let mut backend_buffer = Vec::new();
    elm_rs::export!("Api.Backend", &mut backend_buffer, {
        encoders: [
            ${typeList},
        ],
        decoders: [
            ${typeList},
        ],
    }).unwrap();

    let backend_content = String::from_utf8(backend_buffer).unwrap();
    std::fs::write("api-backend-generated.elm", backend_content).unwrap();

    // Generate Api.Schema module for frontend
    let mut schema_buffer = Vec::new();
    elm_rs::export!("Api.Schema", &mut schema_buffer, {
        encoders: [
            ${typeList},
        ],
        decoders: [
            ${typeList},
        ],
    }).unwrap();

    let schema_content = String::from_utf8(schema_buffer).unwrap();
    std::fs::write("api-schema-generated.elm", schema_content).unwrap();

    println!("Generated Api.Backend and Api.Schema with {} types from {} modules", ${allTypes.length}, ${modules.length});
}
`;
}

/**
 * Run elm-rs generation via cargo
 */
export async function generateElmTypes(projectPaths) {
    console.log('🦀 Generating Elm types via elm-rs...');

    const monorepoRoot = path.resolve(__dirname, '../..');
    const paths = projectPaths || getGenerationPaths();

    // Discover API types from Rust files
    const apiModelsDir = path.join(monorepoRoot, paths.modelsDir, 'api');
    console.log(`   🔍 Discovering types from ${apiModelsDir}`);

    const modules = discoverApiTypes(apiModelsDir);
    const totalTypes = modules.reduce((sum, m) => sum + m.types.length, 0);

    console.log(`   📦 Found ${totalTypes} types in ${modules.length} modules:`);
    for (const m of modules) {
        console.log(`      - ${m.moduleName}: ${m.types.join(', ')}`);
    }

    if (totalTypes === 0) {
        console.log('   ⚠️  No elm-rs types found, skipping generation');
        return { success: true, skipped: true };
    }

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
        fs.writeFileSync(path.join(srcDir, 'main.rs'), generateRustExporter(modules));

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
        let backendGenerated = fs.readFileSync(path.join(tempDir, 'api-backend-generated.elm'), 'utf8');
        const schemaGenerated = fs.readFileSync(path.join(tempDir, 'api-schema-generated.elm'), 'utf8');

        // Remove frontend-only imports from Backend.elm (server-side Elm doesn't have Http/Url.Builder)
        backendGenerated = backendGenerated
            .replace(/^import Http\n/m, '')
            .replace(/^import Url\.Builder\n/m, '');

        // Write Api.Backend.elm (serverHandlersDir is .../src/Api/Handlers, go up one level)
        const serverApiDir = path.join(monorepoRoot, paths.serverHandlersDir, '..');
        const backendPath = path.join(serverApiDir, 'Backend.elm');
        fs.writeFileSync(backendPath, backendGenerated);
        console.log(`   ✅ Generated ${backendPath}`);

        // Write Api.Schema.elm
        const schemaPath = path.join(monorepoRoot, paths.elmApiDir, 'Schema.elm');
        fs.writeFileSync(schemaPath, schemaGenerated);
        console.log(`   ✅ Generated ${schemaPath}`);

        // Clean up temp directory
        fs.rmSync(tempDir, { recursive: true, force: true });

        return {
            success: true,
            backendPath,
            schemaPath,
            typesGenerated: totalTypes,
            modules: modules.length
        };

    } catch (error) {
        console.error('   ❌ elm-rs generation failed:', error);
        throw error;
    }
}

// Test if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
    generateElmTypes().then((result) => {
        if (result.skipped) {
            console.log('⏭️  elm-rs generation skipped (no types found)');
        } else {
            console.log(`✨ elm-rs generation completed: ${result.typesGenerated} types from ${result.modules} modules`);
        }
    }).catch(error => {
        console.error('Failed:', error);
        process.exit(1);
    });
}
