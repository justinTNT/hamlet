module Api.SubmitItem exposing (..)

{-| SubmitItem API Endpoint

    POST /api/SubmitItem
    Submits a new microblog item.

-}

import Interface.Api exposing (..)
import Interface.Schema exposing (RichContent)
import Api.SubmitComment exposing (CommentItem)


{-| Auth requirement — host-level key needed for posting.
-}
type alias Auth =
    { level : HostAdmin }


{-| Request payload for submitting an item.
-}
type alias Request =
    { title : Required String
    , link : String
    , image : String
    , extract : RichContent
    , ownerComment : RichContent
    , tags : List String
    }


{-| Response payload after item creation.
-}
type alias Response =
    { item : MicroblogItem
    }


{-| Server-side context data.
    Generated IDs that the server provides to the handler.
-}
type alias ServerContext =
    { freshTagIds : List String
    }


{-| Full microblog item with all details.
-}
type alias MicroblogItem =
    { id : String
    , title : String
    , link : String
    , image : String
    , extract : RichContent
    , ownerComment : RichContent
    , tags : List String
    , comments : List CommentItem
    , timestamp : Int
    }
