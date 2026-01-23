/**
 * Elm Handler Pool - Shared infrastructure for TEA handler pools
 *
 * Extracted from elm-service.js to be reused by both API handlers
 * and Event handlers. Provides fresh instance management with cleanup.
 */

/**
 * Fresh handler instance with cleanup capability
 */
export class HandlerInstance {
    constructor(config, elmApp) {
        this.config = config;
        this.elmApp = elmApp;
        this.isActive = true;
        this.subscriptions = new Set();
        this.createdAt = Date.now();
    }

    addSubscription(unsubscribeFn) {
        this.subscriptions.add(unsubscribeFn);
    }

    async cleanup() {
        if (!this.isActive) return;

        console.log(`\u{1F9F9} Cleaning up handler instance: ${this.config.name}`);
        this.isActive = false;

        // Cleanup all port subscriptions
        for (const unsubscribe of this.subscriptions) {
            try {
                if (typeof unsubscribe === 'function') {
                    unsubscribe();
                }
            } catch (error) {
                console.warn(`\u26A0\uFE0F  Error during subscription cleanup: ${error.message}`);
            }
        }
        this.subscriptions.clear();

        // Mark Elm app as inactive
        if (this.elmApp && this.elmApp.ports) {
            this.elmApp._hamlet_inactive = true;
        }

        console.log(`\u2705 Handler instance cleaned up: ${this.config.name}`);
    }
}

/**
 * TEA Handler Pool - maintains fresh instances for optimal performance + isolation
 *
 * @param {Object} handlerModule - The compiled Elm module
 * @param {Object} config - Handler configuration { name, file, elmPath }
 * @param {Function} initHandler - Function to initialize handler (config, module) => elmApp
 * @param {number} poolSize - Number of instances to maintain in pool
 */
export class TEAHandlerPool {
    constructor(handlerModule, config, initHandler, poolSize = 3) {
        this.handlerModule = handlerModule;
        this.config = config;
        this.initHandler = initHandler;
        this.poolSize = poolSize;
        this.maxIdle = poolSize * 2; // Allow buffer beyond target
        this.available = [];      // idle/waiting
        this.busy = new Set();    // running
        this.spawning = new Set(); // being created

        // Initialize pool asynchronously
        this.ready = this.fillPool();
    }

    async fillPool() {
        console.log(`\u{1F3CA} Filling TEA handler pool: ${this.config.name} (target: ${this.poolSize})`);
        const promises = [];
        for (let i = 0; i < this.poolSize; i++) {
            promises.push(this.spawnFresh());
        }
        const handlers = await Promise.all(promises);
        this.available.push(...handlers);
        console.log(`\u2705 TEA handler pool ready: ${this.config.name} (${this.available.length} instances)`);
    }

    async getHandler() {
        let handler;

        if (this.available.length > 0) {
            handler = this.available.pop();
        } else {
            console.log(`\u26A1 Pool empty, spawning fresh handler: ${this.config.name}`);
            handler = await this.spawnFresh();
        }

        this.busy.add(handler);

        // Smart replacement: only spawn if we need more capacity
        if (this.available.length < this.maxIdle) {
            this.spawnReplacement();
        }

        console.log(`\u{1F4CA} Pool stats: ${this.config.name} (available: ${this.available.length}, busy: ${this.busy.size}, spawning: ${this.spawning.size})`);

        return handler;
    }

    releaseHandler(handler) {
        this.busy.delete(handler);
        handler.cleanup(); // Always fresh, never reuse
        console.log(`\u{1F504} Released handler: ${this.config.name} (available: ${this.available.length}, busy: ${this.busy.size})`);
    }

    async spawnFresh() {
        const elmApp = this.initHandler(this.config, this.handlerModule);
        return new HandlerInstance(this.config, elmApp);
    }

    spawnReplacement() {
        const spawnPromise = this.spawnFresh();
        this.spawning.add(spawnPromise);

        spawnPromise.then(fresh => {
            this.spawning.delete(spawnPromise);
            this.available.push(fresh);
            console.log(`\u{1F195} Spawned replacement handler: ${this.config.name} (available: ${this.available.length})`);
        }).catch(error => {
            this.spawning.delete(spawnPromise);
            console.error(`\u274C Failed to spawn replacement handler: ${this.config.name}:`, error);
        });
    }

    async cleanup() {
        console.log(`\u{1F9F9} Cleaning up TEA handler pool: ${this.config.name}`);

        // Cleanup all handlers
        const allHandlers = [...this.available, ...this.busy];
        await Promise.all(allHandlers.map(h => h.cleanup()));

        this.available = [];
        this.busy.clear();
        this.spawning.clear();

        console.log(`\u2705 TEA handler pool cleaned up: ${this.config.name}`);
    }
}

/**
 * Default API handler initializer
 * Used by elm-service.js for API handlers
 */
export function createApiHandlerInitializer() {
    return (config, handlerModule) => {
        const serverNow = Date.now();
        return handlerModule.Elm.Api.Handlers[config.file].init({
            node: null,
            flags: {
                globalConfig: {
                    serverNow: serverNow,
                    hostIsolation: true,
                    environment: process.env.NODE_ENV || 'development'
                },
                globalState: {
                    requestCount: 0,
                    lastActivity: serverNow
                }
            }
        });
    };
}

/**
 * Default Event handler initializer
 * Used by event-service.js for Event handlers
 */
export function createEventHandlerInitializer() {
    return (config, handlerModule) => {
        const serverNow = Date.now();
        return handlerModule.Elm.Events.Handlers[config.file].init({
            node: null,
            flags: {
                globalConfig: {
                    serverNow: serverNow,
                    hostIsolation: true,
                    environment: process.env.NODE_ENV || 'development'
                },
                globalState: {
                    eventCount: 0,
                    lastActivity: serverNow
                }
            }
        });
    };
}
