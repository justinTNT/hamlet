/**
 * Shared path utilities for generators
 * All paths are explicit - no magic discovery
 */

import fs from 'fs';
import path from 'path';

/**
 * Create paths object from explicit src/dest configuration
 * @param {Object} config - Configuration with src and dest paths
 * @param {string} config.src - Source models directory (absolute path)
 * @param {string} config.dest - Destination output directory (absolute path)
 */
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
    const serverGlueDir = path.join(dest, 'server', '.hamlet-gen');
    const webGlueDir = path.join(dest, 'web', 'src', '.hamlet-gen');

    // Elm model source paths (shared/ directory)
    const sharedDir = path.join(dest, 'shared');

    return {
        // Source paths (legacy - no longer used, Elm models in shared/ are the source of truth)
        modelsDir: src,
        dbModelsDir: path.join(src, 'db'),
        apiModelsDir: path.join(src, 'api'),
        storageModelsDir: path.join(src, 'storage'),
        kvModelsDir: path.join(src, 'kv'),
        sseModelsDir: path.join(src, 'sse'),
        eventsModelsDir: path.join(src, 'events'),
        configModelsDir: path.join(src, 'config'),

        // Elm model source paths (shared/ directory)
        elmSchemaDir: path.join(sharedDir, 'Schema'),
        elmApiDir: path.join(sharedDir, 'Api'),
        elmKvDir: path.join(sharedDir, 'Kv'),
        elmStorageDir: path.join(sharedDir, 'Storage'),
        elmSseDir: path.join(sharedDir, 'Sse'),
        elmEventsDir: path.join(sharedDir, 'Events'),
        elmConfigDir: path.join(sharedDir, 'Config'),

        // Output paths
        outputDir: dest,
        serverGlueDir,                 // Server JS: api-routes.js, database-queries.js, kv-store.js
        serverElmDir: serverGlueDir,   // Server Elm: Generated/Database.elm, etc (add to elm.json sources)
        webGlueDir,                    // Web: ApiClient.elm, StoragePorts.elm, browser-storage.js
        sharedElmDir: path.join(dest, 'shared', '.hamlet-gen'),  // Shared Elm: Config.elm

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

        // Helper to get Elm model paths
        getElmModelPath: (modelType) => {
            switch (modelType) {
                case 'db':
                case 'schema': return path.join(sharedDir, 'Schema');
                case 'api': return path.join(sharedDir, 'Api');
                case 'storage': return path.join(sharedDir, 'Storage');
                case 'kv': return path.join(sharedDir, 'Kv');
                case 'sse': return path.join(sharedDir, 'Sse');
                case 'events': return path.join(sharedDir, 'Events');
                case 'config': return path.join(sharedDir, 'Config');
                default: return sharedDir;
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
 * Get generation paths - accepts pre-computed paths, src/dest config, or legacy config
 *
 * @param {Object} config - Configuration object
 * @param {Object} [config.paths] - Pre-computed paths object (from orchestrator)
 * @param {string} [config.src] - Source models directory (for direct calls)
 * @param {string} [config.dest] - Destination output directory (for direct calls)
 * @param {string} [config.inputBasePath] - Legacy: path to models (maps to src parent)
 * @param {string} [config.handlersPath] - Legacy: path to handlers output
 */
export function getGenerationPaths(config = {}) {
    // If paths already provided (from orchestrator), use them directly
    if (config.paths) {
        return config.paths;
    }

    // Check for legacy config options (used by tests)
    if (config.inputBasePath && !config.src) {
        // Legacy mode - build paths from inputBasePath
        const modelsDir = path.resolve(config.inputBasePath);
        const outputDir = config.handlersPath ?
            path.resolve(path.dirname(config.handlersPath), '..', '..', '..') :
            process.cwd();

        // Allow explicit jsOutputPath override for tests
        const jsOutputDir = config.jsOutputPath
            ? path.resolve(config.jsOutputPath)
            : path.join(outputDir, 'server', '.hamlet-gen');

        const elmOutputPath = config.backendElmPath || path.join(outputDir, 'web', 'src', '.hamlet-gen');
        return {
            modelsDir,
            dbModelsDir: path.join(modelsDir, 'db'),
            apiModelsDir: path.join(modelsDir, 'api'),
            storageModelsDir: path.join(modelsDir, 'storage'),
            kvModelsDir: path.join(modelsDir, 'kv'),
            sseModelsDir: path.join(modelsDir, 'sse'),
            eventsModelsDir: path.join(modelsDir, 'events'),
            configModelsDir: path.join(modelsDir, 'config'),
            outputDir,
            serverGlueDir: jsOutputDir,
            serverElmDir: jsOutputDir,          // Legacy: same as serverGlueDir
            webGlueDir: path.join(outputDir, 'web', 'src', '.hamlet-gen'),
            sharedElmDir: path.join(outputDir, 'shared', '.hamlet-gen'),
            jsGlueDir: jsOutputDir,
            elmGlueDir: path.join(outputDir, 'web', 'src', '.hamlet-gen'),
            elmOutputPath,
            serverHandlersDir: config.handlersPath || path.join(outputDir, 'server', 'src', 'Api', 'Handlers'),
            getModelPath: (modelType) => path.join(modelsDir, modelType)
        };
    }

    // Otherwise create paths from src/dest
    return createPaths(config);
}
