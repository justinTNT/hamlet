#!/usr/bin/env node

/**
 * BuildAmp Code Generation Script
 * Generates type-safe JavaScript APIs from Rust models
 */

import {
    generateDatabaseQueries,
    generateApiRoutes,
    generateBrowserStorage
} from 'buildamp/generators';

console.log('🚀 Starting BuildAmp code generation...');
console.log('');

// Phase 1: Database Query Generation
console.log('📊 Phase 1: Database Query Generation');
try {
    generateDatabaseQueries();
    console.log('✅ Database queries generated successfully');
} catch (error) {
    console.error('❌ Database query generation failed:', error.message);
    process.exit(1);
}

console.log('');

// Phase 2: API Route Generation
console.log('🚀 Phase 2: API Route Generation');
try {
    generateApiRoutes();
    console.log('✅ API routes generated successfully');
} catch (error) {
    console.error('❌ API route generation failed:', error.message);
    process.exit(1);
}

console.log('');

// Phase 3: Browser Storage Generation (ESSENTIAL)
console.log('💾 Phase 3: Browser Storage Generation');
try {
    generateBrowserStorage();
    console.log('✅ Browser storage generation completed successfully');
} catch (error) {
    console.error('❌ Browser storage generation failed:', error.message);
    process.exit(1);
}

console.log('');
console.log('🎉 Code generation completed successfully!');