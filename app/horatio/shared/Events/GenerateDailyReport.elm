module Events.GenerateDailyReport exposing (..)

{-| GenerateDailyReport Event Model
-}


type alias GenerateDailyReport =
    { userId : String
    , cronExpression : String
    , timezone : Maybe String
    , reportType : String
    , emailResults : Maybe String
    }
