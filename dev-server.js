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
 * Run code generation
 */
async function regenerateCode() {
    return new Promise((resolve, reject) => {
        console.log('🔄 Regenerating code...');
        
        exec('node .buildamp/generate-all.js', (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Code generation failed:', error.message);
                reject(error);
                return;
            }
            
            console.log('✅ Code regenerated successfully');
            if (stdout) console.log(stdout);
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
 * Restart the development stack
 */
async function restart(reason = 'File change detected') {
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
        
        // Regenerate code
        await regenerateCode();
        
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
 * Setup file watchers
 */
function setupWatchers() {
    console.log('👁️  Setting up file watchers...');
    
    // Watch Rust model files
    if (fs.existsSync('src/models/')) {
        watch('src/models/', { recursive: true }, (eventType, filename) => {
            if (filename && filename.endsWith('.rs')) {
                console.log(`📝 Rust model changed: ${filename}`);
                restart('Rust model updated');
            }
        });
        console.log('   👀 Watching src/models/ for Rust changes');
    }
    
    // Watch server files
    if (fs.existsSync(path.join(SERVER_DIR, 'src'))) {
        watch(path.join(SERVER_DIR, 'src'), { recursive: true }, (eventType, filename) => {
            if (filename && filename.endsWith('.elm')) {
                console.log(`📝 Elm file changed: ${filename}`);
                restart('Elm file updated');
            }
        });
        console.log('   👀 Watching server/src/ for Elm changes');
    }
    
    // Watch server.js
    if (fs.existsSync(path.join(SERVER_DIR, 'server.js'))) {
        watch(path.join(SERVER_DIR, 'server.js'), (eventType, filename) => {
            console.log(`📝 Server config changed: ${filename}`);
            restart('Server config updated');
        });
        console.log('   👀 Watching server.js for config changes');
    }
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
        console.log('🔧 Initial setup...');
        await regenerateCode();
        await buildElm();
        
        // Setup watchers
        setupWatchers();
        setupShutdownHandlers();
        
        // Start server
        startServer();
        
        console.log('');
        console.log('🎯 Development server ready!');
        console.log('📁 Generated files are being watched for changes');
        console.log('🔄 Code will auto-regenerate when Rust models change');
        console.log('⚡ Server will auto-restart when files change');
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