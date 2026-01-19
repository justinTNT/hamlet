port module Generated.Events exposing (..)

{-| Generated events interface for TEA handlers

This module provides strongly-typed Event Sourcing capabilities with
three distinct interfaces: immediate, scheduled, and recurring events.

@docs pushEvent, scheduleEvent, cronEvent
@docs SendWelcomeEmail, ProcessUpload

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
        , schedule = Nothing
        }


{-| Schedule background event with delay (in seconds)
Usage: Events.scheduleEvent 300 (ProcessUpload { fileId = file.id, processType = "thumbnail" })
-}
scheduleEvent : Int -> EventPayload -> Cmd msg  
scheduleEvent delaySeconds payload =
    eventPush
        { event = encodeEventPayload payload
        , delay = delaySeconds
        , schedule = Nothing
        }


{-| Schedule recurring background event with cron expression
Usage: Events.cronEvent "0 6 * * *" (GenerateReport { reportType = "daily" })
-}
cronEvent : String -> EventPayload -> Cmd msg
cronEvent cronExpression payload =
    eventPush
        { event = encodeEventPayload payload  
        , delay = 0
        , schedule = Just cronExpression
        }


-- EVENT PAYLOAD TYPES (Generated from src/models/events/*.rs)

type EventPayload
    = GenerateDailyReport GenerateDailyReportData
    | ProcessVideo ProcessVideoData
    | SendWelcomeEmail SendWelcomeEmailData


type alias GenerateDailyReportData =
    {    userId : String
    , cronExpression : String
    , timezone : Maybe String
    , reportType : String
    , emailResults : Maybe String
    }


type alias ProcessVideoData =
    {    correlationId : String
    , videoId : String
    , executeAt : String
    , qualityPreset : Maybe String
    , webhookUrl : Maybe String
    }


type alias SendWelcomeEmailData =
    {    correlationId : String
    , userId : String
    , email : String
    , name : String
    , executeAt : Maybe String
    , templateVars : Maybe String
    }


-- PORT INTERFACE (Internal - used by runtime)

port eventPush : EventRequest -> Cmd msg


type alias EventRequest =
    { event : Encode.Value
    , delay : Int
    , schedule : Maybe String
    }


-- ENCODING

encodeEventPayload : EventPayload -> Encode.Value
encodeEventPayload payload =
    case payload of
        GenerateDailyReport data ->
            Encode.object
                [ ("type", Encode.string "GenerateDailyReport")
                , ("data", encodeGenerateDailyReport data)
                ]
                
        ProcessVideo data ->
            Encode.object
                [ ("type", Encode.string "ProcessVideo")
                , ("data", encodeProcessVideo data)
                ]
                
        SendWelcomeEmail data ->
            Encode.object
                [ ("type", Encode.string "SendWelcomeEmail")
                , ("data", encodeSendWelcomeEmail data)
                ]


encodeGenerateDailyReport : GenerateDailyReportData -> Encode.Value
encodeGenerateDailyReport data =
    Encode.object
        [ -- Generated from event model fields
        ("userId", Encode.string data.userId)
        , ("cronExpression", Encode.string data.cronExpression)
        , ("timezone", encodeMaybe Encode.string data.timezone)
        , ("reportType", Encode.string data.reportType)
        , ("emailResults", encodeMaybe Encode.string data.emailResults)
        ]


encodeProcessVideo : ProcessVideoData -> Encode.Value
encodeProcessVideo data =
    Encode.object
        [ -- Generated from event model fields
        ("correlationId", Encode.string data.correlationId)
        , ("videoId", Encode.string data.videoId)
        , ("executeAt", Encode.string data.executeAt)
        , ("qualityPreset", encodeMaybe Encode.string data.qualityPreset)
        , ("webhookUrl", encodeMaybe Encode.string data.webhookUrl)
        ]


encodeSendWelcomeEmail : SendWelcomeEmailData -> Encode.Value
encodeSendWelcomeEmail data =
    Encode.object
        [ -- Generated from event model fields
        ("correlationId", Encode.string data.correlationId)
        , ("userId", Encode.string data.userId)
        , ("email", Encode.string data.email)
        , ("name", Encode.string data.name)
        , ("executeAt", encodeMaybe Encode.string data.executeAt)
        , ("templateVars", encodeMaybe Encode.string data.templateVars)
        ]


encodeMaybe : (a -> Encode.Value) -> Maybe a -> Encode.Value
encodeMaybe encoder maybeValue =
    case maybeValue of
        Nothing -> Encode.null
        Just value -> encoder value
