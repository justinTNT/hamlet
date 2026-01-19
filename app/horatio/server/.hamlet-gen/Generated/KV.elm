port module Generated.KV exposing (..)

{-| Generated KV Store interface for TEA handlers

This module provides a strongly-typed, capability-based key-value store interface
that automatically handles host isolation and TTL management.

Generated from Elm models in: shared/Kv/*.elm

@docs KvRequest, KvResult, KvData
@docs set, get, delete, exists
@docs TestCache
@docs UserProfile
@docs UserSession

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


-- GENERATED KV MODEL TYPES
{-| TestCache KV model (from TestCache.elm)
-}
type alias TestCache =
    { key : String
    , data : String
    , ttl : Int
    }

{-| UserProfile KV model (from UserProfile.elm)
-}
type alias UserProfile =
    { id : String
    , name : String
    , string : String
    }

{-| UserSession KV model (from UserSession.elm)
-}
type alias UserSession =
    { profile : UserProfile
    , loginTime : Int
    , permissions : List String
    , ttl : Int
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


-- TYPE HELPERS
{-| Encoder for TestCache
-}
encodeTestCache : TestCache -> Encode.Value
encodeTestCache record =
    Encode.object
        [ ( "key", Encode.string record.key )
        , ( "data", Encode.string record.data )
        , ( "ttl", Encode.int record.ttl )
        ]


{-| Decoder for TestCache
-}
decodeTestCache : Decode.Decoder TestCache
decodeTestCache =
    Decode.map3 TestCache
        (Decode.field "key" Decode.string)
        (Decode.field "data" Decode.string)
        (Decode.field "ttl" Decode.int)

{-| Encoder for UserProfile
-}
encodeUserProfile : UserProfile -> Encode.Value
encodeUserProfile record =
    Encode.object
        [ ( "id", Encode.string record.id )
        , ( "name", Encode.string record.name )
        , ( "string", Encode.string record.string )
        ]


{-| Decoder for UserProfile
-}
decodeUserProfile : Decode.Decoder UserProfile
decodeUserProfile =
    Decode.map3 UserProfile
        (Decode.field "id" Decode.string)
        (Decode.field "name" Decode.string)
        (Decode.field "string" Decode.string)

{-| Encoder for UserSession
-}
encodeUserSession : UserSession -> Encode.Value
encodeUserSession record =
    Encode.object
        [ ( "profile", Encode.string record.profile )
        , ( "login_time", Encode.int record.loginTime )
        , ( "permissions", Encode.list Encode.string record.permissions )
        , ( "ttl", Encode.int record.ttl )
        ]


{-| Decoder for UserSession
-}
decodeUserSession : Decode.Decoder UserSession
decodeUserSession =
    Decode.map4 UserSession
        (Decode.field "profile" Decode.string)
        (Decode.field "login_time" Decode.int)
        (Decode.field "permissions" Decode.string)
        (Decode.field "ttl" Decode.int)

