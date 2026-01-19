module Events.ProcessVideo exposing (..)

{-| ProcessVideo Event Model
-}

import Framework.Events exposing (CorrelationId, DateTime, ExecuteAt)


type alias ProcessVideo =
    { correlationId : CorrelationId String
    , videoId : String
    , executeAt : ExecuteAt DateTime
    , qualityPreset : Maybe String
    , webhookUrl : Maybe String
    }
