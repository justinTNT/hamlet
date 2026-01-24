/**
 * Shared path utilities for generators
 * All paths are explicit - no magic discovery
 */

import fs from 'fs';
import path from 'path';

/**
 * Find project root by looking for .git (repo root, not subpackage)
 */
function findProjectRoot(startDir = process.cwd()) {
    let dir = startDir;
    while (dir !== path.dirname(dir)) {
        // Prioritize .git - this is the actual repo root
        if (fs.existsSync(path.join(dir, '.git'))) {
            return dir;
        }
        dir = path.dirname(dir);
    }
    // Fallback: look for package.json
    dir = startDir;
    while (dir !== path.dirname(dir)) {
        if (fs.existsSync(path.join(dir, 'package.json'))) {
            return dir;
        }
        dir = path.dirname(dir);
    }
    return process.cwd(); // Final fallback to CWD
}

/**
 * Create paths object from explicit src/dest configuration
 * @param {Object} config - Configuration with src and dest paths
 * @param {string} config.src - Source models directory
 * @param {string} config.dest - Destination output directory
 */
export function createPaths(config) {
    if (!config.src) {
        throw new Error('buildamp requires --src flag (path to models directory)');
    }
    if (!config.dest) {
        throw new Error('buildamp requires --dest flag (path to output directory)');
    }

    // Resolve paths relative to project root, not CWD
    const projectRoot = findProjectRoot();
    const src = path.isAbsolute(config.src) ? config.src : path.resolve(projectRoot, config.src);
    const dest = path.isAbsolute(config.dest) ? config.dest : path.resolve(projectRoot, config.dest);

    // Output subdirectories matching actual project structure
    const serverGlueDir = path.join(dest, 'server', '.generated');
    const webGlueDir = path.join(dest, 'web', 'src', '.generated');

    return {
        // Source paths - Elm models are the source of truth
        modelsDir: src,
        dbModelsDir: path.join(src, 'db'),
        apiModelsDir: path.join(src, 'api'),
        storageModelsDir: path.join(src, 'storage'),
        kvModelsDir: path.join(src, 'kv'),
        sseModelsDir: path.join(src, 'sse'),
        eventsModelsDir: path.join(src, 'events'),
        configModelsDir: path.join(src, 'config'),

        // Elm model source paths (where user-written Elm type definitions live)
        elmSchemaDir: path.join(src, 'Schema'),
        elmApiDir: path.join(src, 'Api'),
        elmKvDir: path.join(src, 'Kv'),
        elmStorageDir: path.join(src, 'Storage'),
        elmSseDir: path.join(src, 'Sse'),
        elmEventsDir: path.join(src, 'Events'),
        elmConfigDir: path.join(src, 'Config'),

        // Output paths
        outputDir: dest,
        serverGlueDir,                 // Server JS: api-routes.js, database-queries.js, kv-store.js
        serverElmDir: serverGlueDir,   // Server Elm: BuildAmp/Database.elm, etc (add to elm.json sources)
        webGlueDir,                    // Web: ApiClient.elm, StoragePorts.elm, browser-storage.js
        sharedElmDir: path.join(src, '.generated'),  // Shared Elm: Config.elm (generated alongside source models)

        // Legacy aliases (for generator compatibility)
        jsGlueDir: serverGlueDir,      // Server-side JS (api-routes, db-queries, kv-store)
        elmGlueDir: webGlueDir,        // Web Elm + browser JS (ApiClient.elm, browser-storage.js)
        elmOutputPath: webGlueDir,     // Alias for elm generators
        serverHandlersDir: path.join(dest, 'server', 'src', 'Api', 'Handlers'),

        // Helper to get specific model paths (legacy - use getElmModelPath instead)
        getModelPath: (modelType) => {
            switch (modelType) {
                case 'db': return path.join(src, 'db');
                case 'api': return path.join(src, 'api');
                case 'storage': return path.join(src, 'storage');
                case 'kv': return path.join(src, 'kv');
                case 'sse': return path.join(src, 'sse');
                case 'events': return path.join(src, 'events');
                case 'config': return path.join(src, 'config');
                default: return src;
            }
        },

        // Helper to get Elm model paths (source of truth)
        getElmModelPath: (modelType) => {
            switch (modelType) {
                case 'db':
                case 'schema': return path.join(src, 'Schema');
                case 'api': return path.join(src, 'Api');
                case 'storage': return path.join(src, 'Storage');
                case 'kv': return path.join(src, 'Kv');
                case 'sse': return path.join(src, 'Sse');
                case 'events': return path.join(src, 'Events');
                case 'config': return path.join(src, 'Config');
                default: return src;
            }
        }
    };
}

/**
 * Check if a models directory exists
 */
export function modelsExist(modelType, paths) {
    const modelsPath = paths.getModelPath(modelType);
    return fs.existsSync(modelsPath);
}

/**
 * Get full path for a model directory
 */
export function getModelsFullPath(modelType, paths) {
    return paths.getModelPath(modelType);
}

/**
 * Ensure output directory exists
 */
export function ensureOutputDir(outputPath) {
    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
    }
    return outputPath;
}


/**
 * Get generation paths - accepts pre-computed paths or src/dest config
 *
 * @param {Object} config - Configuration object
 * @param {Object} [config.paths] - Pre-computed paths object (from orchestrator)
 * @param {string} [config.src] - Source models directory (for direct calls)
 * @param {string} [config.dest] - Destination output directory (for direct calls)
 */
export function getGenerationPaths(config = {}) {
    // If paths already provided (from orchestrator), use them directly
    if (config.paths) {
        return config.paths;
    }

    // Create paths from src/dest
    return createPaths(config);
}
