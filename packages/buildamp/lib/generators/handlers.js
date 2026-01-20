/**
 * Elm Handler Scaffolding Generation
 *
 * Generates Elm handler files (once) for each API endpoint defined in Elm.
 * These are scaffolding files that developers can then customize with business logic.
 *
 * Key principles:
 * - Generate files ONLY if they don't exist (never overwrite existing files)
 * - Developer must manually move/delete files to force regeneration
 * - Parse Elm API definitions to find endpoints
 * - Create properly typed Elm handlers with database placeholders
 *
 * Regeneration workflow (--regenerate flag):
 * - Backs up existing handler to .backup file
 * - Generates fresh skeleton with updated types
 * - Adds TODO comment pointing to backup for migration
 */

import fs from 'fs';
import path from 'path';
import { parseElmApiDir } from '../../core/elm-parser-ts.js';

/**
 * Generate Elm handler scaffolding files (only if they don't exist)
 * @param {Object} config - Configuration options
 * @param {string} config.regenerateHandler - Handler name to regenerate (or 'all')
 */
export async function generateElmHandlers(config = {}) {
    console.log('🔧 Analyzing API definitions...');

    // Import getGenerationPaths for explicit paths
    const { getGenerationPaths, ensureOutputDir } = await import('./shared-paths.js');
    const paths = getGenerationPaths(config);

    const outputDir = ensureOutputDir(paths.serverHandlersDir);
    const { regenerateHandler } = config;

    // Try Elm API definitions first
    const elmApiDir = paths.elmApiDir;
    let allEndpoints = [];

    if (fs.existsSync(elmApiDir)) {
        const elmApis = parseElmApiDir(elmApiDir);
        if (elmApis.length > 0) {
            console.log(`📦 Using Elm API models from ${elmApiDir}`);
            allEndpoints = elmApis.map(api => ({
                name: api.name,
                requestType: `${api.name}Req`,
                responseType: `${api.name}Res`
            }));
        }
    }

    console.log(`📁 Found ${allEndpoints.length} API endpoints`);

    let generatedCount = 0;
    let skippedCount = 0;
    let regeneratedCount = 0;
    const generatedFiles = [];

    // Generate handler for each endpoint
    for (const endpoint of allEndpoints) {
        const handlerFile = path.join(outputDir, `${endpoint.name}Handler.elm`);
        const handlerName = `${endpoint.name}Handler`;

        // Check if this handler should be regenerated
        const shouldRegenerate = regenerateHandler &&
            (regenerateHandler === 'all' ||
             regenerateHandler === endpoint.name ||
             regenerateHandler === handlerName ||
             regenerateHandler === `${handlerName}.elm`);

        if (fs.existsSync(handlerFile)) {
            if (shouldRegenerate) {
                // Backup and regenerate
                const backupFile = `${handlerFile}.backup`;
                console.log(`   🔄 Regenerating ${handlerName}.elm`);
                console.log(`      📦 Backing up to ${path.basename(backupFile)}`);

                fs.copyFileSync(handlerFile, backupFile);

                const handlerContent = generateHandlerContent(endpoint, backupFile);
                fs.writeFileSync(handlerFile, handlerContent);

                generatedFiles.push(handlerFile);
                regeneratedCount++;
                continue;
            }

            console.log(`   ⏭️  Skipping ${handlerName}.elm (already exists)`);
            skippedCount++;
            continue;
        }

        // Check if required shared modules exist before generating new handlers
        // Database.elm is in server elm directory
        const databaseModulePath = path.join(paths.serverElmDir, 'BuildAmp', 'Database.elm');
        const databaseModuleExists = fs.existsSync(databaseModulePath);
        if (!databaseModuleExists) {
            console.log(`   ⚠️  Skipping ${handlerName}.elm (Database.elm not found - run shared module generation first)`);
            skippedCount++;
            continue;
        }

        console.log(`   ✅ Creating ${handlerName}.elm`);

        const handlerContent = generateHandlerContent(endpoint);
        fs.writeFileSync(handlerFile, handlerContent);

        generatedFiles.push(handlerFile);
        generatedCount++;
    }
    
    console.log('');
    // Generate compilation script for all handlers
    generateCompileScript(allEndpoints, paths);

    // Generate updated elm-service.js integration
    generateServiceIntegration(allEndpoints, paths);
    
    console.log('📊 Elm Handler Generation Summary:');
    console.log(`   Generated: ${generatedCount} new handlers`);
    if (regeneratedCount > 0) {
        console.log(`   Regenerated: ${regeneratedCount} handlers (backups created)`);
    }
    console.log(`   Skipped: ${skippedCount} existing handlers`);
    console.log(`   Total endpoints: ${generatedCount + regeneratedCount + skippedCount}`);
    console.log(`   ✅ Generated compilation script`);
    console.log(`   ✅ Generated service integration`);
    
    return {
        generated: generatedCount,
        regenerated: regeneratedCount,
        skipped: skippedCount,
        outputFiles: generatedFiles
    };
}

/**
 * Generate Elm handler content
 * @param {Object} endpoint - Endpoint definition
 * @param {string} backupFile - Path to backup file (if regenerating)
 */
function generateHandlerContent(endpoint, backupFile = null) {
    const { name, requestType, responseType } = endpoint;

    // Generate TODO header if this is a regeneration
    const regenerationHeader = backupFile ? `
{- ═══════════════════════════════════════════════════════════════════════════
   REGENERATED HANDLER - MIGRATION REQUIRED

   Your previous implementation has been backed up to:
   ${backupFile}

   This handler was regenerated because framework types changed.
   Please migrate your business logic from the backup to this new skeleton.

   Steps:
   1. Review the backup file for your custom business logic
   2. Copy the relevant parts to this new handler
   3. Update any types that have changed (check compile errors)
   4. Delete the backup file when migration is complete
   5. Remove this comment block

   ═══════════════════════════════════════════════════════════════════════════ -}

` : '';

    return `port module Api.Handlers.${name}Handler exposing (main)
${regenerationHeader}
{-| ${name} Handler

Implements the req + state + stage pattern for async request processing.

Business Logic:
TODO: Customize the stages and business logic for your specific ${name} endpoint
TODO: Add database queries and external service calls as needed
TODO: Implement proper error handling and validation

-}

import Api.Backend exposing (${requestType}, ${responseType})
import BuildAmp.Database as DB
import BuildAmp.Events as Events
import BuildAmp.Services as Services
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
    { request : Encode.Value
    , context : Encode.Value
    , globalConfig : Encode.Value
    , globalState : Encode.Value
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
            case decodeRequest bundle of
                Ok ( req, ctx ) ->
                    -- Start the business logic pipeline
                    ( { model 
                      | stage = Processing
                      , request = Just req
                      , context = Just ctx
                      }
                    , processRequest req
                    )
                
                Err error ->
                    ( { model | stage = Failed error }, Cmd.none )
        
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


-- DECODING

decodeRequest : RequestBundle -> Result String ( ${requestType}, Context )
decodeRequest bundle =
    Result.map2 Tuple.pair
        (Decode.decodeValue Api.Backend.${requestType.charAt(0).toLowerCase() + requestType.slice(1)}Decoder bundle.request |> Result.mapError Decode.errorToString)
        (Decode.decodeValue contextDecoder bundle.context |> Result.mapError Decode.errorToString)


contextDecoder : Decode.Decoder Context
contextDecoder =
    Decode.map3 Context
        (Decode.field "host" Decode.string)
        (Decode.maybe (Decode.field "userId" Decode.string))
        (Decode.maybe (Decode.field "sessionId" Decode.string))


-- ENCODING

encode${responseType} : ${responseType} -> Encode.Value
encode${responseType} response =
    ${generateResponseEncoder(endpoint)}


encodeError : String -> Encode.Value
encodeError error =
    Encode.object
        [ ("error", Encode.string error)
        ]


-- PORTS

port handleRequest : (RequestBundle -> msg) -> Sub msg
port complete : Encode.Value -> Cmd msg


-- MAIN

main : Program Flags Model Msg
main =
    Platform.worker
        { init = init
        , update = updateWithResponse
        , subscriptions = subscriptions
        }


updateWithResponse : Msg -> Model -> ( Model, Cmd Msg )
updateWithResponse msg model =
    let
        ( newModel, cmd ) = update msg model
    in
    case newModel.stage of
        Complete response ->
            ( newModel
            , Cmd.batch
                [ complete (encode${responseType} response)
                , cmd
                ]
            )

        Failed error ->
            ( newModel
            , Cmd.batch
                [ complete (encodeError error)
                , cmd
                ]
            )

        _ ->
            ( newModel, cmd )


subscriptions : Model -> Sub Msg
subscriptions _ =
    handleRequest HandleRequest
`;
}

/**
 * Check if a handler needs regeneration due to dependency changes
 */
function shouldRegenerateHandler(handlerFilePath, paths) {
    try {
        const handlerContent = fs.readFileSync(handlerFilePath, 'utf-8');
        const handlerStat = fs.statSync(handlerFilePath);

        // Check if handler imports BuildAmp.Database
        const importsDatabase = /import\s+BuildAmp\.Database/m.test(handlerContent);

        if (importsDatabase) {
            // Database.elm is in server elm directory
            const databaseModulePath = path.join(paths.serverElmDir, 'BuildAmp', 'Database.elm');
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
        const missingDBImport = shouldImportDB && !/import\s+BuildAmp\.Database\s+as\s+DB/m.test(handlerContent);
        
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
                                   handlerContent.includes('BuildAmp.Database as DB') &&
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
function generateCompileScript(endpoints, paths) {
    const compileScript = `#!/bin/bash
# Auto-generated Elm handler compilation script
# Run this from the handlers directory

set -e
echo "🔨 Compiling Elm handlers..."

# Auto-discover all .elm files in the handlers directory
for elm_file in *.elm; do
    if [ -f "$elm_file" ]; then
        # Extract filename without path and extension
        basename=$(basename "$elm_file" .elm)

        echo "Compiling $basename..."
        elm make "$elm_file" --output="$basename.js" && mv "$basename.js" "$basename.cjs"
    fi
done

echo "✅ All handlers compiled successfully!"
`;

    // Put compile script in handlers output directory
    const scriptPath = path.join(paths.serverHandlersDir, 'compile-handlers.sh');
    fs.writeFileSync(scriptPath, compileScript);
    fs.chmodSync(scriptPath, '755'); // Make executable

    console.log(`   ✅ Generated compilation script: ${scriptPath}`);
}

/**
 * Generate updated elm-service.js integration
 */
function generateServiceIntegration(endpoints, paths) {
    const handlerConfigs = endpoints.map(endpoint =>
        `            { name: '${endpoint.name}', file: '${endpoint.name}Handler', function: 'handle${endpoint.name}' }`
    ).join(',\n');

    const serviceCode = `/**
 * Elm Service Middleware - Auto-generated
 *
 * Executes compiled Elm handler functions for business logic.
 * Elm defines both the API schema and the business logic.
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

    // Write to server glue directory
    const servicePath = path.join(paths.serverGlueDir, 'elm-service.js');

    // Skip if existing TEA support is detected
    if (fs.existsSync(servicePath)) {
        const existingContent = fs.readFileSync(servicePath, 'utf-8');
        if (existingContent.includes('TEA Handler Support')) {
            console.log(`   ⏭️  Skipping service integration (existing TEA support detected)`);
            return;
        }
    }

    // Ensure directory exists before writing
    const serviceDir = path.dirname(servicePath);
    if (!fs.existsSync(serviceDir)) {
        fs.mkdirSync(serviceDir, { recursive: true });
    }
    fs.writeFileSync(servicePath, serviceCode);
    console.log(`   ✅ Generated service integration: ${servicePath}`);
}

// Exported for testing
export const _test = {
    generateHandlerContent,
    shouldRegenerateHandler,
    generatePlaceholderResponse,
    generateResponseEncoder
};