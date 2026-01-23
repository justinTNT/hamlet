module Sse.NewCommentEvent exposing (..)

{-| NewCommentEvent SSE Model
Sent when a new comment is created on an item.
Clients viewing the same item should receive this event.
-}


type alias NewCommentEvent =
    { id : String
    , itemId : String
    , guestId : String
    , parentId : Maybe String
    , authorName : String
    , text : String
    , timestamp : Int
    }
