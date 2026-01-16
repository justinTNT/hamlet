/**
 * Generation path utilities
 * Centralizes path logic for all generation scripts
 */

import fs from 'fs';
import path from 'path';
import { discoverProjectPaths, ensureGlueDirs } from 'buildamp/core';

/**
 * Get standardized generation paths
 * This abstracts the path discovery and ensures consistency
 */
export function getGenerationPaths() {
    const projectPaths = discoverProjectPaths();
    
    // Ensure .hamlet-gen directories exist
    ensureGlueDirs(projectPaths);
    
    return {
        // Source paths (Rust models)
        modelsDir: projectPaths.modelsDir,
        dbModelsDir: projectPaths.dbModelsDir,
        apiModelsDir: projectPaths.apiModelsDir,
        storageModelsDir: projectPaths.storageModelsDir,
        kvModelsDir: projectPaths.kvModelsDir,
        sseModelsDir: projectPaths.sseModelsDir,
        eventsModelsDir: projectPaths.eventsModelsDir,
        
        // Output paths - NEW .hamlet-gen structure
        elmGlueDir: projectPaths.elmGlueDir,
        jsGlueDir: projectPaths.jsGlueDir,
        
        // Skeleton paths (user-owned)
        elmApiDir: projectPaths.elmApiDir,
        serverHandlersDir: projectPaths.serverHandlersDir,
        
        // Legacy paths (for migration warnings)
        legacyElmOutputDir: projectPaths.legacyElmOutputDir,
        legacyJsOutputDir: projectPaths.legacyJsOutputDir
    };
}

/**
 * Check if legacy generated files exist and warn
 */
export function checkLegacyFiles(paths) {
    const legacyLocations = [
        paths.legacyElmOutputDir,
        paths.legacyJsOutputDir
    ];
    
    const foundLegacy = legacyLocations.filter(loc => fs.existsSync(loc));
    
    if (foundLegacy.length > 0) {
        console.warn('⚠️  Legacy generated files detected:');
        foundLegacy.forEach(loc => {
            console.warn(`   - ${loc}`);
        });
        console.warn('   These can be safely deleted after verifying the new .hamlet-gen files work correctly.');
        console.warn('');
    }
}

/**
 * Get project name from package.json or directory structure
 */
export function getProjectName() {
    // Try to get from package.json first
    try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
        if (packageJson.buildamp?.project) {
            return packageJson.buildamp.project;
        }
    } catch (e) {
        // Ignore errors
    }
    
    // Try to detect from app directory
    const appDir = path.join(process.cwd(), 'app');
    if (fs.existsSync(appDir)) {
        const projects = fs.readdirSync(appDir)
            .filter(d => fs.statSync(path.join(appDir, d)).isDirectory())
            .filter(d => fs.existsSync(path.join(appDir, d, 'models')));
        
        if (projects.length === 1) {
            return projects[0];
        }
    }
    
    // Default fallback
    return null;
}