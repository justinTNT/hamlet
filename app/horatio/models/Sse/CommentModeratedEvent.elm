module Sse.CommentModeratedEvent exposing (..)

{-| CommentModeratedEvent SSE Model
Sent when an admin moderates a comment (sets removed = true/false).
Clients viewing the same item should receive this event to update their UI.
-}


type alias CommentModeratedEvent =
    { commentId : String
    , removed : Bool
    }
