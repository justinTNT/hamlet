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
            hasWASM: this.server.config.features?.wasm !== false, // Default enabled for BuildAmp
        };
    }
    
    async loadRequiredMiddleware() {
        const features = this.detectFeatures();
        
        // Always load tenant isolation and session cookies
        await this.loadMiddleware('tenant-isolation');
        await this.loadMiddleware('session-cookies');
        
        // Load optional features
        if (features.hasDatabase) {
            await this.loadMiddleware('database');
        }
        
        if (features.hasKeyValueStore) {
            await this.loadMiddleware('key-value-store');
        }
        
        if (features.hasServerSentEvents) {
            await this.loadMiddleware('server-sent-events');
        }
        
        if (features.hasWASM) {
            await this.loadMiddleware('buildamp-wasm');
        }
        
        // Load Elm service for backend business logic
        await this.loadMiddleware('elm-service');
        
        // Always load API routes last
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
                const instance = middleware.default(this.server);
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
            // Connect event processor to SSE service for session-aware events
            const sseService = this.server.getService('sse');
            
            if (sseService) {
                // Import the event processor module dynamically
                const eventProcessor = await import('../../../app/horatio/server/event-processor.js');
                if (eventProcessor.setSSEService) {
                    eventProcessor.setSSEService(sseService);
                    console.log('🔗 Connected event processor to SSE service for session-aware events');
                } else {
                    console.warn('⚠️ setSSEService function not found in event processor');
                }
            } else {
                console.warn('⚠️ SSE service not available for event processing');
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