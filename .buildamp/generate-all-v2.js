#!/usr/bin/env node

/**
 * Master Code Generation Script V2
 * Updated to use .hamlet-gen directories
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { getGenerationPaths, checkLegacyFiles } from '../shared/generation/paths.js';

// Import v2 generation modules (as we create them)
import { generateDatabaseQueries } from '../shared/generation/database_queries_v2.js';
// TODO: Import other v2 modules as they're created
import { generateApiRoutes } from '../shared/generation/api_routes.js';
import { generateBrowserStorage } from '../shared/generation/browser_storage.js';
import { generateKvStore } from '../shared/generation/kv_store.js';
import { generateSSEEvents } from '../shared/generation/sse_events.js';
import { generateElmHandlers } from '../shared/generation/elm_handlers.js';
import { generateElmSharedModules } from '../shared/generation/elm_shared_modules.js';
import { generateAdminUi } from '../shared/generation/admin_ui.js';

console.log('🚀 Hamlet Code Generation V2 (.hamlet-gen)');
console.log('==========================================');
console.log('');

async function generateAll() {
    const paths = getGenerationPaths();
    checkLegacyFiles(paths);
    
    console.log('📁 Output directories:');
    console.log(`   Elm glue: ${paths.elmGlueDir}`);
    console.log(`   JS glue: ${paths.jsGlueDir}`);
    console.log('');
    
    const results = {
        database: null,
        api: null,
        browser: null,
        kv: null,
        sse: null,
        shared: null,
        handlers: null,
        admin: null,
        wasm: null,
        success: false
    };
    
    try {
        // Phase 1: Database Query Generation (Updated to V2)
        console.log('📊 Phase 1: Database Query Generation');
        console.log('===================================');
        results.database = await generateDatabaseQueries({
            inputBasePath: paths.dbModelsDir,
            jsOutputPath: paths.jsGlueDir
        });
        console.log('');
        
        // TODO: Update remaining phases to use .hamlet-gen
        // For now, we'll use the existing generators with path overrides
        
        // Phase 2: API Route Generation
        console.log('🛣️  Phase 2: API Route Generation');
        console.log('===============================');
        results.api = await generateApiRoutes(
            paths.apiModelsDir,
            paths.jsGlueDir,
            paths.elmGlueDir
        );
        console.log('');
        
        // Phase 3: Browser Storage Generation  
        console.log('💾 Phase 3: Browser Storage Generation');
        console.log('====================================');
        results.browser = await generateBrowserStorage({
            inputBasePath: path.dirname(paths.storageModelsDir),
            elmOutputPath: paths.elmGlueDir,
            jsOutputPath: paths.jsGlueDir,
            elmApiPath: paths.elmApiDir
        });
        console.log('');
        
        // Phase 4: KV Store Generation
        console.log('🗄️  Phase 4: KV Store Generation');
        console.log('==============================');
        results.kv = await generateKvStore(
            paths.kvModelsDir,
            paths.jsGlueDir
        );
        console.log('');
        
        // Phase 5: SSE Events Generation
        console.log('📡 Phase 5: SSE Events Generation');
        console.log('===============================');
        results.sse = await generateSSEEvents(
            paths.sseModelsDir,
            paths.jsGlueDir
        );
        console.log('');
        
        // Phase 6: Elm Shared Modules
        console.log('📦 Phase 6: Elm Shared Modules');
        console.log('=============================');
        results.shared = await generateElmSharedModules(
            paths.modelsDir,
            paths.elmGlueDir
        );
        console.log('');
        
        // Phase 7: Elm Handler Scaffolding (Skeletons - user owned)
        console.log('🔧 Phase 7: Elm Handler Scaffolding');
        console.log('=================================');
        results.handlers = await generateElmHandlers(
            paths.apiModelsDir,
            paths.serverHandlersDir,
            paths.elmGlueDir
        );
        console.log('');
        
        // Phase 8: Admin UI Generation
        console.log('👑 Phase 8: Admin UI Generation');
        console.log('==============================');
        results.admin = await generateAdminUi(
            paths.dbModelsDir,
            path.join(paths.elmGlueDir, 'Admin')
        );
        console.log('');
        
        // Phase 9: WASM Build
        console.log('📦 Phase 9: WASM Build');
        console.log('====================');
        results.wasm = await buildWasm();
        console.log('');
        
        // Success summary
        results.success = true;
        printSuccessSummary(results, paths);
        
        return results;
        
    } catch (error) {
        console.error('❌ Code generation failed:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

async function buildWasm() {
    try {
        console.log('🔨 Building Rust to WASM...');
        
        execSync('cargo build --release', {
            stdio: 'inherit',
            encoding: 'utf8'
        });
        
        console.log('📦 Generating WASM package...');
        execSync('wasm-pack build --target web --out-dir pkg-web', {
            stdio: 'inherit',
            encoding: 'utf8'
        });
        
        console.log('✅ WASM build complete');
        
        return {
            success: true,
            outputDir: 'pkg-web',
            message: 'WASM rebuilt successfully'
        };
        
    } catch (error) {
        console.error('❌ WASM build failed:', error.message);
        throw new Error(`WASM build failed: ${error.message}`);
    }
}

function printSuccessSummary(results, paths) {
    console.log('✨ Generation Complete!');
    console.log('======================');
    console.log('');
    
    console.log('📁 Generated to .hamlet-gen:');
    console.log(`   ${paths.elmGlueDir}/`);
    console.log(`   ${paths.jsGlueDir}/`);
    console.log('');
    
    if (results.database) {
        console.log(`📊 Database: ${results.database.structs} models → ${results.database.functions} functions`);
    }
    
    if (results.api) {
        console.log(`🛣️  API: ${results.api.routes} routes → ${results.api.endpoints} endpoints`);
    }
    
    if (results.browser) {
        console.log(`💾 Storage: ${results.browser.models} models → ${results.browser.classes} classes`);
    }
    
    if (results.kv) {
        console.log(`🗄️  KV Store: ${results.kv.structs} models → ${results.kv.functions} functions`);
    }
    
    console.log('');
    console.log('🚀 "Rust once, JSON never" - Code generation complete!');
}

// Run generation
if (import.meta.url === `file://${process.argv[1]}`) {
    generateAll();
}

export { generateAll };