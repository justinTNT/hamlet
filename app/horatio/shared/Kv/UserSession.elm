module Kv.UserSession exposing (..)

{-| UserSession KV Model
-}

import Kv.UserProfile exposing (UserProfile)


type alias UserSession =
    { profile : UserProfile
    , loginTime : Int
    , permissions : List String
    , ttl : Int
    }
