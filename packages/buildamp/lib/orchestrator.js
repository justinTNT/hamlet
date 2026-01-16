/**
 * BuildAmp Orchestrator
 * Coordinates code generation based on model directories and targets
 */

import path from 'path';
import { generateDatabaseQueries } from './generators/db.js';
import { generateApiRoutes } from './generators/api.js';
import { generateBrowserStorage } from './generators/storage.js';
import { generateKvStore } from './generators/kv.js';
import { generateSSEEvents } from './generators/sse.js';
import { generateElmSharedModules } from './generators/elm.js';
import { generateElmHandlers } from './generators/handlers.js';
import { generateAdminUi } from './generators/admin.js';
import { generateWasm, checkWasmStatus, getWasmOutputDir } from './generators/wasm.js';
import { generateSqlMigrations, generateSchemaIntrospection } from './generators/sql.js';
import { discoverProjectPaths } from '../core/paths.js';
import { getContractStatus } from '../core/contracts.js';

/**
 * Map of model directories to their associated generators
 * When a model-dir is specified, these generators run
 */
const modelDirGenerators = {
    db: ['js', 'elm', 'admin', 'sql', 'schema'],
    api: ['js', 'elm', 'handlers'],
    storage: ['js', 'elm'],
    kv: ['js', 'elm'],
    sse: ['js', 'elm'],
    events: ['elm'],
    config: ['elm'],
};

/**
 * Map of interface names to their JavaScript generators
 * Used by the 'js' target to dispatch to the correct generator
 */
const jsGeneratorsByInterface = {
    db: generateDatabaseQueries,
    api: generateApiRoutes,
    storage: generateBrowserStorage,
    kv: generateKvStore,
    sse: generateSSEEvents,
};

/**
 * JavaScript generator - dispatches to correct generator based on interface context
 * @param {Object} config - Configuration including modelDir for context
 */
async function generateJavaScript(config = {}) {
    const { modelDir } = config;

    if (!modelDir) {
        // No specific interface - run all JS generators
        const results = [];
        for (const [iface, generator] of Object.entries(jsGeneratorsByInterface)) {
            try {
                const result = await generator(config);
                results.push({ interface: iface, success: true, result });
            } catch (error) {
                results.push({ interface: iface, success: false, error: error.message });
            }
        }
        return results;
    }

    const generator = jsGeneratorsByInterface[modelDir];
    if (!generator) {
        console.log(`No JavaScript generator for interface: ${modelDir}`);
        return null;
    }

    return generator(config);
}

/**
 * Map of target names to generator functions
 */
const targetGenerators = {
    js: generateJavaScript,
    elm: generateElmSharedModules,
    handlers: generateElmHandlers,
    admin: generateAdminUi,
    wasm: generateWasm,
    sql: generateSqlMigrations,
    schema: generateSchemaIntrospection,
};

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
                // Pass modelDir to config so generators like 'js' know the context
                const genConfig = { ...config, modelDir };
                const result = await generator(genConfig);
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
 * Get detailed status of generated code vs source models
 * @param {Object} options - Options
 * @param {string} options.contractsPath - Path to contracts.json
 * @param {string} options.modelsDir - Path to models directory
 * @param {string} options.projectRoot - Project root directory
 * @returns {Promise<Object>} Status object with models, wasm, and suggestions
 */
export async function getStatus(options = {}) {
    const paths = discoverProjectPaths();
    const rootDir = process.cwd();
    const {
        contractsPath = path.join(rootDir, paths.elmGlueDir, 'contracts.json'),
        modelsDir = path.join(rootDir, paths.modelsDir),
        projectRoot = rootDir
    } = options;

    // Get models contract status
    const modelsStatus = await getContractStatus(modelsDir, contractsPath);

    // Get WASM status for both targets using mtime comparison
    const wasmWebOutDir = getWasmOutputDir('web', projectRoot);
    const wasmNodeOutDir = getWasmOutputDir('node', projectRoot);
    const wasmWebStatus = checkWasmStatus(modelsDir, wasmWebOutDir);
    const wasmNodeStatus = checkWasmStatus(modelsDir, wasmNodeOutDir);

    // Load contracts.json to get generatedAt timestamp
    let generatedAt = null;
    try {
        const fs = await import('fs');
        if (fs.existsSync(contractsPath)) {
            const contracts = JSON.parse(fs.readFileSync(contractsPath, 'utf8'));
            generatedAt = contracts.generatedAt || null;
        }
    } catch (e) {
        // Ignore errors reading contracts
    }

    // Build suggestions
    const suggestions = [];

    if (modelsStatus.isDirty) {
        suggestions.push('buildamp gen');
    }

    if (wasmWebStatus.needsRebuild) {
        suggestions.push('buildamp gen:wasm --target web');
    }

    if (wasmNodeStatus.needsRebuild) {
        suggestions.push('buildamp gen:wasm --target node');
    }

    return {
        appName: paths.appName,
        models: {
            isDirty: modelsStatus.isDirty,
            reason: modelsStatus.reason,
            generatedAt,
            details: modelsStatus.details || null
        },
        wasm: {
            web: {
                isDirty: wasmWebStatus.needsRebuild,
                reason: wasmWebStatus.reason,
                wasmMtime: wasmWebStatus.wasmMtime
            },
            node: {
                isDirty: wasmNodeStatus.needsRebuild,
                reason: wasmNodeStatus.reason,
                wasmMtime: wasmNodeStatus.wasmMtime
            }
        },
        suggestions
    };
}

/**
 * Get status of generated code vs source models (CLI wrapper)
 */
export async function status() {
    const paths = discoverProjectPaths();
    const result = await getStatus();

    console.log('');
    console.log('📊 BuildAmp Status');
    console.log(`   App: ${result.appName}`);
    console.log('');

    // Models status
    console.log('Models:');
    if (result.models.isDirty) {
        console.log(`   ✗ Dirty (${result.models.reason})`);
        if (result.models.details?.changed?.length > 0) {
            console.log(`     Changed: ${result.models.details.changed.join(', ')}`);
        }
        if (result.models.details?.added?.length > 0) {
            console.log(`     Added: ${result.models.details.added.join(', ')}`);
        }
        if (result.models.details?.removed?.length > 0) {
            console.log(`     Removed: ${result.models.details.removed.join(', ')}`);
        }
    } else {
        const ago = result.models.generatedAt
            ? ` (generated: ${result.models.generatedAt})`
            : '';
        console.log(`   ✓ Clean${ago}`);
    }
    console.log('');

    // WASM status
    console.log('WASM:');
    for (const [target, status] of Object.entries(result.wasm)) {
        if (status.isDirty) {
            console.log(`   ${target}: ✗ ${status.reason}`);
        } else {
            const mtime = status.wasmMtime
                ? ` (built: ${status.wasmMtime.toISOString()})`
                : '';
            console.log(`   ${target}: ✓ Current${mtime}`);
        }
    }
    console.log('');

    // Suggestions
    if (result.suggestions.length > 0) {
        console.log('Suggestions:');
        for (const suggestion of result.suggestions) {
            console.log(`   → ${suggestion}`);
        }
        console.log('');
    }

    return result;
}
