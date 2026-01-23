module Config.AdminHooks exposing (..)

{-| Admin Hooks Configuration

Defines hooks that trigger events when admin updates specific fields.
When admin updates a field listed here, an event is published to the
buildamp_events queue for background processing.

This enables real-time SSE notifications for admin moderation actions.
-}


adminHooks : List AdminHook
adminHooks =
    [ { table = "item_comment", field = "removed", event = "CommentModerated" }
    ]


type alias AdminHook =
    { table : String
    , field : String
    , event : String
    }
