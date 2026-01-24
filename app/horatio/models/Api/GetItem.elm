module Api.GetItem exposing (..)

{-| GetItem API Endpoint

    POST /api/GetItem
    Retrieves a single microblog item by ID.

-}

import Interface.Api exposing (..)
import Api.SubmitItem exposing (MicroblogItem)


{-| Request payload for getting an item.
-}
type alias Request =
    { id : String
    }


{-| Response payload containing the item.
-}
type alias Response =
    { item : MicroblogItem
    }
