/**
 * BuildAmp Path Discovery
 * Detects project structure and provides paths for code generation
 *
 * NOTE: This module is for HAMLET framework use only.
 * BuildAmp generators should use explicit --src and --dest paths instead.
 * This magic discovery is kept here for backward compatibility with hamlet.
 *
 * Hamlet uses these functions to discover project structure automatically.
 * BuildAmp CLI requires explicit paths for predictable behavior.
 */

import fs from 'fs';
import path from 'path';

/**
 * Get the active app name from environment or package.json config
 */
export function getActiveApp(rootDir = process.cwd()) {
    // 1. Check environment variable first (for local dev)
    if (process.env.HAMLET_APP) {
        return process.env.HAMLET_APP;
    }

    // 2. Check package.json hamlet config
    try {
        const packageJsonPath = path.join(rootDir, 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        if (packageJson.hamlet?.defaultApp) {
            return packageJson.hamlet.defaultApp;
        }
    } catch (e) {
        // Ignore errors, fall through to auto-discovery
    }

    // 3. Auto-discover first app in app directory
    const appDir = path.join(rootDir, 'app');
    if (fs.existsSync(appDir)) {
        const apps = fs.readdirSync(appDir)
            .filter(name => {
                const stats = fs.statSync(path.join(appDir, name));
                return stats.isDirectory() && fs.existsSync(path.join(appDir, name, 'models'));
            });

        if (apps.length > 0) {
            return apps[0];
        }
    }

    // 4. Default fallback
    return 'horatio';
}

/**
 * Discover project paths based on directory structure
 * Supports both BuildAmp framework (app/project/models) and simple (src/models) patterns
 */
export function discoverProjectPaths(rootDir = process.cwd()) {
    const activeApp = getActiveApp(rootDir);
    const appModelsPath = path.join(rootDir, 'app', activeApp, 'models');

    // Check for app/${activeApp}/models pattern (BuildAmp framework)
    if (fs.existsSync(appModelsPath)) {
        return {
            // App name for reference
            appName: activeApp,

            // Source paths (legacy - Elm models in shared/ are now the source of truth)
            modelsDir: `app/${activeApp}/models`,
            dbModelsDir: `app/${activeApp}/models/db`,
            apiModelsDir: `app/${activeApp}/models/api`,
            storageModelsDir: `app/${activeApp}/models/storage`,
            kvModelsDir: `app/${activeApp}/models/kv`,
            sseModelsDir: `app/${activeApp}/models/sse`,
            eventsModelsDir: `app/${activeApp}/models/events`,
            configModelsDir: `app/${activeApp}/models/config`,

            // Output paths - UPDATED for new architecture
            // Glue (clobberable) - goes in .generated
            elmGlueDir: `app/${activeApp}/web/src/.generated`,
            jsGlueDir: `app/${activeApp}/server/.generated`,

            // Skeletons (owned) - stays in app src
            elmApiDir: `app/${activeApp}/web/src/Api`,
            serverHandlersDir: `app/${activeApp}/server/src/Api/Handlers`
        };
    }

    // Fallback to src/models pattern (simple projects)
    return {
        // App name for reference
        appName: 'default',

        // Source paths (legacy - Elm models in shared/ are now the source of truth)
        modelsDir: 'src/models',
        dbModelsDir: 'src/models/db',
        apiModelsDir: 'src/models/api',
        storageModelsDir: 'src/models/storage',
        kvModelsDir: 'src/models/kv',
        sseModelsDir: 'src/models/sse',
        eventsModelsDir: 'src/models/events',
        configModelsDir: 'src/models/config',

        // Output paths - UPDATED for new architecture
        // Glue (clobberable)
        elmGlueDir: 'src/.generated',
        jsGlueDir: '.generated',

        // Skeletons (owned)
        elmApiDir: 'src/Api',
        serverHandlersDir: 'src/Api/Handlers'
    };
}

/**
 * Path constants for BuildAmp-generated code
 */
export const GENERATED_DIR = '.generated';

/**
 * Ensure .generated directories exist
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
    const activeApp = getActiveApp(rootDir);
    return fs.existsSync(path.join(rootDir, 'app', activeApp, 'models'));
}
