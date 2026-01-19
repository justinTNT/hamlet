module Sse.NewCommentEvent exposing (..)

{-| NewCommentEvent SSE Model
-}


type alias NewCommentEvent =
    { commentId : String
    , postId : String
    , parentCommentId : Maybe String
    , authorName : String
    , authorId : String
    , text : String
    , timestamp : Int
    }
