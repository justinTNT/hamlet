port module BuildAmp.Events exposing (..)

{-| Generated events interface for TEA handlers

This module provides strongly-typed Event Sourcing capabilities:
- pushEvent: Trigger an event immediately
- scheduleEvent: Trigger an event after a delay

For recurring/cron events, use Config/Cron.elm configuration instead.

@docs pushEvent, scheduleEvent

-}

import Json.Encode as Encode


-- EVENT SCHEDULING INTERFACES

{-| Push immediate background event
Usage: Events.pushEvent (SendWelcomeEmail { email = user.email, name = user.name })
-}
pushEvent : EventPayload -> Cmd msg
pushEvent payload =
    eventPush
        { event = encodeEventPayload payload
        , delay = 0
        }


{-| Schedule background event with delay (in seconds)
Usage: Events.scheduleEvent 300 (ProcessUpload { fileId = file.id, processType = "thumbnail" })
-}
scheduleEvent : Int -> EventPayload -> Cmd msg
scheduleEvent delaySeconds payload =
    eventPush
        { event = encodeEventPayload payload
        , delay = delaySeconds
        }


-- EVENT PAYLOAD TYPES (Generated from src/models/events/*.rs)

type EventPayload
    = CommentModerated CommentModeratedData


type alias CommentModeratedData =
    {    recordId : String
    , table : String
    , field : String
    , oldValue : String
    , newValue : String
    }


-- PORT INTERFACE (Internal - used by runtime)

port eventPush : EventRequest -> Cmd msg


type alias EventRequest =
    { event : Encode.Value
    , delay : Int
    }


-- ENCODING

encodeEventPayload : EventPayload -> Encode.Value
encodeEventPayload payload =
    case payload of
        CommentModerated data ->
            Encode.object
                [ ("type", Encode.string "CommentModerated")
                , ("data", encodeCommentModerated data)
                ]


encodeCommentModerated : CommentModeratedData -> Encode.Value
encodeCommentModerated data =
    Encode.object
        [ -- Generated from event model fields
        ("recordId", Encode.string data.recordId)
        , ("table", Encode.string data.table)
        , ("field", Encode.string data.field)
        , ("oldValue", Encode.string data.oldValue)
        , ("newValue", Encode.string data.newValue)
        ]


encodeMaybe : (a -> Encode.Value) -> Maybe a -> Encode.Value
encodeMaybe encoder maybeValue =
    case maybeValue of
        Nothing -> Encode.null
        Just value -> encoder value
