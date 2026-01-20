/**
 * Elm Shared Modules Generation
 *
 * Generates shared port modules for Database, Events, KV, and Services
 * capabilities from Elm schema models.
 */

import fs from 'fs';
import path from 'path';
import { getGenerationPaths, ensureOutputDir } from './shared-paths.js';
import { parseElmSchemaDir, parseElmConfigDir, parseElmEventsDir, parseElmKvDir } from '../../core/elm-parser-ts.js';

/**
 * Generate all shared Elm modules (configurable version)
 */
export async function generateElmSharedModules(config = {}) {
    console.log('🔧 Generating shared Elm modules...');

    // Use shared path utilities for consistency
    const paths = getGenerationPaths(config);

    // Legacy mode (tests): use flat Generated/ structure under elmOutputPath
    // Normal mode: use serverElmDir/Generated/ and sharedElmDir/Generated/
    const isLegacyMode = config.inputBasePath && !config.src;

    const serverOutputDir = isLegacyMode
        ? ensureOutputDir(path.join(paths.elmOutputPath, 'BuildAmp'))
        : ensureOutputDir(path.join(paths.serverElmDir, 'BuildAmp'));

    const sharedOutputDir = isLegacyMode
        ? ensureOutputDir(path.join(paths.elmOutputPath, 'BuildAmp'))
        : ensureOutputDir(path.join(paths.sharedElmDir, 'BuildAmp'));

    // Server-only modules
    const serverModules = [
        { name: 'Database.elm', content: generateDatabaseModule(paths, config) },
        { name: 'Events.elm', content: generateEventsModule(paths, config) },
        { name: 'KV.elm', content: generateKvModule(paths, config) },
        { name: 'Services.elm', content: generateServicesModule(config) }
    ];

    // Shared modules (used by both web and server)
    const sharedModules = [
        { name: 'Config.elm', content: generateConfigModule(paths, config) }
    ];

    for (const module of serverModules) {
        const filePath = path.join(serverOutputDir, module.name);
        fs.writeFileSync(filePath, module.content);
        console.log(`   ✅ Generated ${module.name}`);
    }

    for (const module of sharedModules) {
        const filePath = path.join(sharedOutputDir, module.name);
        fs.writeFileSync(filePath, module.content);
        console.log(`   ✅ Generated ${module.name} (shared)`);
    }

    // Generate per-model field accessor modules for type-safe query building
    const dbModels = parseDbModels(paths, config);
    const fieldModules = generateFieldAccessorModules(dbModels, serverOutputDir);
    console.log(`   ✅ Generated ${fieldModules.length} field accessor modules`);

    const allModules = [...serverModules, ...sharedModules, ...fieldModules.map(f => `Database/${f}`)];
    console.log(`📊 Generated ${allModules.length} shared modules`);
    return allModules.map(m => m.name || m);
}

/**
 * Generate per-model field accessor modules for type-safe query building
 * Creates modules like Generated/Database/MicroblogItem.elm
 */
function generateFieldAccessorModules(models, serverOutputDir) {
    const databaseDir = ensureOutputDir(path.join(serverOutputDir, 'Database'));
    const generatedModules = [];

    for (const model of models) {
        if (!model.isMainModel) continue; // Skip component types

        const moduleName = `${model.name}.elm`;
        const content = generateFieldAccessorModule(model);
        const filePath = path.join(databaseDir, moduleName);
        fs.writeFileSync(filePath, content);
        generatedModules.push(moduleName);
    }

    return generatedModules;
}

/**
 * Generate a single field accessor module for a database model
 */
function generateFieldAccessorModule(model) {
    const modelName = model.name;
    const dbTypeName = `${modelName}Db`;

    // Generate field accessors with phantom types and encoders
    const fieldAccessors = model.fields.map(field => {
        const snakeFieldName = camelToSnake(field.name);
        const elmFieldName = snakeToCamel(field.name);
        const phantomType = getPhantomType(field);
        const encoder = getFieldEncoder(field);

        return `{-| Field accessor for ${snakeFieldName}
-}
${elmFieldName} : Field ${dbTypeName} ${phantomType}
${elmFieldName} =
    Field "${snakeFieldName}" ${encoder}`;
    }).join('\n\n\n');

    return `module BuildAmp.Database.${modelName} exposing (..)

{-| Type-safe field accessors for ${modelName}

Use these with Interface.Query operators for compile-time safe queries:

    import Interface.Query as Q
    import BuildAmp.Database.${modelName} as ${modelName}

    -- Filter by field
    ${modelName}.title |> Q.eq "Hello"

    -- Sort by field
    Q.desc ${modelName}.createdAt

-}

import Interface.Query exposing (Field(..))
import BuildAmp.Database exposing (${dbTypeName})
import Json.Encode as Encode


${fieldAccessors}
`;
}

/**
 * Get the phantom type for a field (used in Field model value)
 */
function getPhantomType(field) {
    const elmType = field.elmType;

    // Handle special framework types
    if (elmType === 'MultiTenant' || elmType === 'String') {
        return 'String';
    }
    if (elmType === 'Int' || elmType === 'Timestamp' || elmType === 'CreateTimestamp' || elmType === 'UpdateTimestamp') {
        return 'Int';
    }
    if (elmType === 'Float') {
        return 'Float';
    }
    if (elmType === 'Bool') {
        return 'Bool';
    }
    if (elmType === 'SoftDelete') {
        return '(Maybe Int)';
    }
    if (elmType.startsWith('Maybe ')) {
        const innerType = elmType.slice(6);
        const phantomInner = getPhantomTypeSimple(innerType);
        return `(Maybe ${phantomInner})`;
    }

    // Default to String for unknown types
    return 'String';
}

/**
 * Get phantom type for inner types (without Maybe wrapper handling)
 */
function getPhantomTypeSimple(elmType) {
    if (elmType === 'String' || elmType === 'MultiTenant' || elmType === 'Link' || elmType === 'RichContent') {
        return 'String';
    }
    if (elmType === 'Int' || elmType === 'Timestamp' || elmType === 'CreateTimestamp' || elmType === 'UpdateTimestamp') {
        return 'Int';
    }
    if (elmType === 'Float') {
        return 'Float';
    }
    if (elmType === 'Bool') {
        return 'Bool';
    }
    return 'String'; // Default fallback
}

/**
 * Get the JSON encoder for a field type
 */
function getFieldEncoder(field) {
    const elmType = field.elmType;

    if (elmType === 'String' || elmType === 'MultiTenant' || elmType === 'Link' || elmType === 'RichContent') {
        return 'Encode.string';
    }
    if (elmType === 'Int' || elmType === 'Timestamp' || elmType === 'CreateTimestamp' || elmType === 'UpdateTimestamp') {
        return 'Encode.int';
    }
    if (elmType === 'Float') {
        return 'Encode.float';
    }
    if (elmType === 'Bool') {
        return 'Encode.bool';
    }
    if (elmType === 'SoftDelete') {
        return '(Maybe.withDefault Encode.null << Maybe.map Encode.int)';
    }
    if (elmType.startsWith('Maybe ')) {
        const innerType = elmType.slice(6);
        const innerEncoder = getFieldEncoderSimple(innerType);
        return `(Maybe.withDefault Encode.null << Maybe.map ${innerEncoder})`;
    }

    // Default to string encoder for unknown types
    return 'Encode.string';
}

/**
 * Get encoder for inner types (without Maybe wrapper handling)
 */
function getFieldEncoderSimple(elmType) {
    if (elmType === 'String' || elmType === 'Link' || elmType === 'RichContent') {
        return 'Encode.string';
    }
    if (elmType === 'Int' || elmType === 'Timestamp' || elmType === 'CreateTimestamp' || elmType === 'UpdateTimestamp') {
        return 'Encode.int';
    }
    if (elmType === 'Float') {
        return 'Encode.float';
    }
    if (elmType === 'Bool') {
        return 'Encode.bool';
    }
    return 'Encode.string';
}

/**
 * Generate Database module with query builder interface
 */
function generateDatabaseModule(paths, config = {}) {
    // Parse Elm schema models
    const dbModels = parseDbModels(paths, config);
    
    return `port module BuildAmp.Database exposing (..)

{-| Generated database interface for TEA handlers

This module provides a strongly-typed, capability-based database interface
that automatically handles host isolation and query building.

@docs Database, Query, Filter, Sort, Pagination
@docs findItems, findItem, createItem, updateItem, killItem
@docs queryAll, byId, byField, where_, orderBy, sortBy, sortByCreatedAt, paginate
@docs GlobalConfig, GlobalState

-}

import Interface.Query as Q
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
    , sort : List Sort
    , paginate : Maybe Pagination
    }


{-| Filter types for queries

Supports both legacy filters (ById, ByField) and the new type-safe
filter expressions from Interface.Query.

-}
type Filter a
    = ById String
    | ByField String String
    | Expr (Q.FilterExpr a)


{-| Sort direction
-}
type Direction
    = Asc
    | Desc


{-| Sort by field name and direction
-}
type alias Sort =
    { field : String
    , direction : Direction
    }


{-| Pagination parameters
-}
type alias Pagination =
    { offset : Int
    , limit : Int
    }


{-| Multi-tenant field type (same as String, for documentation)
-}
type alias MultiTenant = String


{-| Soft-delete field type (nullable timestamp)
-}
type alias SoftDelete = Maybe Int


{-| Auto-populated creation timestamp. Set on INSERT.
-}
type alias CreateTimestamp = Int


{-| Auto-populated update timestamp. Set on INSERT and UPDATE.
-}
type alias UpdateTimestamp = Int


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


{-| Add field filter to query
-}
byField : String -> String -> Query a -> Query a
byField field value query =
    { query | filter = query.filter ++ [ByField field value] }


{-| Sort by a field with direction
-}
sortBy : String -> Direction -> Query a -> Query a
sortBy field direction query =
    { query | sort = query.sort ++ [{ field = field, direction = direction }] }


{-| Sort by created_at descending (convenience helper)
-}
sortByCreatedAt : Query a -> Query a
sortByCreatedAt query =
    sortBy "created_at" Desc query


{-| Add pagination to query
-}
paginate : Int -> Int -> Query a -> Query a
paginate offset limit query =
    { query | paginate = Just { offset = offset, limit = limit } }


-- TYPE-SAFE QUERY BUILDERS (using Interface.Query)

{-| Add a type-safe filter expression to query

Use with operators from Interface.Query:

    import Interface.Query as Q
    import BuildAmp.Database.MicroblogItem as Blog

    DB.findMicroblogItems
        (DB.queryAll
            |> DB.where_ (Blog.viewCount |> Q.gt 100)
            |> DB.where_ (Blog.deletedAt |> Q.isNull)
        )

-}
where_ : Q.FilterExpr a -> Query a -> Query a
where_ expr query =
    { query | filter = query.filter ++ [Expr expr] }


{-| Add a type-safe sort expression to query

Use with sort operators from Interface.Query:

    import Interface.Query as Q
    import BuildAmp.Database.MicroblogItem as Blog

    DB.findMicroblogItems
        (DB.queryAll
            |> DB.orderBy (Q.desc Blog.createdAt)
        )

-}
orderBy : Q.SortExpr a -> Query a -> Query a
orderBy sortExpr query =
    let
        newSort =
            case sortExpr of
                Q.SortAsc field ->
                    { field = field, direction = Asc }

                Q.SortDesc field ->
                    { field = field, direction = Desc }
    in
    { query | sort = query.sort ++ [newSort] }


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


-- ENCODING/DECODING

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
        ByField field value ->
            Encode.object [("type", Encode.string "ByField"), ("field", Encode.string field), ("value", Encode.string value)]
        Expr expr ->
            Q.encodeFilterExpr expr


encodeDirection : Direction -> Encode.Value
encodeDirection direction =
    case direction of
        Asc -> Encode.string "asc"
        Desc -> Encode.string "desc"


encodeSort : Sort -> Encode.Value
encodeSort sort =
    Encode.object
        [ ("field", Encode.string sort.field)
        , ("direction", encodeDirection sort.direction)
        ]


encodeMaybePagination : Maybe Pagination -> Encode.Value
encodeMaybePagination maybePagination =
    case maybePagination of
        Nothing -> Encode.null
        Just pagination ->
            Encode.object
                [ ("offset", Encode.int pagination.offset)
                , ("limit", Encode.int pagination.limit)
                ]


-- DATABASE MODELS AND FUNCTIONS

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
function generateEventsModule(paths, config = {}) {
    // Parse Elm event models
    const eventModels = parseEventModels(paths, config);
    
    return `port module BuildAmp.Events exposing (..)

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


-- ENCODING

${generateEventEncoders(eventModels)}


encodeMaybe : (a -> Encode.Value) -> Maybe a -> Encode.Value
encodeMaybe encoder maybeValue =
    case maybeValue of
        Nothing -> Encode.null
        Just value -> encoder value
`;
}

/**
 * Generate KV Store module with type-safe operations
 */
function generateKvModule(paths, config = {}) {
    // Parse Elm KV models
    const kvModels = parseKvModels(paths, config);
    
    const modelDocs = kvModels.length > 0 ? 
        kvModels.map(model => `@docs ${model.name}`).join('\n') : 
        '';
    
    const modelTypes = kvModels.map(model => `
{-| ${model.name} KV model (from ${model.sourceFile})
-}
type alias ${model.name} =
    { ${model.fields.map(field => {
        const elmFieldName = snakeToCamel(field.name);
        return `${elmFieldName} : ${field.elmType}`;
    }).join('\n    , ')}
    }`).join('\n');

    const typeHelpers = kvModels.map(model => `
{-| Encoder for ${model.name}
-}
encode${model.name} : ${model.name} -> Encode.Value
encode${model.name} record =
    Encode.object
        [ ${model.fields.map(field => {
            const elmFieldName = snakeToCamel(field.name);
            const encoderType = generateBasicEncoder(field.elmType);
            return `( "${field.name}", ${encoderType} record.${elmFieldName} )`;
        }).join('\n        , ')}
        ]


{-| Decoder for ${model.name}
-}
decode${model.name} : Decode.Decoder ${model.name}
decode${model.name} =
    Decode.map${model.fields.length} ${model.name}
        ${model.fields.map((field, i) => {
            const elmFieldName = snakeToCamel(field.name);
            const decoderType = generateBasicDecoder(field.elmType);
            return `(Decode.field "${field.name}" ${decoderType})`;
        }).join('\n        ')}`).join('\n');

    return `port module BuildAmp.KV exposing (..)

{-| Generated KV Store interface for TEA handlers

This module provides a strongly-typed, capability-based key-value store interface
that automatically handles host isolation and TTL management.

Generated from Elm models in: models/Kv/*.elm

@docs KvRequest, KvResult, KvData
@docs set, get, delete, exists
${modelDocs}

-}

import Json.Encode as Encode
import Json.Decode as Decode


-- KV STORE TYPES

{-| KV operation request structure
-}
type alias KvRequest =
    { id : String
    , type_ : String
    , key : String
    , value : Maybe Encode.Value
    , ttl : Maybe Int
    }


{-| KV operation result structure
-}
type alias KvResult =
    { id : String
    , success : Bool
    , operation : String
    , data : Maybe KvData
    , error : Maybe String
    }


{-| KV data wrapper
-}
type alias KvData =
    { value : Maybe Encode.Value
    , found : Bool
    , exists : Bool
    , expired : Maybe Bool
    }

${modelTypes.length > 0 ? '\n-- GENERATED KV MODEL TYPES' + modelTypes : ''}


-- KV OPERATIONS

{-| Set a value in the KV store with optional TTL
-}
set : String -> String -> Encode.Value -> Maybe Int -> Cmd msg
set type_ key value ttl =
    kvSet
        { id = generateRequestId()
        , type_ = type_
        , key = key
        , value = Just value
        , ttl = ttl
        }


{-| Get a value from the KV store
-}
get : String -> String -> Cmd msg
get type_ key =
    kvGet
        { id = generateRequestId()
        , type_ = type_
        , key = key
        , value = Nothing
        , ttl = Nothing
        }


{-| Delete a value from the KV store
-}
delete : String -> String -> Cmd msg
delete type_ key =
    kvDelete
        { id = generateRequestId()
        , type_ = type_
        , key = key
        , value = Nothing
        , ttl = Nothing
        }


{-| Check if a key exists in the KV store
-}
exists : String -> String -> Cmd msg
exists type_ key =
    kvExists
        { id = generateRequestId()
        , type_ = type_
        , key = key
        , value = Nothing
        , ttl = Nothing
        }


-- PORTS

port kvSet : KvRequest -> Cmd msg
port kvGet : KvRequest -> Cmd msg  
port kvDelete : KvRequest -> Cmd msg
port kvExists : KvRequest -> Cmd msg
port kvResult : (KvResult -> msg) -> Sub msg


-- HELPERS

{-| Generate a unique request ID
-}
generateRequestId : () -> String
generateRequestId _ =
    "kv_" ++ String.fromInt (round ((*) 1000000 (toFloat (floor (toFloat 0)))))

${typeHelpers.length > 0 ? '\n-- TYPE HELPERS' + typeHelpers : ''}

`;
}

/**
 * Generate Services module for external API calls
 */
function generateServicesModule(config = {}) {
    return `port module BuildAmp.Services exposing (..)

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
 * Generate Config module with types from Elm config models
 */
function generateConfigModule(paths, config = {}) {
    // Parse Elm config models
    const configModels = parseConfigModels(paths, config);

    if (configModels.length === 0) {
        return `module BuildAmp.Config exposing (..)

{-| Generated configuration types
No config models found in models/config/
-}


-- No configuration models found
type alias EmptyConfig = {}
`;
    }

    return `module BuildAmp.Config exposing (..)

{-| Generated configuration types for app initialization

These types are generated from Elm models in shared/Config/*.elm
They define the shape of configuration data passed to Elm via init flags.

@docs ${configModels.map(m => m.name).join(', ')}

-}

import Json.Decode as Decode
import Json.Encode as Encode


-- CONFIG TYPES

${generateConfigModelTypes(configModels)}


-- DECODERS

${generateConfigDecoders(configModels)}


-- ENCODERS

${generateConfigEncoders(configModels)}


-- HELPERS

encodeMaybe : (a -> Encode.Value) -> Maybe a -> Encode.Value
encodeMaybe encoder maybeValue =
    case maybeValue of
        Nothing -> Encode.null
        Just value -> encoder value


-- Helper for pipeline-style decoding
andMap : Decode.Decoder a -> Decode.Decoder (a -> b) -> Decode.Decoder b
andMap = Decode.map2 (|>)
`;
}


/**
 * Generate Elm type aliases for config models
 */
function generateConfigModelTypes(models) {
    return models.map(model => {
        const fields = model.fields.map((field, index) => {
            const elmFieldName = snakeToCamel(field.name);
            const prefix = index === 0 ? '    ' : '    , ';
            return `${prefix}${elmFieldName} : ${field.elmType}`;
        }).join('\n');

        return `{-| ${model.name} configuration type
Generated from ${model.sourceFile}
-}
type alias ${model.name} =
    { ${fields}
    }`;
    }).join('\n\n\n');
}


/**
 * Generate decoders for config models
 */
function generateConfigDecoders(models) {
    return models.map(model => {
        const decoderName = model.name.charAt(0).toLowerCase() + model.name.slice(1) + 'Decoder';

        return `${decoderName} : Decode.Decoder ${model.name}
${decoderName} =
    Decode.succeed ${model.name}
${model.fields.map(field => {
    const decoder = generateConfigFieldDecoder(field, models);
    return `        |> andMap (Decode.field "${field.name}" ${decoder})`;
}).join('\n')}`;
    }).join('\n\n\n');
}


/**
 * Generate encoders for config models
 */
function generateConfigEncoders(models) {
    return models.map(model => {
        const encoderName = 'encode' + model.name;

        return `${encoderName} : ${model.name} -> Encode.Value
${encoderName} config =
    Encode.object
        [ ${model.fields.map(field => {
            const elmFieldName = snakeToCamel(field.name);
            const encoder = generateConfigFieldEncoder(field, models);
            return `("${field.name}", ${encoder} config.${elmFieldName})`;
        }).join('\n        , ')}
        ]`;
    }).join('\n\n\n');
}


/**
 * Generate decoder for a config field
 */
function generateConfigFieldDecoder(field, allModels) {
    // Check if the type references another config model
    const referencedModel = allModels.find(m => m.name === field.elmType);
    if (referencedModel) {
        return field.elmType.charAt(0).toLowerCase() + field.elmType.slice(1) + 'Decoder';
    }

    if (field.elmType.startsWith('Maybe ')) {
        const innerType = field.elmType.replace('Maybe ', '');
        const innerModel = allModels.find(m => m.name === innerType);
        if (innerModel) {
            return `(Decode.nullable ${innerType.charAt(0).toLowerCase() + innerType.slice(1)}Decoder)`;
        }
        return `(Decode.nullable ${generateBasicDecoder(innerType)})`;
    } else if (field.elmType.startsWith('List ')) {
        const innerType = field.elmType.replace(/List \(?([^)]+)\)?/, '$1');
        const innerModel = allModels.find(m => m.name === innerType);
        if (innerModel) {
            return `(Decode.list ${innerType.charAt(0).toLowerCase() + innerType.slice(1)}Decoder)`;
        }
        return `(Decode.list ${generateBasicDecoder(innerType)})`;
    }

    return generateBasicDecoder(field.elmType);
}


/**
 * Generate encoder for a config field
 */
function generateConfigFieldEncoder(field, allModels) {
    // Check if the type references another config model
    const referencedModel = allModels.find(m => m.name === field.elmType);
    if (referencedModel) {
        return 'encode' + field.elmType;
    }

    if (field.elmType.startsWith('Maybe ')) {
        const innerType = field.elmType.replace('Maybe ', '');
        const innerModel = allModels.find(m => m.name === innerType);
        if (innerModel) {
            return `encodeMaybe encode${innerType}`;
        }
        return `encodeMaybe ${generateBasicEncoder(innerType)}`;
    } else if (field.elmType.startsWith('List ')) {
        const innerType = field.elmType.replace(/List \(?([^)]+)\)?/, '$1');
        const innerModel = allModels.find(m => m.name === innerType);
        if (innerModel) {
            return `Encode.list encode${innerType}`;
        }
        return `Encode.list ${generateBasicEncoder(innerType)}`;
    }

    return generateBasicEncoder(field.elmType);
}


/**
 * Parse config models from Elm Config files
 */
function parseConfigModels(paths, config = {}) {
    const models = [];
    const elmConfigPath = paths.elmConfigDir;

    if (!fs.existsSync(elmConfigPath)) {
        return [];
    }

    const elmModels = parseElmConfigDir(elmConfigPath);
    for (const model of elmModels) {
        models.push({
            name: model.name,
            fields: model.fields.map(f => ({
                name: f.name,
                elmType: elmTypeToElmType(f.elmType),
                isOptional: f.isOptional
            })),
            sourceFile: model.filename,
            isMainModel: true,
            isComponent: false
        });
        // Also add helper types
        for (const helper of (model.helperTypes || [])) {
            models.push({
                name: helper.name,
                fields: helper.fields.map(f => ({
                    name: f.name,
                    elmType: elmTypeToElmType(f.elmType),
                    isOptional: f.isOptional
                })),
                sourceFile: model.filename,
                isMainModel: false,
                isComponent: true
            });
        }
    }
    return models;
}


/**
 * Parse database models from Elm Schema files
 */
function parseDbModels(paths, config = {}) {
    const elmSchemaDir = paths.elmSchemaDir;

    if (!fs.existsSync(elmSchemaDir)) {
        console.warn(`Schema directory not found at ${elmSchemaDir}`);
        return [];
    }

    const elmTypes = parseElmSchemaDir(elmSchemaDir);
    return elmTypes.map(t => ({
        name: t.name,
        fields: t.fields.map(f => ({
            name: snakeToCamel(f.name),
            elmType: elmTypeToElmType(f.rustType),
            rustType: f.rustType,
            isPrimaryKey: f.isPrimaryKey,
            isTimestamp: f.isTimestamp,
            isOptional: f.isOptional,
            isForeignKey: f.isForeignKey,
            referencedTable: f.referencedTable
        })),
        tableName: t.tableName,
        isMainModel: true,
        isComponent: false,
        sourceFile: t.filename
    }));
}

/**
 * Parse KV models from Elm KV files
 */
function parseKvModels(paths, config = {}) {
    const elmKvDir = paths.elmKvDir;

    if (!fs.existsSync(elmKvDir)) {
        return [];
    }

    const elmModels = parseElmKvDir(elmKvDir);
    return elmModels.map(m => ({
        name: m.name,
        fields: m.fields.map(f => ({
            name: f.name,
            elmType: f.elmType,
            isOptional: f.isOptional
        })),
        sourceFile: m.filename
    }));
}


// Helper functions

function snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
              .replace(/_([0-9])/g, (_, digit) => digit);
}

function camelToSnake(str) {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

/**
 * Convert Elm schema types to Elm module types
 * Maps from Elm parser representation to what Database.elm expects
 */
function elmTypeToElmType(elmType) {
    // DatabaseId a -> String (the ID type)
    if (elmType.startsWith('DatabaseId ')) {
        return 'String';
    }
    // Timestamp -> Int
    if (elmType === 'Timestamp') {
        return 'Int';
    }
    // Host -> String
    if (elmType === 'Host') {
        return 'String';
    }
    // ForeignKey Table a -> String (the FK type)
    if (elmType.startsWith('ForeignKey ')) {
        return 'String';
    }
    // RichContent -> String (stored as TEXT/JSONB in database)
    if (elmType === 'RichContent') {
        return 'String';
    }
    // Link -> String (URL stored as TEXT)
    if (elmType === 'Link') {
        return 'String';
    }
    // CorrelationId a -> String (event tracking phantom type)
    if (elmType.startsWith('CorrelationId ')) {
        return 'String';
    }
    // ExecuteAt a -> String (scheduled execution phantom type)
    if (elmType.startsWith('ExecuteAt ')) {
        return 'String';
    }
    // DateTime -> String
    if (elmType === 'DateTime') {
        return 'String';
    }
    // Dict a b -> String (serialize as JSON string)
    if (elmType.startsWith('Dict ')) {
        return 'String';
    }
    // Maybe a -> Maybe a (already correct)
    if (elmType.startsWith('Maybe ')) {
        const innerType = elmType.slice(6);
        // Handle parenthesized inner types like "Maybe (ExecuteAt DateTime)"
        let cleanInner = innerType;
        if (innerType.startsWith('(') && innerType.endsWith(')')) {
            cleanInner = innerType.slice(1, -1);
        }
        const convertedInner = elmTypeToElmType(cleanInner);
        // Add parens if inner type has spaces
        if (convertedInner.includes(' ')) {
            return `Maybe (${convertedInner})`;
        }
        return `Maybe ${convertedInner}`;
    }
    // List a -> List a
    if (elmType.startsWith('List ')) {
        const innerType = elmType.slice(5);
        return `List ${elmTypeToElmType(innerType)}`;
    }
    // Basic types pass through
    return elmType;
}

/**
 * Generate Elm type aliases from parsed database models
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
        const comment = field.rustType ? ` -- ${field.rustType}` : '';
        const elmFieldName = snakeToCamel(field.name);
        const prefix = index === 0 ? '    ' : '    , ';
        return `${prefix}${elmFieldName} : ${field.elmType}${comment}`;
    }).join('\n');
    
    return `{-| Database entity for ${model.name}
-}
type alias ${model.name}Db =
    { ${fields}
    }`;
}

/**
 * Generate create type alias (all user-settable fields, excluding framework-managed fields)
 * MultiTenant (host), SoftDelete (deletedAt), CreateTimestamp, and UpdateTimestamp
 * are handled automatically by the runtime or database.
 * Optional fields are wrapped in Maybe so they can be set during creation.
 */
function generateCreateTypeAlias(model) {
    const createFields = model.fields
        .filter(field => field.name !== 'id' && field.name !== 'timestamp')
        .filter(field =>
            field.elmType !== 'MultiTenant' &&
            field.elmType !== 'SoftDelete' &&
            field.elmType !== 'CreateTimestamp' &&
            field.elmType !== 'UpdateTimestamp'
        );

    if (createFields.length === 0) {
        return `-- No create type needed for ${model.name}`;
    }

    const fields = createFields.map((field, index) => {
        const elmFieldName = snakeToCamel(field.name);
        const prefix = index === 0 ? '    ' : '    , ';
        // Optional fields become Maybe if not already
        const fieldType = field.isOptional && !field.elmType.startsWith('Maybe ')
            ? `Maybe ${field.elmType}`
            : field.elmType;
        return `${prefix}${elmFieldName} : ${fieldType}`;
    }).join('\n');

    return `{-| Database entity for creating new ${model.name}
Framework fields (host, deletedAt) are injected automatically by the runtime.
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
        // SoftDelete is already Maybe Int, don't double-wrap
        // Same for types already starting with Maybe
        const isAlreadyOptional = field.elmType.startsWith('Maybe ') || field.elmType === 'SoftDelete';
        const optionalType = isAlreadyOptional ? field.elmType : `Maybe ${field.elmType}`;
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
    const snakeFieldName = camelToSnake(field.name);
    const decoder = generateFieldDecoder(field);
    return `        |> decodeField "${snakeFieldName}" ${decoder}`;
}).join('\n')}


encode${modelName}Db : ${modelName}Db -> Encode.Value
encode${modelName}Db item =
    Encode.object
        [ ${model.fields.map(field => {
            const snakeFieldName = camelToSnake(field.name);
            const encoder = generateFieldEncoder(field);
            return `("${snakeFieldName}", ${encoder} item.${field.name})`;
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
    const snakeFieldName = camelToSnake(field.name);
    const decoder = generateFieldDecoder(field);
    return `        |> decodeField "${snakeFieldName}" ${decoder}`;
}).join('\n')}


encode${modelName}DbCreate : ${modelName}DbCreate -> Encode.Value
encode${modelName}DbCreate item =
    Encode.object
        [ ${model.fields
            .filter(field => field.name !== 'id' && field.name !== 'timestamp')
            .filter(field =>
                field.elmType !== 'MultiTenant' &&
                field.elmType !== 'SoftDelete' &&
                field.elmType !== 'CreateTimestamp' &&
                field.elmType !== 'UpdateTimestamp'
            )
            .map(field => {
                const snakeFieldName = camelToSnake(field.name);
                // Optional fields need encodeMaybe wrapper
                const encoder = generateFieldEncoder(field, field.isOptional);
                return `("${snakeFieldName}", ${encoder} item.${field.name})`;
            }).join('\n        , ')}
        ]


encode${modelName}DbUpdate : ${modelName}DbUpdate -> Encode.Value
encode${modelName}DbUpdate item =
    Encode.object
        [ ${model.fields
            .filter(field => field.name !== 'id' && field.name !== 'timestamp')
            .map(field => {
                const snakeFieldName = camelToSnake(field.name);
                const encoder = generateFieldEncoder(field, true); // optional for update
                return `("${snakeFieldName}", ${encoder} item.${field.name})`;
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
    if (field.rustType === 'Timestamp' || field.elmType === 'Timestamp' ||
        field.elmType === 'CreateTimestamp' || field.elmType === 'UpdateTimestamp') {
        return 'timestampDecoder';
    }

    // Special handling for SoftDelete - it's defined as Maybe Int (nullable timestamp)
    if (field.elmType === 'SoftDelete') {
        return '(Decode.nullable timestampDecoder)';
    }

    // Special handling for MultiTenant - it's defined as String
    if (field.elmType === 'MultiTenant') {
        return 'Decode.string';
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
        case 'MultiTenant': return 'Decode.string';  // MultiTenant = String
        case 'SoftDelete': return '(Decode.nullable timestampDecoder)';  // SoftDelete = Maybe Int
        case 'Timestamp':
        case 'CreateTimestamp':
        case 'UpdateTimestamp': return 'timestampDecoder';  // Timestamp types
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
    } else if (field.elmType === 'SoftDelete') {
        // SoftDelete = Maybe Int, encode as nullable int
        baseEncoder = 'encodeMaybe Encode.int';
    } else if (field.elmType === 'MultiTenant') {
        // MultiTenant = String
        baseEncoder = 'Encode.string';
    } else if (field.elmType === 'Timestamp' || field.elmType === 'CreateTimestamp' || field.elmType === 'UpdateTimestamp') {
        // Timestamp types = Int
        baseEncoder = 'Encode.int';
    } else if (field.elmType.startsWith('Maybe ')) {
        const innerType = field.elmType.replace('Maybe ', '');
        baseEncoder = `encodeMaybe ${generateBasicEncoder(innerType)}`;
    } else {
        baseEncoder = generateBasicEncoder(field.elmType);
    }

    if (isOptional && !field.elmType.startsWith('Maybe ') && field.elmType !== 'SoftDelete') {
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
            case 'MultiTenant': return 'Encode.string';  // MultiTenant = String
            case 'SoftDelete': return 'encodeMaybe Encode.int';  // SoftDelete = Maybe Int
            case 'Timestamp':
            case 'CreateTimestamp':
            case 'UpdateTimestamp': return 'Encode.int';  // Timestamp types
            default: return 'Encode.string'; // Fallback for custom types
        }
    }
}

/**
 * Parse event models from Elm Events files
 */
function parseEventModels(paths, config = {}) {
    const models = [];
    const elmEventsPath = paths.elmEventsDir;

    if (!fs.existsSync(elmEventsPath)) {
        return [];
    }

    const elmModels = parseElmEventsDir(elmEventsPath);
    for (const model of elmModels) {
        models.push({
            name: model.name,
            fields: model.fields.map(f => ({
                name: f.camelName || f.name,
                rustType: f.type,
                elmType: elmTypeToElmType(f.elmType),
                isOptional: f.isOptional
            })),
            sourceFile: model.filename
        });
    }
    return models;
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

