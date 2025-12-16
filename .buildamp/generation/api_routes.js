/**
 * API Route Generation
 * Generates Express routes and Elm backend types from #[buildamp_api] annotations in src/models/api/
 * Replaces manual endpoint switching with individual type-safe routes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse buildamp_api annotations from Rust file content
function parseApiAnnotations(content, filename) {
    const apis = [];
    
    // Match #[buildamp] annotations and their associated structs
    // Need to handle multiline field annotations
    const apiRegex = /#\[buildamp\(([^)]+)\)\][\s\S]*?pub struct\s+(\w+)\s*\{([\s\S]*?)\}/g;
    let match;
    
    while ((match = apiRegex.exec(content)) !== null) {
        const [, annotationContent, structName, fieldsContent] = match;
        
        // Parse annotation parameters
        const annotations = {};
        const paramRegex = /(\w+)\s*=\s*"([^"]+)"/g;
        let paramMatch;
        while ((paramMatch = paramRegex.exec(annotationContent)) !== null) {
            const [, key, value] = paramMatch;
            annotations[key] = value;
        }
        
        // Parse fields with their annotations - need to look at the broader context
        const fields = [];
        
        // Split content into lines to parse field annotations correctly
        const lines = fieldsContent.split('\n');
        let currentAnnotations = {};
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Check for field annotations
            if (line.startsWith('#[api(')) {
                currentAnnotations = {};
                const annotationContent = line.match(/#\[api\(([^)]+)\)\]/);
                if (annotationContent) {
                    const annotationStr = annotationContent[1];
                    
                    if (annotationStr.includes('Inject')) {
                        const injectMatch = annotationStr.match(/Inject\s*=\s*"([^"]+)"/);
                        if (injectMatch) {
                            currentAnnotations.inject = injectMatch[1];
                        }
                    }
                    if (annotationStr.includes('Required')) {
                        currentAnnotations.required = true;
                    }
                }
            }
            
            // Check for field definition
            const fieldMatch = line.match(/pub\s+(\w+):\s*([^,\n]+)/);
            if (fieldMatch) {
                const [, fieldName, fieldType] = fieldMatch;
                fields.push({
                    name: fieldName,
                    type: fieldType.trim().replace(',', ''),
                    annotations: { ...currentAnnotations }
                });
                currentAnnotations = {}; // Reset after using
            }
        }
        
        apis.push({
            struct_name: structName,
            name: structName,
            path: annotations.path || structName,
            bundleWith: annotations.bundle_with,
            serverContext: annotations.server_context,
            fields,
            filename
        });
    }
    
    return apis;
}

// Generate Express route for an API endpoint
function generateRoute(api) {
    const { name, path, fields, bundleWith, serverContext } = api;
    
    // Fields that need injection
    const injectFields = fields.filter(f => f.annotations.inject);
    const requiredFields = fields.filter(f => f.annotations.required);
    
    // Generate field validation
    const validationChecks = requiredFields.map(field => 
        `    if (!requestData.${field.name} || requestData.${field.name}.trim() === '') {
        return res.status(400).json({ error: '${field.name} is required' });
    }`
    ).join('\n');
    
    // Generate field injection
    const injectionCode = injectFields.map(field => {
        if (field.annotations.inject === 'host') {
            return `        ${field.name}: req.context.host`;
        }
        return `        ${field.name}: req.context.${field.annotations.inject}`;
    }).join(',\n');
    
    return `
/**
 * Auto-generated route for ${name}
 * Path: ${path}
 * Generated from: ${api.filename}
 */
server.app.post('/api/${path}', async (req, res) => {
    const host = req.tenant?.host || 'localhost';
    
    try {
        // Extract request data
        let requestData = req.body;
        
        // Field validation
${validationChecks}
        
        // Ensure context exists
        if (!req.context) {
            req.context = { host };
        }
        
        // Context injection
        requestData = {
            ...requestData,${injectionCode ? '\n' + injectionCode + '\n        ' : ''}
        };
        
        // Call Elm business logic
        const elmService = server.getService('elm');
        if (!elmService) {
            throw new Error('Elm service not available');
        }
        
        const result = await elmService.callHandler('${path}', requestData, {
            host,
            user_id: req.context?.user_id || null,
            is_extension: req.context?.is_extension || false,
            tenant: host
        });
        
        res.json(result);
        
    } catch (error) {
        console.error(\`Error handling ${path}:\`, error);
        res.status(400).json({ error: error.message });
    }
});`.trim();
}

/**
 * Convert Rust type to Elm type
 */
function rustTypeToElmType(rustType) {
    const typeMap = {
        'String': 'String',
        'i32': 'Int',
        'i64': 'Int',
        'u32': 'Int',
        'u64': 'Int',
        'f32': 'Float',
        'f64': 'Float',
        'bool': 'Bool',
        'Option<String>': 'Maybe String',
        'Option<i32>': 'Maybe Int',
        'Option<bool>': 'Maybe Bool',
        'Vec<String>': 'List String',
        'Vec<i32>': 'List Int',
        'serde_json::Value': 'Json.Encode.Value'
    };
    
    return typeMap[rustType] || rustType;
}

/**
 * Generate Elm type definition for API request
 */
function generateElmTypeDefinition(api) {
    if (!api.fields || api.fields.length === 0) {
        return `type alias ${api.struct_name} = {}`;
    }
    
    const fields = api.fields.map(field => {
        const elmType = rustTypeToElmType(field.type);
        return `    ${field.name} : ${elmType}`;
    }).join('\n');
    
    return `type alias ${api.struct_name} =\n{\n${fields}\n}`;
}

/**
 * Generate Elm encoder for API request
 */
function generateElmEncoder(api) {
    const functionName = `encode${api.struct_name}`;
    const paramName = api.struct_name.toLowerCase();
    
    if (!api.fields || api.fields.length === 0) {
        return `${functionName} : ${api.struct_name} -> Json.Encode.Value
${functionName} _ =
    Json.Encode.object []`;
    }
    
    const encoderFields = api.fields.map(field => {
        let encoder;
        switch (field.type) {
            case 'String':
                encoder = 'Json.Encode.string';
                break;
            case 'i32':
            case 'i64':
            case 'u32':
            case 'u64':
                encoder = 'Json.Encode.int';
                break;
            case 'f32':
            case 'f64':
                encoder = 'Json.Encode.float';
                break;
            case 'bool':
                encoder = 'Json.Encode.bool';
                break;
            case 'Option<String>':
                encoder = '(Maybe.withDefault Json.Encode.null << Maybe.map Json.Encode.string)';
                break;
            case 'Vec<String>':
                encoder = '(Json.Encode.list Json.Encode.string)';
                break;
            default:
                encoder = 'Json.Encode.string'; // Fallback
        }
        return `        ( "${field.name}", ${encoder} ${paramName}.${field.name} )`;
    }).join('\n');
    
    return `${functionName} : ${api.struct_name} -> Json.Encode.Value
${functionName} ${paramName} =
    Json.Encode.object
        [ ${encoderFields}
        ]`;
}

/**
 * Generate Elm HTTP function for API call
 */
function generateElmHttpFunction(api) {
    const functionName = `${api.path.toLowerCase()}`;
    const requestType = api.struct_name;
    const encoderName = `encode${api.struct_name}`;
    
    return `{-| Call ${api.path} API endpoint
-}
${functionName} : ${requestType} -> (Result Http.Error Json.Decode.Value -> msg) -> Cmd msg
${functionName} request toMsg =
    Http.post
        { url = "/api/${api.path}"
        , body = Http.jsonBody (${encoderName} request)
        , expect = Http.expectJson toMsg Json.Decode.value
        }`;
}

/**
 * Generate complete Elm API client module
 */
function generateElmApiClient(allApis) {
    const moduleDeclarations = allApis.map(api => {
        const functionName = api.path.toLowerCase();
        const typeName = api.struct_name;
        const encoderName = `encode${api.struct_name}`;
        return `${functionName}, ${typeName}, ${encoderName}`;
    });
    
    const typeDefinitions = allApis.map(generateElmTypeDefinition).join('\n\n');
    const encoders = allApis.map(generateElmEncoder).join('\n\n');
    const httpFunctions = allApis.map(generateElmHttpFunction).join('\n\n');
    
    return `-- Auto-Generated Elm API Client
-- Generated from #[buildamp_api] annotations in src/models/api/
-- 
-- ⚠️  DO NOT EDIT THIS FILE MANUALLY
-- ⚠️  Changes will be overwritten during next generation

module Generated.ApiClient exposing
    ( ${moduleDeclarations.join('\n    , ')}
    )

import Http
import Json.Decode
import Json.Encode


-- TYPE DEFINITIONS

${typeDefinitions}


-- ENCODERS

${encoders}


-- HTTP FUNCTIONS

${httpFunctions}
`;
}

/**
 * Generate Elm backend types for API handlers
 */
function generateElmBackendTypes(allApis) {
    // Generate BackendAction type with all endpoints
    const backendActions = allApis.map(api => {
        const actionName = api.path; // GetFeed, SubmitItem, etc.
        const bundleName = `${actionName}ReqBundle`;
        return `    | ${actionName} (${bundleName})`;
    }).join('\n');
    
    // Generate bundle types for each endpoint
    const bundleTypes = allApis.map(api => {
        const actionName = api.path;
        const reqType = `${actionName}Req`;
        const bundleType = `${actionName}ReqBundle`;
        
        return `type alias ${bundleType} =
    { context : StandardServerContext
    , input : ${reqType}
    }`;
    }).join('\n\n');
    
    // Generate encoders for bundle types
    const bundleEncoders = allApis.map(api => {
        const actionName = api.path;
        const bundleType = `${actionName}ReqBundle`;
        const reqEncoder = `${actionName.toLowerCase()}ReqEncoder`;
        const functionName = `${actionName.toLowerCase()}ReqBundleEncoder`;
        
        return `${functionName} : ${bundleType} -> Json.Encode.Value
${functionName} struct =
    Json.Encode.object
        [ ( "context", (standardServerContextEncoder) struct.context )
        , ( "input", (${reqEncoder}) struct.input )
        ]`;
    }).join('\n\n');
    
    // Generate decoders for bundle types  
    const bundleDecoders = allApis.map(api => {
        const actionName = api.path;
        const bundleType = `${actionName}ReqBundle`;
        const reqDecoder = `${actionName.toLowerCase()}ReqDecoder`;
        const functionName = `${actionName.toLowerCase()}ReqBundleDecoder`;
        
        return `${functionName} : Json.Decode.Decoder ${bundleType}
${functionName} =
    Json.Decode.succeed ${bundleType}
        |> Json.Decode.andThen (\\x -> Json.Decode.map x (Json.Decode.field "context" (standardServerContextDecoder)))
        |> Json.Decode.andThen (\\x -> Json.Decode.map x (Json.Decode.field "input" (${reqDecoder})))`;
    }).join('\n\n');
    
    // Generate BackendAction encoder cases
    const actionEncoderCases = allApis.map(api => {
        const actionName = api.path;
        const bundleEncoder = `${actionName.toLowerCase()}ReqBundleEncoder`;
        
        return `        ${actionName} inner ->
            Json.Encode.object [ ( "${actionName}", ${bundleEncoder} inner ) ]`;
    }).join('\n');
    
    // Generate BackendAction decoder cases
    const actionDecoderCases = allApis.map(api => {
        const actionName = api.path;
        const bundleDecoder = `${actionName.toLowerCase()}ReqBundleDecoder`;
        
        return `        , Json.Decode.map ${actionName} (Json.Decode.field "${actionName}" (${bundleDecoder}))`;
    }).join('\n');
    
    return `-- AUTO-GENERATED BACKEND TYPES
-- Add these to your Api.Backend module

-- Updated BackendAction type:
type BackendAction
${backendActions}

-- Bundle types:
${bundleTypes}

-- Bundle encoders:
${bundleEncoders}

-- Bundle decoders:
${bundleDecoders}

-- Updated backendActionEncoder cases:
backendActionEncoder enum =
    case enum of
${actionEncoderCases}

-- Updated backendActionDecoder cases:
backendActionDecoder = 
    Json.Decode.oneOf
        [ -- Add your existing cases here first
${actionDecoderCases}
        ]
`;
}

// Generate all API routes
function generateApiRoutes() {
    const apiModelsPath = path.join(__dirname, '../../src/models/api');
    const outputPath = path.join(__dirname, '../../packages/hamlet-server/generated');
    
    if (!fs.existsSync(apiModelsPath)) {
        console.log('📁 No src/models/api directory found, skipping API route generation');
        return;
    }
    
    // Ensure output directory exists
    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
    }
    
    const allApis = [];
    
    // Read all .rs files in src/models/api
    const files = fs.readdirSync(apiModelsPath).filter(file => file.endsWith('.rs') && file !== 'mod.rs');
    
    for (const file of files) {
        const filePath = path.join(apiModelsPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const apis = parseApiAnnotations(content, file);
        allApis.push(...apis);
    }
    
    console.log(`🔍 Found ${allApis.length} API endpoints: ${allApis.map(api => api.path).join(', ')}`);
    
    // Generate JavaScript routes for each API
    const allRoutes = allApis.map(generateRoute).join('\n\n');
    
    // Generate Elm client code for each API
    const elmClientCode = generateElmApiClient(allApis);
    
    // Generate Elm backend types for each API
    const elmBackendCode = generateElmBackendTypes(allApis);
    
    const outputContent = `/**
 * Auto-Generated API Routes  
 * Generated from #[buildamp_api] annotations in src/models/api/
 * 
 * ⚠️  DO NOT EDIT THIS FILE MANUALLY
 * ⚠️  Changes will be overwritten during next generation
 * 
 * This file replaces manual endpoint switching with individual Express routes
 * that include automatic validation, context injection, and WASM integration.
 */

/**
 * Register all auto-generated API routes
 * @param {Object} server - Server instance with Express app
 */
export default function registerApiRoutes(server) {
    console.log('🚀 Registering auto-generated API routes...');
    
${allRoutes}
    
    console.log(\`✅ Registered \${${allApis.length}} auto-generated API routes\`);
}
`;
    
    // Write JavaScript routes file
    const jsOutputFile = path.join(outputPath, 'api-routes.js');
    fs.writeFileSync(jsOutputFile, outputContent);
    
    // Write Elm client file
    const elmOutputPath = path.join(__dirname, '../../app/generated');
    if (!fs.existsSync(elmOutputPath)) {
        fs.mkdirSync(elmOutputPath, { recursive: true });
    }
    const elmOutputFile = path.join(elmOutputPath, 'ApiClient.elm');
    fs.writeFileSync(elmOutputFile, elmClientCode);
    
    // Write Elm backend types file
    const backendOutputPath = path.join(__dirname, '../../app/horatio/server/generated');
    if (!fs.existsSync(backendOutputPath)) {
        fs.mkdirSync(backendOutputPath, { recursive: true });
    }
    const backendOutputFile = path.join(backendOutputPath, 'BackendTypes.elm');
    fs.writeFileSync(backendOutputFile, elmBackendCode);
    
    console.log(`✅ Generated API routes: ${jsOutputFile}`);
    console.log(`✅ Generated Elm API client: ${elmOutputFile}`);
    console.log(`✅ Generated Elm backend types: ${backendOutputFile}`);
    console.log(`📊 Generated ${allApis.length} Express routes and ${allApis.length} Elm HTTP functions`);
    
    return {
        routes: allApis.length,
        endpoints: allApis.length,
        outputFile: jsOutputFile,
        elmOutputFile: elmOutputFile
    };
}

// Run generation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    try {
        generateApiRoutes();
        console.log('🎉 API route generation completed successfully!');
    } catch (error) {
        console.error('❌ API route generation failed:', error);
        process.exit(1);
    }
}

export { generateApiRoutes };