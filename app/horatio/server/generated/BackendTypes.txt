-- AUTO-GENERATED BACKEND TYPES
-- Add these to your Api.Backend module

-- Updated BackendAction type:
type BackendAction
    | SubmitComment (SubmitCommentReqBundle)
    | GetFeed (GetFeedReqBundle)
    | SubmitItem (SubmitItemReqBundle)
    | GetTags (GetTagsReqBundle)

-- Bundle types:
type alias SubmitCommentReqBundle =
    { context : StandardServerContext
    , input : SubmitCommentReq
    }

type alias GetFeedReqBundle =
    { context : StandardServerContext
    , input : GetFeedReq
    }

type alias SubmitItemReqBundle =
    { context : StandardServerContext
    , input : SubmitItemReq
    }

type alias GetTagsReqBundle =
    { context : StandardServerContext
    , input : GetTagsReq
    }

-- Bundle encoders:
submitcommentReqBundleEncoder : SubmitCommentReqBundle -> Json.Encode.Value
submitcommentReqBundleEncoder struct =
    Json.Encode.object
        [ ( "context", (standardServerContextEncoder) struct.context )
        , ( "input", (submitcommentReqEncoder) struct.input )
        ]

getfeedReqBundleEncoder : GetFeedReqBundle -> Json.Encode.Value
getfeedReqBundleEncoder struct =
    Json.Encode.object
        [ ( "context", (standardServerContextEncoder) struct.context )
        , ( "input", (getfeedReqEncoder) struct.input )
        ]

submititemReqBundleEncoder : SubmitItemReqBundle -> Json.Encode.Value
submititemReqBundleEncoder struct =
    Json.Encode.object
        [ ( "context", (standardServerContextEncoder) struct.context )
        , ( "input", (submititemReqEncoder) struct.input )
        ]

gettagsReqBundleEncoder : GetTagsReqBundle -> Json.Encode.Value
gettagsReqBundleEncoder struct =
    Json.Encode.object
        [ ( "context", (standardServerContextEncoder) struct.context )
        , ( "input", (gettagsReqEncoder) struct.input )
        ]

-- Bundle decoders:
submitcommentReqBundleDecoder : Json.Decode.Decoder SubmitCommentReqBundle
submitcommentReqBundleDecoder =
    Json.Decode.succeed SubmitCommentReqBundle
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "context" (standardServerContextDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "input" (submitcommentReqDecoder)))

getfeedReqBundleDecoder : Json.Decode.Decoder GetFeedReqBundle
getfeedReqBundleDecoder =
    Json.Decode.succeed GetFeedReqBundle
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "context" (standardServerContextDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "input" (getfeedReqDecoder)))

submititemReqBundleDecoder : Json.Decode.Decoder SubmitItemReqBundle
submititemReqBundleDecoder =
    Json.Decode.succeed SubmitItemReqBundle
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "context" (standardServerContextDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "input" (submititemReqDecoder)))

gettagsReqBundleDecoder : Json.Decode.Decoder GetTagsReqBundle
gettagsReqBundleDecoder =
    Json.Decode.succeed GetTagsReqBundle
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "context" (standardServerContextDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "input" (gettagsReqDecoder)))

-- Updated backendActionEncoder cases:
backendActionEncoder enum =
    case enum of
        SubmitComment inner ->
            Json.Encode.object [ ( "SubmitComment", submitcommentReqBundleEncoder inner ) ]
        GetFeed inner ->
            Json.Encode.object [ ( "GetFeed", getfeedReqBundleEncoder inner ) ]
        SubmitItem inner ->
            Json.Encode.object [ ( "SubmitItem", submititemReqBundleEncoder inner ) ]
        GetTags inner ->
            Json.Encode.object [ ( "GetTags", gettagsReqBundleEncoder inner ) ]

-- Updated backendActionDecoder cases:
backendActionDecoder = 
    Json.Decode.oneOf
        [ -- Add your existing cases here first
        , Json.Decode.map SubmitComment (Json.Decode.field "SubmitComment" (submitcommentReqBundleDecoder))
        , Json.Decode.map GetFeed (Json.Decode.field "GetFeed" (getfeedReqBundleDecoder))
        , Json.Decode.map SubmitItem (Json.Decode.field "SubmitItem" (submititemReqBundleDecoder))
        , Json.Decode.map GetTags (Json.Decode.field "GetTags" (gettagsReqBundleDecoder))
        ]
