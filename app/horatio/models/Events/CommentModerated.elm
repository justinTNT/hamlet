module Events.CommentModerated exposing (CommentModerated)

{-| CommentModerated Event Payload

This event is triggered by admin hooks when a comment's `removed` field changes.
The payload contains `before` and `after` row snapshots as JSON values.
The handler decodes these to access specific fields.
-}

import Json.Decode


type alias CommentModerated =
    { before : Json.Decode.Value -- Row state before the update (or null)
    , after : Json.Decode.Value -- Row state after the update (or null)
    }
