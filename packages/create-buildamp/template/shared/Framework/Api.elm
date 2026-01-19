module Framework.Api exposing (..)

{-| API Endpoint Framework Types

    These type wrappers are recognized by buildamp for request validation:
    - Inject a → Server-injected field (host, userId, etc.)
    - Required a → Required field (validation error if missing)
    - Trim a → Trim whitespace from string
    - MinLength a → Minimum length validation
    - MaxLength a → Maximum length validation

-}


{-| Server-injected field (not from client request)
-}
type alias Inject a =
    a


{-| Required field with validation
-}
type alias Required a =
    a


{-| Trim whitespace from string
-}
type alias Trim a =
    a


{-| Minimum length validation
-}
type alias MinLength a =
    a


{-| Maximum length validation
-}
type alias MaxLength a =
    a
