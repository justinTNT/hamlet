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
    const serverGlueDir = path.join(dest, 'server', '.generated');
    const webGlueDir = path.join(dest, 'web', 'src', '.generated');

    // Elm model source paths (models/ directory - user-written definitions)
    const modelsDir = path.join(dest, 'models');

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

        // Elm model source paths (models/ directory)
        elmSchemaDir: path.join(modelsDir, 'Schema'),
        elmApiDir: path.join(modelsDir, 'Api'),
        elmKvDir: path.join(modelsDir, 'Kv'),
        elmStorageDir: path.join(modelsDir, 'Storage'),
        elmSseDir: path.join(modelsDir, 'Sse'),
        elmEventsDir: path.join(modelsDir, 'Events'),
        elmConfigDir: path.join(modelsDir, 'Config'),

        // Output paths
        outputDir: dest,
        serverGlueDir,                 // Server JS: api-routes.js, database-queries.js, kv-store.js
        serverElmDir: serverGlueDir,   // Server Elm: BuildAmp/Database.elm, etc (add to elm.json sources)
        webGlueDir,                    // Web: ApiClient.elm, StoragePorts.elm, browser-storage.js
        sharedElmDir: path.join(modelsDir, '.generated'),  // Shared Elm: Config.elm

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
                case 'schema': return path.join(modelsDir, 'Schema');
                case 'api': return path.join(modelsDir, 'Api');
                case 'storage': return path.join(modelsDir, 'Storage');
                case 'kv': return path.join(modelsDir, 'Kv');
                case 'sse': return path.join(modelsDir, 'Sse');
                case 'events': return path.join(modelsDir, 'Events');
                case 'config': return path.join(modelsDir, 'Config');
                default: return modelsDir;
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
            : path.join(outputDir, 'server', '.generated');

        const elmOutputPath = config.backendElmPath || path.join(outputDir, 'web', 'src', '.generated');
        // For legacy mode, Elm model paths use the models directory structure
        const elmModelsDir = path.join(outputDir, 'models');
        return {
            modelsDir,
            dbModelsDir: path.join(modelsDir, 'db'),
            apiModelsDir: path.join(modelsDir, 'api'),
            storageModelsDir: path.join(modelsDir, 'storage'),
            kvModelsDir: path.join(modelsDir, 'kv'),
            sseModelsDir: path.join(modelsDir, 'sse'),
            eventsModelsDir: path.join(modelsDir, 'events'),
            configModelsDir: path.join(modelsDir, 'config'),
            // Elm model source paths
            elmSchemaDir: path.join(elmModelsDir, 'Schema'),
            elmApiDir: path.join(elmModelsDir, 'Api'),
            elmKvDir: path.join(elmModelsDir, 'Kv'),
            elmStorageDir: path.join(elmModelsDir, 'Storage'),
            elmSseDir: path.join(elmModelsDir, 'Sse'),
            elmEventsDir: path.join(elmModelsDir, 'Events'),
            elmConfigDir: path.join(elmModelsDir, 'Config'),
            outputDir,
            serverGlueDir: jsOutputDir,
            serverElmDir: jsOutputDir,          // Legacy: same as serverGlueDir
            webGlueDir: path.join(outputDir, 'web', 'src', '.generated'),
            sharedElmDir: path.join(outputDir, 'models', '.generated'),
            jsGlueDir: jsOutputDir,
            elmGlueDir: path.join(outputDir, 'web', 'src', '.generated'),
            elmOutputPath,
            serverHandlersDir: config.handlersPath || path.join(outputDir, 'server', 'src', 'Api', 'Handlers'),
            getModelPath: (modelType) => path.join(modelsDir, modelType)
        };
    }

    // Otherwise create paths from src/dest
    return createPaths(config);
}
