module Events.CommentModerated exposing (CommentModerated)

{-| CommentModerated Event Payload

This event is triggered by admin hooks when a comment's `removed` field changes.
The event handler fetches additional comment data and broadcasts an SSE event.
-}


type alias CommentModerated =
    { recordId : String -- The comment ID (JSON: record_id)
    , table : String -- Always "item_comment" for this event
    , field : String -- Always "removed" for this event
    , oldValue : String -- Old value as string (JSON: old_value)
    , newValue : String -- New value as string (JSON: new_value)
    }
