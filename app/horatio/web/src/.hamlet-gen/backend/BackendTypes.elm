-- AUTO-GENERATED BACKEND TYPES
-- Add these to your Api.Backend module

-- Updated BackendAction type:
type BackendAction
    | GetFeed (GetFeedReqBundle)
    | GetItem (GetItemReqBundle)
    | GetItemsByTag (GetItemsByTagReqBundle)
    | GetTags (GetTagsReqBundle)
    | SubmitComment (SubmitCommentReqBundle)
    | SubmitItem (SubmitItemReqBundle)

-- Bundle types:
type alias GetFeedReqBundle =
    { context : StandardServerContext
    , input : GetFeedReq
    }

type alias GetItemReqBundle =
    { context : StandardServerContext
    , input : GetItemReq
    }

type alias GetItemsByTagReqBundle =
    { context : StandardServerContext
    , input : GetItemsByTagReq
    }

type alias GetTagsReqBundle =
    { context : StandardServerContext
    , input : GetTagsReq
    }

type alias SubmitCommentReqBundle =
    { context : StandardServerContext
    , input : SubmitCommentReq
    }

type alias SubmitItemReqBundle =
    { context : StandardServerContext
    , input : SubmitItemReq
    }

-- Bundle encoders:
getfeedReqBundleEncoder : GetFeedReqBundle -> Json.Encode.Value
getfeedReqBundleEncoder struct =
    Json.Encode.object
        [ ( "context", (standardServerContextEncoder) struct.context )
        , ( "input", (getfeedReqEncoder) struct.input )
        ]

getitemReqBundleEncoder : GetItemReqBundle -> Json.Encode.Value
getitemReqBundleEncoder struct =
    Json.Encode.object
        [ ( "context", (standardServerContextEncoder) struct.context )
        , ( "input", (getitemReqEncoder) struct.input )
        ]

getitemsbytagReqBundleEncoder : GetItemsByTagReqBundle -> Json.Encode.Value
getitemsbytagReqBundleEncoder struct =
    Json.Encode.object
        [ ( "context", (standardServerContextEncoder) struct.context )
        , ( "input", (getitemsbytagReqEncoder) struct.input )
        ]

gettagsReqBundleEncoder : GetTagsReqBundle -> Json.Encode.Value
gettagsReqBundleEncoder struct =
    Json.Encode.object
        [ ( "context", (standardServerContextEncoder) struct.context )
        , ( "input", (gettagsReqEncoder) struct.input )
        ]

submitcommentReqBundleEncoder : SubmitCommentReqBundle -> Json.Encode.Value
submitcommentReqBundleEncoder struct =
    Json.Encode.object
        [ ( "context", (standardServerContextEncoder) struct.context )
        , ( "input", (submitcommentReqEncoder) struct.input )
        ]

submititemReqBundleEncoder : SubmitItemReqBundle -> Json.Encode.Value
submititemReqBundleEncoder struct =
    Json.Encode.object
        [ ( "context", (standardServerContextEncoder) struct.context )
        , ( "input", (submititemReqEncoder) struct.input )
        ]

-- Bundle decoders:
getfeedReqBundleDecoder : Json.Decode.Decoder GetFeedReqBundle
getfeedReqBundleDecoder =
    Json.Decode.succeed GetFeedReqBundle
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "context" (standardServerContextDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "input" (getfeedReqDecoder)))

getitemReqBundleDecoder : Json.Decode.Decoder GetItemReqBundle
getitemReqBundleDecoder =
    Json.Decode.succeed GetItemReqBundle
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "context" (standardServerContextDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "input" (getitemReqDecoder)))

getitemsbytagReqBundleDecoder : Json.Decode.Decoder GetItemsByTagReqBundle
getitemsbytagReqBundleDecoder =
    Json.Decode.succeed GetItemsByTagReqBundle
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "context" (standardServerContextDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "input" (getitemsbytagReqDecoder)))

gettagsReqBundleDecoder : Json.Decode.Decoder GetTagsReqBundle
gettagsReqBundleDecoder =
    Json.Decode.succeed GetTagsReqBundle
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "context" (standardServerContextDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "input" (gettagsReqDecoder)))

submitcommentReqBundleDecoder : Json.Decode.Decoder SubmitCommentReqBundle
submitcommentReqBundleDecoder =
    Json.Decode.succeed SubmitCommentReqBundle
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "context" (standardServerContextDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "input" (submitcommentReqDecoder)))

submititemReqBundleDecoder : Json.Decode.Decoder SubmitItemReqBundle
submititemReqBundleDecoder =
    Json.Decode.succeed SubmitItemReqBundle
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "context" (standardServerContextDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "input" (submititemReqDecoder)))

-- Updated backendActionEncoder cases:
backendActionEncoder enum =
    case enum of
        GetFeed inner ->
            Json.Encode.object [ ( "GetFeed", getfeedReqBundleEncoder inner ) ]
        GetItem inner ->
            Json.Encode.object [ ( "GetItem", getitemReqBundleEncoder inner ) ]
        GetItemsByTag inner ->
            Json.Encode.object [ ( "GetItemsByTag", getitemsbytagReqBundleEncoder inner ) ]
        GetTags inner ->
            Json.Encode.object [ ( "GetTags", gettagsReqBundleEncoder inner ) ]
        SubmitComment inner ->
            Json.Encode.object [ ( "SubmitComment", submitcommentReqBundleEncoder inner ) ]
        SubmitItem inner ->
            Json.Encode.object [ ( "SubmitItem", submititemReqBundleEncoder inner ) ]

-- Updated backendActionDecoder cases:
backendActionDecoder =
    Json.Decode.oneOf
        [ -- Add your existing cases here first
        , Json.Decode.map GetFeed (Json.Decode.field "GetFeed" (getfeedReqBundleDecoder))
        , Json.Decode.map GetItem (Json.Decode.field "GetItem" (getitemReqBundleDecoder))
        , Json.Decode.map GetItemsByTag (Json.Decode.field "GetItemsByTag" (getitemsbytagReqBundleDecoder))
        , Json.Decode.map GetTags (Json.Decode.field "GetTags" (gettagsReqBundleDecoder))
        , Json.Decode.map SubmitComment (Json.Decode.field "SubmitComment" (submitcommentReqBundleDecoder))
        , Json.Decode.map SubmitItem (Json.Decode.field "SubmitItem" (submititemReqBundleDecoder))
        ]

