/**
 * Server-Sent Events (SSE) Generation
 * Generates Elm event types and WebSocket connection helpers from SSE models
 * Enables real-time communication from server to Elm frontend
 */

import fs from 'fs';
import path from 'path';

// Parse SSE event models from Rust file content
function parseSSEModels(content, filename) {
    const models = [];
    const structRegex = /pub struct\s+(\w+)\s*{([^}]+)}/g;
    let match;
    
    while ((match = structRegex.exec(content)) !== null) {
        const [, structName, fieldsContent] = match;
        
        // Parse fields
        const fields = [];
        const fieldRegex = /pub\s+(\w+):\s*([^,\n]+)/g;
        let fieldMatch;
        
        while ((fieldMatch = fieldRegex.exec(fieldsContent)) !== null) {
            const [, fieldName, fieldType] = fieldMatch;
            fields.push({
                name: fieldName,
                type: fieldType.trim().replace(',', ''),
                isOptional: fieldType.includes('Option<'),
                isList: fieldType.includes('Vec<')
            });
        }
        
        // Convert CamelCase to kebab-case for event names
        const eventName = structName
            .replace(/([A-Z])/g, '_$1')
            .toLowerCase()
            .substring(1);
        
        models.push({
            name: structName,
            eventName,
            fields,
            filename
        });
    }
    
    return models;
}

// Generate Elm type alias for an SSE event
function generateElmType(model) {
    const { name, fields } = model;
    
    const elmFields = fields.map(field => {
        let elmType;
        if (field.type === 'String') {
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
            elmType = `Maybe ${elmType}`;
        }
        
        return `    ${field.name} : ${elmType}`;
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
        if (field.type === 'String') {
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
        
        return `        |> andMap (Decode.field "${field.name}" ${decoder})`;
    });
    
    return `${decoderName} : Decode.Decoder ${name}
${decoderName} =
    Decode.succeed ${name}
${fieldDecoders.join('\n')}`;
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


-- SSE Event Decoder
decodeSSEEvent : String -> String -> Result Decode.Error SSEEvent
decodeSSEEvent eventType jsonData =
    case eventType of
${eventDecoders}
        _ -> Ok (UnknownEvent eventType)


-- SSE Connection Helpers

{-| Subscribe to server-sent events
-}
subscribeToSSE : String -> (SSEEvent -> msg) -> Sub msg
subscribeToSSE url toMsg =
    sseSubscription { url = url, onEvent = toMsg }

{-| Port for SSE subscription - implement in JavaScript
-}
port sseSubscription : { url : String, onEvent : SSEEvent -> msg } -> Sub msg`;
}

// Generate complete SSE Elm module
function generateSSEModule(allModels) {
    const types = allModels.map(generateElmType).join('\n\n\n');
    const decoders = allModels.map(generateElmDecoder).join('\n\n\n');
    const helpers = generateSSEHelpers(allModels);
    
    return `module Generated.ServerSentEvents exposing (..)

{-| Auto-Generated Server-Sent Events Types and Decoders
Generated from models in src/models/sse/

⚠️  DO NOT EDIT THIS FILE MANUALLY
⚠️  Changes will be overwritten during next generation

This module provides type-safe SSE event handling for real-time communication.

-}

import Json.Decode as Decode exposing (Decoder)
import Json.Decode.Pipeline exposing (required, optional, hardcoded)


-- Helper for pipeline decoding
andMap : Decoder a -> Decoder (a -> b) -> Decoder b
andMap =
    Decode.map2 (|>)


-- EVENT TYPES

${types}


-- EVENT DECODERS

${decoders}


-- SSE HELPERS

${helpers}`;
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
export function generateSSEEvents() {
    const sseModelsPath = path.join(process.cwd(), 'src/models/sse');
    const elmOutputPath = path.join(process.cwd(), 'app/horatio/server/generated');
    const jsOutputPath = path.join(process.cwd(), 'generated');
    
    if (!fs.existsSync(sseModelsPath)) {
        console.log('📁 No src/models/sse directory found, skipping SSE generation');
        return {
            models: 0,
            generated: false,
            outputFiles: []
        };
    }
    
    // Ensure output directories exist
    if (!fs.existsSync(elmOutputPath)) {
        fs.mkdirSync(elmOutputPath, { recursive: true });
    }
    if (!fs.existsSync(jsOutputPath)) {
        fs.mkdirSync(jsOutputPath, { recursive: true });
    }
    
    const allModels = [];
    
    // Read all .rs files in src/models/sse
    const files = fs.readdirSync(sseModelsPath).filter(file => file.endsWith('.rs') && file !== 'mod.rs');
    
    for (const file of files) {
        const filePath = path.join(sseModelsPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const models = parseSSEModels(content, file);
        allModels.push(...models);
    }
    
    console.log(`🔍 Found ${allModels.length} SSE models: ${allModels.map(m => m.name).join(', ')}`);
    
    if (allModels.length === 0) {
        return {
            models: 0,
            generated: false,
            outputFiles: []
        };
    }
    
    // Generate Elm module
    const elmContent = generateSSEModule(allModels);
    const elmOutputFile = path.join(elmOutputPath, 'ServerSentEvents.elm');
    fs.writeFileSync(elmOutputFile, elmContent);
    console.log(`   ✅ Generated ServerSentEvents.elm`);
    
    // Generate JavaScript helper
    const jsContent = generateSSEJavaScript(allModels);
    const jsOutputFile = path.join(jsOutputPath, 'sse-connection.js');
    fs.writeFileSync(jsOutputFile, jsContent);
    console.log(`   ✅ Generated sse-connection.js`);
    
    return {
        models: allModels.length,
        generated: true,
        outputFiles: [elmOutputFile, jsOutputFile],
        events: allModels.length
    };
}