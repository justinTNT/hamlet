/**
 * ProjectLoader
 *
 * Eagerly loads all configured projects at startup. For each project:
 *   1. Creates an Express Router + ProjectServerProxy
 *   2. Loads project's database-queries.js → extends a project-scoped db wrapper
 *   3. Loads project's elm-service (TEA handler pools scoped to proxy)
 *   4. Loads project's event-service + cron-scheduler (scoped to proxy)
 *   5. Loads project's api-routes.js → registerApiRoutes(proxy) attaches routes to the Router
 *   6. Wires project's event-processor.js
 *
 * Stores Map<projectName, { proxy, router }>.
 */

import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { ProjectServerProxy } from './project-context.js';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function createProjectLoader(server) {
    console.log('📦 Setting up Project Loader');

    const projects = new Map(); // projectName -> { proxy, router }
    const applications = server.config.applications || [server.config.application || 'horatio'];

    for (const projectName of applications) {
        try {
            await loadProject(server, projectName, projects);
        } catch (error) {
            console.error(`❌ Failed to load project ${projectName}:`, error.message);
        }
    }

    console.log(`📦 Loaded ${projects.size} projects: ${[...projects.keys()].join(', ')}`);

    const projectLoaderService = {
        getRouter(projectName) {
            return projects.get(projectName)?.router || null;
        },

        getProxy(projectName) {
            return projects.get(projectName)?.proxy || null;
        },

        getProjectNames() {
            return [...projects.keys()];
        },

        hasProject(projectName) {
            return projects.has(projectName);
        },

        async cleanup() {
            console.log('🧹 Cleaning up Project Loader');
            for (const [name, { proxy }] of projects) {
                for (const [serviceName, service] of proxy.getProjectServices()) {
                    if (service?.cleanup) {
                        try {
                            await service.cleanup();
                        } catch (error) {
                            console.warn(`⚠️ Cleanup failed for ${name}/${serviceName}:`, error.message);
                        }
                    }
                }
            }
            projects.clear();
        }
    };

    server.registerService('project-loader', projectLoaderService);
    return projectLoaderService;
}

/**
 * Load a single project: create proxy, load services, register routes
 */
async function loadProject(server, projectName, projects) {
    console.log(`📦 Loading project: ${projectName}`);

    const router = Router();
    const proxy = new ProjectServerProxy(server, projectName, router);
    const appDir = path.join(__dirname, `../../../app/${projectName}`);

    if (!fs.existsSync(appDir)) {
        console.warn(`⚠️ Project directory not found: ${appDir}`);
        return;
    }

    // 1. Load project-scoped database queries
    await loadProjectDatabase(proxy, projectName, server);

    // 2. Load project-scoped elm-service
    await loadProjectElmService(proxy, projectName);

    // 3. Load project-scoped event-service
    await loadProjectEventService(proxy, projectName);

    // 4. Load project-scoped cron-scheduler
    await loadProjectCronScheduler(proxy, projectName);

    // 5. Load project's api-routes.js → attaches routes to the Router
    await loadProjectApiRoutes(proxy, projectName);

    // 6. Wire event processing
    await wireProjectEventProcessing(proxy, projectName, server);

    projects.set(projectName, { proxy, router });
    console.log(`✅ Project ${projectName} loaded`);
}

/**
 * Create project-scoped db wrapper: inherits pool/query/transaction from shared,
 * adds project-specific generated methods
 */
async function loadProjectDatabase(proxy, projectName, server) {
    const sharedDb = server.getService('database');
    if (!sharedDb) return;

    // Create project-scoped db that inherits from shared
    const projectDb = Object.create(sharedDb);

    // Load project's generated database-queries.js
    const queriesPath = path.join(__dirname, `../../../app/${projectName}/server/.generated/database-queries.js`);
    if (fs.existsSync(queriesPath)) {
        try {
            const { default: createDbQueries } = await import(queriesPath);
            const queries = createDbQueries(sharedDb.pool);
            Object.assign(projectDb, queries);
            console.log(`   📦 ${projectName}: database queries loaded`);
        } catch (error) {
            console.warn(`   ⚠️ ${projectName}: failed to load database queries:`, error.message);
        }
    }

    proxy.registerService('database', projectDb);
}

/**
 * Load project-scoped elm-service using the middleware module
 */
async function loadProjectElmService(proxy, projectName) {
    try {
        const elmServiceModule = await import('../middleware/elm-service.js');
        await elmServiceModule.default(proxy);
        console.log(`   📦 ${projectName}: elm-service loaded`);
    } catch (error) {
        console.warn(`   ⚠️ ${projectName}: elm-service failed:`, error.message);
    }
}

/**
 * Load project-scoped event-service using the middleware module
 */
async function loadProjectEventService(proxy, projectName) {
    try {
        const eventServiceModule = await import('../middleware/event-service.js');
        await eventServiceModule.default(proxy);
        console.log(`   📦 ${projectName}: event-service loaded`);
    } catch (error) {
        console.warn(`   ⚠️ ${projectName}: event-service failed:`, error.message);
    }
}

/**
 * Load project-scoped cron-scheduler using the middleware module
 */
async function loadProjectCronScheduler(proxy, projectName) {
    try {
        const cronModule = await import('../middleware/cron-scheduler.js');
        await cronModule.default(proxy);
        console.log(`   📦 ${projectName}: cron-scheduler loaded`);
    } catch (error) {
        console.warn(`   ⚠️ ${projectName}: cron-scheduler failed:`, error.message);
    }
}

/**
 * Load project's generated api-routes.js
 */
async function loadProjectApiRoutes(proxy, projectName) {
    const apiRoutesPath = path.join(__dirname, `../../../app/${projectName}/server/.generated/api-routes.js`);
    if (fs.existsSync(apiRoutesPath)) {
        try {
            const { default: registerApiRoutes } = await import(apiRoutesPath);
            registerApiRoutes(proxy);
            console.log(`   📦 ${projectName}: API routes registered`);
        } catch (error) {
            console.warn(`   ⚠️ ${projectName}: API routes failed:`, error.message);
        }
    }
}

/**
 * Wire event processing for a project
 */
async function wireProjectEventProcessing(proxy, projectName, server) {
    try {
        const eventProcessorPath = path.join(__dirname, `../../../app/${projectName}/server/event-processor.js`);
        if (!fs.existsSync(eventProcessorPath)) return;

        const eventProcessor = await import(eventProcessorPath);

        // Connect to SSE service (shared)
        const sseService = server.getService('sse');
        if (sseService && eventProcessor.setSSEService) {
            eventProcessor.setSSEService(sseService);
        }

        // Connect to project-scoped event service
        const eventService = proxy.getService('events');
        if (eventService && eventProcessor.setElmEventService) {
            eventProcessor.setElmEventService(eventService);
        }

        // Start event polling (only for the first project — event processor
        // polls buildamp_events table which is shared across projects)
        if (eventProcessor.startPolling) {
            await eventProcessor.startPolling();
        }

        console.log(`   📦 ${projectName}: event processing wired`);
    } catch (error) {
        console.warn(`   ⚠️ ${projectName}: event processing failed:`, error.message);
    }
}
