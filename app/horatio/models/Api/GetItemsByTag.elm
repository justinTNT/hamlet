module Api.GetItemsByTag exposing (..)

{-| GetItemsByTag API Endpoint

    POST /api/GetItemsByTag
    Retrieves all items with a specific tag.

-}

import Interface.Api exposing (..)
import Api.GetFeed exposing (FeedItem)


{-| Request payload for getting items by tag.
-}
type alias Request =
    { tag : String
    }


{-| Response payload containing tagged items.
-}
type alias Response =
    { tag : String
    , items : List FeedItem
    }
