/**
 * Hamlet Generation Orchestrator
 * 
 * Executes all Hamlet code generation phases for the new architecture
 * Outputs to .hamlet-gen directories instead of legacy locations
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to resolve shared generation scripts
function resolveGenerationScript(scriptName) {
    // Look for shared/generation relative to monorepo root
    const monorepoRoot = path.resolve(__dirname, '../../..');
    return path.join(monorepoRoot, 'shared/generation', scriptName);
}

// Dynamic import of generation functions
async function importGenerators() {
    const generators = {};
    
    const scriptPath = (name) => resolveGenerationScript(name);
    
    generators.generateDatabaseQueries = (await import(scriptPath('database_queries.js'))).generateDatabaseQueries;
    generators.generateApiRoutes = (await import(scriptPath('api_routes.js'))).generateApiRoutes;
    generators.generateBrowserStorage = (await import(scriptPath('browser_storage.js'))).generateBrowserStorage;
    generators.generateKvStore = (await import(scriptPath('kv_store.js'))).generateKvStore;
    generators.generateSSEEvents = (await import(scriptPath('sse_events.js'))).generateSSEEvents;
    generators.generateElmSharedModules = (await import(scriptPath('elm_shared_modules.js'))).generateElmSharedModules;
    generators.generateElmHandlers = (await import(scriptPath('elm_handlers.js'))).generateElmHandlers;
    generators.generateAdminUi = (await import(scriptPath('admin_ui.js'))).generateAdminUi;
    
    return generators;
}

/**
 * Build WASM
 */
async function buildWasm() {
    try {
        console.log('🔨 Building WASM package...');
        // Build from monorepo root where Cargo.toml is located
        const monorepoRoot = path.resolve(__dirname, '../../..');
        execSync('wasm-pack build --target web --out-dir pkg-web', {
            stdio: 'inherit',
            cwd: monorepoRoot
        });
        return {
            success: true,
            message: 'WASM built successfully'
        };
    } catch (error) {
        console.log('⚠️  WASM build skipped (wasm-pack not installed or build failed)');
        return {
            success: false,
            warning: true,
            message: 'WASM build skipped'
        };
    }
}

/**
 * Run all generation phases in sequence
 */
export async function runGeneration() {
    console.log('🚀 Starting Hamlet code generation...');
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
        // Import all generators
        const generators = await importGenerators();

        // Phase 1: Database Query Generation
        console.log('📊 Phase 1: Database Query Generation');
        console.log('===================================');
        results.database = await generators.generateDatabaseQueries();
        console.log('');

        // Phase 2: API Route Generation
        console.log('🛣️  Phase 2: API Route Generation');
        console.log('===============================');
        results.api = await generators.generateApiRoutes();
        console.log('');

        // Phase 3: Browser Storage Generation
        console.log('💾 Phase 3: Browser Storage Generation');
        console.log('====================================');
        results.browser = await generators.generateBrowserStorage();
        console.log('');

        // Phase 4: KV Store Generation
        console.log('🗄️  Phase 4: KV Store Generation');
        console.log('==============================');
        results.kv = await generators.generateKvStore();
        console.log('');

        // Phase 5: SSE Events Generation
        console.log('📡 Phase 5: SSE Events Generation');
        console.log('===============================');
        results.sse = await generators.generateSSEEvents();
        console.log('');

        // Phase 6: Elm Shared Modules (MUST come before handlers)
        console.log('📦 Phase 6: Elm Shared Modules');
        console.log('=============================');
        results.shared = await generators.generateElmSharedModules();
        console.log('');

        // Phase 7: Elm Handler Scaffolding (depends on shared modules)  
        console.log('🔧 Phase 7: Elm Handler Scaffolding');
        console.log('=================================');
        console.log('🔗 Checking handler dependencies against shared modules...');
        results.handlers = await generators.generateElmHandlers();
        console.log('');

        // Phase 8: Admin UI Generation (depends on database models)
        console.log('👑 Phase 8: Admin UI Generation');
        console.log('==============================');
        console.log('🔗 Generating admin interface from database models...');
        results.admin = await generators.generateAdminUi();
        console.log('');

        // Phase 9: WASM Build (sync Rust models with generated Elm types)
        console.log('📦 Phase 9: WASM Build');
        console.log('====================');
        console.log('🔄 Rebuilding WASM to sync with updated Elm types...');
        results.wasm = await buildWasm();
        console.log('');

        results.success = true;

        // Summary
        console.log('📊 Generation Summary');
        console.log('===================');
        console.log(`✅ Database Queries: ${results.database?.generatedPaths?.length || 0} operations generated`);
        console.log(`✅ API Routes: ${results.api?.stats?.totalRoutes || 0} routes across ${results.api?.stats?.totalHandlers || 0} handlers`);
        console.log(`✅ Browser Storage: ${results.browser?.stats?.totalKeys || 0} storage keys generated`);
        console.log(`✅ KV Store: ${results.kv?.stats?.totalKeys || 0} KV keys across ${results.kv?.stats?.totalStores || 0} stores`);
        console.log(`✅ SSE Events: ${results.sse?.stats?.totalEvents || 0} events generated`);
        console.log(`✅ Elm Shared: ${results.shared?.stats?.totalModules || 0} modules generated`);
        console.log(`✅ Elm Handlers: ${results.handlers?.stats?.totalHandlers || 0} handlers generated`);
        console.log(`✅ Admin UI: ${results.admin?.stats?.totalResources || 0} resources generated`);
        if (results.wasm?.warning) {
            console.log(`⚠️  WASM Build: ${results.wasm.message}`);
        } else {
            console.log(`✅ WASM Build: ${results.wasm?.message || 'Completed'}`);
        }
        console.log('');
        console.log('✨ Code generation completed successfully!');

        return true;
    } catch (error) {
        console.error('❌ Generation failed:', error.message);
        console.error('Stack trace:', error.stack);
        return false;
    }
}