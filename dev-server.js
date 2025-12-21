#!/usr/bin/env node

/**
 * Hamlet Development Server with Code Generation Watching
 * 
 * This script sets up a complete development environment that:
 * 1. Watches Rust model files for changes
 * 2. Automatically regenerates JavaScript/Elm code
 * 3. Rebuilds Elm logic
 * 4. Restarts the server
 */

import { spawn, exec } from 'child_process';
import { watch } from 'fs';
import path from 'path';
import fs from 'fs';
import { generateDatabaseQueries } from './shared/generation/database_queries.js';
import { generateApiRoutes } from './shared/generation/api_routes.js';
import { generateBrowserStorage } from './shared/generation/browser_storage.js';
import { generateKvStore } from './shared/generation/kv_store.js';
import { generateSSEEvents } from './shared/generation/sse_events.js';
import { generateElmHandlers } from './shared/generation/elm_handlers.js';
import { generateElmSharedModules } from './shared/generation/elm_shared_modules.js';

console.log('🚀 Hamlet Development Server');
console.log('============================');
console.log('');

let serverProcess = null;
let isRestarting = false;

// Watch paths will be set after path discovery
let WATCH_PATHS = [];

const SERVER_DIR = 'app/horatio/server';

/**
 * Discover project structure and return standardized paths
 */
function discoverProjectPaths() {
    // Check for app/${project}/models pattern (BuildAmp framework)
    if (fs.existsSync('app/horatio/models')) {
        return {
            modelsDir: 'app/horatio/models',
            dbModelsDir: 'app/horatio/models/db',
            apiModelsDir: 'app/horatio/models/api', 
            storageModelsDir: 'app/horatio/models/storage',
            kvModelsDir: 'app/horatio/models/kv',
            sseModelsDir: 'app/horatio/models/sse',
            eventsModelsDir: 'app/horatio/models/events',
            elmOutputDir: 'app/generated',
            jsOutputDir: 'packages/hamlet-server/generated',
            elmApiDir: 'app/horatio/web/src/Api',
            serverHandlersDir: 'app/horatio/server/src/Api/Handlers'
        };
    }
    
    // Fallback to src/models pattern (simple projects)
    return {
        modelsDir: 'src/models',
        dbModelsDir: 'src/models/db',
        apiModelsDir: 'src/models/api',
        storageModelsDir: 'src/models/storage', 
        kvModelsDir: 'src/models/kv',
        sseModelsDir: 'src/models/sse',
        eventsModelsDir: 'src/models/events',
        elmOutputDir: 'app/generated',
        jsOutputDir: 'packages/hamlet-server/generated',
        elmApiDir: 'app/horatio/web/src/Api',
        serverHandlersDir: 'app/horatio/server/src/Api/Handlers'
    };
}

// Global paths discovered once at startup
const PROJECT_PATHS = discoverProjectPaths();

/**
 * Detect which generation phase to run based on file path
 */
function getGenerationPhaseForFile(filePath) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    if (normalizedPath.includes('/models/db/')) {
        return 'database';
    } else if (normalizedPath.includes('/models/api/')) {
        return 'api';
    } else if (normalizedPath.includes('/models/storage/')) {
        return 'browser';
    } else if (normalizedPath.includes('/models/kv/')) {
        return 'kv';
    } else if (normalizedPath.includes('/models/sse/')) {
        return 'sse';
    } else if (normalizedPath.includes('/models/events/')) {
        return 'shared'; // Events affect shared modules
    }
    
    // Default: run all if we can't determine
    return 'all';
}

/**
 * Run targeted code generation based on what changed
 */
async function regenerateCodeForFile(filePath, reason = 'File change') {
    const phase = getGenerationPhaseForFile(filePath);
    
    try {
        console.log(`🔄 ${reason}: ${path.basename(filePath)}`);
        console.log(`🎯 Running ${phase} generation phase...`);
        
        if (phase === 'database') {
            await generateDatabaseQueries(PROJECT_PATHS.dbModelsDir, PROJECT_PATHS.jsOutputDir);
            console.log('✅ Database queries regenerated');
            
        } else if (phase === 'api') {
            await generateApiRoutes(PROJECT_PATHS.apiModelsDir, PROJECT_PATHS.jsOutputDir);
            await generateElmHandlers(PROJECT_PATHS.apiModelsDir, PROJECT_PATHS.serverHandlersDir, PROJECT_PATHS.elmOutputDir); // API changes might need new handlers
            console.log('✅ API routes and handlers regenerated');
            
        } else if (phase === 'browser') {
            await generateBrowserStorage({
                inputBasePath: path.dirname(PROJECT_PATHS.storageModelsDir), // app/horatio/models
                elmOutputPath: PROJECT_PATHS.elmOutputDir,
                jsOutputPath: PROJECT_PATHS.jsOutputDir,
                elmApiPath: PROJECT_PATHS.elmApiDir
            });
            console.log('✅ Browser storage regenerated');
            
        } else if (phase === 'kv') {
            await generateKvStore(PROJECT_PATHS.kvModelsDir, PROJECT_PATHS.jsOutputDir);
            console.log('✅ KV store regenerated');
            
        } else if (phase === 'sse') {
            await generateSSEEvents(PROJECT_PATHS.sseModelsDir, PROJECT_PATHS.jsOutputDir);
            await generateElmSharedModules(PROJECT_PATHS.modelsDir, PROJECT_PATHS.elmOutputDir); // SSE events affect shared modules
            console.log('✅ SSE events and shared modules regenerated');
            
        } else if (phase === 'shared') {
            await generateElmSharedModules(PROJECT_PATHS.modelsDir, PROJECT_PATHS.elmOutputDir);
            console.log('✅ Shared modules regenerated');
            
        } else {
            // Fallback: run all phases
            console.log('🔄 Running full generation pipeline...');
            await regenerateAllCode();
        }
        
        // Always rebuild WASM if any Rust changed
        if (filePath.endsWith('.rs')) {
            await buildWasm();
        }
        
    } catch (error) {
        console.error(`❌ Generation failed for ${phase} phase:`, error.message);
        throw error;
    }
}

/**
 * Run full code generation (fallback)
 */
async function regenerateAllCode() {
    return new Promise((resolve, reject) => {
        exec('node .buildamp/generate-all.js', (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Full code generation failed:', error.message);
                reject(error);
                return;
            }
            
            console.log('✅ Full code regenerated successfully');
            resolve();
        });
    });
}

/**
 * Build WASM (for Rust model changes)
 */
async function buildWasm() {
    return new Promise((resolve, reject) => {
        console.log('📦 Building WASM...');
        
        exec('wasm-pack build --target web --out-dir pkg-web', (error, stdout, stderr) => {
            if (error) {
                console.error('❌ WASM build failed:', error.message);
                reject(error);
                return;
            }
            
            console.log('✅ WASM built successfully');
            resolve();
        });
    });
}

/**
 * Build Elm logic
 */
async function buildElm() {
    return new Promise((resolve, reject) => {
        console.log('🔨 Building Elm logic...');
        
        exec('npm run build:elm', { cwd: SERVER_DIR }, (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Elm build failed:', error.message);
                reject(error);
                return;
            }
            
            console.log('✅ Elm built successfully');
            resolve();
        });
    });
}

/**
 * Start the server
 */
function startServer() {
    if (serverProcess) {
        serverProcess.kill();
    }
    
    console.log('🌟 Starting server...');
    
    serverProcess = spawn('node', ['server.js'], {
        cwd: SERVER_DIR,
        stdio: 'inherit'
    });
    
    serverProcess.on('error', (error) => {
        console.error('❌ Server failed to start:', error.message);
    });
    
    serverProcess.on('close', (code) => {
        if (code !== 0 && !isRestarting) {
            console.error(`❌ Server exited with code ${code}`);
        }
    });
}

/**
 * Run targeted generation with TEA handler reload
 */
async function runTargetedGeneration(filePath, phase, reason = 'File change') {
    try {
        // Run the targeted generation
        await regenerateCodeForFile(filePath, reason);
        
        // Trigger handler reload for the running server if applicable
        // This ensures handlers pick up new generated code without full restart
        if (phase === 'api' || phase === 'all') {
            console.log('🔄 Triggering handler reload...');
            // In a production setup, we'd send a signal to the running server
            // For dev mode, we do a full restart to ensure clean state
            await restart(`Generated code updated (${phase})`, filePath);
        } else {
            // For non-handler changes, just rebuild Elm
            await buildElm();
            console.log(`✅ ${phase} phase complete`);
        }
        
    } catch (error) {
        console.error(`❌ Targeted generation failed for ${phase}:`, error.message);
        // Fall back to full restart on generation errors
        await restart('Generation error, full restart', filePath);
    }
}

/**
 * Restart the development stack with targeted generation
 */
async function restart(reason = 'File change detected', changedFile = null) {
    if (isRestarting) return;
    
    isRestarting = true;
    console.log('');
    console.log(`🔄 ${reason}, restarting...`);
    
    try {
        // Stop server
        if (serverProcess) {
            serverProcess.kill();
            serverProcess = null;
        }
        
        // Smart regeneration based on what changed
        if (changedFile && changedFile.endsWith('.rs')) {
            await regenerateCodeForFile(changedFile, reason);
            await buildElm();
        } else if (changedFile && changedFile.endsWith('.elm')) {
            // For Elm handler changes, rebuild handlers
            console.log('🎯 Elm handler change detected, rebuilding...');
            await buildElm();
        } else {
            // For other changes, just rebuild Elm
            console.log('🎯 Other change detected, rebuilding Elm...');
            await buildElm();
        }
        
        // Start server
        startServer();
        
        console.log('✅ Restart complete');
        console.log('');
        
    } catch (error) {
        console.error('❌ Restart failed:', error.message);
    } finally {
        isRestarting = false;
    }
}

/**
 * Initial setup with full generation
 */
async function initialSetup() {
    console.log('🔧 Initial setup...');
    await regenerateAllCode(); // Full generation on startup
    await buildElm();
}

/**
 * Setup file watchers with smart generation
 */
function setupWatchers() {
    console.log('👁️  Setting up intelligent file watchers...');
    
    // Set up watch paths based on discovered project structure  
    WATCH_PATHS = [
        PROJECT_PATHS.modelsDir,           // Rust models
        PROJECT_PATHS.jsOutputDir,         // Generated JS
        PROJECT_PATHS.elmOutputDir,        // Generated Elm
    ];
    
    // Watch Rust model files with smart regeneration
    if (fs.existsSync(PROJECT_PATHS.modelsDir)) {
        const modelPath = PROJECT_PATHS.modelsDir;
        watch(modelPath, { recursive: true }, (eventType, filename) => {
            if (filename && filename.endsWith('.rs')) {
                const fullPath = path.join(modelPath, filename);
                const phase = getGenerationPhaseForFile(fullPath);
                console.log(`📝 Rust model changed: ${filename} (${phase} phase)`);
                runTargetedGeneration(fullPath, phase, 'Model file changed');
            }
        });
        console.log(`   👀 Watching ${PROJECT_PATHS.modelsDir} for targeted Rust generation`);
    } else {
        console.log(`⚠️  Models directory not found: ${PROJECT_PATHS.modelsDir}`);
    }
    
    // Watch Elm handler files (no generation needed, just rebuild)
    if (fs.existsSync(path.join(SERVER_DIR, 'src'))) {
        watch(path.join(SERVER_DIR, 'src'), { recursive: true }, (eventType, filename) => {
            if (filename && filename.endsWith('.elm')) {
                console.log(`📝 Elm file changed: ${filename}`);
                restart('Elm file updated', path.join(SERVER_DIR, 'src', filename));
            }
        });
        console.log('   👀 Watching server/src/ for Elm changes (fast rebuild)');
    }
    
    // Watch server.js
    if (fs.existsSync(path.join(SERVER_DIR, 'server.js'))) {
        watch(path.join(SERVER_DIR, 'server.js'), (eventType, filename) => {
            console.log(`📝 Server config changed: ${filename}`);
            restart('Server config updated');
        });
        console.log('   👀 Watching server.js for config changes');
    }
    
    console.log('');
    console.log('🎯 Smart generation phases:');
    console.log('   📊 /models/db/*.rs      → database queries only');
    console.log('   🛣️  /models/api/*.rs     → API routes + handlers');
    console.log('   💾 /models/storage/*.rs → browser storage only');
    console.log('   🗄️  /models/kv/*.rs      → KV store only');
    console.log('   📡 /models/sse/*.rs     → SSE events + shared modules');
    console.log('   🎪 /models/events/*.rs  → shared modules only');
    console.log('   ⚡ *.elm                → Elm rebuild only (no generation)');
    console.log('');
}

/**
 * Handle shutdown
 */
function setupShutdownHandlers() {
    process.on('SIGINT', () => {
        console.log('');
        console.log('🛑 Shutting down development server...');
        
        if (serverProcess) {
            serverProcess.kill();
        }
        
        console.log('✅ Shutdown complete');
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        if (serverProcess) {
            serverProcess.kill();
        }
        process.exit(0);
    });
}

/**
 * Main function
 */
async function main() {
    try {
        // Initial build
        await initialSetup();
        
        // Setup watchers
        setupWatchers();
        setupShutdownHandlers();
        
        // Start server
        startServer();
        
        console.log('🎯 Intelligent Development Server Ready!');
        console.log('📁 Generated files are being watched for changes');
        console.log('🧠 Smart regeneration will run only needed phases');
        console.log('⚡ Fast rebuilds for Elm-only changes');
        console.log('🚀 Full pipeline only runs once at startup');
        console.log('');
        console.log('Press Ctrl+C to stop');
        console.log('');
        
    } catch (error) {
        console.error('❌ Failed to start development server:', error.message);
        process.exit(1);
    }
}

// Start the development server
main();