/**
 * Server-Sent Events (SSE) Generation
 *
 * Generates Elm event types and connection helpers from Elm SSE models.
 */

import fs from 'fs';
import path from 'path';
import { getGenerationPaths, ensureOutputDir } from './shared-paths.js';
import { parseElmSseDir } from '../../core/elm-parser-ts.js';

// Generate Elm type alias for an SSE event
function generateElmType(model) {
    const { name, fields } = model;

    const elmFields = fields.map(field => {
        let elmType;
        if (field.elmType === 'RichContent' || field.isRichContent) {
            elmType = 'Encode.Value'; // RichContent is JSONB passthrough
        } else if (field.type === 'String') {
            elmType = 'String';
        } else if (field.type === 'i64' || field.type === 'i32') {
            elmType = 'Int';
        } else if (field.type === 'f64' || field.type === 'f32') {
            elmType = 'Float';
        } else if (field.type === 'bool') {
            elmType = 'Bool';
        } else if (field.type.includes('Vec<String>')) {
            elmType = 'List String';
        } else if (field.type.includes('Vec<')) {
            elmType = 'List String'; // Default for other Vec types
        } else {
            elmType = 'String'; // Default fallback
        }

        if (field.isOptional) {
            // Wrap compound types in parentheses when used with Maybe
            const needsParens = elmType.includes(' ');
            elmType = needsParens ? `Maybe (${elmType})` : `Maybe ${elmType}`;
        }

        // Use camelCase for idiomatic Elm field names
        const elmFieldName = field.camelName || field.name;
        return `    ${elmFieldName} : ${elmType}`;
    });

    return `type alias ${name} =
    { ${elmFields.join('\n    , ')}
    }`;
}

// Generate Elm decoder for an SSE event
function generateElmDecoder(model) {
    const { name, fields } = model;
    const decoderName = `decode${name}`;

    const fieldDecoders = fields.map(field => {
        let decoder;
        if (field.elmType === 'RichContent' || field.isRichContent) {
            decoder = 'Decode.value'; // RichContent is JSONB passthrough
        } else if (field.type === 'String') {
            decoder = 'Decode.string';
        } else if (field.type === 'i64' || field.type === 'i32') {
            decoder = 'Decode.int';
        } else if (field.type === 'f64' || field.type === 'f32') {
            decoder = 'Decode.float';
        } else if (field.type === 'bool') {
            decoder = 'Decode.bool';
        } else if (field.type.includes('Vec<String>')) {
            decoder = '(Decode.list Decode.string)';
        } else if (field.type.includes('Vec<')) {
            decoder = '(Decode.list Decode.string)'; // Default for other Vec types
        } else {
            decoder = 'Decode.string'; // Default fallback
        }

        if (field.isOptional) {
            decoder = `(Decode.maybe ${decoder})`;
        }

        // Use snake_case for JSON field names (wire format)
        const jsonFieldName = field.name;
        return `        |> andMap (Decode.field "${jsonFieldName}" ${decoder})`;
    });

    return `${decoderName} : Decode.Decoder ${name}
${decoderName} =
    Decode.succeed ${name}
${fieldDecoders.join('\n')}`;
}

// Generate Elm encoder for an SSE event (server-side)
function generateElmEncoder(model) {
    const { name, fields } = model;
    const encoderName = `encode${name}`;
    const paramName = name.charAt(0).toLowerCase() + name.slice(1);

    const fieldEncoders = fields.map(field => {
        let encoder;
        if (field.elmType === 'RichContent' || field.isRichContent) {
            encoder = 'identity'; // RichContent is already Encode.Value
        } else if (field.type === 'String') {
            encoder = 'Encode.string';
        } else if (field.type === 'i64' || field.type === 'i32') {
            encoder = 'Encode.int';
        } else if (field.type === 'f64' || field.type === 'f32') {
            encoder = 'Encode.float';
        } else if (field.type === 'bool') {
            encoder = 'Encode.bool';
        } else if (field.type.includes('Vec<String>')) {
            encoder = '(Encode.list Encode.string)';
        } else if (field.type.includes('Vec<')) {
            encoder = '(Encode.list Encode.string)';
        } else {
            encoder = 'Encode.string';
        }

        // Use camelCase for Elm record field access (idiomatic Elm)
        // Use snake_case for JSON output (wire format)
        const elmFieldName = field.camelName || field.name;
        const jsonKey = field.name; // snake_case for wire format

        if (field.isOptional) {
            return `        , ( "${jsonKey}", Maybe.withDefault Encode.null (Maybe.map ${encoder} ${paramName}.${elmFieldName}) )`;
        }

        return `        , ( "${jsonKey}", ${encoder} ${paramName}.${elmFieldName} )`;
    });

    // First field without leading comma
    const firstField = fieldEncoders[0].replace('        , ', '          ');
    const restFields = fieldEncoders.slice(1);

    return `${encoderName} : ${name} -> Encode.Value
${encoderName} ${paramName} =
    Encode.object
        [ ${firstField.trim()}
${restFields.join('\n')}
        ]`;
}

// Generate SSE connection helpers
function generateSSEHelpers(allModels) {
    const eventDecoders = allModels.map(model => 
        `        "${model.eventName}" -> Decode.map ${model.name}Event decode${model.name}`
    ).join('\n');
    
    const eventTypes = allModels.map(model => 
        `    | ${model.name}Event ${model.name}`
    ).join('\n');
    
    return `-- SSE Event Union Type
type SSEEvent
    = UnknownEvent String${eventTypes}


-- SSE Event Decoder (use with raw JSON from port)
decodeSSEEvent : String -> Decode.Value -> Result Decode.Error SSEEvent
decodeSSEEvent eventType jsonData =
    case eventType of
${eventDecoders}
            |> (\\decoder -> Decode.decodeValue decoder jsonData)
        _ -> Ok (UnknownEvent eventType)`;
}

// Generate complete SSE Elm module
function generateSSEModule(allModels) {
    const types = allModels.map(generateElmType).join('\n\n\n');
    const decoders = allModels.map(generateElmDecoder).join('\n\n\n');

    return `module BuildAmp.ServerSentEvents exposing (..)

{-| Auto-Generated Server-Sent Events Types and Decoders

DO NOT EDIT - Changes will be overwritten

-}

import Json.Decode as Decode exposing (Decoder)
import Json.Encode as Encode


-- Helper for pipeline decoding
andMap : Decoder a -> Decoder (a -> b) -> Decoder b
andMap =
    Decode.map2 (|>)


-- EVENT TYPES

${types}


-- EVENT DECODERS

${decoders}
`;
}

// Generate server-side SSE module with encoders
function generateSSEServerModule(allModels) {
    const types = allModels.map(generateElmType).join('\n\n\n');
    const encoders = allModels.map(generateElmEncoder).join('\n\n\n');

    return `module BuildAmp.Sse exposing (..)

{-| Auto-Generated Server-Sent Events Types and Encoders

Use these types and encoders when broadcasting SSE events from handlers.

Example:
    Services.broadcast "new_comment_event" (Sse.encodeNewCommentEvent event)

DO NOT EDIT - Changes will be overwritten

-}

import Json.Encode as Encode


-- EVENT TYPES

${types}


-- EVENT ENCODERS

${encoders}
`;
}

// Generate JavaScript SSE connection handler
function generateSSEJavaScript(allModels) {
    return `/**
 * Auto-Generated SSE Connection Handler
 * Connects to server-sent events and sends to Elm
 * 
 * ⚠️  DO NOT EDIT THIS FILE MANUALLY
 * ⚠️  Changes will be overwritten during next generation
 */

/**
 * Setup SSE connection for Elm app
 * @param {Object} app - Elm app instance
 * @param {string} baseUrl - Base URL for SSE endpoint (e.g., '/api/events')
 */
export function setupSSE(app, baseUrl = '/api/events') {
    if (!app || !app.ports || !app.ports.sseSubscription) {
        console.warn('SSE: Elm app or ports not available');
        return;
    }
    
    console.log('📡 Setting up Server-Sent Events connection...');
    
    let eventSource = null;
    
    // Subscribe to SSE subscription requests from Elm
    app.ports.sseSubscription.subscribe(function(config) {
        // Close existing connection if any
        if (eventSource) {
            eventSource.close();
        }
        
        // Create new EventSource connection
        eventSource = new EventSource(config.url || baseUrl);
        
        eventSource.onopen = function(event) {
            console.log('📡 SSE connection opened');
        };
        
        eventSource.onerror = function(event) {
            console.error('📡 SSE connection error:', event);
        };
        
        // Handle incoming events
        eventSource.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                const eventType = data.type || 'unknown';
                const eventData = data.data || {};
                
                // Send to Elm via port (this would need proper event parsing)
                console.log('📡 SSE event received:', eventType, eventData);
                
                // TODO: Implement proper event parsing and send to Elm
                // config.onEvent({ eventType, data: eventData });
                
            } catch (error) {
                console.error('📡 Error parsing SSE event:', error);
            }
        };
    });
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', function() {
        if (eventSource) {
            eventSource.close();
        }
    });
}`;
}

// Generate all SSE-related files
export function generateSSEEvents(config = {}) {
    console.log('🏗️ Generating SSE event handlers...');

    const paths = getGenerationPaths(config);
    const elmSseDir = paths.elmSseDir;

    if (!fs.existsSync(elmSseDir)) {
        console.log(`📁 No SSE models found at ${elmSseDir}, skipping generation`);
        return { models: 0, generated: false };
    }

    const allModels = parseElmSseDir(elmSseDir);

    if (allModels.length === 0) {
        console.log('📁 No SSE models found, skipping generation');
        return { models: 0, generated: false };
    }

    console.log(`📦 Using Elm SSE models from ${elmSseDir}`);
    console.log(`🔍 Found ${allModels.length} SSE models: ${allModels.map(m => m.name).join(', ')}`);

    const elmOutputPath = ensureOutputDir(path.join(paths.webGlueDir, 'BuildAmp'));
    const jsOutputPath = ensureOutputDir(paths.serverGlueDir);
    const serverElmOutputPath = ensureOutputDir(path.join(paths.serverGlueDir, 'BuildAmp'));

    // Generate Elm module for web (decoders)
    const elmContent = generateSSEModule(allModels);
    const elmOutputFile = path.join(elmOutputPath, 'ServerSentEvents.elm');
    fs.writeFileSync(elmOutputFile, elmContent);

    // Generate Elm module for server (encoders)
    const serverElmContent = generateSSEServerModule(allModels);
    const serverElmOutputFile = path.join(serverElmOutputPath, 'Sse.elm');
    fs.writeFileSync(serverElmOutputFile, serverElmContent);

    // Generate JavaScript helper
    const jsContent = generateSSEJavaScript(allModels);
    const jsOutputFile = path.join(jsOutputPath, 'sse-connection.js');
    fs.writeFileSync(jsOutputFile, jsContent);

    console.log(`✅ Generated ${allModels.length} SSE event types`);
    console.log(`📁 Output: ${elmOutputFile} (web), ${serverElmOutputFile} (server)`);

    return {
        models: allModels.length,
        generated: true,
        outputFiles: [elmOutputFile, serverElmOutputFile, jsOutputFile]
    };
}

// Exported for testing
export const _test = {
    generateElmType,
    generateElmDecoder,
    generateElmEncoder,
    generateSSEHelpers,
    generateSSEModule,
    generateSSEServerModule,
    generateSSEJavaScript
};