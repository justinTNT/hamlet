module Api.GetTags exposing (..)

{-| GetTags API Endpoint

    POST /api/GetTags
    Retrieves all tags for the current host.

-}

import Interface.Api exposing (..)


{-| Request payload for getting tags.
-}
type alias Request =
    {}


{-| Response payload containing tags.
-}
type alias Response =
    { tags : List String
    }
