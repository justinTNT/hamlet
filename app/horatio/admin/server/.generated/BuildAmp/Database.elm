port module BuildAmp.Database exposing (..)

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
