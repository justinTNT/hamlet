module Api.GetFeed exposing (..)

{-| GetFeed API Endpoint

    POST /api/GetFeed
    Retrieves the feed of microblog items for the current host.

-}

import Interface.Api exposing (..)


{-| Request payload for getting the feed.
-}
type alias Request =
    { host : Inject String
    }


{-| Response payload containing feed items.
-}
type alias Response =
    { items : List FeedItem
    }


{-| Simplified item for feed view - no comments, tags, or full link.
-}
type alias FeedItem =
    { id : String
    , title : String
    , image : Maybe String
    , extract : Maybe String
    , ownerComment : String
    , timestamp : Int
    }
