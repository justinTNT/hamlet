module BuildAmp.Events exposing (..)

{-| Generated Events Backend Module
No event models found in models/Events/
-}

import Json.Decode as Decode
import Json.Encode as Encode


-- No event models found
type alias EmptyPayload = {}

type EventResult
    = Success { message : String, recordsAffected : Int }
    | Failure { error : String }

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
