module Api exposing (..)

{-| Port-based API module for browser extensions.

    Auto-generated from Elm API definitions.
    Uses Request type for port-based communication.
-}

import BuildAmp.ApiClient as Client
import Json.Decode as Decode
import Json.Encode as Encode


-- CORE TYPES


type alias Request response =
    { endpoint : String
    , body : Encode.Value
    , decoder : Decode.Decoder response
    }



-- ENDPOINTS


getFeed : { host : String } -> Request Client.GetFeedRes
getFeed req =
    { endpoint = "GetFeed"
    , body =
        Encode.object
            [ ( "host", Encode.string req.host )
            ]
    , decoder = Client.getFeedResDecoder
    }


getItem : { host : String, id : String } -> Request Client.GetItemRes
getItem req =
    { endpoint = "GetItem"
    , body =
        Encode.object
            [ ( "host", Encode.string req.host )
            , ( "id", Encode.string req.id )
            ]
    , decoder = Client.getItemResDecoder
    }


getItemsByTag : { host : String, tag : String } -> Request Client.GetItemsByTagRes
getItemsByTag req =
    { endpoint = "GetItemsByTag"
    , body =
        Encode.object
            [ ( "host", Encode.string req.host )
            , ( "tag", Encode.string req.tag )
            ]
    , decoder = Client.getItemsByTagResDecoder
    }


getTags : { host : String } -> Request Client.GetTagsRes
getTags req =
    { endpoint = "GetTags"
    , body =
        Encode.object
            [ ( "host", Encode.string req.host )
            ]
    , decoder = Client.getTagsResDecoder
    }


submitComment : { host : String, itemId : String, parentId : Maybe String, text : String, authorName : Maybe String } -> Request Client.SubmitCommentRes
submitComment req =
    { endpoint = "SubmitComment"
    , body =
        Encode.object
            [ ( "host", Encode.string req.host )
            , ( "item_id", Encode.string req.itemId )
            , ( "parent_id", (Maybe.withDefault Encode.null << Maybe.map Encode.string) req.parentId )
            , ( "text", Encode.string req.text )
            , ( "author_name", (Maybe.withDefault Encode.null << Maybe.map Encode.string) req.authorName )
            ]
    , decoder = Client.submitCommentResDecoder
    }


submitItem : { host : String, title : String, link : String, image : String, extract : String, ownerComment : String, tags : List String } -> Request Client.SubmitItemRes
submitItem req =
    { endpoint = "SubmitItem"
    , body =
        Encode.object
            [ ( "host", Encode.string req.host )
            , ( "title", Encode.string req.title )
            , ( "link", Encode.string req.link )
            , ( "image", Encode.string req.image )
            , ( "extract", Encode.string req.extract )
            , ( "owner_comment", Encode.string req.ownerComment )
            , ( "tags", (Encode.list Encode.string) req.tags )
            ]
    , decoder = Client.submitItemResDecoder
    }
