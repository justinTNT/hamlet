/**
 * Elm Shared Modules Generation
 * 
 * Generates shared port modules for Database, Events, and Services capabilities
 * that are used by TEA handlers for async operations.
 * 
 * Key principles:
 * - Generate capability-based interfaces
 * - Auto-derive types from Rust models
 * - Provide strongly-typed query builders
 * - Hide implementation complexity from developers
 */

import fs from 'fs';
import path from 'path';

/**
 * Generate all shared Elm modules (configurable version)
 */
export async function generateElmSharedModules(config = {}) {
    console.log('🔧 Generating shared Elm modules...');
    
    // Use config values or fallback to auto-detection for backwards compatibility
    const PROJECT_NAME = config.projectName || getProjectNameFallback();
    const outputDir = config.backendElmPath ? 
        `${config.backendElmPath}/Generated` : 
        (PROJECT_NAME ? `app/${PROJECT_NAME}/server/generated/Generated` : 'generated/Generated');
    
    // Auto-detect fallback function (for backwards compatibility)
    function getProjectNameFallback() {
        const appDir = path.join(process.cwd(), 'app');
        if (!fs.existsSync(appDir)) return null;
        
        const projects = fs.readdirSync(appDir).filter(name => {
            const fullPath = path.join(appDir, name);
            const modelsPath = path.join(fullPath, 'models');
            
            // Must be directory with a models/ subdirectory (actual project)
            return fs.statSync(fullPath).isDirectory() && 
                   fs.existsSync(modelsPath);
        });
        
        return projects[0]; // Use first valid project found
    }
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const modules = [
        { name: 'Database.elm', content: generateDatabaseModule(PROJECT_NAME, config) },
        { name: 'Events.elm', content: generateEventsModule(PROJECT_NAME, config) },
        { name: 'Services.elm', content: generateServicesModule(config) }
    ];
    
    for (const module of modules) {
        const filePath = path.join(outputDir, module.name);
        fs.writeFileSync(filePath, module.content);
        console.log(`   ✅ Generated ${module.name}`);
    }
    
    console.log(`📊 Generated ${modules.length} shared modules`);
    return modules.map(m => m.name);
}

/**
 * Generate Database module with query builder interface
 */
function generateDatabaseModule(PROJECT_NAME, config = {}) {
    // Parse actual Rust models to generate correct Elm types
    const dbModels = parseRustDbModels(PROJECT_NAME, config);
    
    return `port module Generated.Database exposing (..)

{-| Generated database interface for TEA handlers

This module provides a strongly-typed, capability-based database interface
that automatically handles host isolation and query building.

@docs Database, Query, Filter, Sort, Pagination
@docs findItems, findItem, createItem, updateItem, killItem
@docs queryAll, byId, bySlug, sortByCreatedAt, paginate
@docs GlobalConfig, GlobalState

-}

import Json.Encode as Encode
import Json.Decode as Decode


-- GLOBAL TYPES FOR TEA HANDLERS

{-| Global configuration provided by server at handler initialization
Read-only data that's consistent across the request lifecycle
-}
type alias GlobalConfig =
    { serverNow : Int  -- Server-issued Unix timestamp (milliseconds)
    , hostIsolation : Bool  -- Whether host isolation is enabled
    , environment : String  -- "development", "production", etc.
    }


{-| Global state for the handler instance  
Mutable state that can be updated through TEA Model updates
-}
type alias GlobalState = 
    { requestCount : Int  -- Number of requests processed by this handler
    , lastActivity : Int  -- Last activity timestamp
    }


{-| Database service type - opaque to handlers
-}
type Database
    = Database


{-| Query builder for composable database operations
-}
type alias Query a =
    { filter : List (Filter a)
    , sort : List (Sort a)  
    , paginate : Maybe Pagination
    }


{-| Filter types for different models
-}
type Filter a
    = ById String
    | BySlug String
    | ByUserId String
    | ByField String String


{-| Sort options
-}
type Sort a
    = CreatedAtAsc
    | CreatedAtDesc
    | TitleAsc
    | TitleDesc


{-| Pagination parameters
-}
type alias Pagination =
    { offset : Int
    , limit : Int
    }


-- QUERY BUILDERS

{-| Empty query - returns all records
-}
queryAll : Query a
queryAll =
    { filter = []
    , sort = []
    , paginate = Nothing
    }


{-| Add ID filter to query
-}
byId : String -> Query a -> Query a
byId id query =
    { query | filter = query.filter ++ [ById id] }


{-| Add slug filter to query
-}
bySlug : String -> Query a -> Query a
bySlug slug query =
    { query | filter = query.filter ++ [BySlug slug] }


{-| Sort by created_at descending
-}
sortByCreatedAt : Query a -> Query a
sortByCreatedAt query =
    { query | sort = [CreatedAtDesc] }


{-| Add pagination to query
-}
paginate : Int -> Int -> Query a -> Query a
paginate offset limit query =
    { query | paginate = Just { offset = offset, limit = limit } }


-- INTERNAL HELPERS

addFilter : Filter a -> Query a -> Query a  
addFilter filter query =
    { query | filter = query.filter ++ [filter] }


limitOne : Query a -> Query a
limitOne query =
    { query | paginate = Just { offset = 0, limit = 1 } }


-- PORT INTERFACE (Internal - used by runtime)

port dbFind : DbFindRequest -> Cmd msg
port dbCreate : DbCreateRequest -> Cmd msg  
port dbUpdate : DbUpdateRequest -> Cmd msg
port dbKill : DbKillRequest -> Cmd msg
port dbResult : (DbResponse -> msg) -> Sub msg


type alias DbFindRequest =
    { id : String
    , table : String
    , query : Encode.Value
    }


type alias DbCreateRequest =
    { id : String
    , table : String
    , data : Encode.Value
    }


type alias DbUpdateRequest =
    { id : String
    , table : String
    , data : Encode.Value
    , whereClause : String
    , params : List String
    }


type alias DbKillRequest =
    { id : String
    , table : String
    , whereClause : String
    , params : List String
    }


type alias DbResponse =
    { id : String
    , success : Bool
    , data : Maybe Encode.Value
    , error : Maybe String
    }


-- ENCODING/DECODING (Generated from Rust models)

encodeQuery : Query a -> Encode.Value
encodeQuery query =
    Encode.object
        [ ("filter", Encode.list encodeFilter query.filter)
        , ("sort", Encode.list encodeSort query.sort)
        , ("paginate", encodeMaybePagination query.paginate)
        ]


encodeFilter : Filter a -> Encode.Value
encodeFilter filter =
    case filter of
        ById id ->
            Encode.object [("type", Encode.string "ById"), ("value", Encode.string id)]
        BySlug slug ->
            Encode.object [("type", Encode.string "BySlug"), ("value", Encode.string slug)]
        ByUserId userId ->
            Encode.object [("type", Encode.string "ByUserId"), ("value", Encode.string userId)]
        ByField field value ->
            Encode.object [("type", Encode.string "ByField"), ("field", Encode.string field), ("value", Encode.string value)]


encodeSort : Sort a -> Encode.Value
encodeSort sort =
    case sort of
        CreatedAtAsc -> Encode.string "created_at_asc"
        CreatedAtDesc -> Encode.string "created_at_desc"
        TitleAsc -> Encode.string "title_asc"
        TitleDesc -> Encode.string "title_desc"


encodeMaybePagination : Maybe Pagination -> Encode.Value
encodeMaybePagination maybePagination =
    case maybePagination of
        Nothing -> Encode.null
        Just pagination ->
            Encode.object
                [ ("offset", Encode.int pagination.offset)
                , ("limit", Encode.int pagination.limit)
                ]


-- DATABASE MODELS AND FUNCTIONS (Generated from Rust database models)

${generateDbModelTypes(dbModels)}


encodeMaybe : (a -> Encode.Value) -> Maybe a -> Encode.Value
encodeMaybe encoder maybeValue =
    case maybeValue of
        Nothing -> Encode.null
        Just value -> encoder value


-- DECODER HELPER FUNCTIONS

-- Helper for pipeline-style decoding  
andMap : Decode.Decoder a -> Decode.Decoder (a -> b) -> Decode.Decoder b
andMap = Decode.map2 (|>)

decodeField : String -> Decode.Decoder a -> Decode.Decoder (a -> b) -> Decode.Decoder b
decodeField fieldName decoder =
    andMap (Decode.field fieldName decoder)


-- PostgreSQL BIGINT timestamp decoder (handles both string and int)
timestampDecoder : Decode.Decoder Int
timestampDecoder =
    Decode.oneOf
        [ Decode.int
        , Decode.string |> Decode.andThen stringToInt
        ]


stringToInt : String -> Decode.Decoder Int
stringToInt str =
    case String.toInt str of
        Just int -> Decode.succeed int
        Nothing -> Decode.fail ("Could not parse timestamp: " ++ str)


-- UTILITY FUNCTIONS

hashString : String -> Int
hashString str =
    String.foldl (\\char acc -> acc * 31 + Char.toCode char) 0 str


toString : Query a -> String
toString query =
    "filters:" ++ String.fromInt (List.length query.filter) ++ 
    "_sorts:" ++ String.fromInt (List.length query.sort) ++
    "_paginated:" ++ (if query.paginate /= Nothing then "yes" else "no")
`;
}

/**
 * Generate Events module for Event Sourcing
 */
function generateEventsModule(PROJECT_NAME, config = {}) {
    // Parse actual Rust event models to generate correct types
    const eventModels = parseRustEventModels(PROJECT_NAME, config);
    
    return `port module Generated.Events exposing (..)

{-| Generated events interface for TEA handlers

This module provides strongly-typed Event Sourcing capabilities with
three distinct interfaces: immediate, scheduled, and recurring events.

@docs pushEvent, scheduleEvent, cronEvent
@docs SendWelcomeEmail, ProcessUpload

-}

import Json.Encode as Encode


-- EVENT SCHEDULING INTERFACES

{-| Push immediate background event
Usage: Events.pushEvent (SendWelcomeEmail { email = user.email, name = user.name })
-}
pushEvent : EventPayload -> Cmd msg
pushEvent payload =
    eventPush
        { event = encodeEventPayload payload
        , delay = 0
        , schedule = Nothing
        }


{-| Schedule background event with delay (in seconds)
Usage: Events.scheduleEvent 300 (ProcessUpload { fileId = file.id, processType = "thumbnail" })
-}
scheduleEvent : Int -> EventPayload -> Cmd msg  
scheduleEvent delaySeconds payload =
    eventPush
        { event = encodeEventPayload payload
        , delay = delaySeconds
        , schedule = Nothing
        }


{-| Schedule recurring background event with cron expression
Usage: Events.cronEvent "0 6 * * *" (GenerateReport { reportType = "daily" })
-}
cronEvent : String -> EventPayload -> Cmd msg
cronEvent cronExpression payload =
    eventPush
        { event = encodeEventPayload payload  
        , delay = 0
        , schedule = Just cronExpression
        }


-- EVENT PAYLOAD TYPES (Generated from src/models/events/*.rs)

${generateEventPayloadTypes(eventModels)}


-- PORT INTERFACE (Internal - used by runtime)

port eventPush : EventRequest -> Cmd msg


type alias EventRequest =
    { event : Encode.Value
    , delay : Int
    , schedule : Maybe String
    }


-- ENCODING (Generated from Rust event models)

${generateEventEncoders(eventModels)}


encodeMaybe : (a -> Encode.Value) -> Maybe a -> Encode.Value
encodeMaybe encoder maybeValue =
    case maybeValue of
        Nothing -> Encode.null
        Just value -> encoder value
`;
}

/**
 * Generate Services module for external API calls
 */
function generateServicesModule(config = {}) {
    return `port module Generated.Services exposing (..)

{-| Generated services interface for TEA handlers

This module provides strongly-typed external service integration
for making HTTP requests to third-party APIs.

@docs HttpRequest, HttpResponse, HttpMethod
@docs get, post, put, delete, request

-}

import Json.Encode as Encode
import Json.Decode as Decode


-- HTTP REQUEST INTERFACE

{-| Make GET request
Usage: Services.get "https://api.example.com/users" [] handleResponse
-}
get : String -> List (String, String) -> Cmd msg
get url headers =
    request
        { method = GET
        , url = url
        , headers = headers
        , body = Nothing
        }


{-| Make POST request with JSON body
Usage: Services.post "https://api.example.com/users" [] (encodeUser user) handleResponse
-}
post : String -> List (String, String) -> Encode.Value -> Cmd msg
post url headers body =
    request
        { method = POST
        , url = url
        , headers = headers
        , body = Just body
        }


{-| Make PUT request with JSON body
-}
put : String -> List (String, String) -> Encode.Value -> Cmd msg
put url headers body =
    request
        { method = PUT
        , url = url
        , headers = headers
        , body = Just body
        }


{-| Make DELETE request
-}
delete : String -> List (String, String) -> Cmd msg
delete url headers =
    request
        { method = DELETE
        , url = url
        , headers = headers
        , body = Nothing
        }


{-| Make custom HTTP request
-}
request : HttpRequest -> Cmd msg
request req =
    let
        requestId = "req_" ++ String.fromInt (abs (hashString (req.url ++ toString req.method)))
    in
    httpRequest
        { id = requestId
        , method = httpMethodToString req.method
        , url = req.url
        , headers = req.headers
        , body = req.body
        }


-- TYPES

type alias HttpRequest =
    { method : HttpMethod
    , url : String
    , headers : List (String, String)
    , body : Maybe Encode.Value
    }


type alias HttpResponse =
    { status : Int
    , headers : List (String, String)
    , body : String
    }


type HttpMethod
    = GET
    | POST
    | PUT
    | DELETE
    | PATCH


-- PORT INTERFACE (Internal - used by runtime)

port httpRequest : HttpRequestPort -> Cmd msg
port httpResponse : (HttpResponsePort -> msg) -> Sub msg


type alias HttpRequestPort =
    { id : String
    , method : String
    , url : String
    , headers : List (String, String)
    , body : Maybe Encode.Value
    }


type alias HttpResponsePort =
    { id : String
    , success : Bool
    , status : Maybe Int
    , headers : Maybe (List (String, String))
    , body : Maybe String
    , error : Maybe String
    }


-- INTERNAL HELPERS

httpMethodToString : HttpMethod -> String
httpMethodToString method =
    case method of
        GET -> "GET"
        POST -> "POST"  
        PUT -> "PUT"
        DELETE -> "DELETE"
        PATCH -> "PATCH"


toString : HttpMethod -> String
toString = httpMethodToString


hashString : String -> Int
hashString str =
    String.foldl (\\char acc -> acc * 31 + Char.toCode char) 0 str
`;
}

/**
 * Parse Rust database models from src/models/db/*.rs files
 */
function parseRustDbModels(PROJECT_NAME, config = {}) {
    const models = [];
    const dbPath = config.inputBasePath ? `${config.inputBasePath}/src/models/db/` : 
                   (PROJECT_NAME ? `app/${PROJECT_NAME}/models/db/` : 'src/models/db/');
    
    if (!fs.existsSync(dbPath)) {
        console.warn('Database models directory not found, using fallback types');
        return getDefaultDbModels();
    }
    
    const files = fs.readdirSync(dbPath).filter(f => f.endsWith('.rs') && f !== 'mod.rs');
    
    const modelsByName = new Map();
    
    // First pass: collect all model names
    const allKnownModels = [];
    for (const file of files) {
        const filePath = path.join(dbPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const modelStructs = parseRustStructs(content, [], file);
        
        for (const struct of modelStructs) {
            allKnownModels.push(struct.name);
        }
    }
    
    // Second pass: parse fields with knowledge of all models
    for (const file of files) {
        const filePath = path.join(dbPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const modelStructs = parseRustStructs(content, allKnownModels, file);
        
        for (const struct of modelStructs) {
            // Normalize struct name - convert snake_case to PascalCase for Elm compatibility  
            const normalizedName = struct.name.includes('_') 
                ? struct.name.split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('')
                : struct.name.charAt(0).toUpperCase() + struct.name.slice(1);
            
            // Deduplicate models with the same normalized name
            if (!modelsByName.has(normalizedName)) {
                modelsByName.set(normalizedName, {
                    name: normalizedName,
                    fields: struct.fields,
                    tableName: struct.isMainModel ? pluralize(pascalToSnake(struct.name)) : null,
                    isMainModel: struct.isMainModel,
                    isComponent: struct.isComponent,
                    sourceFile: file
                });
            }
        }
    }
    
    models.push(...modelsByName.values());
    return models.length > 0 ? models : getDefaultDbModels();
}

/**
 * Parse Rust struct definitions from file content
 */
function parseRustStructs(content, knownModels = [], filename = null) {
    const structs = [];
    
    // Match all pub struct definitions (no annotation required)
    const structPattern = /pub\s+struct\s+(\w+)\s*\{([^}]+)\}/gs;
    let match;
    
    while ((match = structPattern.exec(content)) !== null) {
        const [, structName, fieldsContent] = match;
        const fields = parseStructFields(fieldsContent, knownModels);
        
        // Classify based on filename convention
        const isMainModel = filename ? fuzzyMatchFilename(structName, filename) : true;
        
        structs.push({
            name: structName,
            fields: fields,
            isMainModel: isMainModel,
            isComponent: !isMainModel
        });
    }
    
    return structs;
}

/**
 * Check if struct name fuzzy matches filename
 * e.g., "MicroblogItem" matches "microblog_item.rs"
 */
function fuzzyMatchFilename(structName, filename) {
    // Remove .rs extension
    const baseName = filename.replace(/\.rs$/, '');
    
    // Convert struct name from PascalCase to snake_case
    const snakeCaseStruct = structName
        .replace(/([A-Z])/g, '_$1')  // Insert underscore before capitals
        .toLowerCase()               // Convert to lowercase
        .replace(/^_/, '');          // Remove leading underscore
    
    return snakeCaseStruct === baseName;
}

/**
 * Parse individual struct fields and convert Rust types to Elm types
 */
function parseStructFields(fieldsContent, knownModels = []) {
    const fields = [];
    const fieldPattern = /pub\s+(\w+):\s*([^,\n]+)/g;
    let match;
    
    while ((match = fieldPattern.exec(fieldsContent)) !== null) {
        const [, fieldName, rustType] = match;
        const elmType = rustTypeToElmType(rustType.trim(), knownModels);
        
        // Skip serde attributes and dependencies for now
        if (!fieldName.startsWith('#[') && !rustType.includes('#[dependency')) {
            fields.push({
                name: fieldName,
                rustType: rustType.trim(),
                elmType: elmType,
                isOptional: rustType.includes('Option<'),
                isList: rustType.includes('Vec<')
            });
        }
    }
    
    return fields;
}

/**
 * Convert Rust types to equivalent Elm types
 */
function rustTypeToElmType(rustType, knownModels = []) {
    // Remove generic parameters for basic mapping
    const baseType = rustType.replace(/<[^>]*>/g, '');
    
    const typeMap = {
        'String': 'String',
        'i32': 'Int', 
        'i64': 'Int',
        'f32': 'Float',
        'f64': 'Float',
        'bool': 'Bool',
        'DatabaseId': 'String',  // DatabaseId<T> becomes String
        'Timestamp': 'Int',      // Timestamp becomes Int (Unix timestamp)
        'DefaultComment': 'String', // DefaultComment becomes String
        'Uuid': 'String',        // Uuid becomes String
        // Model references - assume they exist as Db types
        'ItemComment': 'ItemCommentDb',
        'Guest': 'GuestDb', 
        'Tag': 'TagDb',
    };
    
    if (rustType.startsWith('JsonBlob<')) {
        const match = rustType.match(/JsonBlob<(.+)>/);
        if (match) {
            const innerType = match[1];
            // JsonBlob<T> becomes the component type directly in Elm
            return rustTypeToElmType(innerType, knownModels);
        }
    }
    
    if (rustType.startsWith('Option<')) {
        const match = rustType.match(/Option<(.+)>/);
        if (match) {
            const innerType = match[1];
            return `Maybe ${rustTypeToElmType(innerType, knownModels)}`;
        }
    }
    
    if (rustType.startsWith('Vec<')) {
        const match = rustType.match(/Vec<(.+)>/);
        if (match) {
            const innerType = match[1];
            const innerElmType = rustTypeToElmType(innerType, knownModels);
            // Add parentheses for nested List types to ensure proper syntax
            if (innerElmType.startsWith('List ')) {
                return `List (${innerElmType})`;
            }
            return `List ${innerElmType}`;
        }
    }
    
    // Check if it's a known type
    if (typeMap[baseType]) {
        return typeMap[baseType];
    }
    
    // Check if it's a known domain model (should map to ModelDb type)
    if (knownModels.includes(baseType)) {
        return `${baseType}Db`;
    }
    
    // For enum types (typically PascalCase single words), treat as String
    // This is a heuristic - enums are usually PascalCase without underscores
    if (/^[A-Z][a-zA-Z]*$/.test(baseType)) {
        return 'String';
    }
    
    // Convert unknown complex types to Db versions
    return `${baseType}Db`;
}

/**
 * Fallback database models when parsing fails
 */
function getDefaultDbModels() {
    return [
        {
            name: 'MicroblogItem',
            tableName: 'microblog_items',
            fields: [
                { name: 'id', elmType: 'String', isOptional: false, isList: false },
                { name: 'title', elmType: 'String', isOptional: false, isList: false },
                { name: 'link', elmType: 'Maybe String', isOptional: true, isList: false },
                { name: 'image', elmType: 'Maybe String', isOptional: true, isList: false },
                { name: 'extract', elmType: 'Maybe String', isOptional: true, isList: false },
                { name: 'ownerComment', elmType: 'String', isOptional: false, isList: false },
                { name: 'timestamp', elmType: 'Int', isOptional: false, isList: false }
            ]
        }
    ];
}

function camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function pascalToSnake(str) {
    // Convert PascalCase to snake_case properly
    return str.replace(/([A-Z])/g, (match, letter, index) => {
        return (index > 0 ? '_' : '') + letter.toLowerCase();
    });
}

function pluralize(str) {
    // Simple pluralization - add 's' or handle common cases
    if (str.endsWith('y')) {
        return str.slice(0, -1) + 'ies';
    } else if (str.endsWith('s') || str.endsWith('sh') || str.endsWith('ch') || str.endsWith('x') || str.endsWith('z')) {
        return str + 'es';
    } else {
        return str + 's';
    }
}

function snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
              .replace(/_([0-9])/g, (_, digit) => digit);
}

/**
 * Generate Elm type aliases from parsed Rust database models
 */
function generateDbModelTypes(models) {
    return models.map(model => {
        const modelTypeAlias = generateModelTypeAlias(model);
        const encodersDecoders = generateEncodersDecoders(model);
        
        // Only generate CRUD operations for main models (database tables)
        if (model.isMainModel) {
            const createTypeAlias = generateCreateTypeAlias(model);
            const updateTypeAlias = generateUpdateTypeAlias(model);
            const crudFunctions = generateCrudFunctions(model);
            
            return `-- ${model.name.toUpperCase()} TYPES (Generated from ${model.sourceFile})

${modelTypeAlias}

${createTypeAlias}

${updateTypeAlias}

-- ${model.name.toUpperCase()} CRUD OPERATIONS

${crudFunctions}

-- ${model.name.toUpperCase()} ENCODERS/DECODERS

${encodersDecoders}`;
        } else {
            // Component types: only type alias and simple encoders/decoders (no CRUD)
            const componentEncoders = generateComponentEncodersDecoders(model);
            return `-- ${model.name.toUpperCase()} COMPONENT TYPE (Generated from ${model.sourceFile})

${modelTypeAlias}

-- ${model.name.toUpperCase()} ENCODERS/DECODERS

${componentEncoders}`;
        }
    }).join('\n\n');
}

/**
 * Generate main database model type alias
 */
function generateModelTypeAlias(model) {
    const fields = model.fields.map((field, index) => {
        const comment = field.rustType ? ` -- ${field.rustType} in Rust` : '';
        const elmFieldName = snakeToCamel(field.name);
        const prefix = index === 0 ? '    ' : '    , ';
        return `${prefix}${elmFieldName} : ${field.elmType}${comment}`;
    }).join('\n');
    
    return `{-| Database entity for ${model.name}
This corresponds to the Rust ${model.name} struct with database-specific types
-}
type alias ${model.name}Db =
    { ${fields}
    }`;
}

/**
 * Generate create type alias (only non-optional fields)
 */
function generateCreateTypeAlias(model) {
    const createFields = model.fields
        .filter(field => !field.isOptional && field.name !== 'id' && field.name !== 'timestamp');
    
    if (createFields.length === 0) {
        return `-- No create type needed for ${model.name}`;
    }
    
    const fields = createFields.map((field, index) => {
        const elmFieldName = snakeToCamel(field.name);
        const prefix = index === 0 ? '    ' : '    , ';
        return `${prefix}${elmFieldName} : ${field.elmType}`;
    }).join('\n');
    
    return `{-| Database entity for creating new ${model.name}
Only includes fields that can be set during creation
-}
type alias ${model.name}DbCreate =
    { ${fields}
    }`;
}

/**
 * Generate update type alias (all fields optional)
 */
function generateUpdateTypeAlias(model) {
    const updateFields = model.fields
        .filter(field => field.name !== 'id' && field.name !== 'timestamp');
    
    if (updateFields.length === 0) {
        return `-- No update type needed for ${model.name}`;
    }
    
    const fields = updateFields.map((field, index) => {
        const optionalType = field.elmType.startsWith('Maybe ') ? field.elmType : `Maybe ${field.elmType}`;
        const elmFieldName = snakeToCamel(field.name);
        const prefix = index === 0 ? '    ' : '    , ';
        return `${prefix}${elmFieldName} : ${optionalType}`;
    }).join('\n');
    
    return `{-| Database entity for updating existing ${model.name}
All fields optional to support partial updates
-}
type alias ${model.name}DbUpdate = 
    { ${fields}
    }`;
}

/**
 * Generate CRUD function signatures for a model
 */
function generateCrudFunctions(model) {
    const modelName = model.name;
    const modelNameLower = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    const tableName = model.tableName;
    
    return `{-| Find multiple ${modelNameLower}s with query builder
-}
find${modelName}s : Query ${modelName}Db -> Cmd msg
find${modelName}s query =
    let
        requestId = "find_${tableName}_" ++ String.fromInt (abs (hashString (toString query)))
    in
    dbFind 
        { id = requestId
        , table = "${tableName}"
        , query = encodeQuery query
        }


{-| Create a new ${modelNameLower}
-}
create${modelName} : ${modelName}DbCreate -> (Result String ${modelName}Db -> msg) -> Cmd msg
create${modelName} data toMsg =
    let
        requestId = "create_${tableName}_" ++ String.fromInt (abs (hashString (encode${modelName}DbCreate data |> Encode.encode 0)))
    in
    dbCreate
        { id = requestId
        , table = "${tableName}"
        , data = encode${modelName}DbCreate data
        }


{-| Update an existing ${modelNameLower}
-}
update${modelName} : String -> ${modelName}DbUpdate -> (Result String ${modelName}Db -> msg) -> Cmd msg
update${modelName} id data toMsg =
    let
        requestId = "update_${tableName}_" ++ id
    in
    dbUpdate
        { id = requestId
        , table = "${tableName}"
        , data = encode${modelName}DbUpdate data
        , whereClause = "id = $1"
        , params = [id]
        }


{-| Delete a ${modelNameLower}
-}
kill${modelName} : String -> (Result String Int -> msg) -> Cmd msg
kill${modelName} id toMsg =
    let
        requestId = "kill_${tableName}_" ++ id
    in
    dbKill
        { id = requestId
        , table = "${tableName}"
        , whereClause = "id = $1"
        , params = [id]
        }`;
}

/**
 * Generate simple encoder and decoder for component types (no Create/Update variants)
 */
function generateComponentEncodersDecoders(model) {
    const modelName = model.name;
    
    return `${modelName.toLowerCase()}DbDecoder : Decode.Decoder ${modelName}Db
${modelName.toLowerCase()}DbDecoder =
    Decode.succeed ${modelName}Db
${model.fields.map(field => {
    const elmFieldName = snakeToCamel(field.name);
    const decoder = generateFieldDecoder(field);
    return `        |> decodeField "${field.name}" ${decoder}`;
}).join('\n')}


encode${modelName}Db : ${modelName}Db -> Encode.Value
encode${modelName}Db item =
    Encode.object
        [ ${model.fields.map(field => {
            const elmFieldName = snakeToCamel(field.name);
            const encoder = generateFieldEncoder(field);
            return `("${field.name}", ${encoder} item.${elmFieldName})`;
        }).join('\n        , ')}
        ]`;
}

/**
 * Generate encoder and decoder functions for a model
 */
function generateEncodersDecoders(model) {
    const modelName = model.name;
    
    return `${modelName.toLowerCase()}DbDecoder : Decode.Decoder ${modelName}Db
${modelName.toLowerCase()}DbDecoder =
    Decode.succeed ${modelName}Db
${model.fields.map(field => {
    const elmFieldName = snakeToCamel(field.name);
    const decoder = generateFieldDecoder(field);
    return `        |> decodeField "${field.name}" ${decoder}`;
}).join('\n')}


encode${modelName}DbCreate : ${modelName}DbCreate -> Encode.Value
encode${modelName}DbCreate item =
    Encode.object
        [ ${model.fields
            .filter(field => !field.isOptional && field.name !== 'id' && field.name !== 'timestamp')
            .map(field => {
                const elmFieldName = snakeToCamel(field.name);
                const encoder = generateFieldEncoder(field);
                return `("${field.name}", ${encoder} item.${elmFieldName})`;
            }).join('\n        , ')}
        ]


encode${modelName}DbUpdate : ${modelName}DbUpdate -> Encode.Value
encode${modelName}DbUpdate item =
    Encode.object
        [ ${model.fields
            .filter(field => field.name !== 'id' && field.name !== 'timestamp')
            .map(field => {
                const elmFieldName = snakeToCamel(field.name);
                const encoder = generateFieldEncoder(field, true); // optional for update
                return `("${field.name}", ${encoder} item.${elmFieldName})`;
            }).join('\n        , ')}
        ]`;
}

/**
 * Generate appropriate decoder for a field
 */
function generateFieldDecoder(field) {
    // Special handling for JsonBlob fields - decode JSONB column as component type
    if (field.rustType && field.rustType.startsWith('JsonBlob<')) {
        const componentType = field.elmType; // e.g., "MicroblogItemDataDb"
        // Remove "Db" suffix to get base name, then add "DbDecoder"
        const baseName = componentType.replace(/Db$/, '');
        return `${baseName.toLowerCase()}DbDecoder`;
    }
    
    // Special handling for Timestamp fields - PostgreSQL BIGINT comes as string
    if (field.rustType === 'Timestamp') {
        return 'timestampDecoder';
    }
    
    if (field.elmType.startsWith('Maybe ')) {
        const innerType = field.elmType.replace('Maybe ', '');
        return `(Decode.nullable ${generateBasicDecoder(innerType)})`;
    } else if (field.elmType.startsWith('List ')) {
        const innerType = field.elmType.replace(/List \(?([^)]+)\)?/, '$1');
        return `(Decode.list ${generateBasicDecoder(innerType)})`;
    } else {
        return generateBasicDecoder(field.elmType);
    }
}

/**
 * Generate basic decoder for simple types
 */
function generateBasicDecoder(elmType) {
    switch (elmType) {
        case 'String': return 'Decode.string';
        case 'Int': return 'Decode.int';
        case 'Float': return 'Decode.float';
        case 'Bool': return 'Decode.bool';
        default: return 'Decode.string'; // Fallback for custom types
    }
}

/**
 * Generate appropriate encoder for a field
 */
function generateFieldEncoder(field, isOptional = false) {
    let baseEncoder;
    
    // Special handling for JsonBlob fields - encode using component encoder
    if (field.rustType && field.rustType.startsWith('JsonBlob<')) {
        const componentType = field.elmType; // e.g., "MicroblogItemDataDb"
        const baseName = componentType.replace(/Db$/, '');
        baseEncoder = `encode${baseName}Db`;
    } else if (field.elmType.startsWith('Maybe ')) {
        const innerType = field.elmType.replace('Maybe ', '');
        baseEncoder = `encodeMaybe ${generateBasicEncoder(innerType)}`;
    } else {
        baseEncoder = generateBasicEncoder(field.elmType);
    }
    
    if (isOptional && !field.elmType.startsWith('Maybe ')) {
        return `encodeMaybe ${baseEncoder}`;
    }
    
    return baseEncoder;
}

/**
 * Generate basic encoder for simple types
 */
function generateBasicEncoder(elmType) {
    if (elmType.startsWith('Maybe ')) {
        const innerType = elmType.replace('Maybe ', '');
        return `encodeMaybe ${generateBasicEncoder(innerType)}`;
    } else if (elmType.startsWith('List ')) {
        const innerType = elmType.replace(/List \(?([^)]+)\)?/, '$1');
        return `Encode.list ${generateBasicEncoder(innerType)}`;
    } else {
        switch (elmType) {
            case 'String': return 'Encode.string';
            case 'Int': return 'Encode.int';
            case 'Float': return 'Encode.float';
            case 'Bool': return 'Encode.bool';
            default: return 'Encode.string'; // Fallback for custom types
        }
    }
}

/**
 * Parse Rust event models from src/models/events/*.rs files
 */
function parseRustEventModels(PROJECT_NAME, config = {}) {
    const models = [];
    const eventsPath = config.inputBasePath ? `${config.inputBasePath}/src/models/events/` :
                      (PROJECT_NAME ? `app/${PROJECT_NAME}/models/events/` : 'src/models/events/');
    
    if (!fs.existsSync(eventsPath)) {
        console.warn('Events models directory not found, using fallback types');
        return getDefaultEventModels();
    }
    
    const files = fs.readdirSync(eventsPath).filter(f => f.endsWith('.rs') && f !== 'mod.rs');
    
    for (const file of files) {
        const filePath = path.join(eventsPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const eventStructs = parseRustEventStructs(content);
        
        for (const struct of eventStructs) {
            models.push({
                name: struct.name,
                fields: struct.fields,
                sourceFile: file
            });
        }
    }
    
    return models.length > 0 ? models : getDefaultEventModels();
}

/**
 * Parse Rust event struct definitions from file content
 */
function parseRustEventStructs(content) {
    const structs = [];
    
    // Match pub struct definitions (event models don't need buildamp annotations)
    const structPattern = /pub\s+struct\s+(\w+)\s*\{([^}]+)\}/gs;
    let match;
    
    while ((match = structPattern.exec(content)) !== null) {
        const [, structName, fieldsContent] = match;
        const fields = parseEventStructFields(fieldsContent);
        
        structs.push({
            name: structName,
            fields: fields
        });
    }
    
    return structs;
}

/**
 * Parse event struct fields, skipping framework fields
 */
function parseEventStructFields(fieldsContent) {
    const fields = [];
    const fieldPattern = /pub\s+(\w+):\s*([^,\n]+)/g;
    let match;
    
    while ((match = fieldPattern.exec(fieldsContent)) !== null) {
        const [, fieldName, rustType] = match;
        
        // Skip framework fields
        if (fieldName === 'correlation_id' || fieldName === 'execute_at') {
            continue;
        }
        
        const elmType = eventRustTypeToElmType(rustType.trim());
        
        fields.push({
            name: fieldName,
            rustType: rustType.trim(),
            elmType: elmType,
            isOptional: rustType.includes('Option<')
        });
    }
    
    return fields;
}

/**
 * Convert Rust types to Elm types for event models
 */
function eventRustTypeToElmType(rustType) {
    // Remove generic parameters for basic mapping
    const baseType = rustType.replace(/<[^>]*>/g, '');
    
    const typeMap = {
        'String': 'String',
        'i32': 'Int', 
        'i64': 'Int',
        'f32': 'Float',
        'f64': 'Float',
        'bool': 'Bool',
    };
    
    if (rustType.startsWith('Option<')) {
        const match = rustType.match(/Option<(.+)>/);
        if (match) {
            const innerType = match[1];
            return `Maybe ${eventRustTypeToElmType(innerType)}`;
        }
    }
    
    if (rustType.startsWith('Vec<')) {
        const match = rustType.match(/Vec<(.+)>/);
        if (match) {
            const innerType = match[1];
            return `List ${eventRustTypeToElmType(innerType)}`;
        }
    }
    
    if (rustType.includes('HashMap<String, String>')) {
        return 'List (String, String)';
    }
    
    return typeMap[baseType] || 'String';
}

/**
 * Generate event payload types and union type
 */
function generateEventPayloadTypes(models) {
    if (models.length === 0) {
        return `type EventPayload = NoEvents -- No events found`;
    }
    
    const unionVariants = models.map((model, index) => {
        const prefix = index === 0 ? '    = ' : '    | ';
        return `${prefix}${model.name} ${model.name}Data`;
    }).join('\n');
    const typeAliases = models.map(model => {
        const fields = model.fields.map((field, index) => {
            const elmFieldName = snakeToCamel(field.name);
            const prefix = index === 0 ? '    ' : '    , ';
            return `${prefix}${elmFieldName} : ${field.elmType}`;
        }).join('\n');
        
        return `type alias ${model.name}Data =
    {${fields}
    }`;
    }).join('\n\n\n');
    
    return `type EventPayload
${unionVariants}


${typeAliases}`;
}

/**
 * Generate event encoders
 */
function generateEventEncoders(models) {
    if (models.length === 0) {
        return `encodeEventPayload : EventPayload -> Encode.Value
encodeEventPayload payload =
    case payload of
        NoEvents -> Encode.object []`;
    }
    
    const mainEncoderCases = models.map(model => {
        return `        ${model.name} data ->
            Encode.object
                [ ("type", Encode.string "${model.name}")
                , ("data", encode${model.name} data)
                ]`;
    }).join('\n                \n');
    
    const individualEncoders = models.map(model => {
        const fields = model.fields.map((field, index) => {
            const elmFieldName = snakeToCamel(field.name);
            const encoder = generateBasicEncoder(field.elmType);
            const prefix = index === 0 ? '        ' : '        , ';
            return `${prefix}("${field.name}", ${encoder} data.${elmFieldName})`;
        }).join('\n');
        
        return `encode${model.name} : ${model.name}Data -> Encode.Value
encode${model.name} data =
    Encode.object
        [ -- Generated from event model fields
${fields}
        ]`;
    }).join('\n\n\n');
    
    return `encodeEventPayload : EventPayload -> Encode.Value
encodeEventPayload payload =
    case payload of
${mainEncoderCases}


${individualEncoders}`;
}

/**
 * Fallback event models when parsing fails
 */
function getDefaultEventModels() {
    return [
        {
            name: 'SendWelcomeEmail',
            fields: [
                { name: 'user_id', elmType: 'String', isOptional: false },
                { name: 'email', elmType: 'String', isOptional: false },
                { name: 'name', elmType: 'String', isOptional: false }
            ]
        },
        {
            name: 'ProcessVideo',
            fields: [
                { name: 'file_id', elmType: 'String', isOptional: false },
                { name: 'process_type', elmType: 'String', isOptional: false }
            ]
        }
    ];
}