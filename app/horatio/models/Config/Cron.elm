module Config.Cron exposing (..)

{-| Cron Schedule Configuration

Defines scheduled events that run on a cron schedule.
Event names must match event types defined in Events/*.elm

BuildAmp validates these at build time and generates the scheduler config.
-}


cronEvents : List CronEvent
cronEvents =
    [ { event = "HardDeletes", schedule = "23 * * * *" }
    ]


type alias CronEvent =
    { event : String
    , schedule : String
    }
