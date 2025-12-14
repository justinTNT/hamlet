#!/usr/bin/env node

/**
 * Simple Server Runner for Hamlet
 * Builds and starts the server without file watching
 */

import { execSync } from 'child_process';

console.log('🚀 Hamlet Server - Simple Runner');
console.log('=================================');
console.log('');

try {
    // Step 1: Generate code
    console.log('📊 Step 1: Generating code...');
    execSync('node .buildamp/generate-all.js', { stdio: 'inherit' });
    console.log('');
    
    // Step 2: Build Elm
    console.log('🔨 Step 2: Building Elm logic...');
    execSync('npm run build:elm', { 
        cwd: 'app/horatio/server',
        stdio: 'inherit' 
    });
    console.log('');
    
    // Step 3: Start server
    console.log('🌟 Step 3: Starting server...');
    console.log('Server will be available at http://localhost:3000');
    console.log('Press Ctrl+C to stop');
    console.log('');
    
    execSync('npm start', { 
        cwd: 'app/horatio/server',
        stdio: 'inherit' 
    });
    
} catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
}