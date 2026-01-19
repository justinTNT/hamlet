module Sse.PostDeletedEvent exposing (..)

{-| PostDeletedEvent SSE Model
-}


type alias PostDeletedEvent =
    { postId : String
    , authorId : String
    , timestamp : Int
    }
