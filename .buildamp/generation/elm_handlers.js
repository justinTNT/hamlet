/**
 * Elm Handler Scaffolding Generation
 * 
 * Generates Elm handler files (once) for each API endpoint defined in Rust.
 * These are scaffolding files that developers can then customize with business logic.
 * 
 * Key principles:
 * - Generate files ONLY if they don't exist (preserve developer customizations)
 * - Parse Rust API definitions to find endpoints
 * - Create properly typed Elm handlers with database placeholders
 */

import fs from 'fs';
import path from 'path';

/**
 * Generate Elm handler scaffolding files
 */
export async function generateElmHandlers() {
    console.log('🔧 Analyzing Rust API definitions...');
    
    const apiDir = 'src/models/api';
    const outputDir = 'app/horatio/server/src/Api/Handlers';
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Find all API files
    const apiFiles = fs.readdirSync(apiDir)
        .filter(file => file.endsWith('_api.rs'))
        .map(file => path.join(apiDir, file));
        
    console.log(`📁 Found ${apiFiles.length} API definition files`);
    
    let generatedCount = 0;
    let skippedCount = 0;
    const generatedFiles = [];
    const allEndpoints = [];
    
    // Process each API file
    for (const filePath of apiFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const endpoints = parseApiEndpoints(content);
        allEndpoints.push(...endpoints);
        
        console.log(`📝 Processing ${path.basename(filePath)}: ${endpoints.length} endpoints`);
        
        // Generate handler for each endpoint
        for (const endpoint of endpoints) {
            const handlerFile = path.join(outputDir, `${endpoint.name}Handler.elm`);
            
            if (fs.existsSync(handlerFile)) {
                console.log(`   ⏭️  Skipping ${endpoint.name}Handler.elm (already exists)`);
                skippedCount++;
                continue;
            }
            
            console.log(`   ✅ Creating ${endpoint.name}Handler.elm`);
            
            const handlerContent = generateHandlerContent(endpoint);
            fs.writeFileSync(handlerFile, handlerContent);
            
            generatedFiles.push(handlerFile);
            generatedCount++;
        }
    }
    
    console.log('');
    // Generate compilation script for all handlers
    generateCompileScript(allEndpoints);
    
    // Generate updated elm-service.js integration
    generateServiceIntegration(allEndpoints);
    
    console.log('📊 Elm Handler Generation Summary:');
    console.log(`   Generated: ${generatedCount} new handlers`);
    console.log(`   Skipped: ${skippedCount} existing handlers`);
    console.log(`   Total endpoints: ${generatedCount + skippedCount}`);
    console.log(`   ✅ Generated compilation script`);
    console.log(`   ✅ Generated service integration`);
    
    return {
        generated: generatedCount,
        skipped: skippedCount,
        outputFiles: generatedFiles
    };
}

/**
 * Parse API endpoints from Rust file content
 */
function parseApiEndpoints(content) {
    const endpoints = [];
    
    // Match #[buildamp_api(path = "EndpointName")] patterns
    const apiRegex = /#\[buildamp_api\(path\s*=\s*"([^"]+)"[^\]]*\]\s*pub struct\s+(\w+)/g;
    
    let match;
    while ((match = apiRegex.exec(content)) !== null) {
        const [, path, structName] = match;
        
        endpoints.push({
            name: path,
            requestType: structName,
            responseType: structName.replace('Req', 'Res') // Convention: GetFeedReq -> GetFeedRes
        });
    }
    
    return endpoints;
}

/**
 * Generate Elm handler content
 */
function generateHandlerContent(endpoint) {
    const { name, requestType, responseType } = endpoint;
    
    return `module Api.Handlers.${name}Handler exposing (handle${name})

{-| ${name} Handler

This handler was auto-generated as scaffolding. You can customize the business logic
while keeping the type signature intact.

@docs handle${name}

-}

import Api.Backend exposing (${requestType}, ${responseType}, ${name}ReqBundle, DatabaseService)
import Task exposing (Task)
import Json.Encode as Encode


{-| Handle ${name} request

TODO: Implement your business logic here
TODO: Query the database using generated functions
TODO: Transform and validate data as needed

-}
handle${name} : ${name}ReqBundle -> DatabaseService -> Task Error ${responseType}
handle${name} bundle db =
    -- Example database operations (replace with actual business logic):
    -- let
    --     host = bundle.input.host
    --     userId = bundle.context.userId
    -- in
    -- db.find "SELECT * FROM some_table WHERE host = $1" [host]
    --     |> Task.andThen (\\rows ->
    --         -- Process and combine data as needed
    --         Task.succeed { items = [] }
    --     )
    
    -- Placeholder - replace with real implementation
    Task.succeed (${generatePlaceholderResponse(endpoint)})


{-| Helper to generate database effects

Example usage:
    queryEffect = queryDatabase "microblog_items" 
        [ ("host", bundle.input.host) 
        ]

-}
queryDatabase : String -> List ( String, String ) -> BackendEffect
queryDatabase table conditions =
    let
        queryJson =
            Encode.object
                [ ( "table", Encode.string table )
                , ( "conditions", Encode.object (List.map (\\(k, v) -> (k, Encode.string v)) conditions) )
                ]
                |> Encode.encode 0
    in
    Log ("TODO: Implement database query for " ++ table)
    -- TODO: Create proper Query effect type and implementation


{-| Helper to generate insert effects

Example usage:
    insertEffect = insertIntoDatabase "microblog_items" 
        [ ("id", newId)
        , ("title", bundle.input.title)  
        , ("host", bundle.input.host)
        ]

-}
insertIntoDatabase : String -> List ( String, String ) -> BackendEffect
insertIntoDatabase table fields =
    let
        insertData =
            Encode.object (List.map (\\(k, v) -> (k, Encode.string v)) fields)
                |> Encode.encode 0
    in
    Insert { table = table, data = insertData }
`;
}

/**
 * Generate placeholder response - completely generic
 */
function generatePlaceholderResponse(endpoint) {
    const { name, responseType } = endpoint;
    
    return `Debug.todo "Implement ${name} handler"`;
}

/**
 * Generate compilation script for Elm handlers
 */
function generateCompileScript(endpoints) {
    const compileCommands = endpoints.map(endpoint => 
        `echo "Compiling ${endpoint.name}Handler..."
elm make src/Api/Handlers/${endpoint.name}Handler.elm --output=${endpoint.name}Handler.cjs --optimize`
    ).join('\n');
    
    const compileScript = `#!/bin/bash
# Auto-generated Elm handler compilation script
# Run this from app/horatio/server/ directory

set -e
echo "🔨 Compiling Elm handlers..."

${compileCommands}

echo "✅ All handlers compiled successfully!"
`;
    
    const scriptPath = 'app/horatio/server/compile-handlers.sh';
    fs.writeFileSync(scriptPath, compileScript);
    fs.chmodSync(scriptPath, '755'); // Make executable
    
    console.log(`   ✅ Generated compilation script: ${scriptPath}`);
}

/**
 * Generate updated elm-service.js integration
 */
function generateServiceIntegration(endpoints) {
    const handlerConfigs = endpoints.map(endpoint => 
        `            { name: '${endpoint.name}', file: '${endpoint.name}Handler', function: 'handle${endpoint.name}' }`
    ).join(',\n');
    
    const serviceCode = `/**
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

export default function createElmService(server) {
    console.log('🌳 Setting up Elm service with individual handlers');
    
    const handlers = new Map();
    const require = createRequire(import.meta.url);
    
    // Load compiled Elm handlers
    try {
        const handlersPath = path.join(__dirname, '../../../app/horatio/server');
        
        // Auto-generated handler configurations
        const handlerConfigs = [
${handlerConfigs}
        ];
        
        for (const config of handlerConfigs) {
            try {
                const handlerPath = path.join(handlersPath, \`\${config.file}.cjs\`);
                
                // Load the compiled handler module
                delete require.cache[require.resolve(handlerPath)];
                const handlerModule = require(handlerPath);
                
                // Store the handler function
                handlers.set(config.name, {
                    ...config,
                    handler: handlerModule.Elm[\`Api.Handlers.\${config.file}\`][\`\${config.function}\`]
                });
                
                console.log(\`✅ Loaded handler: \${config.name}\`);
            } catch (error) {
                console.log(\`⚠️  Handler \${config.name} not found: \${error.message}\`);
                // Handler will use fallback
            }
        }
        
        console.log(\`🎯 Ready with \${handlers.size} Elm handlers\`);
        
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
                throw new Error(\`Handler \${handlerName} not available\`);
            }
            
            try {
                // Call the Elm handler function directly
                const result = handlerConfig.handler(requestData);
                
                console.log(\`🌳 \${handlerName} handler completed successfully\`);
                return result;
                
            } catch (error) {
                console.error(\`❌ \${handlerName} handler failed:\`, error);
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
            throw new Error(\`Elm service not available. Cannot call handler: \${handlerName}\`);
        },
        
        cleanup: async () => console.log('🧹 Cleaning up fallback Elm service')
    };
    
    server.registerService('elm', fallbackService);
    return fallbackService;
}
`;
    
    const servicePath = 'packages/hamlet-server/middleware/elm-service.js';
    fs.writeFileSync(servicePath, serviceCode);
    
    console.log(`   ✅ Generated service integration: ${servicePath}`);
}