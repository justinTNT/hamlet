/**
 * API Route Generation
 * Generates Express routes and Elm backend types from Elm API definitions in shared/Api/
 * Replaces manual endpoint switching with individual type-safe routes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getGenerationPaths, modelsExist, getModelsFullPath, ensureOutputDir } from './shared-paths.js';
import { parseElmApiDir } from '../../core/elm-parser-ts.js';
import { generateUnionEncoder, generateUnionDecoder, generateUnionTypeDefinition } from './union-types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse buildamp_api annotations from file content
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
 * Convert schema type to Elm type
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
 * @param {Array} allApis - All parsed API definitions
 * @param {Set} dbReferences - Set of DB model names referenced by API models
 */
function generateElmApiClient(allApis, dbReferences = new Set()) {
    const moduleDeclarations = allApis.map(api => {
        const functionName = api.path.toLowerCase();
        const typeName = api.struct_name;
        const encoderName = `encode${api.struct_name}`;
        return `${functionName}, ${typeName}, ${encoderName}`;
    });

    const typeDefinitions = allApis.map(generateElmTypeDefinition).join('\n\n');
    const encoders = allApis.map(generateElmEncoder).join('\n\n');
    const httpFunctions = allApis.map(generateElmHttpFunction).join('\n\n');

    // Generate cross-model imports for DB references
    const dbReferencesArray = Array.from(dbReferences);
    const crossModelImports = dbReferencesArray.length > 0
        ? `import Generated.Db exposing (${dbReferencesArray.map(m => m + 'Db').join(', ')})\n`
        : '';

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
${crossModelImports}

-- TYPE DEFINITIONS

${typeDefinitions}


-- ENCODERS

${encoders}


-- HTTP FUNCTIONS

${httpFunctions}
`;
}

/**
 * Generate code for all union types (definitions, encoders, decoders)
 */
function generateUnionTypesCode(unionTypes) {
    const definitions = [];
    const encoders = [];
    const decoders = [];

    for (const unionType of unionTypes) {
        // Skip types with type parameters (generic types like Maybe a)
        if (unionType.typeParams && unionType.typeParams.length > 0) {
            continue;
        }

        definitions.push(generateUnionTypeDefinition(unionType));

        const encoder = generateUnionEncoder(unionType);
        if (encoder) encoders.push(encoder);

        const decoder = generateUnionDecoder(unionType);
        if (decoder) decoders.push(decoder);
    }

    const parts = [];
    if (definitions.length > 0) {
        parts.push('-- Union Types\n' + definitions.join('\n\n'));
    }
    if (encoders.length > 0) {
        parts.push('-- Union Type Encoders\n' + encoders.join('\n\n'));
    }
    if (decoders.length > 0) {
        parts.push('-- Union Type Decoders\n' + decoders.join('\n\n'));
    }

    return parts.join('\n\n');
}

/**
 * Generate Elm backend types for API handlers
 */
function generateElmBackendTypes(allApis, unionTypes = []) {
    // Generate union type definitions, encoders, and decoders
    const unionTypeCode = unionTypes.length > 0 ? generateUnionTypesCode(unionTypes) : '';

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
${unionTypeCode ? '\n' + unionTypeCode : ''}
`;
}

/**
 * Convert Elm API format to the format expected by generators
 */
function convertElmApiToGeneratorFormat(elmApi) {
    // Convert Elm annotations to generator format
    const convertAnnotations = (annotations) => {
        const result = {};
        if (annotations.inject) {
            result.inject = 'host'; // Elm uses Inject type wrapper
        }
        if (annotations.required) {
            result.required = true;
        }
        if (annotations.trim) {
            result.trim = true;
        }
        return result;
    };

    // Map Elm types to schema format types (for compatibility with existing generators)
    const elmTypeToSchemaType = (elmType) => {
        if (elmType.startsWith('Maybe ')) {
            const inner = elmType.slice(6);
            return `Option<${elmTypeToSchemaType(inner)}>`;
        }
        if (elmType.startsWith('List ')) {
            const inner = elmType.slice(5);
            return `Vec<${elmTypeToSchemaType(inner)}>`;
        }
        if (elmType === 'Int') return 'i64';
        if (elmType === 'Float') return 'f64';
        if (elmType === 'Bool') return 'bool';
        return elmType; // String stays String
    };

    return {
        struct_name: `${elmApi.name}Req`,
        name: `${elmApi.name}Req`,
        path: elmApi.name,
        serverContext: elmApi.serverContext ? 'ServerContext' : null,
        fields: elmApi.request.fields.map(f => ({
            name: f.name,
            type: elmTypeToSchemaType(f.elmType),
            annotations: convertAnnotations(f.annotations)
        })),
        filename: elmApi.filename,
        // Keep Elm-specific data for enhanced generation
        _elm: elmApi
    };
}

// Generate all API routes
function generateApiRoutes(config = {}) {
    // Use shared path discovery
    const paths = getGenerationPaths(config);
    const schemaLang = config.schemaLang || 'elm';

    const outputPath = ensureOutputDir(paths.jsGlueDir);
    const allApis = [];
    const allDbReferences = new Set(); // Track cross-model DB references
    const allUnionTypes = []; // Collect union types from all API modules

    // Try Elm API schemas first
    if (schemaLang === 'elm') {
        const elmApiDir = path.join(paths.outputDir, 'shared/Api');
        if (fs.existsSync(elmApiDir)) {
            const elmApis = parseElmApiDir(elmApiDir);
            if (elmApis.length > 0) {
                console.log(`🌳 Parsing Elm API schemas from ${elmApiDir}`);
                for (const elmApi of elmApis) {
                    allApis.push(convertElmApiToGeneratorFormat(elmApi));
                    // Collect union types from this API module
                    if (elmApi.unionTypes && elmApi.unionTypes.length > 0) {
                        allUnionTypes.push(...elmApi.unionTypes);
                    }
                }
                console.log(`🔍 Found ${allApis.length} API endpoints (elm): ${allApis.map(api => api.path).join(', ')}`);
                if (allUnionTypes.length > 0) {
                    console.log(`🔷 Found ${allUnionTypes.length} union types: ${allUnionTypes.map(t => t.name).join(', ')}`);
                }
            }
        }
    }

    // If no Elm APIs found, skip generation
    if (allApis.length === 0) {
        console.log('❌ No API endpoints found in Elm models, skipping API route generation');
        return;
    }

    // Report cross-model references
    const dbReferencesArray = Array.from(allDbReferences);
    if (dbReferencesArray.length > 0) {
        console.log(`🔗 Found cross-model DB references: ${dbReferencesArray.join(', ')}`);
    }
    
    // Generate JavaScript routes for each API
    const allRoutes = allApis.map(generateRoute).join('\n\n');

    // Generate Elm client code for each API (with cross-model imports)
    const elmClientCode = generateElmApiClient(allApis, allDbReferences);
    
    // Generate Elm backend types for each API (including union types)
    const elmBackendCode = generateElmBackendTypes(allApis, allUnionTypes);
    
    const outputContent = `/**
 * Auto-Generated API Routes  
 * Generated from #[buildamp_api] annotations in src/models/api/
 * 
 * ⚠️  DO NOT EDIT THIS FILE MANUALLY
 * ⚠️  Changes will be overwritten during next generation
 * 
 * This file replaces manual endpoint switching with individual Express routes
 * that include automatic validation and context injection.
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
    const elmOutputPath = ensureOutputDir(paths.elmGlueDir);
    const elmOutputFile = path.join(elmOutputPath, 'ApiClient.elm');
    fs.writeFileSync(elmOutputFile, elmClientCode);
    
    // Write Elm backend types file
    // BackendTypes.elm goes to elm/backend subdirectory of dest
    const backendOutputPath = ensureOutputDir(path.join(paths.elmOutputPath, 'backend'));
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

// Exported for testing
export const _test = {
    parseApiAnnotations,
    generateRoute,
    rustTypeToElmType,
    generateElmTypeDefinition,
    generateElmEncoder,
    generateElmHttpFunction,
    generateElmApiClient,
    generateElmBackendTypes,
    generateUnionTypesCode,
    convertElmApiToGeneratorFormat
};