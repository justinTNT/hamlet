/**
 * Shared path utilities for generators
 * Wraps core/paths.js for backward compatibility
 */

import fs from 'fs';
import path from 'path';
import { discoverProjectPaths } from '../../core/paths.js';

/**
 * Get project paths with defaults for generation
 * Uses core path discovery for consistency
 */
export function getGenerationPaths(config = {}) {
    // Use core path discovery
    const paths = discoverProjectPaths();

    // Use new .hamlet-gen output paths
    const outputPaths = {
        jsOutputPath: config.jsOutputPath || paths.jsGlueDir,
        elmOutputPath: config.elmOutputPath || paths.elmGlueDir,
    };

    return {
        ...paths,
        ...outputPaths,

        // Helper to get specific model paths
        getModelPath: (modelType) => {
            switch (modelType) {
                case 'db': return paths.dbModelsDir;
                case 'api': return paths.apiModelsDir;
                case 'storage': return paths.storageModelsDir;
                case 'kv': return paths.kvModelsDir;
                case 'sse': return paths.sseModelsDir;
                case 'events': return paths.eventsModelsDir;
                case 'config': return paths.configModelsDir;
                default: return paths.modelsDir;
            }
        }
    };
}

/**
 * Check if a models directory exists
 */
export function modelsExist(modelType, paths) {
    const modelsPath = path.join(process.cwd(), paths.getModelPath(modelType));
    return fs.existsSync(modelsPath);
}

/**
 * Get full path for a model directory
 */
export function getModelsFullPath(modelType, paths) {
    return path.join(process.cwd(), paths.getModelPath(modelType));
}

/**
 * Ensure output directory exists
 */
export function ensureOutputDir(outputPath) {
    const fullPath = path.join(process.cwd(), outputPath);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
    return fullPath;
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
 * @param {Object} paths - Generation paths object
 * @returns {Map<string, Object>} Map of model name to model metadata
 */
export function loadDbModelMetadata(paths) {
    const dbModels = new Map();
    const dbPath = getModelsFullPath('db', paths);

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
