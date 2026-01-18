port module Generated.KV exposing (..)

{-| Generated KV Store interface for TEA handlers

This module provides a strongly-typed, capability-based key-value store interface
that automatically handles host isolation and TTL management.

Generated from Rust models in: models/kv/*.rs

@docs KvRequest, KvResult, KvData
@docs set, get, delete, exists


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



