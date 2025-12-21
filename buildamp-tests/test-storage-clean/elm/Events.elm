module Events exposing (..)

-- Auto-generated Events module
-- Contains event types with framework types (CorrelationId, ExecuteAt)
-- Generated from: src/models/events/

import Json.Decode
import Json.Encode
import Dict exposing (Dict)
import Set exposing (Set)

-- Event Models (actual events with CorrelationId)

type alias SendWelcomeEmail =
    { correlationId : CorrelationId
    , userId : String
    , email : String
    , name : String
    , executeAt : Maybe (ExecuteAt)
    , templateVars : Maybe (Dict String (String))
    }



type alias ProcessVideo =
    { correlationId : CorrelationId
    , videoId : String
    , executeAt : ExecuteAt
    , qualityPreset : Maybe (String)
    , webhookUrl : Maybe (String)
    }




-- Helper Types (defined in event files but not standalone events)

type alias GenerateDailyReport =
    { userId : String
    , cronExpression : String
    , timezone : Maybe (String)
    , reportType : String
    , emailResults : Maybe (String)
    }




-- Events framework features:
-- ✅ Correlation ID tracing
-- ✅ Execution scheduling (now, delayed, ISO8601, cron)
-- ✅ Required vs optional field validation
-- ✅ Framework types: CorrelationId, ExecuteAt<DateTime>, ExecuteAt<Cron>

-- Events types discovered:
-- Event models (main types):
-- ✅ SendWelcomeEmail (from send_welcome_email.rs)
-- ✅ ProcessVideo (from process_video.rs)
--
-- Additional types from event files:
-- - GenerateDailyReport (helper type in process_video.rs)