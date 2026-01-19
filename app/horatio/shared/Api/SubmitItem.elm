module Api.SubmitItem exposing (..)

{-| SubmitItem API Endpoint

    POST /api/SubmitItem
    Submits a new microblog item.

-}

import Framework.Api exposing (..)
import Api.SubmitComment exposing (CommentItem)


{-| Request payload for submitting an item.
-}
type alias Request =
    { host : Inject String
    , title : Required String
    , link : String
    , image : String
    , extract : String
    , ownerComment : String
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
    , extract : String
    , ownerComment : String
    , tags : List String
    , comments : List CommentItem
    , timestamp : Int
    }
