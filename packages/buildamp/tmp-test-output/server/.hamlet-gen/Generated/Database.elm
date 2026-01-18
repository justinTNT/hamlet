port module Generated.Database exposing (..)

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

-- MICROBLOGITEM COMPONENT TYPE (Generated from undefined)

{-| Database entity for MicroblogItem
This corresponds to the Rust MicroblogItem struct with database-specific types
-}
type alias MicroblogItemDb =
    {     id : String
    , title : String
    , link : Maybe String
    , image : Maybe String
    , extract : Maybe String
    , ownerComment : String
    , timestamp : Int
    }

-- MICROBLOGITEM ENCODERS/DECODERS

microblogitemDbDecoder : Decode.Decoder MicroblogItemDb
microblogitemDbDecoder =
    Decode.succeed MicroblogItemDb
        |> decodeField "id" Decode.string
        |> decodeField "title" Decode.string
        |> decodeField "link" (Decode.nullable Decode.string)
        |> decodeField "image" (Decode.nullable Decode.string)
        |> decodeField "extract" (Decode.nullable Decode.string)
        |> decodeField "ownerComment" Decode.string
        |> decodeField "timestamp" Decode.int


encodeMicroblogItemDb : MicroblogItemDb -> Encode.Value
encodeMicroblogItemDb item =
    Encode.object
        [ ("id", Encode.string item.id)
        , ("title", Encode.string item.title)
        , ("link", encodeMaybe Encode.string item.link)
        , ("image", encodeMaybe Encode.string item.image)
        , ("extract", encodeMaybe Encode.string item.extract)
        , ("ownerComment", Encode.string item.ownerComment)
        , ("timestamp", Encode.int item.timestamp)
        ]


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
    String.foldl (\char acc -> acc * 31 + Char.toCode char) 0 str


toString : Query a -> String
toString query =
    "filters:" ++ String.fromInt (List.length query.filter) ++ 
    "_sorts:" ++ String.fromInt (List.length query.sort) ++
    "_paginated:" ++ (if query.paginate /= Nothing then "yes" else "no")
