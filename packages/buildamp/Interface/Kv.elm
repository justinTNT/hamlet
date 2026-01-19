module Interface.Kv exposing (..)

{-| KV Store Schema Types

    Types for key-value store models with TTL support.

-}


{-| Time-to-live in seconds for cache entries.
-}
type alias Ttl =
    Int
