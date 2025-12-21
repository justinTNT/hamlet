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

const WATCH_PATHS = [
    'src/models/',           // Rust models
    'packages/hamlet-server/generated/', // Generated JS
    'app/generated/',        // Generated Elm
];

const SERVER_DIR = 'app/horatio/server';

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
            await generateDatabaseQueries();
            console.log('✅ Database queries regenerated');
            
        } else if (phase === 'api') {
            await generateApiRoutes();
            await generateElmHandlers(); // API changes might need new handlers
            console.log('✅ API routes and handlers regenerated');
            
        } else if (phase === 'browser') {
            await generateBrowserStorage();
            console.log('✅ Browser storage regenerated');
            
        } else if (phase === 'kv') {
            await generateKvStore();
            console.log('✅ KV store regenerated');
            
        } else if (phase === 'sse') {
            await generateSSEEvents();
            await generateElmSharedModules(); // SSE events affect shared modules
            console.log('✅ SSE events and shared modules regenerated');
            
        } else if (phase === 'shared') {
            await generateElmSharedModules();
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
        } else {
            // For Elm or other changes, just rebuild Elm
            console.log('🎯 Elm change detected, skipping generation...');
        }
        
        // Build Elm
        await buildElm();
        
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
    
    // Watch Rust model files with smart regeneration
    const modelPaths = ['src/models/', 'app/horatio/models/'];
    for (const modelPath of modelPaths) {
        if (fs.existsSync(modelPath)) {
            watch(modelPath, { recursive: true }, (eventType, filename) => {
                if (filename && filename.endsWith('.rs')) {
                    const fullPath = path.join(modelPath, filename);
                    const phase = getGenerationPhaseForFile(fullPath);
                    console.log(`📝 Rust model changed: ${filename} (${phase} phase)`);
                    restart('Rust model updated', fullPath);
                }
            });
            console.log(`   👀 Watching ${modelPath} for targeted Rust generation`);
        }
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