#!/usr/bin/env node

/**
 * Master Code Generation Script
 * 
 * Executes all Hamlet code generation phases:
 * - Database query generation
 * - API route generation  
 * - Browser storage generation
 * - KV store generation
 */

import fs from 'fs';
import { generateDatabaseQueries } from '../../shared/generation/database_queries.js';
import { generateApiRoutes } from '../../shared/generation/api_routes.js';
import { generateBrowserStorage } from '../../shared/generation/browser_storage.js';
import { generateKvStore } from '../../shared/generation/kv_store.js';
import { generateElmHandlers } from '../../shared/generation/elm_handlers.js';
import { generateElmSharedModules } from '../../shared/generation/elm_shared_modules.js';

/**
 * Run all generation phases in sequence
 */
async function generateAll() {
    console.log('🚀 Starting Hamlet code generation...');
    console.log('');
    
    const results = {
        database: null,
        api: null,
        browser: null,
        kv: null,
        shared: null,
        handlers: null,
        success: false
    };
    
    try {
        // Phase 1: Database Query Generation
        console.log('📊 Phase 1: Database Query Generation');
        console.log('===================================');
        results.database = await generateDatabaseQueries();
        console.log('');
        
        // Phase 2: API Route Generation
        console.log('🛣️  Phase 2: API Route Generation');
        console.log('===============================');
        results.api = await generateApiRoutes();
        console.log('');
        
        // Phase 3: Browser Storage Generation
        console.log('💾 Phase 3: Browser Storage Generation');
        console.log('====================================');
        results.browser = await generateBrowserStorage();
        console.log('');
        
        // Phase 4: KV Store Generation
        console.log('🗄️  Phase 4: KV Store Generation');
        console.log('==============================');
        results.kv = await generateKvStore();
        console.log('');
        
        // Phase 5: Elm Shared Modules (MUST come before handlers)
        console.log('📦 Phase 5: Elm Shared Modules');
        console.log('=============================');
        results.shared = await generateElmSharedModules();
        console.log('');
        
        // Phase 6: Elm Handler Scaffolding (depends on shared modules)  
        console.log('🔧 Phase 6: Elm Handler Scaffolding');
        console.log('=================================');
        console.log('🔗 Checking handler dependencies against shared modules...');
        results.handlers = await generateElmHandlers();
        console.log('');
        
        // Success summary
        results.success = true;
        printSuccessSummary(results);
        
        return results;
        
    } catch (error) {
        console.error('❌ Code generation failed:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

/**
 * Print generation summary
 */
function printSuccessSummary(results) {
    console.log('✨ Generation Complete!');
    console.log('======================');
    console.log('');
    
    // Database queries
    if (results.database) {
        const dbStats = typeof results.database === 'string' ? 'generated' : `${results.database.structs} models → ${results.database.functions} functions`;
        console.log(`📊 Database: ${dbStats}`);
    }
    
    // API routes
    if (results.api) {
        console.log(`🛣️  API: ${results.api.routes} routes → ${results.api.endpoints} endpoints + Elm client`);
    }
    
    // Browser storage
    if (results.browser) {
        console.log(`💾 Storage: ${results.browser.models} models → ${results.browser.classes} classes + ${results.browser.elmModules} Elm modules`);
    }
    
    // KV store
    if (results.kv) {
        console.log(`🗄️  KV Store: ${results.kv.structs} models → ${results.kv.functions} functions`);
    }
    
    // Shared modules
    if (results.shared) {
        console.log(`📦 Shared: ${results.shared.length} modules (Database, Events, Services)`);
    }
    
    // Elm handlers
    if (results.handlers) {
        console.log(`🔧 Handlers: ${results.handlers.generated} new + ${results.handlers.skipped} existing`);
    }
    
    console.log('');
    
    // Total summary
    const totalFunctions = 
        (results.database?.functions || 0) + 
        (results.api?.endpoints || 0) + 
        (results.browser?.classes || 0) + 
        (results.kv?.functions || 0);
        
    console.log(`🎉 Total: ${totalFunctions} type-safe functions generated`);
    console.log('');
    
    // Generated files
    console.log('📁 Generated files:');
    if (results.database) {
        const dbFile = typeof results.database === 'string' ? results.database : results.database.outputFile;
        if (dbFile) console.log(`   ${dbFile}`);
    }
    if (results.api?.outputFile) {
        console.log(`   ${results.api.outputFile}`);
    }
    if (results.api?.elmOutputFile) {
        console.log(`   ${results.api.elmOutputFile}`);
    }
    if (results.browser?.jsOutputFile) {
        console.log(`   ${results.browser.jsOutputFile}`);
    }
    if (results.browser?.elmOutputFiles) {
        results.browser.elmOutputFiles.forEach(file => {
            console.log(`   ${file}`);
        });
    }
    if (results.kv?.outputFile) {
        console.log(`   ${results.kv.outputFile}`);
    }
    if (results.handlers?.outputFiles) {
        results.handlers.outputFiles.forEach(file => {
            console.log(`   ${file}`);
        });
    }
    console.log('');
    
    console.log('🚀 "Rust once, JSON never" - Code generation complete!');
}

/**
 * Run specific generation phase
 */
async function generatePhase(phase) {
    console.log(`🔧 Running single phase: ${phase}`);
    console.log('');
    
    try {
        switch (phase) {
            case 'database':
            case 'db':
                console.log('📊 Database Query Generation');
                return await generateDatabaseQueries();
                
            case 'api':
            case 'routes':
                console.log('🛣️  API Route Generation');
                return await generateApiRoutes();
                
            case 'browser':
            case 'storage':
                console.log('💾 Browser Storage Generation');
                return await generateBrowserStorage();
                
            case 'kv':
            case 'cache':
                console.log('🗄️  KV Store Generation');
                return await generateKvStore();
                
            case 'shared':
            case 'modules':
                console.log('📦 Elm Shared Modules');
                return await generateElmSharedModules();
                
            case 'handlers':
            case 'elm':
                console.log('🔧 Elm Handler Scaffolding');
                // Ensure shared modules exist first
                if (!fs.existsSync('app/horatio/server/generated/Database.elm')) {
                    console.log('🔗 Shared modules missing, generating them first...');
                    await generateElmSharedModules();
                    console.log('');
                }
                return await generateElmHandlers();
                
            default:
                throw new Error(`Unknown phase: ${phase}. Available phases: database, api, browser, kv, shared, handlers`);
        }
    } catch (error) {
        console.error(`❌ Phase '${phase}' failed:`, error.message);
        process.exit(1);
    }
}

/**
 * Print help information
 */
function printHelp() {
    console.log('Hamlet Code Generation');
    console.log('=====================');
    console.log('');
    console.log('Usage:');
    console.log('  node generate-all.js [phase]');
    console.log('');
    console.log('Options:');
    console.log('  (no args)     Run all generation phases');
    console.log('  database      Generate database queries only');
    console.log('  api           Generate API routes only'); 
    console.log('  browser       Generate browser storage only');
    console.log('  kv            Generate KV store only');
    console.log('  handlers      Generate Elm handler scaffolding only');
    console.log('  --help        Show this help');
    console.log('');
    console.log('Examples:');
    console.log('  node generate-all.js              # Generate everything');
    console.log('  node generate-all.js database     # Database queries only');
    console.log('  node generate-all.js api          # API routes only');
    console.log('');
    console.log('Generated code replaces manual JavaScript interfaces with');
    console.log('type-safe functions automatically derived from Rust models.');
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
}

// Run generation
if (import.meta.url === `file://${process.argv[1]}`) {
    if (args.length === 0) {
        // Run all phases
        generateAll();
    } else if (args.length === 1) {
        // Run specific phase
        generatePhase(args[0]);
    } else {
        console.error('❌ Too many arguments. Use --help for usage information.');
        process.exit(1);
    }
}

export { generateAll, generatePhase };