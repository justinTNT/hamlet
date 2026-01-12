/**
 * Shared path utilities for generation scripts
 * Consolidates repeated path discovery logic
 * 
 * Future: This will be replaced by a manifest-based approach
 * where hamlet-core generates a paths manifest that all generators read
 */

import fs from 'fs';
import path from 'path';
import { discoverProjectPaths } from 'buildamp-core';

/**
 * Get project paths with defaults for generation
 * Uses hamlet-core's path discovery for consistency
 */
export function getGenerationPaths(config = {}) {
    // Use hamlet-core for path discovery
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