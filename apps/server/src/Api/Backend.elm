module Api.Backend exposing (..)

import Json.Decode
import Json.Encode
import Dict exposing (Dict)
import Set exposing (Set)

type BackendAction
    = SubmitItem (SubmitItemSlice)
    | SubmitComment (SubmitCommentSlice)


type alias SubmitCommentReq =
    { host : String
    , itemId : String
    , parentId : Maybe (String)
    , text : String
    , authorName : Maybe (String)
    }


type ApiError
    = ValidationError { details : String }
    | NotFound { details : String }
    | InternalError { details : String }


type alias GetTagsReq =
    { host : String
    }


type BackendEffect
    = Insert { table : String, data : String }
    | Log (String)


type alias Tag =
    { id : String
    , name : String
    }


type alias BackendOutput =
    { effects : List (BackendEffect)
    , response : Maybe (String)
    , error : Maybe (String)
    }


type alias SubmitItemRes =
    { item : MicroblogItem
    }


type alias GetFeedRes =
    { items : List (MicroblogItem)
    }


type alias SubmitItemSlice =
    { context : ServerContext
    , input : SubmitItemReq
    , existingTags : List (Tag)
    , freshTagIds : List (String)
    }


type alias ItemComment =
    { id : String
    , itemId : String
    , guestId : String
    , parentId : Maybe (String)
    , authorName : String
    , text : String
    , timestamp : Int
    }


type alias MicroblogItem =
    { id : String
    , title : String
    , link : String
    , image : String
    , extract : String
    , ownerComment : String
    , tags : List (String)
    , comments : List (ItemComment)
    , timestamp : Int
    }


type alias Guest =
    { id : String
    , name : String
    }


type alias GetTagsRes =
    { tags : List (String)
    }


type alias GetFeedReq =
    { host : String
    }


type alias SubmitCommentSlice =
    { context : ServerContext
    , input : SubmitCommentReq
    , existingGuest : Maybe (Guest)
    , freshGuestId : String
    , freshCommentId : String
    }


type alias SubmitCommentRes =
    { comment : ItemComment
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


type alias ServerContext =
    { requestId : String
    , sessionId : Maybe (String)
    , userId : Maybe (String)
    , host : String
    }


submitItemSliceEncoder : SubmitItemSlice -> Json.Encode.Value
submitItemSliceEncoder struct =
    Json.Encode.object
        [ ( "context", (serverContextEncoder) struct.context )
        , ( "input", (submitItemReqEncoder) struct.input )
        , ( "existing_tags", (Json.Encode.list (tagEncoder)) struct.existingTags )
        , ( "fresh_tag_ids", (Json.Encode.list (Json.Encode.string)) struct.freshTagIds )
        ]


submitCommentResEncoder : SubmitCommentRes -> Json.Encode.Value
submitCommentResEncoder struct =
    Json.Encode.object
        [ ( "comment", (itemCommentEncoder) struct.comment )
        ]


apiErrorEncoder : ApiError -> Json.Encode.Value
apiErrorEncoder enum =
    case enum of
        ValidationError { details } ->
            Json.Encode.object [ ( "type", Json.Encode.string "ValidationError" ), ( "details", (Json.Encode.string) details ) ]
        NotFound { details } ->
            Json.Encode.object [ ( "type", Json.Encode.string "NotFound" ), ( "details", (Json.Encode.string) details ) ]
        InternalError { details } ->
            Json.Encode.object [ ( "type", Json.Encode.string "InternalError" ), ( "details", (Json.Encode.string) details ) ]

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
        , ( "comments", (Json.Encode.list (itemCommentEncoder)) struct.comments )
        , ( "timestamp", (Json.Encode.int) struct.timestamp )
        ]


itemCommentEncoder : ItemComment -> Json.Encode.Value
itemCommentEncoder struct =
    Json.Encode.object
        [ ( "id", (Json.Encode.string) struct.id )
        , ( "item_id", (Json.Encode.string) struct.itemId )
        , ( "guest_id", (Json.Encode.string) struct.guestId )
        , ( "parent_id", (Maybe.withDefault Json.Encode.null << Maybe.map (Json.Encode.string)) struct.parentId )
        , ( "author_name", (Json.Encode.string) struct.authorName )
        , ( "text", (Json.Encode.string) struct.text )
        , ( "timestamp", (Json.Encode.int) struct.timestamp )
        ]


tagEncoder : Tag -> Json.Encode.Value
tagEncoder struct =
    Json.Encode.object
        [ ( "id", (Json.Encode.string) struct.id )
        , ( "name", (Json.Encode.string) struct.name )
        ]


getTagsReqEncoder : GetTagsReq -> Json.Encode.Value
getTagsReqEncoder struct =
    Json.Encode.object
        [ ( "host", (Json.Encode.string) struct.host )
        ]


backendEffectEncoder : BackendEffect -> Json.Encode.Value
backendEffectEncoder enum =
    case enum of
        Insert { table, data } ->
            Json.Encode.object [ ( "Insert", Json.Encode.object [ ( "table", (Json.Encode.string) table ), ( "data", (Json.Encode.string) data ) ] ) ]
        Log inner ->
            Json.Encode.object [ ( "Log", Json.Encode.string inner ) ]

guestEncoder : Guest -> Json.Encode.Value
guestEncoder struct =
    Json.Encode.object
        [ ( "id", (Json.Encode.string) struct.id )
        , ( "name", (Json.Encode.string) struct.name )
        ]


backendOutputEncoder : BackendOutput -> Json.Encode.Value
backendOutputEncoder struct =
    Json.Encode.object
        [ ( "effects", (Json.Encode.list (backendEffectEncoder)) struct.effects )
        , ( "response", (Maybe.withDefault Json.Encode.null << Maybe.map (Json.Encode.string)) struct.response )
        , ( "error", (Maybe.withDefault Json.Encode.null << Maybe.map (Json.Encode.string)) struct.error )
        ]


submitItemResEncoder : SubmitItemRes -> Json.Encode.Value
submitItemResEncoder struct =
    Json.Encode.object
        [ ( "item", (microblogItemEncoder) struct.item )
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


getFeedResEncoder : GetFeedRes -> Json.Encode.Value
getFeedResEncoder struct =
    Json.Encode.object
        [ ( "items", (Json.Encode.list (microblogItemEncoder)) struct.items )
        ]


submitCommentReqEncoder : SubmitCommentReq -> Json.Encode.Value
submitCommentReqEncoder struct =
    Json.Encode.object
        [ ( "host", (Json.Encode.string) struct.host )
        , ( "item_id", (Json.Encode.string) struct.itemId )
        , ( "parent_id", (Maybe.withDefault Json.Encode.null << Maybe.map (Json.Encode.string)) struct.parentId )
        , ( "text", (Json.Encode.string) struct.text )
        , ( "author_name", (Maybe.withDefault Json.Encode.null << Maybe.map (Json.Encode.string)) struct.authorName )
        ]


getFeedReqEncoder : GetFeedReq -> Json.Encode.Value
getFeedReqEncoder struct =
    Json.Encode.object
        [ ( "host", (Json.Encode.string) struct.host )
        ]


serverContextEncoder : ServerContext -> Json.Encode.Value
serverContextEncoder struct =
    Json.Encode.object
        [ ( "request_id", (Json.Encode.string) struct.requestId )
        , ( "session_id", (Maybe.withDefault Json.Encode.null << Maybe.map (Json.Encode.string)) struct.sessionId )
        , ( "user_id", (Maybe.withDefault Json.Encode.null << Maybe.map (Json.Encode.string)) struct.userId )
        , ( "host", (Json.Encode.string) struct.host )
        ]


backendActionEncoder : BackendAction -> Json.Encode.Value
backendActionEncoder enum =
    case enum of
        SubmitItem inner ->
            Json.Encode.object [ ( "SubmitItem", submitItemSliceEncoder inner ) ]
        SubmitComment inner ->
            Json.Encode.object [ ( "SubmitComment", submitCommentSliceEncoder inner ) ]

submitCommentSliceEncoder : SubmitCommentSlice -> Json.Encode.Value
submitCommentSliceEncoder struct =
    Json.Encode.object
        [ ( "context", (serverContextEncoder) struct.context )
        , ( "input", (submitCommentReqEncoder) struct.input )
        , ( "existing_guest", (Maybe.withDefault Json.Encode.null << Maybe.map (guestEncoder)) struct.existingGuest )
        , ( "fresh_guest_id", (Json.Encode.string) struct.freshGuestId )
        , ( "fresh_comment_id", (Json.Encode.string) struct.freshCommentId )
        ]


getTagsResEncoder : GetTagsRes -> Json.Encode.Value
getTagsResEncoder struct =
    Json.Encode.object
        [ ( "tags", (Json.Encode.list (Json.Encode.string)) struct.tags )
        ]


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
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "comments" (Json.Decode.list (itemCommentDecoder))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "timestamp" (Json.Decode.int)))


submitItemSliceDecoder : Json.Decode.Decoder SubmitItemSlice
submitItemSliceDecoder =
    Json.Decode.succeed SubmitItemSlice
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "context" (serverContextDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "input" (submitItemReqDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "existing_tags" (Json.Decode.list (tagDecoder))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "fresh_tag_ids" (Json.Decode.list (Json.Decode.string))))


submitItemResDecoder : Json.Decode.Decoder SubmitItemRes
submitItemResDecoder =
    Json.Decode.succeed SubmitItemRes
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "item" (microblogItemDecoder)))


backendActionDecoder : Json.Decode.Decoder BackendAction
backendActionDecoder = 
    Json.Decode.oneOf
        [ Json.Decode.map SubmitItem (Json.Decode.field "SubmitItem" (submitItemSliceDecoder))
        , Json.Decode.map SubmitComment (Json.Decode.field "SubmitComment" (submitCommentSliceDecoder))
        ]

guestDecoder : Json.Decode.Decoder Guest
guestDecoder =
    Json.Decode.succeed Guest
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "id" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "name" (Json.Decode.string)))


submitCommentSliceDecoder : Json.Decode.Decoder SubmitCommentSlice
submitCommentSliceDecoder =
    Json.Decode.succeed SubmitCommentSlice
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "context" (serverContextDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "input" (submitCommentReqDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "existing_guest" (Json.Decode.nullable (guestDecoder))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "fresh_guest_id" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "fresh_comment_id" (Json.Decode.string)))


backendEffectDecoder : Json.Decode.Decoder BackendEffect
backendEffectDecoder = 
        let
            elmRsConstructInsert table data =
                        Insert { table = table, data = data }
        in
    Json.Decode.oneOf
        [ Json.Decode.field "Insert" (Json.Decode.succeed elmRsConstructInsert |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "table" (Json.Decode.string))) |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "data" (Json.Decode.string))))
        , Json.Decode.map Log (Json.Decode.field "Log" (Json.Decode.string))
        ]

submitCommentResDecoder : Json.Decode.Decoder SubmitCommentRes
submitCommentResDecoder =
    Json.Decode.succeed SubmitCommentRes
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "comment" (itemCommentDecoder)))


apiErrorDecoder : Json.Decode.Decoder ApiError
apiErrorDecoder = 
        let
            elmRsConstructValidationError details =
                        ValidationError { details = details }
            elmRsConstructNotFound details =
                        NotFound { details = details }
            elmRsConstructInternalError details =
                        InternalError { details = details }
        in
    Json.Decode.field "type" Json.Decode.string
        |> Json.Decode.andThen
            (\tag ->
                case tag of
                    "ValidationError" ->
                        Json.Decode.succeed elmRsConstructValidationError |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "details" (Json.Decode.string)))
                    "NotFound" ->
                        Json.Decode.succeed elmRsConstructNotFound |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "details" (Json.Decode.string)))
                    "InternalError" ->
                        Json.Decode.succeed elmRsConstructInternalError |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "details" (Json.Decode.string)))
                    unexpected ->
                        Json.Decode.fail <| "Unexpected variant " ++ unexpected
            )

tagDecoder : Json.Decode.Decoder Tag
tagDecoder =
    Json.Decode.succeed Tag
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "id" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "name" (Json.Decode.string)))


submitCommentReqDecoder : Json.Decode.Decoder SubmitCommentReq
submitCommentReqDecoder =
    Json.Decode.succeed SubmitCommentReq
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "host" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "item_id" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "parent_id" (Json.Decode.nullable (Json.Decode.string))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "text" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "author_name" (Json.Decode.nullable (Json.Decode.string))))


getFeedResDecoder : Json.Decode.Decoder GetFeedRes
getFeedResDecoder =
    Json.Decode.succeed GetFeedRes
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "items" (Json.Decode.list (microblogItemDecoder))))


getTagsResDecoder : Json.Decode.Decoder GetTagsRes
getTagsResDecoder =
    Json.Decode.succeed GetTagsRes
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "tags" (Json.Decode.list (Json.Decode.string))))


backendOutputDecoder : Json.Decode.Decoder BackendOutput
backendOutputDecoder =
    Json.Decode.succeed BackendOutput
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "effects" (Json.Decode.list (backendEffectDecoder))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "response" (Json.Decode.nullable (Json.Decode.string))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "error" (Json.Decode.nullable (Json.Decode.string))))


itemCommentDecoder : Json.Decode.Decoder ItemComment
itemCommentDecoder =
    Json.Decode.succeed ItemComment
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "id" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "item_id" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "guest_id" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "parent_id" (Json.Decode.nullable (Json.Decode.string))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "author_name" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "text" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "timestamp" (Json.Decode.int)))


serverContextDecoder : Json.Decode.Decoder ServerContext
serverContextDecoder =
    Json.Decode.succeed ServerContext
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "request_id" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "session_id" (Json.Decode.nullable (Json.Decode.string))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "user_id" (Json.Decode.nullable (Json.Decode.string))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "host" (Json.Decode.string)))


getTagsReqDecoder : Json.Decode.Decoder GetTagsReq
getTagsReqDecoder =
    Json.Decode.succeed GetTagsReq
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "host" (Json.Decode.string)))


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


getFeedReqDecoder : Json.Decode.Decoder GetFeedReq
getFeedReqDecoder =
    Json.Decode.succeed GetFeedReq
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "host" (Json.Decode.string)))


