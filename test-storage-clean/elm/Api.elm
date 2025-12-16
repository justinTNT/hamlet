module Api.Backend exposing (..)

import Json.Decode
import Json.Encode
import Dict exposing (Dict)
import Set exposing (Set)

type alias SubmitItemReqBundle =
    { context : StandardServerContext
    , input : SubmitItemReq
    , data : SubmitItemData
    }


type alias FeedItem =
    { id : String
    , title : String
    , link : Maybe (String)
    , image : Maybe (String)
    , extract : Maybe (String)
    , ownerComment : String
    , tags : List (String)
    , timestamp : Int
    , viewCount : Int
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


type alias SubmitItemRes =
    { item : FeedItem
    }


type alias SubmitItemData =
    { freshTagIds : List (String)
    }


type alias GetFeedRes =
    { items : List (FeedItem)
    }


type alias GetFeedReq =
    { host : String
    }


type alias GetTagsReq =
    { host : String
    }


type alias GetTagsRes =
    { tags : List (String)
    }


type alias UserPreferences =
    { theme : String
    , notifications : Bool
    , locale : Locale
    }


type alias Locale =
    { language : String
    , timezone : String
    }


type alias FileProcessingStatus =
    { fileId : String
    , originalName : String
    , status : CrossTab
    , progressPercent : CrossTab
    , processingSteps : Cached
    }


type alias ProcessingStep =
    { stepName : String
    , status : String
    , startedAt : Maybe (Int)
    , completedAt : Maybe (Int)
    , errorMessage : Maybe (String)
    }


type alias MicroblogItem =
    { id : Generated
    , title : String
    , link : Maybe (String)
    , image : Maybe (String)
    , extract : Maybe (String)
    , ownerComment : DefaultValue
    , tags : List (String)
    , timestamp : Generated
    , viewCount : Int
    }


type alias SubmitCommentReq =
    { host : String
    , itemId : String
    , parentId : Maybe (String)
    , text : String
    , authorName : Maybe (String)
    }


type alias CommentItem =
    { id : String
    , itemId : String
    , guestId : String
    , parentId : Maybe (String)
    , authorName : String
    , text : String
    , timestamp : Int
    }


type alias SubmitCommentRes =
    { comment : CommentItem
    }


type alias SubmitCommentReqBundle =
    { context : StandardServerContext
    , input : SubmitCommentReq
    , data : SubmitCommentData
    }


type alias SubmitCommentData =
    { freshGuestId : String
    , freshCommentId : String
    }


type alias ItemComment =
    { id : Generated
    , itemId : String
    , guestId : String
    , parentId : Maybe (String)
    , authorName : String
    , text : String
    , timestamp : Generated
    }


type alias SendWelcomeEmail =
    { correlationId : CorrelationId
    , userId : String
    , email : String
    , name : String
    , executeAt : Maybe (ExecuteAt)
    , templateVars : Maybe (Dict String (String))
    }


type alias Tag =
    { id : Generated
    , name : String
    }


type alias ViewportState =
    { scrollY : SessionOnly
    , selectedItem : SessionOnly
    , sidebarCollapsed : CrossTab
    }


type ApiError
    = ValidationError { details : String }
    | NotFound { details : String }
    | InternalError { details : String }


type alias BackendOutput =
    { effects : List (BackendEffect)
    , response : Maybe (String)
    , error : Maybe (String)
    }


type alias StandardServerContext =
    { requestId : String
    , sessionId : Maybe (String)
    , userId : Maybe (String)
    , host : String
    }


type BackendEffect
    = Insert { table : String, data : String }
    | Log (String)


type alias Guest =
    { id : Generated
    , name : String
    , picture : String
    , sessionId : String
    , createdAt : Generated
    }


type alias AuthState =
    { userId : String
    , sessionToken : Expiring
    , permissions : Cached
    }


type alias GenerateDailyReport =
    { userId : String
    , cronExpression : String
    , timezone : Maybe (String)
    , reportType : String
    , emailResults : Maybe (String)
    }


type alias ProcessVideo =
    { correlationId : CorrelationId
    , videoId : String
    , executeAt : ExecuteAt
    , qualityPreset : Maybe (String)
    , webhookUrl : Maybe (String)
    }


submitItemDataEncoder : SubmitItemData -> Json.Encode.Value
submitItemDataEncoder struct =
    Json.Encode.object
        [ ( "fresh_tag_ids", (Json.Encode.list (Json.Encode.string)) struct.freshTagIds )
        ]


feedItemEncoder : FeedItem -> Json.Encode.Value
feedItemEncoder struct =
    Json.Encode.object
        [ ( "id", (Json.Encode.string) struct.id )
        , ( "title", (Json.Encode.string) struct.title )
        , ( "link", (Maybe.withDefault Json.Encode.null << Maybe.map (Json.Encode.string)) struct.link )
        , ( "image", (Maybe.withDefault Json.Encode.null << Maybe.map (Json.Encode.string)) struct.image )
        , ( "extract", (Maybe.withDefault Json.Encode.null << Maybe.map (Json.Encode.string)) struct.extract )
        , ( "owner_comment", (Json.Encode.string) struct.ownerComment )
        , ( "tags", (Json.Encode.list (Json.Encode.string)) struct.tags )
        , ( "timestamp", (Json.Encode.int) struct.timestamp )
        , ( "view_count", (Json.Encode.int) struct.viewCount )
        ]


getFeedReqEncoder : GetFeedReq -> Json.Encode.Value
getFeedReqEncoder struct =
    Json.Encode.object
        [ ( "host", (Json.Encode.string) struct.host )
        ]


submitItemReqBundleEncoder : SubmitItemReqBundle -> Json.Encode.Value
submitItemReqBundleEncoder struct =
    Json.Encode.object
        [ ( "context", (standardServerContextEncoder) struct.context )
        , ( "input", (submitItemReqEncoder) struct.input )
        , ( "data", (submitItemDataEncoder) struct.data )
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


submitItemResEncoder : SubmitItemRes -> Json.Encode.Value
submitItemResEncoder struct =
    Json.Encode.object
        [ ( "item", (feedItemEncoder) struct.item )
        ]


getFeedResEncoder : GetFeedRes -> Json.Encode.Value
getFeedResEncoder struct =
    Json.Encode.object
        [ ( "items", (Json.Encode.list (feedItemEncoder)) struct.items )
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


localeEncoder : Locale -> Json.Encode.Value
localeEncoder struct =
    Json.Encode.object
        [ ( "language", (Json.Encode.string) struct.language )
        , ( "timezone", (Json.Encode.string) struct.timezone )
        ]


userPreferencesEncoder : UserPreferences -> Json.Encode.Value
userPreferencesEncoder struct =
    Json.Encode.object
        [ ( "theme", (Json.Encode.string) struct.theme )
        , ( "notifications", (Json.Encode.bool) struct.notifications )
        , ( "locale", (localeEncoder) struct.locale )
        ]


fileProcessingStatusEncoder : FileProcessingStatus -> Json.Encode.Value
fileProcessingStatusEncoder struct =
    Json.Encode.object
        [ ( "file_id", (Json.Encode.string) struct.fileId )
        , ( "original_name", (Json.Encode.string) struct.originalName )
        , ( "status", (crossTabEncoder) struct.status )
        , ( "progress_percent", (crossTabEncoder) struct.progressPercent )
        , ( "processing_steps", (cachedEncoder) struct.processingSteps )
        ]


processingStepEncoder : ProcessingStep -> Json.Encode.Value
processingStepEncoder struct =
    Json.Encode.object
        [ ( "step_name", (Json.Encode.string) struct.stepName )
        , ( "status", (Json.Encode.string) struct.status )
        , ( "started_at", (Maybe.withDefault Json.Encode.null << Maybe.map (Json.Encode.int)) struct.startedAt )
        , ( "completed_at", (Maybe.withDefault Json.Encode.null << Maybe.map (Json.Encode.int)) struct.completedAt )
        , ( "error_message", (Maybe.withDefault Json.Encode.null << Maybe.map (Json.Encode.string)) struct.errorMessage )
        ]


microblogItemEncoder : MicroblogItem -> Json.Encode.Value
microblogItemEncoder struct =
    Json.Encode.object
        [ ( "id", (generatedEncoder) struct.id )
        , ( "title", (Json.Encode.string) struct.title )
        , ( "link", (Maybe.withDefault Json.Encode.null << Maybe.map (Json.Encode.string)) struct.link )
        , ( "image", (Maybe.withDefault Json.Encode.null << Maybe.map (Json.Encode.string)) struct.image )
        , ( "extract", (Maybe.withDefault Json.Encode.null << Maybe.map (Json.Encode.string)) struct.extract )
        , ( "owner_comment", (defaultValueEncoder) struct.ownerComment )
        , ( "tags", (Json.Encode.list (Json.Encode.string)) struct.tags )
        , ( "timestamp", (generatedEncoder) struct.timestamp )
        , ( "view_count", (Json.Encode.int) struct.viewCount )
        ]


submitCommentReqBundleEncoder : SubmitCommentReqBundle -> Json.Encode.Value
submitCommentReqBundleEncoder struct =
    Json.Encode.object
        [ ( "context", (standardServerContextEncoder) struct.context )
        , ( "input", (submitCommentReqEncoder) struct.input )
        , ( "data", (submitCommentDataEncoder) struct.data )
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


submitCommentDataEncoder : SubmitCommentData -> Json.Encode.Value
submitCommentDataEncoder struct =
    Json.Encode.object
        [ ( "fresh_guest_id", (Json.Encode.string) struct.freshGuestId )
        , ( "fresh_comment_id", (Json.Encode.string) struct.freshCommentId )
        ]


submitCommentResEncoder : SubmitCommentRes -> Json.Encode.Value
submitCommentResEncoder struct =
    Json.Encode.object
        [ ( "comment", (commentItemEncoder) struct.comment )
        ]


commentItemEncoder : CommentItem -> Json.Encode.Value
commentItemEncoder struct =
    Json.Encode.object
        [ ( "id", (Json.Encode.string) struct.id )
        , ( "item_id", (Json.Encode.string) struct.itemId )
        , ( "guest_id", (Json.Encode.string) struct.guestId )
        , ( "parent_id", (Maybe.withDefault Json.Encode.null << Maybe.map (Json.Encode.string)) struct.parentId )
        , ( "author_name", (Json.Encode.string) struct.authorName )
        , ( "text", (Json.Encode.string) struct.text )
        , ( "timestamp", (Json.Encode.int) struct.timestamp )
        ]


itemCommentEncoder : ItemComment -> Json.Encode.Value
itemCommentEncoder struct =
    Json.Encode.object
        [ ( "id", (generatedEncoder) struct.id )
        , ( "item_id", (Json.Encode.string) struct.itemId )
        , ( "guest_id", (Json.Encode.string) struct.guestId )
        , ( "parent_id", (Maybe.withDefault Json.Encode.null << Maybe.map (Json.Encode.string)) struct.parentId )
        , ( "author_name", (Json.Encode.string) struct.authorName )
        , ( "text", (Json.Encode.string) struct.text )
        , ( "timestamp", (generatedEncoder) struct.timestamp )
        ]


sendWelcomeEmailEncoder : SendWelcomeEmail -> Json.Encode.Value
sendWelcomeEmailEncoder struct =
    Json.Encode.object
        [ ( "correlation_id", (correlationIdEncoder) struct.correlationId )
        , ( "user_id", (Json.Encode.string) struct.userId )
        , ( "email", (Json.Encode.string) struct.email )
        , ( "name", (Json.Encode.string) struct.name )
        , ( "execute_at", (Maybe.withDefault Json.Encode.null << Maybe.map (executeAtEncoder)) struct.executeAt )
        , ( "template_vars", (Maybe.withDefault Json.Encode.null << Maybe.map (Json.Encode.dict identity (Json.Encode.string))) struct.templateVars )
        ]


tagEncoder : Tag -> Json.Encode.Value
tagEncoder struct =
    Json.Encode.object
        [ ( "id", (generatedEncoder) struct.id )
        , ( "name", (Json.Encode.string) struct.name )
        ]


viewportStateEncoder : ViewportState -> Json.Encode.Value
viewportStateEncoder struct =
    Json.Encode.object
        [ ( "scroll_y", (sessionOnlyEncoder) struct.scrollY )
        , ( "selected_item", (sessionOnlyEncoder) struct.selectedItem )
        , ( "sidebar_collapsed", (crossTabEncoder) struct.sidebarCollapsed )
        ]


backendEffectEncoder : BackendEffect -> Json.Encode.Value
backendEffectEncoder enum =
    case enum of
        Insert { table, data } ->
            Json.Encode.object [ ( "Insert", Json.Encode.object [ ( "table", (Json.Encode.string) table ), ( "data", (Json.Encode.string) data ) ] ) ]
        Log inner ->
            Json.Encode.object [ ( "Log", Json.Encode.string inner ) ]

backendOutputEncoder : BackendOutput -> Json.Encode.Value
backendOutputEncoder struct =
    Json.Encode.object
        [ ( "effects", (Json.Encode.list (backendEffectEncoder)) struct.effects )
        , ( "response", (Maybe.withDefault Json.Encode.null << Maybe.map (Json.Encode.string)) struct.response )
        , ( "error", (Maybe.withDefault Json.Encode.null << Maybe.map (Json.Encode.string)) struct.error )
        ]


standardServerContextEncoder : StandardServerContext -> Json.Encode.Value
standardServerContextEncoder struct =
    Json.Encode.object
        [ ( "request_id", (Json.Encode.string) struct.requestId )
        , ( "session_id", (Maybe.withDefault Json.Encode.null << Maybe.map (Json.Encode.string)) struct.sessionId )
        , ( "user_id", (Maybe.withDefault Json.Encode.null << Maybe.map (Json.Encode.string)) struct.userId )
        , ( "host", (Json.Encode.string) struct.host )
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

guestEncoder : Guest -> Json.Encode.Value
guestEncoder struct =
    Json.Encode.object
        [ ( "id", (generatedEncoder) struct.id )
        , ( "name", (Json.Encode.string) struct.name )
        , ( "picture", (Json.Encode.string) struct.picture )
        , ( "session_id", (Json.Encode.string) struct.sessionId )
        , ( "created_at", (generatedEncoder) struct.createdAt )
        ]


authStateEncoder : AuthState -> Json.Encode.Value
authStateEncoder struct =
    Json.Encode.object
        [ ( "user_id", (Json.Encode.string) struct.userId )
        , ( "session_token", (expiringEncoder) struct.sessionToken )
        , ( "permissions", (cachedEncoder) struct.permissions )
        ]


processVideoEncoder : ProcessVideo -> Json.Encode.Value
processVideoEncoder struct =
    Json.Encode.object
        [ ( "correlation_id", (correlationIdEncoder) struct.correlationId )
        , ( "video_id", (Json.Encode.string) struct.videoId )
        , ( "execute_at", (executeAtEncoder) struct.executeAt )
        , ( "quality_preset", (Maybe.withDefault Json.Encode.null << Maybe.map (Json.Encode.string)) struct.qualityPreset )
        , ( "webhook_url", (Maybe.withDefault Json.Encode.null << Maybe.map (Json.Encode.string)) struct.webhookUrl )
        ]


generateDailyReportEncoder : GenerateDailyReport -> Json.Encode.Value
generateDailyReportEncoder struct =
    Json.Encode.object
        [ ( "user_id", (Json.Encode.string) struct.userId )
        , ( "cron_expression", (Json.Encode.string) struct.cronExpression )
        , ( "timezone", (Maybe.withDefault Json.Encode.null << Maybe.map (Json.Encode.string)) struct.timezone )
        , ( "report_type", (Json.Encode.string) struct.reportType )
        , ( "email_results", (Maybe.withDefault Json.Encode.null << Maybe.map (Json.Encode.string)) struct.emailResults )
        ]


feedItemDecoder : Json.Decode.Decoder FeedItem
feedItemDecoder =
    Json.Decode.succeed FeedItem
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "id" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "title" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "link" (Json.Decode.nullable (Json.Decode.string))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "image" (Json.Decode.nullable (Json.Decode.string))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "extract" (Json.Decode.nullable (Json.Decode.string))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "owner_comment" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "tags" (Json.Decode.list (Json.Decode.string))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "timestamp" (Json.Decode.int)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "view_count" (Json.Decode.int)))


submitItemDataDecoder : Json.Decode.Decoder SubmitItemData
submitItemDataDecoder =
    Json.Decode.succeed SubmitItemData
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "fresh_tag_ids" (Json.Decode.list (Json.Decode.string))))


submitItemResDecoder : Json.Decode.Decoder SubmitItemRes
submitItemResDecoder =
    Json.Decode.succeed SubmitItemRes
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "item" (feedItemDecoder)))


getFeedReqDecoder : Json.Decode.Decoder GetFeedReq
getFeedReqDecoder =
    Json.Decode.succeed GetFeedReq
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "host" (Json.Decode.string)))


submitItemReqBundleDecoder : Json.Decode.Decoder SubmitItemReqBundle
submitItemReqBundleDecoder =
    Json.Decode.succeed SubmitItemReqBundle
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "context" (standardServerContextDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "input" (submitItemReqDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "data" (submitItemDataDecoder)))


getFeedResDecoder : Json.Decode.Decoder GetFeedRes
getFeedResDecoder =
    Json.Decode.succeed GetFeedRes
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "items" (Json.Decode.list (feedItemDecoder))))


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


getTagsResDecoder : Json.Decode.Decoder GetTagsRes
getTagsResDecoder =
    Json.Decode.succeed GetTagsRes
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "tags" (Json.Decode.list (Json.Decode.string))))


getTagsReqDecoder : Json.Decode.Decoder GetTagsReq
getTagsReqDecoder =
    Json.Decode.succeed GetTagsReq
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "host" (Json.Decode.string)))


userPreferencesDecoder : Json.Decode.Decoder UserPreferences
userPreferencesDecoder =
    Json.Decode.succeed UserPreferences
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "theme" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "notifications" (Json.Decode.bool)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "locale" (localeDecoder)))


localeDecoder : Json.Decode.Decoder Locale
localeDecoder =
    Json.Decode.succeed Locale
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "language" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "timezone" (Json.Decode.string)))


fileProcessingStatusDecoder : Json.Decode.Decoder FileProcessingStatus
fileProcessingStatusDecoder =
    Json.Decode.succeed FileProcessingStatus
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "file_id" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "original_name" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "status" (crossTabDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "progress_percent" (crossTabDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "processing_steps" (cachedDecoder)))


processingStepDecoder : Json.Decode.Decoder ProcessingStep
processingStepDecoder =
    Json.Decode.succeed ProcessingStep
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "step_name" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "status" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "started_at" (Json.Decode.nullable (Json.Decode.int))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "completed_at" (Json.Decode.nullable (Json.Decode.int))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "error_message" (Json.Decode.nullable (Json.Decode.string))))


microblogItemDecoder : Json.Decode.Decoder MicroblogItem
microblogItemDecoder =
    Json.Decode.succeed MicroblogItem
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "id" (generatedDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "title" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "link" (Json.Decode.nullable (Json.Decode.string))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "image" (Json.Decode.nullable (Json.Decode.string))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "extract" (Json.Decode.nullable (Json.Decode.string))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "owner_comment" (defaultValueDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "tags" (Json.Decode.list (Json.Decode.string))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "timestamp" (generatedDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "view_count" (Json.Decode.int)))


submitCommentReqBundleDecoder : Json.Decode.Decoder SubmitCommentReqBundle
submitCommentReqBundleDecoder =
    Json.Decode.succeed SubmitCommentReqBundle
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "context" (standardServerContextDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "input" (submitCommentReqDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "data" (submitCommentDataDecoder)))


submitCommentReqDecoder : Json.Decode.Decoder SubmitCommentReq
submitCommentReqDecoder =
    Json.Decode.succeed SubmitCommentReq
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "host" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "item_id" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "parent_id" (Json.Decode.nullable (Json.Decode.string))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "text" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "author_name" (Json.Decode.nullable (Json.Decode.string))))


submitCommentResDecoder : Json.Decode.Decoder SubmitCommentRes
submitCommentResDecoder =
    Json.Decode.succeed SubmitCommentRes
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "comment" (commentItemDecoder)))


commentItemDecoder : Json.Decode.Decoder CommentItem
commentItemDecoder =
    Json.Decode.succeed CommentItem
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "id" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "item_id" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "guest_id" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "parent_id" (Json.Decode.nullable (Json.Decode.string))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "author_name" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "text" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "timestamp" (Json.Decode.int)))


submitCommentDataDecoder : Json.Decode.Decoder SubmitCommentData
submitCommentDataDecoder =
    Json.Decode.succeed SubmitCommentData
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "fresh_guest_id" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "fresh_comment_id" (Json.Decode.string)))


itemCommentDecoder : Json.Decode.Decoder ItemComment
itemCommentDecoder =
    Json.Decode.succeed ItemComment
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "id" (generatedDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "item_id" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "guest_id" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "parent_id" (Json.Decode.nullable (Json.Decode.string))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "author_name" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "text" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "timestamp" (generatedDecoder)))


sendWelcomeEmailDecoder : Json.Decode.Decoder SendWelcomeEmail
sendWelcomeEmailDecoder =
    Json.Decode.succeed SendWelcomeEmail
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "correlation_id" (correlationIdDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "user_id" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "email" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "name" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "execute_at" (Json.Decode.nullable (executeAtDecoder))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "template_vars" (Json.Decode.nullable (Json.Decode.dict (Json.Decode.string)))))


tagDecoder : Json.Decode.Decoder Tag
tagDecoder =
    Json.Decode.succeed Tag
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "id" (generatedDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "name" (Json.Decode.string)))


viewportStateDecoder : Json.Decode.Decoder ViewportState
viewportStateDecoder =
    Json.Decode.succeed ViewportState
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "scroll_y" (sessionOnlyDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "selected_item" (sessionOnlyDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "sidebar_collapsed" (crossTabDecoder)))


backendOutputDecoder : Json.Decode.Decoder BackendOutput
backendOutputDecoder =
    Json.Decode.succeed BackendOutput
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "effects" (Json.Decode.list (backendEffectDecoder))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "response" (Json.Decode.nullable (Json.Decode.string))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "error" (Json.Decode.nullable (Json.Decode.string))))


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

standardServerContextDecoder : Json.Decode.Decoder StandardServerContext
standardServerContextDecoder =
    Json.Decode.succeed StandardServerContext
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "request_id" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "session_id" (Json.Decode.nullable (Json.Decode.string))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "user_id" (Json.Decode.nullable (Json.Decode.string))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "host" (Json.Decode.string)))


guestDecoder : Json.Decode.Decoder Guest
guestDecoder =
    Json.Decode.succeed Guest
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "id" (generatedDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "name" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "picture" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "session_id" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "created_at" (generatedDecoder)))


authStateDecoder : Json.Decode.Decoder AuthState
authStateDecoder =
    Json.Decode.succeed AuthState
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "user_id" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "session_token" (expiringDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "permissions" (cachedDecoder)))


processVideoDecoder : Json.Decode.Decoder ProcessVideo
processVideoDecoder =
    Json.Decode.succeed ProcessVideo
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "correlation_id" (correlationIdDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "video_id" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "execute_at" (executeAtDecoder)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "quality_preset" (Json.Decode.nullable (Json.Decode.string))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "webhook_url" (Json.Decode.nullable (Json.Decode.string))))


generateDailyReportDecoder : Json.Decode.Decoder GenerateDailyReport
generateDailyReportDecoder =
    Json.Decode.succeed GenerateDailyReport
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "user_id" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "cron_expression" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "timezone" (Json.Decode.nullable (Json.Decode.string))))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "report_type" (Json.Decode.string)))
        |> Json.Decode.andThen (\x -> Json.Decode.map x (Json.Decode.field "email_results" (Json.Decode.nullable (Json.Decode.string))))


