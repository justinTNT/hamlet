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
import { generateSqlMigrations, generateSchemaIntrospection } from './generators/sql.js';
import { createPaths } from './generators/shared-paths.js';

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
 * @param {Object} config - Configuration including paths and modelDir for context
 */
async function generateJavaScript(config = {}) {
    const { modelDir, paths } = config;

    if (!modelDir) {
        // No specific interface - run all JS generators
        const results = [];
        for (const [iface, generator] of Object.entries(jsGeneratorsByInterface)) {
            try {
                const result = await generator({ paths });
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

    return generator({ paths });
}

/**
 * Map of target names to generator functions
 */
const targetGenerators = {
    js: generateJavaScript,
    elm: generateElmSharedModules,
    handlers: generateElmHandlers,
    admin: generateAdminUi,
    sql: generateSqlMigrations,
    schema: generateSchemaIntrospection,
};

/**
 * Main generation function
 * @param {Object} options - Generation options
 * @param {string} options.src - Source models directory (required)
 * @param {string} options.dest - Destination output directory (required)
 * @param {string} options.target - Specific target (js, elm, handlers, etc.) or null for all
 * @param {string} options.modelDir - Model directory (api, db, storage, etc.) or null for all
 */
export async function generate(options = {}) {
    const { src, dest, target, modelDir } = options;

    // Create paths from explicit src/dest
    const paths = createPaths({ src, dest });

    console.log('');
    console.log('BuildAmp Code Generation');
    console.log(`   Source: ${paths.modelsDir}`);
    console.log(`   Destination: ${paths.outputDir}`);
    console.log(`   Target: ${target || 'all'}`);
    console.log(`   Model dir: ${modelDir || 'all'}`);
    console.log('');

    const results = [];

    // Determine which generators to run
    let generatorsToRun = [];

    if (target) {
        // Specific target requested
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
                // Pass paths and modelDir to generators
                const genConfig = { paths, modelDir };
                const result = await generator(genConfig);
                results.push({ generator: gen, success: true, result });
            } catch (error) {
                console.error(`Generator '${gen}' failed:`, error.message);
                results.push({ generator: gen, success: false, error: error.message });
            }
        }
    }

    // Summary
    console.log('');
    console.log('Generation Summary:');
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    console.log(`   Successful: ${successful}`);
    if (failed > 0) {
        console.log(`   Failed: ${failed}`);
    }

    return results;
}
