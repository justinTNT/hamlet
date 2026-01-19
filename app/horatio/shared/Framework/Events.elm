module Framework.Events exposing (..)

{-| Event Framework Types

    Type wrappers for scheduled/background event processing.
-}


{-| Correlation ID for distributed tracing.
-}
type alias CorrelationId a =
    a


{-| Scheduled execution time.
-}
type alias ExecuteAt a =
    a


{-| DateTime placeholder (ISO8601 string).
-}
type alias DateTime =
    String
