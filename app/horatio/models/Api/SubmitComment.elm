module Api.SubmitComment exposing (..)

{-| SubmitComment API Endpoint

    POST /api/SubmitComment
    Submits a new comment on a microblog item.

-}

import Interface.Api exposing (..)
import Interface.Schema exposing (RichContent)


{-| Request payload for submitting a comment.
-}
type alias Request =
    { itemId : String
    , parentId : Maybe String
    , text : Required (Trim String) -- @minLength 1 @maxLength 500
    , authorName : Maybe String
    }


{-| Response payload after comment creation.
-}
type alias Response =
    { comment : CommentItem
    }


{-| Server-side context data.
    Generated IDs that the server provides to the handler.
-}
type alias ServerContext =
    { freshGuestId : String
    , freshCommentId : String
    }


{-| Comment item structure returned in responses.
-}
type alias CommentItem =
    { id : String
    , itemId : String
    , guestId : String
    , parentId : Maybe String
    , authorName : String
    , text : RichContent
    , timestamp : Int
    }
