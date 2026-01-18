/**
 * Elm Service Middleware - Auto-generated
 *
 * Executes compiled Elm handler functions for business logic.
 * This is where the "Rust once, JSON never" magic happens -
 * Rust defines the API, Elm implements the business logic.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function createElmService(server, handlersPath) {
    console.log('🌳 Setting up Elm service with individual handlers');

    const handlers = new Map();
    const require = createRequire(import.meta.url);

    // Load compiled Elm handlers
    try {
        // Auto-generated handler configurations
        const handlerConfigs = [

        ];

        for (const handlerConfig of handlerConfigs) {
            try {
                const handlerPath = path.join(handlersPath, handlerConfig.file + '.cjs');

                // Load the compiled handler module
                delete require.cache[require.resolve(handlerPath)];
                const handlerModule = require(handlerPath);

                // Store the handler function
                handlers.set(handlerConfig.name, {
                    ...handlerConfig,
                    handler: handlerModule.Elm['Api.Handlers.' + handlerConfig.file][handlerConfig.function]
                });

                console.log('✅ Loaded handler: ' + handlerConfig.name);
            } catch (error) {
                console.log('⚠️  Handler ' + handlerConfig.name + ' not found: ' + error.message);
                // Handler will use fallback
            }
        }

        console.log('🎯 Ready with ' + handlers.size + ' Elm handlers');

    } catch (error) {
        console.error('❌ Failed to load Elm handlers:', error.message);
        return createFallbackService(server);
    }

    const elmService = {
        /**
         * Call an individual Elm handler
         */
        async callHandler(handlerName, requestData, context = {}) {
            const handlerConfig = handlers.get(handlerName);

            if (!handlerConfig || !handlerConfig.handler) {
                throw new Error('Handler ' + handlerName + ' not available');
            }

            try {
                // Call the Elm handler function directly
                const result = handlerConfig.handler(requestData);

                console.log('🌳 ' + handlerName + ' handler completed successfully');
                return result;

            } catch (error) {
                console.error('❌ ' + handlerName + ' handler failed:', error);
                throw error;
            }
        },

        cleanup: async () => {
            console.log('🧹 Cleaning up Elm service');
            handlers.clear();
        }
    };

    server.registerService('elm', elmService);
    return elmService;
}

/**
 * Fallback service when Elm handlers are not available
 */
function createFallbackService(server) {
    console.log('🔄 Creating fallback Elm service');

    const fallbackService = {
        async callHandler(handlerName, requestData) {
            throw new Error('Elm service not available. Cannot call handler: ' + handlerName);
        },

        cleanup: async () => console.log('🧹 Cleaning up fallback Elm service')
    };

    server.registerService('elm', fallbackService);
    return fallbackService;
}
