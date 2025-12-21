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
export async function generateElmHandlers(config = {}) {
    console.log('🔧 Analyzing Rust API definitions...');
    
    // Auto-detect project name for fallback
    function getProjectName() {
        const appDir = path.join(process.cwd(), 'app');
        if (!fs.existsSync(appDir)) return null;
        const projects = fs.readdirSync(appDir).filter(name => {
            const fullPath = path.join(appDir, name);
            const modelsPath = path.join(fullPath, 'models');
            return fs.statSync(fullPath).isDirectory() && fs.existsSync(modelsPath);
        });
        return projects[0];
    }
    
    const PROJECT_NAME = config.projectName || getProjectName();
    const apiDir = config.inputBasePath ? `${config.inputBasePath}/api` :
                   (PROJECT_NAME ? `app/${PROJECT_NAME}/models/api` : path.join(process.cwd(), 'src/models/api'));
    const outputDir = config.handlersPath || 
                     (PROJECT_NAME ? `app/${PROJECT_NAME}/server/src/Api/Handlers` : path.join(process.cwd(), 'src/Api/Handlers'));
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Find all API files
    let apiFiles = [];
    if (fs.existsSync(apiDir)) {
        apiFiles = fs.readdirSync(apiDir)
            .filter(file => file.endsWith('.rs') && !file.startsWith('.'))
            .map(file => path.join(apiDir, file));
    }
        
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
            const handlerFile = path.join(outputDir, `${endpoint.name}HandlerTEA.elm`);
            
            if (fs.existsSync(handlerFile)) {
                // Check if handler needs regeneration due to shared module changes
                if (shouldRegenerateHandler(handlerFile, config, PROJECT_NAME)) {
                    console.log(`   🔄 Regenerating ${endpoint.name}HandlerTEA.elm (dependencies changed)`);
                } else {
                    console.log(`   ⏭️  Skipping ${endpoint.name}HandlerTEA.elm (up to date)`);
                    skippedCount++;
                    continue;
                }
            }
            
            // Check if required shared modules exist before generating new handlers
            const databaseModulePath = config.backendElmPath ? 
                `${config.backendElmPath}/Generated/Database.elm` :
                (PROJECT_NAME ? `app/${PROJECT_NAME}/server/generated/Generated/Database.elm` : 'generated/Generated/Database.elm');
            if (!fs.existsSync(databaseModulePath)) {
                console.log(`   ⚠️  Skipping ${endpoint.name}HandlerTEA.elm (Database.elm not found - run shared module generation first)`);
                skippedCount++;
                continue;
            }

            console.log(`   ✅ Creating ${endpoint.name}HandlerTEA.elm`);
            
            const handlerContent = generateHandlerContent(endpoint);
            fs.writeFileSync(handlerFile, handlerContent);
            
            generatedFiles.push(handlerFile);
            generatedCount++;
        }
    }
    
    console.log('');
    // Generate compilation script for all handlers
    generateCompileScript(allEndpoints, config, PROJECT_NAME);
    
    // Generate updated elm-service.js integration
    generateServiceIntegration(allEndpoints, config, PROJECT_NAME);
    
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
    
    // Match #[buildamp_api(path = "EndpointName")] or #[buildamp(path = "EndpointName")] patterns
    const apiRegex = /#\[buildamp(?:_api)?\([^#]*?path\s*=\s*"([^"]+)"[^#]*?\]\s*pub struct\s+(\w+)/gs;
    
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
 * Generate TEA-based Elm handler content
 */
function generateHandlerContent(endpoint) {
    const { name, requestType, responseType } = endpoint;
    
    return `port module Api.Handlers.${name}HandlerTEA exposing (main)

{-| ${name} Handler - TEA Architecture

This handler implements The Elm Architecture pattern for async request processing.
It demonstrates the req + state + stage pattern for complex async operations.

Business Logic:
TODO: Customize the stages and business logic for your specific ${name} endpoint
TODO: Add database queries and external service calls as needed
TODO: Implement proper error handling and validation

-}

import Api.Backend exposing (${requestType}, ${responseType})
import Generated.Database as DB
import Generated.Events as Events
import Generated.Services as Services
import Json.Encode as Encode
import Json.Decode as Decode
import Platform
import Task


-- MODEL (req + state + stage)

type alias Model =
    { stage : Stage
    , request : Maybe ${requestType}
    , context : Maybe Context
    , globalConfig : GlobalConfig
    , globalState : GlobalState
    -- TODO: Add domain-specific state fields here
    }


type Stage
    = Idle
    | Processing
    -- TODO: Add specific stages for your business logic, e.g.:
    -- | LoadingData
    -- | ValidatingInput  
    -- | SavingResults
    | Complete ${responseType}
    | Failed String


type alias Context =
    { host : String
    , userId : Maybe String
    , sessionId : Maybe String
    }


type alias GlobalConfig = DB.GlobalConfig  -- Server-issued read-only config


type alias GlobalState = DB.GlobalState  -- Mutable handler state


-- UPDATE

type Msg
    = HandleRequest RequestBundle
    | ProcessingComplete ${responseType}
    -- TODO: Add specific messages for your business logic, e.g.:
    -- | DataLoaded (Result String SomeData)
    -- | ValidationComplete (Result String ValidatedInput)
    -- | SaveComplete (Result String SavedResult)


type alias RequestBundle =
    { id : String
    , context : Context
    , request : ${requestType}
    }


init : Flags -> ( Model, Cmd Msg )
init flags =
    ( { stage = Idle
      , request = Nothing
      , context = Nothing
      , globalConfig = flags.globalConfig
      , globalState = flags.globalState
      }
    , Cmd.none
    )


type alias Flags =
    { globalConfig : GlobalConfig
    , globalState : GlobalState
    }


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        HandleRequest bundle ->
            -- Start the business logic pipeline
            ( { model 
              | stage = Processing
              , request = Just bundle.request
              , context = Just bundle.context
              }
            , processRequest bundle.request
            )
        
        ProcessingComplete result ->
            ( { model | stage = Complete result }
            , complete (encode${responseType} result)
            )
        
        -- TODO: Handle your specific business logic messages here
        -- e.g.:
        -- DataLoaded result ->
        --     case result of
        --         Ok data ->
        --             ( { model | stage = ValidatingInput }
        --             , validateData data
        --             )
        --         Err error ->
        --             ( { model | stage = Failed error }
        --             , complete (encodeError error)
        --             )


-- BUSINESS LOGIC

{-| Get server-issued timestamp for reliable time operations
This ensures all timestamps come from the server, preventing client manipulation
-}
getServerTimestamp : GlobalConfig -> Int
getServerTimestamp config =
    config.serverNow


processRequest : ${requestType} -> Cmd Msg
processRequest request =
    -- TODO: Implement your business logic here
    -- Example patterns:
    
    -- Database query:
    -- DB.findItems (DB.queryAll |> DB.sortByCreatedAt) DataLoaded
    
    -- External API call:
    -- Services.get "https://api.example.com/data" [] ApiResponseReceived
    
    -- Event scheduling:
    -- Events.pushEvent (Events.SomeEvent { data = request.someField })
    
    -- Server timestamp usage:
    -- let currentTime = getServerTimestamp model.globalConfig
    
    -- For now, return a placeholder response
    let
        placeholderResponse = ${generatePlaceholderResponse(endpoint)}
    in
    Task.perform (\\_ -> 
        -- Signal completion with the response
        ProcessingComplete placeholderResponse
    ) (Task.succeed ())


-- ENCODING

encode${responseType} : ${responseType} -> Encode.Value
encode${responseType} response =
    ${generateResponseEncoder(endpoint)}


encodeError : String -> Encode.Value
encodeError error =
    Encode.object
        [ ("error", Encode.string error)
        ]


-- PORTS (TEA Pattern)

port handleRequest : (RequestBundle -> msg) -> Sub msg
port complete : Encode.Value -> Cmd msg


-- MAIN

main : Program Flags Model Msg
main =
    Platform.worker
        { init = init
        , update = update
        , subscriptions = subscriptions
        }


subscriptions : Model -> Sub Msg
subscriptions _ =
    handleRequest HandleRequest
`;
}

/**
 * Check if a handler needs regeneration due to dependency changes
 */
function shouldRegenerateHandler(handlerFilePath, config = {}, PROJECT_NAME = null) {
    try {
        const handlerContent = fs.readFileSync(handlerFilePath, 'utf-8');
        const handlerStat = fs.statSync(handlerFilePath);
        
        // Check if handler imports Generated.Database
        const importsDatabase = /import\s+Generated\.Database/m.test(handlerContent);
        
        if (importsDatabase) {
            const databaseModulePath = config.backendElmPath ? 
                `${config.backendElmPath}/Generated/Database.elm` :
                (PROJECT_NAME ? `app/${PROJECT_NAME}/server/generated/Generated/Database.elm` : 'generated/Generated/Database.elm');
            
            if (fs.existsSync(databaseModulePath)) {
                const databaseStat = fs.statSync(databaseModulePath);
                
                // Regenerate if Database module is newer than handler
                if (databaseStat.mtime > handlerStat.mtime) {
                    return true;
                }
            }
        }
        
        // Check for outdated GlobalConfig usage
        const hasOldGlobalConfig = /type alias GlobalConfig = \{\}/m.test(handlerContent);
        const hasOldGlobalState = /type alias GlobalState = \{\}/m.test(handlerContent);
        
        if (hasOldGlobalConfig || hasOldGlobalState) {
            // Handler has old-style empty config/state types
            return true;
        }
        
        // Check for missing DB import when it should have one
        const shouldImportDB = /DB\./m.test(handlerContent);
        const missingDBImport = shouldImportDB && !/import\s+Generated\.Database\s+as\s+DB/m.test(handlerContent);
        
        if (missingDBImport) {
            return true;
        }
        
        // Check for legacy handler patterns that need updating to TEA (generic pattern)
        const hasLegacyPattern = /handle\w+\s*:\s*\w+Req\s*->\s*\w+Res/.test(handlerContent);
        
        // Check for old TEA pattern that needs updating (generic patterns)
        const hasOldTEAPattern = /\w+ReqBundle/.test(handlerContent) ||
                               handlerContent.includes('DatabaseService') ||
                               /Task String \w+Res/.test(handlerContent);
        
        // Check for proper modern TEA pattern - only apply to Platform.worker handlers
        const hasPlatformWorker = handlerContent.includes('Platform.worker');
        const hasProperTEAPattern = hasPlatformWorker &&
                                   handlerContent.includes('type Msg') &&
                                   handlerContent.includes('type Stage') &&
                                   handlerContent.includes('Generated.Database as DB') &&
                                   handlerContent.includes('type alias RequestBundle');
        
        if (hasLegacyPattern || hasOldTEAPattern) {
            return true;
        }
        
        // If it's a Platform.worker handler but missing modern TEA pattern, regenerate
        if (hasPlatformWorker && !hasProperTEAPattern) {
            return true;
        }
        
        return false;
    } catch (error) {
        // If we can't check, err on the side of regeneration
        console.warn(`Warning: Could not check dependencies for ${handlerFilePath}: ${error.message}`);
        return true;
    }
}

/**
 * Generate placeholder response - completely generic
 */
function generatePlaceholderResponse(endpoint) {
    const { name, responseType } = endpoint;
    
    return `Debug.todo "Implement ${name} handler"`;
}

/**
 * Generate response encoder - uses Backend.elm encoder with proper field mapping
 */
function generateResponseEncoder(endpoint) {
    const { responseType } = endpoint;
    
    // Use the auto-generated encoder from Backend.elm which handles field name mapping
    const encoderName = responseType.charAt(0).toLowerCase() + responseType.slice(1) + 'Encoder';
    return `Api.Backend.${encoderName} response`;
}

/**
 * Generate compilation script for Elm handlers
 */
function generateCompileScript(endpoints, config = {}, PROJECT_NAME = null) {
    const compileScript = `#!/bin/bash
# Auto-generated Elm handler compilation script
# Run this from app/horatio/server/ directory

set -e
echo "🔨 Compiling Elm handlers..."

# Auto-discover all .elm files in the handlers directory
for elm_file in src/Api/Handlers/*.elm; do
    if [ -f "$elm_file" ]; then
        # Extract filename without path and extension
        basename=$(basename "$elm_file" .elm)
        
        echo "Compiling $basename..."
        elm make "$elm_file" --output="$basename.js" && mv "$basename.js" "$basename.cjs"
    fi
done

echo "✅ All handlers compiled successfully!"
`;
    
    const scriptPath = config.backendElmPath ? 
        `${config.backendElmPath.replace('/generated', '')}/compile-handlers.sh` :
        (PROJECT_NAME ? `app/${PROJECT_NAME}/server/compile-handlers.sh` : 'compile-handlers.sh');
    fs.writeFileSync(scriptPath, compileScript);
    fs.chmodSync(scriptPath, '755'); // Make executable
    
    console.log(`   ✅ Generated compilation script: ${scriptPath}`);
}

/**
 * Generate updated elm-service.js integration
 */
function generateServiceIntegration(endpoints, config = {}, PROJECT_NAME = null) {
    const handlerConfigs = endpoints.map(endpoint => 
        `            { name: '${endpoint.name}', file: '${endpoint.name}HandlerTEA', function: 'handle${endpoint.name}' }`
    ).join(',\n');
    
    // Compute handler path outside the template
    const baseHandlersPath = config.backendElmPath ? 
        config.backendElmPath.replace('/generated', '') :
        (PROJECT_NAME ? `app/${PROJECT_NAME}/server` : 'server');
    
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
        const handlersPath = path.join(__dirname, '../../../${baseHandlersPath}');
        
        // Auto-generated handler configurations
        const handlerConfigs = [
${handlerConfigs}
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
`;
    
    // Auto-detect service path based on working directory
    const cwd = process.cwd();
    
    // Check if we have packages/hamlet-server in the current directory structure
    const hasPackagesStructure = fs.existsSync('packages/hamlet-server/middleware');
    const inHamletServer = cwd.includes('packages/hamlet-server');
    
    const servicePath = config.jsOutputPath ? 
        `${config.jsOutputPath}/middleware/elm-service.js` :
        ((inHamletServer && !hasPackagesStructure)
            ? 'middleware/elm-service.js' 
            : 'packages/hamlet-server/middleware/elm-service.js');
    
    // Check if middleware already has TEA handler support
    const existingCode = fs.existsSync(servicePath) ? fs.readFileSync(servicePath, 'utf-8') : '';
    const hasTeaSupport = existingCode.includes('TEA Handler Support') || existingCode.includes('handleRequest');
    
    if (hasTeaSupport) {
        console.log(`   ⏭️  Skipping service integration: ${servicePath} (TEA support detected)`);
    } else {
        // Ensure directory exists before writing
        const serviceDir = path.dirname(servicePath);
        if (!fs.existsSync(serviceDir)) {
            fs.mkdirSync(serviceDir, { recursive: true });
        }
        fs.writeFileSync(servicePath, serviceCode);
        console.log(`   ✅ Generated service integration: ${servicePath}`);
    }
}