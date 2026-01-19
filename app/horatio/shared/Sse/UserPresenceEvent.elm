module Sse.UserPresenceEvent exposing (..)

{-| UserPresenceEvent SSE Model
-}


type alias UserPresenceEvent =
    { userId : String
    , displayName : String
    , status : String
    , lastSeen : Maybe Int
    }
