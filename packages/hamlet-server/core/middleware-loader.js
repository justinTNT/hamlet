/**
 * Middleware Loader
 * Detects required features and loads appropriate middleware
 */
export class MiddlewareLoader {
    constructor(server) {
        this.server = server;
        this.loadedFeatures = [];
        this.middlewareInstances = new Map();
    }
    
    detectFeatures() {
        // TODO: Parse domain models to detect feature requirements
        // For now, use config/environment
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
        }
        
        if (features.hasKeyValueStore) {
            await this.loadMiddleware('key-value-store');
        }
        
        if (features.hasServerSentEvents) {
            await this.loadMiddleware('server-sent-events');
        }

        // Load Elm service for backend business logic
        await this.loadMiddleware('elm-service');

        // Load Elm event service for background event handlers
        await this.loadMiddleware('event-service');

        // Load cron scheduler for scheduled events
        await this.loadMiddleware('cron-scheduler');

        // Load Admin API (must come before api-routes which has * fallback)
        await this.loadMiddleware('admin-api');

        // Load API routes (includes auto-generated routes from BuildAmp)
        await this.loadMiddleware('api-routes');

        // Wire up session-aware event processing
        await this.wireEventProcessing();
        
        console.log(`✅ Loaded ${this.loadedFeatures.length} middleware modules`);
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
    
    async wireEventProcessing() {
        try {
            const appName = this.server.config.application || 'horatio';
            const eventProcessor = await import(`../../../app/${appName}/server/event-processor.js`);

            // Connect event processor to SSE service for session-aware events
            const sseService = this.server.getService('sse');
            if (sseService && eventProcessor.setSSEService) {
                eventProcessor.setSSEService(sseService);
                console.log('🔗 Connected event processor to SSE service');
            }

            // Connect event processor to Elm event service for TEA handlers
            const eventService = this.server.getService('events');
            if (eventService && eventProcessor.setElmEventService) {
                eventProcessor.setElmEventService(eventService);
                console.log('🔗 Connected event processor to Elm event service');
            }

            // Start the event polling loop
            if (eventProcessor.startPolling) {
                await eventProcessor.startPolling();
                console.log('🔗 Started event processor polling');
            }
        } catch (error) {
            console.warn('⚠️ Failed to wire event processing:', error.message);
        }
    }
    
    async cleanup() {
        for (const [name, instance] of this.middlewareInstances) {
            if (instance?.cleanup) {
                await instance.cleanup();
            }
        }
        this.middlewareInstances.clear();
        this.loadedFeatures.length = 0;
    }
}