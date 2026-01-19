module Sse.TypingIndicatorEvent exposing (..)

{-| TypingIndicatorEvent SSE Model
-}


type alias TypingIndicatorEvent =
    { userId : String
    , displayName : String
    , postId : String
    , isTyping : Bool
    , timestamp : Int
    }
