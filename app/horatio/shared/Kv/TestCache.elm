module Kv.TestCache exposing (..)

{-| TestCache KV Model
-}


type alias TestCache =
    { key : String
    , data : String
    , ttl : Int
    }
