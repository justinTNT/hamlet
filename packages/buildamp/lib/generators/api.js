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

// Email regex pattern for validation
const EMAIL_REGEX = '/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/';
const URL_REGEX = '/^https?:\\/\\/.+/';
const UUID_REGEX = '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i';

/**
 * Generate validation checks from validation tags
 */
function generateValidationTagChecks(field) {
    const checks = [];
    const tags = field.validationTags || {};
    const fieldName = field.name;

    // Email validation
    if (tags.validate === 'email') {
        checks.push(`    if (requestData.${fieldName} && !${EMAIL_REGEX}.test(requestData.${fieldName})) {
        return res.status(400).json({ error: '${fieldName} must be a valid email address' });
    }`);
    }

    // URL validation
    if (tags.validate === 'url') {
        checks.push(`    if (requestData.${fieldName} && !${URL_REGEX}.test(requestData.${fieldName})) {
        return res.status(400).json({ error: '${fieldName} must be a valid URL' });
    }`);
    }

    // UUID validation
    if (tags.validate === 'uuid') {
        checks.push(`    if (requestData.${fieldName} && !${UUID_REGEX}.test(requestData.${fieldName})) {
        return res.status(400).json({ error: '${fieldName} must be a valid UUID' });
    }`);
    }

    // Min length validation
    if (tags.minLength !== undefined) {
        checks.push(`    if (requestData.${fieldName} && requestData.${fieldName}.length < ${tags.minLength}) {
        return res.status(400).json({ error: '${fieldName} must be at least ${tags.minLength} characters' });
    }`);
    }

    // Max length validation
    if (tags.maxLength !== undefined) {
        checks.push(`    if (requestData.${fieldName} && requestData.${fieldName}.length > ${tags.maxLength}) {
        return res.status(400).json({ error: '${fieldName} must be at most ${tags.maxLength} characters' });
    }`);
    }

    // Min value validation (for numbers)
    if (tags.min !== undefined) {
        checks.push(`    if (requestData.${fieldName} !== undefined && requestData.${fieldName} < ${tags.min}) {
        return res.status(400).json({ error: '${fieldName} must be at least ${tags.min}' });
    }`);
    }

    // Max value validation (for numbers)
    if (tags.max !== undefined) {
        checks.push(`    if (requestData.${fieldName} !== undefined && requestData.${fieldName} > ${tags.max}) {
        return res.status(400).json({ error: '${fieldName} must be at most ${tags.max}' });
    }`);
    }

    // Custom pattern validation
    if (tags.pattern) {
        const escapedPattern = tags.pattern.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        checks.push(`    if (requestData.${fieldName} && !/${escapedPattern}/.test(requestData.${fieldName})) {
        return res.status(400).json({ error: '${fieldName} format is invalid' });
    }`);
    }

    return checks;
}

// Generate Express route for an API endpoint
function generateRoute(api) {
    const { name, path: apiPath, fields, _elm } = api;

    // Fields that need injection
    const injectFields = fields.filter(f => f.annotations.inject);
    const requiredFields = fields.filter(f => f.annotations.required);

    // Generate required field validation
    const requiredChecks = requiredFields.map(field =>
        `    if (!requestData.${field.name} || requestData.${field.name}.trim() === '') {
        return res.status(400).json({ error: '${field.name} is required' });
    }`
    );

    // Generate validation tag checks for all fields
    const tagChecks = fields.flatMap(generateValidationTagChecks);

    // Combine all validation checks
    const validationChecks = [...requiredChecks, ...tagChecks].join('\n');

    // Generate field injection
    const injectionCode = injectFields.map(field => {
        if (field.annotations.inject === 'host') {
            return `        ${field.name}: req.context.host`;
        }
        return `        ${field.name}: req.context.${field.annotations.inject}`;
    }).join(',\n');

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
 * Generate Elm type definition for API request
 */
function generateElmTypeDefinition(api) {
    if (!api.fields || api.fields.length === 0) {
        return `type alias ${api.struct_name} = {}`;
    }

    const fields = api.fields.map(field => {
        // Use camelCase for idiomatic Elm field names
        const elmFieldName = field.camelName || field.name;
        return `    ${elmFieldName} : ${field.elmType || field.type}`;
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
        const elmType = field.elmType || field.type;
        // Use camelCase for Elm record access, snake_case for JSON keys
        const elmFieldName = field.camelName || field.name;
        const jsonKey = field.name; // snake_case for wire format
        let encoder;
        if (elmType === 'String') {
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
        return `        ( "${jsonKey}", ${encoder} ${paramName}.${elmFieldName} )`;
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
        ? `import BuildAmp.Db exposing (${dbReferencesArray.map(m => m + 'Db').join(', ')})\n`
        : '';

    return `-- Auto-Generated Elm API Client
-- Generated from Elm API definitions in shared/Api/
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

-- TYPE DEFINITIONS

${typeDefinitions}


-- ENCODERS

${encoders}


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
        return `    , ${fieldName} : ${f.elmType}`;
    });

    // Use multi-line record format matching elm_rs style
    if (restFieldLines.length === 0) {
        return `type alias ${typeName} =\n    { ${firstFieldName} : ${firstField.elmType}\n    }`;
    }

    return `type alias ${typeName} =\n    { ${firstFieldName} : ${firstField.elmType}\n${restFieldLines.join('\n')}\n    }`;
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

    // Generate Elm client code for each API (with cross-model imports)
    const elmClientCode = generateElmApiClient(allApis, allDbReferences);

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

    // Write Elm client file
    const elmOutputPath = ensureOutputDir(paths.elmGlueDir);
    const elmOutputFile = path.join(elmOutputPath, 'ApiClient.elm');
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
    generateRoute,
    generateValidationTagChecks,
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
    lcFirst
};
