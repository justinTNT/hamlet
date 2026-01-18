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
export function createPaths(config) {
    if (!config.src) {
        throw new Error('buildamp requires --src flag (path to models directory)');
    }
    if (!config.dest) {
        throw new Error('buildamp requires --dest flag (path to output directory)');
    }

    const src = path.resolve(config.src);
    const dest = path.resolve(config.dest);

    // Output subdirectories matching actual project structure
    const serverGlueDir = path.join(dest, 'server', '.hamlet-gen');
    const webGlueDir = path.join(dest, 'web', 'src', '.hamlet-gen');

    return {
        // Source paths
        modelsDir: src,
        dbModelsDir: path.join(src, 'db'),
        apiModelsDir: path.join(src, 'api'),
        storageModelsDir: path.join(src, 'storage'),
        kvModelsDir: path.join(src, 'kv'),
        sseModelsDir: path.join(src, 'sse'),
        eventsModelsDir: path.join(src, 'events'),
        configModelsDir: path.join(src, 'config'),

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

        // Helper to get specific model paths
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
 * Parse cross-model references from Rust file content
 * Detects `use crate::models::{interface}::{Type}` statements
 *
 * @param {string} content - Rust file content
 * @returns {Object} Object with arrays of referenced types per interface
 *   { db: ['MicroblogItem', 'ItemComment'], api: [], ... }
 */
export function parseCrossModelReferences(content) {
    const references = {
        db: [],
        api: [],
        storage: [],
        kv: [],
        sse: [],
        events: [],
        config: []
    };

    // Match: use crate::models::db::TypeName;
    // Match: use crate::models::db::{Type1, Type2};
    const singleUsePattern = /use\s+crate::models::(\w+)::(\w+);/g;
    const multiUsePattern = /use\s+crate::models::(\w+)::\{([^}]+)\};/g;

    let match;

    // Parse single imports: use crate::models::db::MicroblogItem;
    while ((match = singleUsePattern.exec(content)) !== null) {
        const [, interface_, typeName] = match;
        if (references[interface_]) {
            references[interface_].push(typeName);
        }
    }

    // Parse multi imports: use crate::models::db::{MicroblogItem, ItemComment};
    while ((match = multiUsePattern.exec(content)) !== null) {
        const [, interface_, typeList] = match;
        if (references[interface_]) {
            const types = typeList.split(',').map(t => t.trim()).filter(t => t);
            references[interface_].push(...types);
        }
    }

    return references;
}

/**
 * Load DB model metadata for cache primitive generation
 * Returns parsed DB models that can be used as cache types
 *
 * @param {Object} paths - Paths object from createPaths
 * @returns {Map<string, Object>} Map of model name to model metadata
 */
export function loadDbModelMetadata(paths) {
    const dbModels = new Map();
    const dbPath = paths.getModelPath('db');

    if (!fs.existsSync(dbPath)) {
        return dbModels;
    }

    const files = fs.readdirSync(dbPath).filter(f => f.endsWith('.rs') && f !== 'mod.rs');

    for (const file of files) {
        const filePath = path.join(dbPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Parse struct definitions
        const structPattern = /pub\s+struct\s+(\w+)\s*\{([^}]+)\}/gs;
        let match;

        while ((match = structPattern.exec(content)) !== null) {
            const [, structName, fieldsContent] = match;

            // Parse fields to find the id field type
            const idFieldMatch = fieldsContent.match(/pub\s+id:\s*DatabaseId<([^>]+)>/);
            const hasDbId = !!idFieldMatch;

            // Parse all fields
            const fields = [];
            const fieldPattern = /pub\s+(\w+):\s*([^,\n]+)/g;
            let fieldMatch;

            while ((fieldMatch = fieldPattern.exec(fieldsContent)) !== null) {
                const [, fieldName, fieldType] = fieldMatch;
                fields.push({
                    name: fieldName,
                    rustType: fieldType.trim()
                });
            }

            dbModels.set(structName, {
                name: structName,
                fields,
                hasDbId,
                sourceFile: file
            });
        }
    }

    return dbModels;
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
