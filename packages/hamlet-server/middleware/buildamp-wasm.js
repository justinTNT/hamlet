/**
 * BuildAmp WASM Integration Middleware
 * Handles WASM-based endpoint validation and manifest processing
 */

export default async function createBuildAmpWASM(server) {
    console.log('⚡ Setting up BuildAmp WASM integration');
    
    // Load WASM module - proto-rust should be available as peer dependency
    let Proto;
    try {
        Proto = await import('proto-rust');
        console.log('✅ WASM module loaded successfully');
    } catch (error) {
        console.warn('⚠️  WASM module not available:', error.message);
        return createFallbackAPI(server);
    }
    
    // Load manifests
    const contextManifest = JSON.parse(Proto.get_context_manifest());
    const endpointManifest = JSON.parse(Proto.get_endpoint_manifest());
    
    console.log('📋 Loaded manifests:', {
        contexts: contextManifest.length,
        endpoints: endpointManifest.length
    });
    
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
    
    // Main BuildAmp API endpoint
    server.app.post('/api', async (req, res) => {
        const { endpoint, body } = req.body;
        const host = req.tenant?.host || 'localhost';
        
        console.log(`[${host}] ${endpoint} request received`);

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
    
    // Register WASM service
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