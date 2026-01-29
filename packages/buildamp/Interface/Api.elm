module Interface.Api exposing (..)

{-| API Schema Types

    Transparent type aliases for annotating API request/response fields.
    These compile away to nothing - they're metadata for the code generator.

    ## Field Annotations

    @docs Inject, Required, Trim

    ## Validation (parameterless for now)

    @docs MinLength, MaxLength

    ## Endpoint Metadata

    Endpoint name comes from module name: Api.SubmitComment → "SubmitComment"
    Server context is a type alias named `ServerContext` in the module (optional)

-}


-- FIELD ANNOTATIONS


{-| Server-injected field. The server will populate this, not the client.

    { host : Inject String }  -- Server injects the tenant host

-}
type alias Inject a =
    a


{-| Required field. Must be non-empty.

    { text : Required String }  -- Cannot be empty

-}
type alias Required a =
    a


{-| Trim whitespace from string fields.

    { text : Trim String }  -- Whitespace trimmed before validation

-}
type alias Trim a =
    a



-- VALIDATION
-- For now, parameterless. Parser can extract params from comments if needed.


{-| Minimum length validation.

    { text : MinLength String }  -- Has minimum length (param in comment)

-}
type alias MinLength a =
    a


{-| Maximum length validation.

    { text : MaxLength String }  -- Has maximum length (param in comment)

-}
type alias MaxLength a =
    a



-- AUTH LEVELS
-- Declare in a `type alias Auth` to gate an endpoint.
-- Endpoints without Auth are public (NoAdmin).
--
-- type alias Auth = { level : HostAdmin }


{-| No admin privileges required (default).
-}
type alias NoAdmin =
    {}


{-| Host-level admin — requires a valid X-Hamlet-Host-Key.
-}
type alias HostAdmin =
    {}


{-| Project-level admin — requires a valid X-Hamlet-Project-Key.
-}
type alias ProjectAdmin =
    {}



-- COMPOSED EXAMPLE
-- { text : Required (Trim (MinLength (MaxLength String))) }
-- Parser unwraps: Required → Trim → MinLength → MaxLength → String
-- Extracts: required=true, trim=true, minLength=true, maxLength=true
