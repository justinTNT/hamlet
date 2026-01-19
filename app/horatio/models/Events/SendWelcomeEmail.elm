module Events.SendWelcomeEmail exposing (..)

{-| SendWelcomeEmail Event Model
-}

import Dict exposing (Dict)
import Interface.Events exposing (CorrelationId, DateTime, ExecuteAt)


type alias SendWelcomeEmail =
    { correlationId : CorrelationId String
    , userId : String
    , email : String
    , name : String
    , executeAt : Maybe (ExecuteAt DateTime)
    , templateVars : Maybe (Dict String String)
    }
