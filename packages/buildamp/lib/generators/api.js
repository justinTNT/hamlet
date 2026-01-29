/**
 * API Route Generation
 * Generates Express routes and Elm backend types from Elm API definitions in shared/Api/
 * Replaces manual endpoint switching with individual type-safe routes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getGenerationPaths, ensureOutputDir } from './shared-paths.js';
import { parseElmApiDir } from '../../core/elm-parser-ts.js';
import { generateUnionEncoder, generateUnionDecoder, generateUnionTypeDefinition } from './union-types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);




// Generate Express route for an API endpoint
function generateRoute(api) {
    const { name, path: apiPath, fields, _elm } = api;

    // Fields that need validation
    const requiredFields = fields.filter(f => f.annotations.required);
    const trimFields = fields.filter(f => f.annotations.trim);

    // Generate trim logic
    const trimLogic = trimFields.map(field =>
        `    if (requestData.${field.name} && typeof requestData.${field.name} === 'string') {
        requestData.${field.name} = requestData.${field.name}.trim();
    }`
    ).join('\n');

    // Generate required field validation
    const requiredChecks = requiredFields.map(field =>
        `    if (!requestData.${field.name} || requestData.${field.name}.trim() === '') {
        return res.status(400).json({ error: '${field.name} is required' });
    }`
    );

    // Combine all validation checks
    const validationChecks = [...requiredChecks].join('\n');



    // Build JSDoc from Elm doc comments
    const requestDocComment = _elm?.request?.docComment;
    const fieldDocs = fields.filter(f => f.docComment).map(f =>
        ` * @param {*} req.body.${f.name} - ${f.docComment}`
    ).join('\n');

    const jsdocLines = [
        `/**`,
        ` * ${name} - Auto-generated route`,
        requestDocComment ? ` * ${requestDocComment.split('\n').join('\n * ')}` : null,
        ` * @route POST /api/${apiPath}`,
        ` * @generated from ${api.filename}`,
        fieldDocs || null,
        ` */`
    ].filter(Boolean).join('\n');

    return `
${jsdocLines}
server.app.post('/api/${apiPath}', async (req, res) => {
    const host = req.tenant?.host || 'localhost';

    try {
        // Extract request data
        let requestData = req.body;

        // Trim fields
${trimLogic}

        // Field validation

${validationChecks}

        // Ensure context exists
        if (!req.context) {
            req.context = { host };
        }

        // Call Elm business logic
        const elmService = server.getService('elm');
        if (!elmService) {
            throw new Error('Elm service not available');
        }

        const result = await elmService.callHandler('${apiPath}', requestData, {
            host,
            user_id: req.context?.user_id || null,
            is_extension: req.context?.is_extension || false,
            tenant: host
        });

        res.json(result);

    } catch (error) {
        console.error(\`Error handling ${apiPath}:\`, error);
        res.status(400).json({ error: error.message });
    }
});`.trim();
}

/**
 * Map an Elm model type to its generated Elm wire type.
 * RichContent is a String alias in the model but is JSON on the wire.
 */
function toWireType(elmType) {
    return elmType
        .replace(/\bRichContent\b/g, 'Json.Encode.Value');
}

/**
 * Generate Elm type definition for API request
 */
function generateElmTypeDefinition(api) {
    if (!api.fields || api.fields.length === 0) {
        return `type alias ${api.struct_name} = {}`;
    }

    const firstField = api.fields[0];
    const firstFieldName = firstField.camelName || firstField.name;
    const firstFieldType = toWireType(firstField.elmType || firstField.type);

    const restFields = api.fields.slice(1).map(field => {
        const elmFieldName = field.camelName || field.name;
        return `    , ${elmFieldName} : ${toWireType(field.elmType || field.type)}`;
    }).join('\n');

    if (restFields) {
        return `type alias ${api.struct_name} =\n    { ${firstFieldName} : ${firstFieldType}\n${restFields}\n    }`;
    } else {
        return `type alias ${api.struct_name} =\n    { ${firstFieldName} : ${firstFieldType}\n    }`;
    }
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

    function getFieldEncoder(field) {
        const elmType = field.elmType || field.type;
        const elmFieldName = field.camelName || field.name;
        const jsonKey = field.name; // snake_case for wire format
        let encoder;
        if (elmType === 'RichContent') {
            encoder = 'identity';
        } else if (elmType === 'String') {
            encoder = 'Json.Encode.string';
        } else if (elmType === 'Int') {
            encoder = 'Json.Encode.int';
        } else if (elmType === 'Float') {
            encoder = 'Json.Encode.float';
        } else if (elmType === 'Bool') {
            encoder = 'Json.Encode.bool';
        } else if (elmType.startsWith('Maybe ')) {
            encoder = '(Maybe.withDefault Json.Encode.null << Maybe.map Json.Encode.string)';
        } else if (elmType.startsWith('List ')) {
            encoder = '(Json.Encode.list Json.Encode.string)';
        } else {
            encoder = 'Json.Encode.string'; // Fallback
        }
        return { jsonKey, encoder, elmFieldName };
    }

    const firstField = getFieldEncoder(api.fields[0]);
    const restFields = api.fields.slice(1).map(getFieldEncoder);

    const firstLine = `( "${firstField.jsonKey}", ${firstField.encoder} ${paramName}.${firstField.elmFieldName} )`;
    const restLines = restFields.map(f =>
        `        , ( "${f.jsonKey}", ${f.encoder} ${paramName}.${f.elmFieldName} )`
    ).join('\n');

    if (restLines) {
        return `${functionName} : ${api.struct_name} -> Json.Encode.Value
${functionName} ${paramName} =
    Json.Encode.object
        [ ${firstLine}
${restLines}
        ]`;
    } else {
        return `${functionName} : ${api.struct_name} -> Json.Encode.Value
${functionName} ${paramName} =
    Json.Encode.object
        [ ${firstLine}
        ]`;
    }
}

/**
 * Generate Elm HTTP function for API call (with typed response)
 */
function generateElmHttpFunction(api, hasTypedResponse = false) {
    const functionName = `${api.path.toLowerCase()}`;
    const requestType = api.struct_name;
    const encoderName = `encode${api.struct_name}`;
    const responseType = `${api.path}Res`;
    const decoderName = `${lcFirst(api.path)}ResDecoder`;

    if (hasTypedResponse) {
        return `{-| Call ${api.path} API endpoint
-}
${functionName} : ${requestType} -> (Result Http.Error ${responseType} -> msg) -> Cmd msg
${functionName} request toMsg =
    Http.post
        { url = "/api/${api.path}"
        , body = Http.jsonBody (${encoderName} request)
        , expect = Http.expectJson toMsg ${decoderName}
        }`;
    } else {
        // Fallback for APIs without typed response
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
}

/**
 * Generate complete Elm API client module
 * @param {Array} allApis - All parsed API definitions (converted format)
 * @param {Array} rawElmApis - Raw parsed Elm API modules (for response types)
 * @param {Set} dbReferences - Set of DB model names referenced by API models
 */
function generateElmApiClient(allApis, rawElmApis = [], dbReferences = new Set()) {
    // Build a map of endpoint name to raw API for response info
    const rawApiMap = new Map();
    for (const rawApi of rawElmApis) {
        rawApiMap.set(rawApi.name, rawApi);
    }

    // Collect response types and helper types from raw APIs
    const responseTypes = [];
    const helperTypes = [];

    for (const rawApi of rawElmApis) {
        if (rawApi.response && rawApi.response.fields) {
            responseTypes.push({
                name: `${rawApi.name}Res`,
                fields: rawApi.response.fields
            });
        }
        // Collect helper types (deduplicated by name)
        if (rawApi.helperTypes) {
            for (const helper of rawApi.helperTypes) {
                if (!helperTypes.find(h => h.name === helper.name)) {
                    helperTypes.push(helper);
                }
            }
        }
    }

    // Combine all types that need definitions and decoders
    const allResponseTypes = [...helperTypes, ...responseTypes];

    // Generate module exports
    const moduleDeclarations = [];

    // Request types and encoders
    for (const api of allApis) {
        const functionName = api.path.toLowerCase();
        const typeName = api.struct_name;
        const encoderName = `encode${api.struct_name}`;
        moduleDeclarations.push(`${functionName}, ${typeName}, ${encoderName}`);
    }

    // Response types and decoders
    for (const resType of allResponseTypes) {
        const decoderName = `${lcFirst(resType.name)}Decoder`;
        moduleDeclarations.push(`${resType.name}, ${decoderName}`);
    }

    // Generate request type definitions
    const requestTypeDefinitions = allApis.map(generateElmTypeDefinition).join('\n\n');

    // Generate response type definitions using the backend generator functions
    const responseTypeDefinitions = allResponseTypes.map(t =>
        generateBackendTypeAlias(t.name, t.fields)
    ).join('\n\n');

    // Generate request encoders
    const requestEncoders = allApis.map(generateElmEncoder).join('\n\n');

    // Generate response decoders
    const responseDecoders = allResponseTypes.map(t =>
        generateBackendDecoder(t.name, t.fields)
    ).join('\n\n');

    // Generate HTTP functions (with typed responses where available)
    const httpFunctions = allApis.map(api => {
        const rawApi = rawApiMap.get(api.path);
        const hasTypedResponse = rawApi && rawApi.response && rawApi.response.fields;
        return generateElmHttpFunction(api, hasTypedResponse);
    }).join('\n\n');

    // Generate cross-model imports for DB references
    const dbReferencesArray = Array.from(dbReferences);
    const crossModelImports = dbReferencesArray.length > 0
        ? `import BuildAmp.Db exposing (${dbReferencesArray.map(m => m + 'Db').join(', ')})\n`
        : '';

    return `-- Auto-Generated Elm API Client
-- Generated from Elm API definitions in models/Api/
--
-- DO NOT EDIT THIS FILE MANUALLY
-- Changes will be overwritten during next generation

module BuildAmp.ApiClient exposing
    ( ${moduleDeclarations.join('\n    , ')}
    )

import Http
import Json.Decode
import Json.Encode
${crossModelImports}

-- REQUEST TYPES

${requestTypeDefinitions}


-- RESPONSE TYPES

${responseTypeDefinitions}


-- REQUEST ENCODERS

${requestEncoders}


-- RESPONSE DECODERS

${responseDecoders}


-- HTTP FUNCTIONS

${httpFunctions}
`;
}

// =============================================================================
// BACKEND API MODULE GENERATION
// =============================================================================

/**
 * Convert camelCase to snake_case for JSON keys
 */
function camelToSnake(str) {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

/**
 * Convert a type name to its first-char-lowercase version for function names
 */
function lcFirst(str) {
    return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * Generate Elm encoder expression for a field type
 */
function generateFieldEncoder(elmType, accessor) {
    const type = elmType.trim();

    // Maybe type
    if (type.startsWith('Maybe ') || type.startsWith('Maybe(')) {
        const inner = type.startsWith('Maybe ')
            ? type.slice(6).trim()
            : type.slice(6, -1).trim();
        const innerEncoder = generateFieldEncoderSimple(inner);
        return `(Maybe.withDefault Json.Encode.null << Maybe.map (${innerEncoder})) ${accessor}`;
    }

    // List type
    if (type.startsWith('List ') || type.startsWith('List(')) {
        const inner = type.startsWith('List ')
            ? type.slice(5).trim()
            : type.slice(5, -1).trim();
        const innerEncoder = generateFieldEncoderSimple(inner);
        return `(Json.Encode.list (${innerEncoder})) ${accessor}`;
    }

    // Simple encoder
    const encoder = generateFieldEncoderSimple(type);
    return `(${encoder}) ${accessor}`;
}

/**
 * Generate simple encoder function name for a type
 */
function generateFieldEncoderSimple(elmType) {
    const type = elmType.trim();

    // Remove parentheses if wrapping
    let cleanType = type;
    if (cleanType.startsWith('(') && cleanType.endsWith(')')) {
        cleanType = cleanType.slice(1, -1).trim();
    }

    switch (cleanType) {
        case 'String': return 'Json.Encode.string';
        case 'Int': return 'Json.Encode.int';
        case 'Float': return 'Json.Encode.float';
        case 'Bool': return 'Json.Encode.bool';
        case 'RichContent': return 'identity';
        default:
            // Custom type - use lowercase encoder name
            return lcFirst(cleanType) + 'Encoder';
    }
}

/**
 * Generate Elm decoder expression for a field type
 */
function generateFieldDecoder(elmType) {
    const type = elmType.trim();

    // Maybe type - use nullable
    if (type.startsWith('Maybe ') || type.startsWith('Maybe(')) {
        const inner = type.startsWith('Maybe ')
            ? type.slice(6).trim()
            : type.slice(6, -1).trim();
        const innerDecoder = generateFieldDecoderSimple(inner);
        return `(Json.Decode.nullable (${innerDecoder}))`;
    }

    // List type
    if (type.startsWith('List ') || type.startsWith('List(')) {
        const inner = type.startsWith('List ')
            ? type.slice(5).trim()
            : type.slice(5, -1).trim();
        const innerDecoder = generateFieldDecoderSimple(inner);
        return `(Json.Decode.list (${innerDecoder}))`;
    }

    // Simple decoder
    const decoder = generateFieldDecoderSimple(type);
    return `(${decoder})`;
}

/**
 * Generate simple decoder function name for a type
 */
function generateFieldDecoderSimple(elmType) {
    const type = elmType.trim();

    // Remove parentheses if wrapping
    let cleanType = type;
    if (cleanType.startsWith('(') && cleanType.endsWith(')')) {
        cleanType = cleanType.slice(1, -1).trim();
    }

    switch (cleanType) {
        case 'String': return 'Json.Decode.string';
        case 'Int': return 'Json.Decode.int';
        case 'Float': return 'Json.Decode.float';
        case 'Bool': return 'Json.Decode.bool';
        case 'RichContent': return 'Json.Decode.value';
        default:
            // Custom type - use lowercase decoder name
            return lcFirst(cleanType) + 'Decoder';
    }
}

/**
 * Generate a type alias for the backend module
 */
function generateBackendTypeAlias(typeName, fields) {
    if (!fields || fields.length === 0) {
        return `type alias ${typeName} =\n    {}`;
    }

    const firstField = fields[0];
    const firstFieldName = firstField.camelName || firstField.name;
    const restFields = fields.slice(1);

    const restFieldLines = restFields.map(f => {
        const fieldName = f.camelName || f.name;
        return `    , ${fieldName} : ${toWireType(f.elmType)}`;
    });

    // Use multi-line record format matching elm_rs style
    if (restFieldLines.length === 0) {
        return `type alias ${typeName} =\n    { ${firstFieldName} : ${toWireType(firstField.elmType)}\n    }`;
    }

    return `type alias ${typeName} =\n    { ${firstFieldName} : ${toWireType(firstField.elmType)}\n${restFieldLines.join('\n')}\n    }`;
}

/**
 * Generate an encoder for a type
 */
function generateBackendEncoder(typeName, fields) {
    const encoderName = lcFirst(typeName) + 'Encoder';

    if (!fields || fields.length === 0) {
        return `${encoderName} : ${typeName} -> Json.Encode.Value
${encoderName} _ =
    Json.Encode.object []`;
    }

    const firstField = fields[0];
    const firstFieldName = firstField.camelName || firstField.name;
    const firstJsonKey = camelToSnake(firstFieldName);
    const firstEncoder = generateFieldEncoder(firstField.elmType, `struct.${firstFieldName}`);

    const restFields = fields.slice(1);
    const restFieldEncodings = restFields.map(f => {
        const fieldName = f.camelName || f.name;
        const jsonKey = camelToSnake(fieldName);
        const encoder = generateFieldEncoder(f.elmType, `struct.${fieldName}`);
        return `        , ( "${jsonKey}", ${encoder} )`;
    });

    if (restFieldEncodings.length === 0) {
        return `${encoderName} : ${typeName} -> Json.Encode.Value
${encoderName} struct =
    Json.Encode.object
        [ ( "${firstJsonKey}", ${firstEncoder} )
        ]`;
    }

    return `${encoderName} : ${typeName} -> Json.Encode.Value
${encoderName} struct =
    Json.Encode.object
        [ ( "${firstJsonKey}", ${firstEncoder} )
${restFieldEncodings.join('\n')}
        ]`;
}

/**
 * Generate a decoder for a type using the andThen pattern
 */
function generateBackendDecoder(typeName, fields) {
    const decoderName = lcFirst(typeName) + 'Decoder';

    if (!fields || fields.length === 0) {
        return `${decoderName} : Json.Decode.Decoder ${typeName}
${decoderName} =
    Json.Decode.succeed ${typeName}`;
    }

    const fieldDecodings = fields.map(f => {
        const fieldName = f.camelName || f.name;
        const jsonKey = camelToSnake(fieldName);
        const decoder = generateFieldDecoder(f.elmType);
        return `        |> Json.Decode.andThen (\\x -> Json.Decode.map x (Json.Decode.field "${jsonKey}" ${decoder}))`;
    });

    return `${decoderName} : Json.Decode.Decoder ${typeName}
${decoderName} =
    Json.Decode.succeed ${typeName}
${fieldDecodings.join('\n')}`;
}

/**
 * Collect all types from API modules, renaming Request/Response/ServerContext appropriately
 * @param {Array} allElmApis - Raw parsed API modules from parseElmApiDir
 * @returns {Map} Map of type name to type definition
 */
function collectBackendTypes(allElmApis) {
    const types = new Map();

    for (const api of allElmApis) {
        const endpointName = api.name; // e.g., "SubmitComment"

        // Request -> {Endpoint}Req
        if (api.request) {
            const typeName = `${endpointName}Req`;
            types.set(typeName, {
                name: typeName,
                fields: api.request.fields,
                source: api.name,
                kind: 'request'
            });
        }

        // Response -> {Endpoint}Res
        if (api.response) {
            const typeName = `${endpointName}Res`;
            types.set(typeName, {
                name: typeName,
                fields: api.response.fields,
                source: api.name,
                kind: 'response'
            });
        }

        // ServerContext -> {Endpoint}Data
        if (api.serverContext) {
            const typeName = `${endpointName}Data`;
            types.set(typeName, {
                name: typeName,
                fields: api.serverContext.fields,
                source: api.name,
                kind: 'serverContext'
            });
        }

        // Helper types - keep original name (dedupe by name)
        for (const helper of api.helperTypes || []) {
            if (!types.has(helper.name)) {
                types.set(helper.name, {
                    name: helper.name,
                    fields: helper.fields,
                    source: api.name,
                    kind: 'helper'
                });
            }
        }
    }

    return types;
}

/**
 * Topologically sort types so dependencies come before dependents
 */
function sortTypesByDependency(types) {
    const typeNames = new Set(types.keys());
    const sorted = [];
    const visited = new Set();
    const visiting = new Set();

    function getDependencies(typeInfo) {
        const deps = new Set();
        for (const field of typeInfo.fields || []) {
            const elmType = field.elmType;
            // Extract type references from the field type
            const matches = elmType.match(/[A-Z][a-zA-Z0-9]*/g) || [];
            for (const match of matches) {
                if (typeNames.has(match) && match !== typeInfo.name) {
                    deps.add(match);
                }
            }
        }
        return deps;
    }

    function visit(typeName) {
        if (visited.has(typeName)) return;
        if (visiting.has(typeName)) {
            // Circular dependency - just continue
            return;
        }

        visiting.add(typeName);
        const typeInfo = types.get(typeName);
        const deps = getDependencies(typeInfo);

        for (const dep of deps) {
            visit(dep);
        }

        visiting.delete(typeName);
        visited.add(typeName);
        sorted.push(typeInfo);
    }

    for (const typeName of typeNames) {
        visit(typeName);
    }

    return sorted;
}

/**
 * Generate the complete BuildAmp.Api Elm module
 * @param {Array} allElmApis - Raw parsed API modules from parseElmApiDir
 */
function generateElmBackend(allElmApis) {
    // Collect and sort types
    const typesMap = collectBackendTypes(allElmApis);
    const sortedTypes = sortTypesByDependency(typesMap);

    // Generate type aliases
    const typeAliases = sortedTypes.map(t =>
        generateBackendTypeAlias(t.name, t.fields)
    ).join('\n\n\n');

    // Generate encoders
    const encoders = sortedTypes.map(t =>
        generateBackendEncoder(t.name, t.fields)
    ).join('\n\n\n');

    // Generate decoders
    const decoders = sortedTypes.map(t =>
        generateBackendDecoder(t.name, t.fields)
    ).join('\n\n\n');

    // Build exports list
    const typeExports = sortedTypes.map(t => t.name);
    const encoderExports = sortedTypes.map(t => lcFirst(t.name) + 'Encoder');
    const decoderExports = sortedTypes.map(t => lcFirst(t.name) + 'Decoder');

    const allExports = [
        'resultEncoder',
        'resultDecoder',
        ...typeExports,
        ...encoderExports,
        ...decoderExports
    ].join('\n    , ');

    return `-- Auto-Generated Backend API Types
-- Generated from Elm API definitions in models/Api/
--
-- DO NOT EDIT THIS FILE MANUALLY
-- Changes will be overwritten during next generation

module BuildAmp.Api exposing
    ( ${allExports}
    )

import Dict exposing (Dict)
import Json.Decode
import Json.Encode


-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================


resultEncoder : (e -> Json.Encode.Value) -> (t -> Json.Encode.Value) -> (Result e t -> Json.Encode.Value)
resultEncoder errEncoder okEncoder enum =
    case enum of
        Ok inner ->
            Json.Encode.object [ ( "Ok", okEncoder inner ) ]
        Err inner ->
            Json.Encode.object [ ( "Err", errEncoder inner ) ]


resultDecoder : Json.Decode.Decoder e -> Json.Decode.Decoder t -> Json.Decode.Decoder (Result e t)
resultDecoder errDecoder okDecoder =
    Json.Decode.oneOf
        [ Json.Decode.map Ok (Json.Decode.field "Ok" okDecoder)
        , Json.Decode.map Err (Json.Decode.field "Err" errDecoder)
        ]


-- =============================================================================
-- TYPE ALIASES
-- =============================================================================


${typeAliases}


-- =============================================================================
-- ENCODERS
-- =============================================================================


${encoders}


-- =============================================================================
-- DECODERS
-- =============================================================================


${decoders}
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
-- Legacy BackendTypes for web frontend (see BuildAmp.Api for server)

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

    return {
        struct_name: `${elmApi.name}Req`,
        name: `${elmApi.name}Req`,
        path: elmApi.name,
        serverContext: elmApi.serverContext ? 'ServerContext' : null,
        fields: elmApi.request.fields.map(f => ({
            name: f.name,
            type: f.elmType,
            elmType: f.elmType,
            annotations: convertAnnotations(f.annotations),
            validationTags: f.validationTags || {},
            docComment: f.docComment
        })),
        filename: elmApi.filename,
        // Keep Elm-specific data for enhanced generation (includes sse config)
        _elm: elmApi
    };
}

// Generate all API routes
function generateApiRoutes(config = {}) {
    // Use shared path discovery
    const paths = getGenerationPaths(config);

    const outputPath = ensureOutputDir(paths.jsGlueDir);
    const allApis = [];
    const allDbReferences = new Set(); // Track cross-model DB references
    const allUnionTypes = []; // Collect union types from all API modules
    let rawElmApis = []; // Keep raw parsed APIs for backend generation

    // Parse Elm API schemas
    const elmApiDir = paths.elmApiDir || path.join(paths.outputDir, 'models/Api');


    if (fs.existsSync(elmApiDir)) {
        const elmApis = parseElmApiDir(elmApiDir);
        rawElmApis = elmApis; // Store for backend generation
        if (elmApis.length > 0) {
            console.log(`🌳 Parsing Elm API schemas from ${elmApiDir}`);
            for (const elmApi of elmApis) {
                allApis.push(convertElmApiToGeneratorFormat(elmApi));
                // Collect union types from this API module
                if (elmApi.unionTypes && elmApi.unionTypes.length > 0) {
                    allUnionTypes.push(...elmApi.unionTypes);
                }
            }
            console.log(`🔍 Found ${allApis.length} API endpoints: ${allApis.map(api => api.path).join(', ')}`);
            if (allUnionTypes.length > 0) {
                console.log(`🔷 Found ${allUnionTypes.length} union types: ${allUnionTypes.map(t => t.name).join(', ')}`);
            }
        }
    }

    // If no APIs found, skip generation
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

    // Generate Elm client code for each API (with response types and cross-model imports)
    const elmClientCode = generateElmApiClient(allApis, rawElmApis, allDbReferences);

    // Generate Elm backend types for each API (including union types)
    const elmBackendCode = generateElmBackendTypes(allApis, allUnionTypes);

    const outputContent = `/**
 * Auto-Generated API Routes
 * Generated from Elm API definitions in shared/Api/
 *
 * DO NOT EDIT THIS FILE MANUALLY
 * Changes will be overwritten during next generation
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

    // Write Elm client file (in BuildAmp/ subdirectory to match module name)
    const elmBuildAmpPath = ensureOutputDir(path.join(paths.elmGlueDir, 'BuildAmp'));
    const elmOutputFile = path.join(elmBuildAmpPath, 'ApiClient.elm');
    fs.writeFileSync(elmOutputFile, elmClientCode);

    // Write Elm backend types file (legacy - BackendTypes.elm)
    // BackendTypes.elm goes to elm/backend subdirectory of dest
    const backendOutputPath = ensureOutputDir(path.join(paths.elmOutputPath, 'backend'));
    const backendOutputFile = path.join(backendOutputPath, 'BackendTypes.elm');
    fs.writeFileSync(backendOutputFile, elmBackendCode);

    // Generate BuildAmp.Api module for server-side handlers
    // This replaces the manually-maintained Api.Backend module
    if (rawElmApis.length > 0) {
        const backendApiCode = generateElmBackend(rawElmApis);
        const serverElmBuildAmpDir = ensureOutputDir(path.join(paths.serverElmDir, 'BuildAmp'));
        const backendApiFile = path.join(serverElmBuildAmpDir, 'Api.elm');
        fs.writeFileSync(backendApiFile, backendApiCode);
        console.log(`✅ Generated BuildAmp.Api module: ${backendApiFile}`);
    }

    console.log(`✅ Generated API routes: ${jsOutputFile}`);
    console.log(`✅ Generated Elm API client: ${elmOutputFile}`);
    console.log(`✅ Generated Elm backend types: ${backendOutputFile}`);
    console.log(`📊 Generated ${allApis.length} Express routes and ${allApis.length} Elm HTTP functions`);

    // Generate port-based API modules for extension (if extension path exists)
    const extensionPath = path.join(paths.outputDir, 'extension');
    if (fs.existsSync(extensionPath)) {
        const extensionSrcPath = ensureOutputDir(path.join(extensionPath, 'src'));
        const extensionApiPath = ensureOutputDir(path.join(extensionSrcPath, 'Api'));

        // Generate Api.elm (port-based request builders)
        const portApiCode = generatePortBasedApi(allApis, rawElmApis);
        const portApiFile = path.join(extensionSrcPath, 'Api.elm');
        fs.writeFileSync(portApiFile, portApiCode);
        console.log(`✅ Generated port-based Api.elm: ${portApiFile}`);

        // Generate Api/Port.elm (port communication handler)
        const portModuleCode = generateApiPortModule();
        const portModuleFile = path.join(extensionApiPath, 'Port.elm');
        fs.writeFileSync(portModuleFile, portModuleCode);
        console.log(`✅ Generated Api/Port.elm: ${portModuleFile}`);

        // Generate Api/Schema.elm (type re-exports)
        const schemaCode = generateApiSchemaModule(allApis, rawElmApis);
        const schemaFile = path.join(extensionApiPath, 'Schema.elm');
        fs.writeFileSync(schemaFile, schemaCode);
        console.log(`✅ Generated Api/Schema.elm: ${schemaFile}`);
    }

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

// =============================================================================
// PORT-BASED API GENERATION (for browser extensions)
// =============================================================================

/**
 * Convert snake_case to camelCase
 */
function snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Generate port-based Request type and endpoint functions
 * Used by browser extensions that can't make direct HTTP calls
 */
function generatePortBasedApi(allApis, rawElmApis = []) {
    const rawApiMap = new Map();
    for (const rawApi of rawElmApis) {
        rawApiMap.set(rawApi.name, rawApi);
    }

    // Generate endpoint functions
    const endpointFunctions = allApis.map(api => {
        const functionName = lcFirst(api.path);
        const rawApi = rawApiMap.get(api.path);
        const responseType = `${api.path}Res`;
        const decoderName = `Client.${lcFirst(api.path)}ResDecoder`;

        // Build request fields - filter out injected fields like 'host'
        const requestFields = (api.fields || []).filter(f => !f.annotations.inject);

        // Add host field for extension (required for all requests)
        const allFields = [{ name: 'host', elmType: 'String' }, ...requestFields];

        // Generate type signature using camelCase field names
        // Port module uses `import Json.Encode as Encode`, so use Encode.Value
        const fieldTypes = allFields.map(f => {
            const camelName = snakeToCamel(f.name);
            const wireType = toWireType(f.elmType || f.type).replace('Json.Encode.Value', 'Encode.Value');
            return `${camelName} : ${wireType}`;
        }).join(', ');
        const typeSignature = `{ ${fieldTypes} }`;

        // Generate encoder fields - use camelCase for Elm access, snake_case for JSON
        const encoderFields = allFields.map(f => {
            const camelName = snakeToCamel(f.name);
            const jsonKey = f.name; // Keep snake_case for JSON wire format
            const encoder = getSimpleEncoder(f.elmType || f.type);
            return `( "${jsonKey}", ${encoder} req.${camelName} )`;
        });

        return `${functionName} : ${typeSignature} -> Request Client.${responseType}
${functionName} req =
    { endpoint = "${api.path}"
    , body =
        Encode.object
            [ ${encoderFields.join('\n            , ')}
            ]
    , decoder = ${decoderName}
    }`;
    }).join('\n\n\n');

    return `module Api exposing (..)

{-| Port-based API module for browser extensions.

    Auto-generated from Elm API definitions.
    Uses Request type for port-based communication.
-}

import BuildAmp.ApiClient as Client
import Json.Decode as Decode
import Json.Encode as Encode


-- CORE TYPES


type alias Request response =
    { endpoint : String
    , body : Encode.Value
    , decoder : Decode.Decoder response
    }



-- ENDPOINTS


${endpointFunctions}
`;
}

/**
 * Get simple encoder expression for a type
 */
function getSimpleEncoder(elmType) {
    const type = (elmType || 'String').trim();

    if (type === 'RichContent') return 'identity';
    if (type === 'String') return 'Encode.string';
    if (type === 'Int') return 'Encode.int';
    if (type === 'Float') return 'Encode.float';
    if (type === 'Bool') return 'Encode.bool';
    if (type.startsWith('Maybe RichContent')) return '(Maybe.withDefault Encode.null)';
    if (type.startsWith('Maybe ')) return '(Maybe.withDefault Encode.null << Maybe.map Encode.string)';
    if (type.startsWith('List String')) return '(Encode.list Encode.string)';
    if (type.startsWith('List ')) return '(Encode.list Encode.string)';
    return 'Encode.string';
}

/**
 * Generate Api.Port module for port-based communication
 */
function generateApiPortModule() {
    return `module Api.Port exposing (Model, Msg, init, update, send, subscriptions)

{-| Port-based API communication for browser extensions.

    Auto-generated module that handles request/response correlation
    through ports instead of direct HTTP.
-}

import Api
import Dict exposing (Dict)
import Json.Decode as Decode exposing (Decoder)
import Json.Encode as Encode
import Task


-- MODEL


type alias Model msg =
    { pending : Dict String (Result String Encode.Value -> msg)
    , counter : Int
    }


init : Model msg
init =
    { pending = Dict.empty
    , counter = 0
    }



-- MSG


type Msg msg
    = Send String Encode.Value (Result String Encode.Value -> msg)
    | Received Encode.Value



-- UPDATE


update :
    { sendPort : Encode.Value -> Cmd msg
    }
    -> Msg msg
    -> Model msg
    -> ( Model msg, Cmd msg )
update config msg model =
    case msg of
        Send endpoint body callback ->
            let
                newCounter =
                    model.counter + 1

                correlationId =
                    String.fromInt newCounter

                payload =
                    Encode.object
                        [ ( "endpoint", Encode.string endpoint )
                        , ( "body", body )
                        , ( "correlationId", Encode.string correlationId )
                        ]

                newPending =
                    Dict.insert correlationId callback model.pending
            in
            ( { model | counter = newCounter, pending = newPending }
            , config.sendPort payload
            )

        Received val ->
            let
                envelopeDecoder =
                    Decode.map3 (\\c b e -> { correlationId = c, body = b, error = e })
                        (Decode.field "correlationId" Decode.string)
                        (Decode.field "body" Decode.value)
                        (Decode.maybe (Decode.field "error" Decode.string))
            in
            case Decode.decodeValue envelopeDecoder val of
                Ok { correlationId, body, error } ->
                    case Dict.get correlationId model.pending of
                        Just callback ->
                            let
                                result =
                                    case error of
                                        Just err ->
                                            Err err

                                        Nothing ->
                                            Ok body

                                cmd =
                                    Task.succeed (callback result)
                                        |> Task.perform identity
                            in
                            ( { model | pending = Dict.remove correlationId model.pending }
                            , cmd
                            )

                        Nothing ->
                            ( model, Cmd.none )

                Err _ ->
                    ( model, Cmd.none )



-- SUBSCRIPTIONS


subscriptions : ((Encode.Value -> msg) -> Sub msg) -> (Msg msg -> msg) -> Sub msg
subscriptions portSub toMsg =
    portSub (\\val -> toMsg (Received val))



-- HELPER


send : (Result String response -> msg) -> Api.Request response -> Msg msg
send toMsg req =
    let
        callback : Result String Encode.Value -> msg
        callback result =
            case result of
                Ok json ->
                    case Decode.decodeValue req.decoder json of
                        Ok response ->
                            toMsg (Ok response)

                        Err decodeErr ->
                            toMsg (Err (Decode.errorToString decodeErr))

                Err err ->
                    toMsg (Err err)
    in
    Send req.endpoint req.body callback
`;
}

/**
 * Generate Api.Schema module that re-exports types from ApiClient
 */
function generateApiSchemaModule(allApis, rawElmApis = []) {
    // Collect all response type names
    const responseTypes = rawElmApis
        .filter(api => api.response && api.response.fields)
        .map(api => `${api.name}Res`);

    // Collect helper types
    const helperTypes = new Set();
    for (const api of rawElmApis) {
        if (api.helperTypes) {
            for (const helper of api.helperTypes) {
                helperTypes.add(helper.name);
            }
        }
    }

    const allTypes = [...responseTypes, ...helperTypes];

    const typeAliases = allTypes.map(typeName =>
        `type alias ${typeName} =
    Client.${typeName}`
    ).join('\n\n\n');

    return `module Api.Schema exposing
    ( ${allTypes.join('\n    , ')}
    )

{-| Re-export types from BuildAmp.ApiClient for backward compatibility.

    Auto-generated module.
-}

import BuildAmp.ApiClient as Client


${typeAliases}
`;
}

// Exported for testing
export const _test = {
    generateRoute,
    generateElmTypeDefinition,
    generateElmEncoder,
    generateElmHttpFunction,
    generateElmApiClient,
    generateElmBackendTypes,
    generateUnionTypesCode,
    convertElmApiToGeneratorFormat,
    // Backend API module generation
    generateElmBackend,
    generateBackendTypeAlias,
    generateBackendEncoder,
    generateBackendDecoder,
    collectBackendTypes,
    sortTypesByDependency,
    generateFieldEncoder,
    generateFieldDecoder,
    camelToSnake,
    lcFirst,
    // Port-based API generation (for extensions)
    generatePortBasedApi,
    generateApiPortModule,
    generateApiSchemaModule,
    getSimpleEncoder,
    snakeToCamel
};
