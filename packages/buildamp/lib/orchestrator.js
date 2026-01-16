/**
 * BuildAmp Orchestrator
 * Coordinates code generation based on model directories and targets
 */

import { generateDatabaseQueries } from './generators/db.js';
import { generateApiRoutes } from './generators/api.js';
import { generateBrowserStorage } from './generators/storage.js';
import { generateKvStore } from './generators/kv.js';
import { generateSSEEvents } from './generators/sse.js';
import { generateElmSharedModules } from './generators/elm.js';
import { generateElmHandlers } from './generators/handlers.js';
import { generateAdminUi } from './generators/admin.js';
import { discoverProjectPaths } from '../core/paths.js';

/**
 * Map of model directories to their associated generators
 * When a model-dir is specified, these generators run
 */
const modelDirGenerators = {
    db: ['db', 'elm', 'admin'],
    api: ['api', 'elm', 'handlers'],
    storage: ['storage', 'elm'],
    kv: ['kv', 'elm'],
    sse: ['sse', 'elm'],
    events: ['elm'],
    config: ['elm'],
};

/**
 * Map of target names to generator functions
 */
const targetGenerators = {
    db: generateDatabaseQueries,
    api: generateApiRoutes,
    storage: generateBrowserStorage,
    kv: generateKvStore,
    sse: generateSSEEvents,
    elm: generateElmSharedModules,
    handlers: generateElmHandlers,
    admin: generateAdminUi,
    wasm: generateWasm,
};

/**
 * Generate WASM from Rust models
 * Uses wasm-pack to compile Rust to WASM
 */
async function generateWasm(config = {}) {
    console.log('🦀 WASM generation not yet implemented');
    console.log('   This will use wasm-pack to compile Rust models to WASM modules');
    return { generated: false };
}

/**
 * Main generation function
 * @param {Object} options - Generation options
 * @param {string} options.target - Specific target (wasm, elm, db, etc.) or null for all
 * @param {string} options.modelDir - Model directory (api, db, storage, etc.) or null for all
 * @param {Object} options.config - Additional configuration
 */
export async function generate(options = {}) {
    const { target, modelDir, config = {} } = options;
    const paths = discoverProjectPaths();

    console.log('');
    console.log('🔨 BuildAmp Code Generation');
    console.log(`   App: ${paths.appName}`);
    console.log(`   Target: ${target || 'all'}`);
    console.log(`   Model dir: ${modelDir || 'all'}`);
    console.log('');

    const results = [];

    // Determine which generators to run
    let generatorsToRun = [];

    if (target) {
        // Specific target requested (e.g., gen:wasm, gen:elm)
        if (!targetGenerators[target]) {
            throw new Error(`Unknown target: ${target}. Valid targets: ${Object.keys(targetGenerators).join(', ')}`);
        }
        generatorsToRun = [target];
    } else if (modelDir) {
        // Model directory specified (e.g., gen api, gen db)
        if (!modelDirGenerators[modelDir]) {
            throw new Error(`Unknown model directory: ${modelDir}. Valid directories: ${Object.keys(modelDirGenerators).join(', ')}`);
        }
        generatorsToRun = modelDirGenerators[modelDir];
    } else {
        // Run all generators
        generatorsToRun = Object.keys(targetGenerators);
    }

    // Remove duplicates while preserving order
    generatorsToRun = [...new Set(generatorsToRun)];

    console.log(`   Running generators: ${generatorsToRun.join(', ')}`);
    console.log('');

    // Run each generator
    for (const gen of generatorsToRun) {
        const generator = targetGenerators[gen];
        if (generator) {
            try {
                const result = await generator(config);
                results.push({ generator: gen, success: true, result });
            } catch (error) {
                console.error(`❌ Generator '${gen}' failed:`, error.message);
                results.push({ generator: gen, success: false, error: error.message });
            }
        }
    }

    // Summary
    console.log('');
    console.log('📊 Generation Summary:');
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    console.log(`   ✅ Successful: ${successful}`);
    if (failed > 0) {
        console.log(`   ❌ Failed: ${failed}`);
    }

    return results;
}

/**
 * Get status of generated code vs source models
 */
export async function status() {
    const paths = discoverProjectPaths();

    console.log('');
    console.log('📊 BuildAmp Status');
    console.log(`   App: ${paths.appName}`);
    console.log('');

    // TODO: Implement contract checking to show status
    console.log('   Status checking not yet implemented');
    console.log('   This will show which generators need re-running');

    return { implemented: false };
}
