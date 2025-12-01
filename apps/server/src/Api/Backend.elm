module Api.Backend exposing (..)

import Json.Decode
import Json.Encode
import Dict exposing (Dict)
import Set exposing (Set)

type alias Tag =
    { id : String
    , name : String
    }


type alias MicroblogItem =
    { id : String
    , title : String
    , link : String
    , image : String
    , extract : String
    , ownerComment : String
    , tags : List (String)
    , timestamp : Int
    }


type alias SubmitItemReq =
    { host : String
    , title : String
    , link : String
    , image : String
    , extract : String
    , ownerComment : String
    , tags : List (String)
    }


type alias SubmitItemSlice =
    { input : SubmitItemReq
    , existingTags : List (Tag)
    }


type BackendAction
    = SubmitItem (SubmitItemSlice)


type BackendResult
    = SubmitItemSuccess (MicroblogItem)
    | Error (String)


type alias ItemComment =
    { id : String
    , itemId : String
    , guestId : String
    , text : String
    , timestamp : Int
    }


type alias SubmitCommentReq =
    { host : String
    , itemId : String
    , guestId : String
    , text : String
    }


type alias SubmitCommentRes =
    { comment : ItemComment
    }


type alias GetFeedRes =
    { items : List (MicroblogItem)
    }


type alias GetTagsRes =
    { tags : List (String)
    }


type alias GetTagsReq =
    { host : String
    }


type alias GetFeedReq =
    { host : String
    }


tagEncoder : Tag -> Json.Encode.Value
tagEncoder struct =
    Json.Encode.object
        [ ( "id", (Json.Encode.string) struct.id )
        , ( "name", (Json.Encode.string) struct.name )
        ]


microblogItemEncoder : MicroblogItem -> Json.Encode.Value
microblogItemEncoder struct =
    Json.Encode.object
        [ ( "id", (Json.Encode.string) struct.id )
        , ( "title", (Json.Encode.string) struct.title )
        , ( "link", (Json.Encode.string) struct.link )
        , ( "image", (Json.Encode.string) struct.image )
        , ( "extract", (Json.Encode.string) struct.extract )
        , ( "owner_comment", (Json.Encode.string) struct.ownerComment )
        , ( "tags", (Json.Encode.list (Json.Encode.string)) struct.tags )
        , ( "timestamp", (Json.Encode.int) struct.timestamp )
        ]


submitItemReqEncoder : SubmitItemReq -> Json.Encode.Value
submitItemReqEncoder struct =
    Json.Encode.object
        [ ( "host", (Json.Encode.string) struct.host )
        , ( "title", (Json.Encode.string) struct.title )
        , ( "link", (Json.Encode.string) struct.link )
        , ( "image", (Json.Encode.string) struct.image )
        , ( "extract", (Json.Encode.string) struct.extract )
        , ( "owner_comment", (Json.Encode.string) struct.ownerComment )
        , ( "tags", (Json.Encode.list (Json.Encode.string)) struct.tags )
        ]


submitItemSliceEncoder : SubmitItemSlice -> Json.Encode.Value
submitItemSliceEncoder struct =
    Json.Encode.object
        [ ( "input", (submitItemReqEncoder) struct.input )
        , ( "existing_tags", (Json.Encode.list (tagEncoder)) struct.existingTags )
        ]


backendActionEncoder : BackendAction -> Json.Encode.Value
backendActionEncoder enum =
    case enum of
        SubmitItem inner ->
            Json.Encode.object [ ( "SubmitItem", submitItemSliceEncoder inner ) ]

backendResultEncoder : BackendResult -> Json.Encode.Value
backendResultEncoder enum =
    case enum of
        SubmitItemSuccess inner ->
            Json.Encode.object [ ( "SubmitItemSuccess", microblogItemEncoder inner ) ]
        Error inner ->
            Json.Encode.object [ ( "Error", Json.Encode.string inner ) ]

itemCommentEncoder : ItemComment -> Json.Encode.Value
itemCommentEncoder struct =
    Json.Encode.object
        [ ( "id", (Json.Encode.string) struct.id )
        , ( "item_id", (Json.Encode.string) struct.itemId )
        , ( "guest_id", (Json.Encode.string) struct.guestId )
        , ( "text", (Json.Encode.string) struct.text )
        , ( "timestamp", (Json.Encode.int) struct.timestamp )
        ]


submitCommentReqEncoder : SubmitCommentReq -> Json.Encode.Value
submitCommentReqEncoder struct =
    Json.Encode.object
        [ ( "host", (Json.Encode.string) struct.host )
        , ( "item_id", (Json.Encode.string) struct.itemId )
        , ( "guest_id", (Json.Encode.string) struct.guestId )
        , ( "text", (Json.Encode.string) struct.text )
        ]


submitCommentResEncoder : SubmitCommentRes -> Json.Encode.Value
submitCommentResEncoder struct =
    Json.Encode.object
        [ ( "comment", (itemCommentEncoder) struct.comment )
        ]


getFeedResEncoder : GetFeedRes -> Json.Encode.Value
getFeedResEncoder struct =
    Json.Encode.object
        [ ( "items", (Json.Encode.list (microblogItemEncoder)) struct.items )
        ]


getTagsResEncoder : GetTagsRes -> Json.Encode.Value
getTagsResEncoder struct =
    Json.Encode.object
        [ ( "tags", (Json.Encode.list (Json.Encode.string)) struct.tags )
        ]


getTagsReqEncoder : GetTagsReq -> Json.Encode.Value
getTagsReqEncoder struct =
    Json.Encode.object
        [ ( "host", (Json.Encode.string) struct.host )
        ]


getFeedReqEncoder : GetFeedReq -> Json.Encode.Value
getFeedReqEncoder struct =
    Json.Encode.object
        [ ( "host", (Json.Encode.string) struct.host )
        ]


tagDecoder : Json.Decode.Decoder Tag
tagDecoder =
    Json.Decode.succeed Tag
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "id" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "name" (Json.Decode.string)))


microblogItemDecoder : Json.Decode.Decoder MicroblogItem
microblogItemDecoder =
    Json.Decode.succeed MicroblogItem
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "id" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "title" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "link" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "image" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "extract" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "owner_comment" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "tags" (Json.Decode.list (Json.Decode.string))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "timestamp" (Json.Decode.int)))


submitItemReqDecoder : Json.Decode.Decoder SubmitItemReq
submitItemReqDecoder =
    Json.Decode.succeed SubmitItemReq
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "host" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "title" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "link" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "image" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "extract" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "owner_comment" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "tags" (Json.Decode.list (Json.Decode.string))))


submitItemSliceDecoder : Json.Decode.Decoder SubmitItemSlice
submitItemSliceDecoder =
    Json.Decode.succeed SubmitItemSlice
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "input" (submitItemReqDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "existing_tags" (Json.Decode.list (tagDecoder))))


backendActionDecoder : Json.Decode.Decoder BackendAction
backendActionDecoder = 
    Json.Decode.oneOf
        [ Json.Decode.map SubmitItem (Json.Decode.field "SubmitItem" (submitItemSliceDecoder))
        ]

backendResultDecoder : Json.Decode.Decoder BackendResult
backendResultDecoder = 
    Json.Decode.oneOf
        [ Json.Decode.map SubmitItemSuccess (Json.Decode.field "SubmitItemSuccess" (microblogItemDecoder))
        , Json.Decode.map Error (Json.Decode.field "Error" (Json.Decode.string))
        ]

itemCommentDecoder : Json.Decode.Decoder ItemComment
itemCommentDecoder =
    Json.Decode.succeed ItemComment
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "id" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "item_id" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "guest_id" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "text" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "timestamp" (Json.Decode.int)))


submitCommentReqDecoder : Json.Decode.Decoder SubmitCommentReq
submitCommentReqDecoder =
    Json.Decode.succeed SubmitCommentReq
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "host" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "item_id" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "guest_id" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "text" (Json.Decode.string)))


submitCommentResDecoder : Json.Decode.Decoder SubmitCommentRes
submitCommentResDecoder =
    Json.Decode.succeed SubmitCommentRes
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "comment" (itemCommentDecoder)))


getFeedResDecoder : Json.Decode.Decoder GetFeedRes
getFeedResDecoder =
    Json.Decode.succeed GetFeedRes
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "items" (Json.Decode.list (microblogItemDecoder))))


getTagsResDecoder : Json.Decode.Decoder GetTagsRes
getTagsResDecoder =
    Json.Decode.succeed GetTagsRes
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "tags" (Json.Decode.list (Json.Decode.string))))


getTagsReqDecoder : Json.Decode.Decoder GetTagsReq
getTagsReqDecoder =
    Json.Decode.succeed GetTagsReq
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "host" (Json.Decode.string)))


getFeedReqDecoder : Json.Decode.Decoder GetFeedReq
getFeedReqDecoder =
    Json.Decode.succeed GetFeedReq
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "host" (Json.Decode.string)))


