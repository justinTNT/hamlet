module Api exposing (..)

import Api.Schema exposing (..)
import Json.Decode as Decode
import Json.Encode as Encode

-- CORE TYPES

type alias Request response =
    { endpoint : String
    , body : Encode.Value
    , decoder : Decode.Decoder response
    }

-- ENDPOINTS

getFeed : GetFeedReq -> Request GetFeedRes
getFeed req =
    { endpoint = "GetFeed"
    , body = getFeedReqEncoder req
    , decoder = getFeedResDecoder
    }

getTags : GetTagsReq -> Request GetTagsRes
getTags req =
    { endpoint = "GetTags"
    , body = getTagsReqEncoder req
    , decoder = getTagsResDecoder
    }

submitItem : SubmitItemReq -> Request SubmitItemRes
submitItem req =
    { endpoint = "SubmitItem"
    , body = submitItemReqEncoder req
    , decoder = submitItemResDecoder
    }

submitComment : SubmitCommentReq -> Request SubmitCommentRes
submitComment req =
    { endpoint = "SubmitComment"
    , body = submitCommentReqEncoder req
    , decoder = submitCommentResDecoder
    }
