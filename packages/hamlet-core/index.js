import fs from 'fs';
import path from 'path';

/**
 * Discover project paths based on directory structure
 * Supports both BuildAmp framework (app/project/models) and simple (src/models) patterns
 */
export function discoverProjectPaths(rootDir = process.cwd()) {
    const appHoratioModels = path.join(rootDir, 'app/horatio/models');
    
    // Check for app/${project}/models pattern (BuildAmp framework)
    if (fs.existsSync(appHoratioModels)) {
        return {
            // Source paths (Rust models)
            modelsDir: 'app/horatio/models',
            dbModelsDir: 'app/horatio/models/db',
            apiModelsDir: 'app/horatio/models/api',
            storageModelsDir: 'app/horatio/models/storage',
            kvModelsDir: 'app/horatio/models/kv',
            sseModelsDir: 'app/horatio/models/sse',
            eventsModelsDir: 'app/horatio/models/events',
            
            // Output paths - UPDATED for new architecture
            // Glue (clobberable) - goes in .hamlet-gen
            elmGlueDir: 'app/horatio/web/src/.hamlet-gen',
            jsGlueDir: 'packages/hamlet-server/.hamlet-gen',
            
            // Skeletons (owned) - stays in app src
            elmApiDir: 'app/horatio/web/src/Api',
            serverHandlersDir: 'app/horatio/server/src/Api/Handlers',
            
            // Legacy paths (for migration)
            legacyElmOutputDir: 'app/generated',
            legacyJsOutputDir: 'packages/hamlet-server/generated'
        };
    }
    
    // Fallback to src/models pattern (simple projects)
    return {
        // Source paths (Rust models)
        modelsDir: 'src/models',
        dbModelsDir: 'src/models/db',
        apiModelsDir: 'src/models/api',
        storageModelsDir: 'src/models/storage',
        kvModelsDir: 'src/models/kv',
        sseModelsDir: 'src/models/sse',
        eventsModelsDir: 'src/models/events',
        
        // Output paths - UPDATED for new architecture
        // Glue (clobberable)
        elmGlueDir: 'src/.hamlet-gen',
        jsGlueDir: 'packages/hamlet-server/.hamlet-gen',
        
        // Skeletons (owned)
        elmApiDir: 'src/Api',
        serverHandlersDir: 'src/Api/Handlers',
        
        // Legacy paths (for migration)
        legacyElmOutputDir: 'app/generated',
        legacyJsOutputDir: 'packages/hamlet-server/generated'
    };
}

/**
 * Path constants for hamlet-gen structure
 */
export const HAMLET_GEN_DIR = '.hamlet-gen';
export const CONTRACTS_FILE = 'contracts.json';

/**
 * Get the full path to contracts.json for a given project
 */
export function getContractsPath(projectPaths) {
    return path.join(projectPaths.elmGlueDir, CONTRACTS_FILE);
}

/**
 * Ensure .hamlet-gen directories exist
 */
export function ensureGlueDirs(projectPaths) {
    const dirs = [projectPaths.elmGlueDir, projectPaths.jsGlueDir];
    
    for (const dir of dirs) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
}

/**
 * Check if this is a BuildAmp framework project
 */
export function isBuildAmpProject(rootDir = process.cwd()) {
    return fs.existsSync(path.join(rootDir, 'app/horatio/models'));
}