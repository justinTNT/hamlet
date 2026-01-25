module BuildAmp.Events exposing (HardDeletesPayload, CommentModeratedPayload, hardDeletesPayloadDecoder, commentModeratedPayloadDecoder, EventContext, EventResult(..), eventContextDecoder, encodeEventResult)

{-| Generated Events Backend Module

This module provides strongly-typed payload types and decoders for Elm event handlers.
Generated from Elm models in: models/Events/*.elm

@docs HardDeletesPayload, CommentModeratedPayload
@docs hardDeletesPayloadDecoder, commentModeratedPayloadDecoder
@docs EventContext, EventResult, eventContextDecoder, encodeEventResult

-}

import Json.Decode as Decode
import Json.Encode as Encode


-- EVENT RESULT TYPE

type EventResult
    = Success { message : String, recordsAffected : Int }
    | Failure { error : String }


encodeEventResult : EventResult -> Encode.Value
encodeEventResult result =
    case result of
        Success data ->
            Encode.object
                [ ("success", Encode.bool True)
                , ("message", Encode.string data.message)
                , ("recordsAffected", Encode.int data.recordsAffected)
                ]

        Failure data ->
            Encode.object
                [ ("success", Encode.bool False)
                , ("error", Encode.string data.error)
                ]


-- EVENT CONTEXT TYPE

type alias EventContext =
    { host : String
    , sessionId : Maybe String
    , correlationId : Maybe String
    , attempt : Int
    , scheduledAt : Int
    , executedAt : Int
    }


eventContextDecoder : Decode.Decoder EventContext
eventContextDecoder =
    Decode.map6 EventContext
        (Decode.field "host" Decode.string)
        (Decode.maybe (Decode.field "sessionId" Decode.string))
        (Decode.maybe (Decode.field "correlationId" Decode.string))
        (Decode.field "attempt" Decode.int)
        (Decode.field "scheduledAt" Decode.int)
        (Decode.field "executedAt" Decode.int)


-- EVENT PAYLOAD TYPES

{-| Payload type for HardDeletes events
Generated from Config/Cron.elm
-}
type alias HardDeletesPayload =
    {}


{-| Payload type for CommentModerated events
Generated from CommentModerated.elm
-}
type alias CommentModeratedPayload =
    {     before : Decode.Value
    , after : Decode.Value
    }


-- EVENT PAYLOAD DECODERS

hardDeletesPayloadDecoder : Decode.Decoder HardDeletesPayload
hardDeletesPayloadDecoder =
    Decode.succeed {}


commentModeratedPayloadDecoder : Decode.Decoder CommentModeratedPayload
commentModeratedPayloadDecoder =
    Decode.map2 CommentModeratedPayload
        (Decode.field "before" Decode.value)
        (Decode.field "after" Decode.value)
