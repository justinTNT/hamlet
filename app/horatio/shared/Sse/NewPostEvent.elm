module Sse.NewPostEvent exposing (..)

{-| NewPostEvent SSE Model
-}


type alias NewPostEvent =
    { postId : String
    , title : String
    , authorName : String
    , authorId : String
    , extract : Maybe String
    , tags : List String
    , timestamp : Int
    , link : Maybe String
    , image : Maybe String
    }
