/**
 * Middleware Loader
 * Detects required features and loads appropriate middleware
 */
import createProjectLoader from './project-loader.js';

export class MiddlewareLoader {
    constructor(server) {
        this.server = server;
        this.loadedFeatures = [];
        this.middlewareInstances = new Map();
    }

    detectFeatures() {
        return {
            hasKeyValueStore: this.server.config.features?.kv !== false,
            hasServerSentEvents: this.server.config.features?.sse !== false,
            hasDatabase: this.server.config.features?.database === true,
        };
    }

    async loadRequiredMiddleware() {
        const features = this.detectFeatures();

        // Always load tenant isolation and session cookies
        await this.loadMiddleware('tenant-isolation');
        await this.loadMiddleware('session-cookies');

        // Load host-specific asset directory (depends on tenant isolation)
        await this.loadMiddleware('host-dir');

        // Load optional features
        if (features.hasDatabase) {
            await this.loadMiddleware('database');
            // Auth resolver depends on database for host key lookups
            await this.loadMiddleware('auth-resolver');
            // Host resolver: maps hostname -> project (depends on database + tenant isolation)
            await this.loadMiddleware('host-resolver');
        }

        if (features.hasKeyValueStore) {
            await this.loadMiddleware('key-value-store');
        }

        if (features.hasServerSentEvents) {
            await this.loadMiddleware('server-sent-events');
        }

        // Load Admin API (must come before api-routes which has * fallback)
        await this.loadMiddleware('admin-api');

        // Load all projects eagerly via ProjectLoader
        // Replaces individual elm-service, event-service, cron-scheduler, api-routes loading
        await this.loadProjectsAndRoutes();

        // Load API routes (static/SPA serving + status endpoint + catch-all 404)
        await this.loadMiddleware('api-routes');

        console.log(`✅ Loaded ${this.loadedFeatures.length} middleware modules`);
    }

    /**
     * Load all projects and mount project router dispatch
     */
    async loadProjectsAndRoutes() {
        try {
            const instance = await createProjectLoader(this.server);
            this.middlewareInstances.set('project-loader', instance);
            this.loadedFeatures.push('project-loader');
            console.log('📦 Loaded: project-loader');

            // Mount project router dispatch at root — generated api-routes.js registers
            // full paths like '/api/GetFeed', so the router must not strip a prefix.
            this.server.app.use((req, res, next) => {
                if (!req.path.startsWith('/api/')) return next();

                const projectLoader = this.server.getService('project-loader');
                if (!projectLoader || !req.project) return next();

                const router = projectLoader.getRouter(req.project);
                if (router) {
                    router(req, res, next);
                } else {
                    next();
                }
            });
            console.log('🔀 Mounted project router dispatch');
        } catch (error) {
            console.warn('⚠️ Failed to load project-loader:', error.message);
        }
    }

    async loadMiddleware(middlewareName) {
        try {
            const middlewarePath = `../middleware/${middlewareName}.js`;
            const middleware = await import(middlewarePath);

            if (middleware.default) {
                const instance = await middleware.default(this.server);
                this.middlewareInstances.set(middlewareName, instance);
                this.loadedFeatures.push(middlewareName);
                console.log(`📦 Loaded: ${middlewareName}`);
            }
        } catch (error) {
            console.warn(`⚠️ Failed to load ${middlewareName}:`, error.message);
        }
    }

    getLoadedFeatures() {
        return [...this.loadedFeatures];
    }

    async cleanup() {
        // Clean up project-loader first (it manages per-project services)
        const projectLoader = this.middlewareInstances.get('project-loader');
        if (projectLoader?.cleanup) {
            await projectLoader.cleanup();
        }

        for (const [name, instance] of this.middlewareInstances) {
            if (name === 'project-loader') continue; // Already cleaned up
            if (instance?.cleanup) {
                await instance.cleanup();
            }
        }
        this.middlewareInstances.clear();
        this.loadedFeatures.length = 0;
    }
}
