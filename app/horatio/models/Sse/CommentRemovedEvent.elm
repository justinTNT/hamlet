module Sse.CommentRemovedEvent exposing (..)

{-| CommentRemovedEvent SSE Model
-}


type alias CommentRemovedEvent =
    { commentId : String
    , postId : String
    , timestamp : Int
    }
