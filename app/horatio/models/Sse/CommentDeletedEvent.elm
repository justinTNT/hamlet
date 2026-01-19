module Sse.CommentDeletedEvent exposing (..)

{-| CommentDeletedEvent SSE Model
-}


type alias CommentDeletedEvent =
    { commentId : String
    , postId : String
    , authorId : String
    , timestamp : Int
    }
