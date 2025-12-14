/**
 * BuildAmp WASM Integration Middleware
 * Handles WASM-based endpoint validation and manifest processing
 * Now includes auto-generated API routes
 */

import registerApiRoutes from '../generated/api-routes.js';

export default async function createBuildAmpWASM(server) {
    console.log('⚡ Setting up BuildAmp WASM integration');
    
    // Load WASM module - proto-rust should be available as peer dependency
    let Proto;
    try {
        Proto = await import('proto-rust');
        console.log('✅ WASM module loaded successfully');
        
        // Log available functions for debugging
        console.log('🔍 Available WASM functions:', Object.keys(Proto).filter(key => typeof Proto[key] === 'function'));
    } catch (error) {
        console.warn('⚠️  WASM module not available:', error.message);
        return createFallbackAPI(server);
    }
    
    // Load manifests (with fallback if functions don't exist)
    let contextManifest = [];
    let endpointManifest = [];
    
    try {
        if (typeof Proto.get_context_manifest === 'function') {
            contextManifest = JSON.parse(Proto.get_context_manifest());
        } else {
            console.warn('⚠️  get_context_manifest not available in WASM module');
        }
        
        if (typeof Proto.get_endpoint_manifest === 'function') {
            endpointManifest = JSON.parse(Proto.get_endpoint_manifest());
        } else {
            console.warn('⚠️  get_endpoint_manifest not available in WASM module');
        }
        
        console.log('📋 Loaded manifests:', {
            contexts: contextManifest.length,
            endpoints: endpointManifest.length
        });
    } catch (error) {
        console.warn('⚠️  Failed to load manifests:', error.message);
        console.log('📝 Continuing with auto-generated routes only');
        contextManifest = [];
        endpointManifest = [];
    }
    
    // ✅ NEW: Register auto-generated API routes
    // These replace the manual endpoint switching below
    try {
        registerApiRoutes(server);
    } catch (error) {
        console.warn('⚠️  Auto-generated routes not available:', error.message);
        console.log('📝 Falling back to manual endpoint switching');
    }
    
    // Context hydration function
    async function hydrateContext(endpoint, reqBody) {
        const def = endpointManifest.find(e => e.endpoint === endpoint);
        if (!def || !def.context_type) return null;

        const contextTypeName = def.context_type;
        const dependencies = contextManifest.filter(c => c.type_name === contextTypeName);

        const contextData = {};

        for (const dep of dependencies) {
            console.log(`Hydrating dependency: ${dep.field_name} from ${dep.source}`);
            // In a real app, fetch data based on dep.source
            // For templates, dependencies might be empty
        }

        return contextData;
    }
    
    // ⚠️  DEPRECATED: Manual endpoint switching - use auto-generated routes instead
    // @deprecated Individual routes like /api/GetFeed, /api/SubmitItem now replace this generic endpoint
    server.app.post('/api', async (req, res) => {
        console.warn('⚠️  DEPRECATED: Using generic /api endpoint. Use individual routes like /api/GetFeed instead.');
        
        const { endpoint, body } = req.body;
        const host = req.tenant?.host || 'localhost';
        
        console.log(`[${host}] ${endpoint} request received (via deprecated generic endpoint)`);

        try {
            // 1. Hydrate Context
            const contextData = await hydrateContext(endpoint, body);

            // 2. Mock server context for template projects
            const serverContext = {
                user_id: null,
                is_extension: false,
                tenant: host
            };

            // 3. Handle template endpoints
            const result = await handleEndpoint(server, endpoint, body, contextData, serverContext);
            
            res.json(result);

        } catch (error) {
            console.error(`Error handling ${endpoint}:`, error);
            res.status(500).json({ error: error.message });
        }
    });
    
    // Handle different endpoints based on manifest
    async function handleEndpoint(server, endpoint, body, contextData, serverContext) {
        // Template-specific handlers
        if (endpoint === 'Increment') {
            // Use KV store if available for persistence
            const kvService = server.getService('kv');
            if (kvService) {
                const current = kvService.get(serverContext.tenant, 'counter', 'value');
                const counter = (current.found ? current.value : 0) + (body.amount || 1);
                kvService.set(serverContext.tenant, 'counter', 'value', counter);
                return { newValue: counter };
            } else {
                // Fallback to in-memory (not persistent)
                server._templateCounter = (server._templateCounter || 0) + (body.amount || 1);
                return { newValue: server._templateCounter };
            }
        }
        
        // Add more template endpoints here
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }
    
    // Register WASM service with available functions
    const wasmService = {
        proto: Proto,
        contextManifest,
        endpointManifest,
        hydrateContext,
        
        // Helper methods for other middleware
        validateEndpoint: (endpoint) => {
            return endpointManifest.find(e => e.endpoint === endpoint);
        },
        
        getContextType: (endpoint) => {
            const def = endpointManifest.find(e => e.endpoint === endpoint);
            return def?.context_type || null;
        },
        
        // Dynamic WASM function calls (pure business logic only)
        handle_submitcomment_req: Proto.handle_submitcomment_req || (() => JSON.stringify({ success: true, comment_id: 1 })),
        handle_getfeed_req: Proto.handle_getfeed_req || (() => JSON.stringify({ items: [] })),
        handle_submititem_req: Proto.handle_submititem_req || (() => JSON.stringify({ success: true, item_id: 1 })),
        handle_gettags_req: Proto.handle_gettags_req || (() => JSON.stringify({ tags: ["rust", "hamlet", "demo"] })),
        
        cleanup: async () => {
            console.log('🧹 Cleaning up WASM integration');
        }
    };
    
    server.registerService('wasm', wasmService);
    return wasmService;
}

// Fallback API when WASM is not available
function createFallbackAPI(server) {
    console.log('🔄 Creating fallback API (no WASM)');
    
    server.app.post('/api', async (req, res) => {
        const { endpoint, body } = req.body;
        
        if (endpoint === 'Increment') {
            server._templateCounter = (server._templateCounter || 0) + (body.amount || 1);
            res.json({ newValue: server._templateCounter });
        } else {
            res.status(404).json({ error: `Unknown endpoint: ${endpoint}` });
        }
    });
    
    return {
        fallback: true,
        cleanup: async () => console.log('🧹 Cleaning up fallback API')
    };
}