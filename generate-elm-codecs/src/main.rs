use elm_rs::{Elm, ElmDecode, ElmEncode};
use serde::{Deserialize, Serialize};
use std::fs;

// Re-declare all the API types with elm_rs derives
// This is necessary because we can't import from proto-rust due to compilation issues

#[derive(Debug, Clone, Serialize, Deserialize, Elm, ElmEncode, ElmDecode)]
pub struct GetFeedReq {
    pub host: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Elm, ElmEncode, ElmDecode)]
pub struct FeedItem {
    pub id: String,
    pub title: String,
    pub image: Option<String>,
    pub extract: Option<String>,
    pub owner_comment: String,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Elm, ElmEncode, ElmDecode)]
pub struct GetFeedRes {
    pub items: Vec<FeedItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Elm, ElmEncode, ElmDecode)]
pub struct MicroblogItem {
    pub id: String,
    pub title: String,
    pub link: String,
    pub image: String,
    pub extract: String,
    pub owner_comment: String,
    pub tags: Vec<String>,
    pub comments: Vec<ItemComment>,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Elm, ElmEncode, ElmDecode)]
pub struct SubmitItemData {
    pub fresh_tag_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Elm, ElmEncode, ElmDecode)]
pub struct SubmitItemReq {
    pub host: String,
    pub title: String,
    pub link: String,
    pub image: String,
    pub extract: String,
    pub owner_comment: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Elm, ElmEncode, ElmDecode)]
pub struct SubmitItemRes {
    pub item: MicroblogItem,
}

#[derive(Debug, Clone, Serialize, Deserialize, Elm, ElmEncode, ElmDecode)]
pub struct ItemComment {
    pub id: String,
    pub item_id: String,
    pub guest_id: String,
    pub parent_id: Option<String>,
    pub author_name: String,
    pub text: String,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Elm, ElmEncode, ElmDecode)]
pub struct SubmitCommentReq {
    pub host: String,
    pub item_id: String,
    pub parent_id: Option<String>,
    pub text: String,
    pub author_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Elm, ElmEncode, ElmDecode)]
pub struct SubmitCommentRes {
    pub comment: ItemComment,
}

#[derive(Debug, Clone, Serialize, Deserialize, Elm, ElmEncode, ElmDecode)]
pub struct GetTagsReq {
    pub host: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Elm, ElmEncode, ElmDecode)]
pub struct GetTagsRes {
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Elm, ElmEncode, ElmDecode)]
pub struct GetItemReq {
    pub host: String,
    pub id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Elm, ElmEncode, ElmDecode)]
pub struct GetItemRes {
    pub item: MicroblogItem,
}

fn main() {
    println!("🦀 Generating complete Elm types with codecs...");
    
    // Generate Api.Backend module with all types and codecs
    let mut backend_buffer = Vec::new();
    elm_rs::export!("Api.Backend", &mut backend_buffer, {
        encoders: [
            GetFeedReq,
            GetFeedRes,
            FeedItem,
            MicroblogItem,
            SubmitItemReq,
            SubmitItemRes,
            SubmitItemData,
            SubmitCommentReq,
            SubmitCommentRes,
            ItemComment,
            GetTagsReq,
            GetTagsRes,
            GetItemReq,
            GetItemRes,
        ],
        decoders: [
            GetFeedReq,
            GetFeedRes,
            FeedItem,
            MicroblogItem,
            SubmitItemReq,
            SubmitItemRes,
            SubmitItemData,
            SubmitCommentReq,
            SubmitCommentRes,
            ItemComment,
            GetTagsReq,
            GetTagsRes,
            GetItemReq,
            GetItemRes,
        ],
    }).unwrap();
    
    let mut backend_content = String::from_utf8(backend_buffer).unwrap();
    
    // Remove unnecessary imports for backend
    backend_content = backend_content
        .replace("import Http\n", "")
        .replace("import Url.Builder\n", "");
    
    // Add the backend-specific types that aren't auto-generated
    let backend_additions = r#"

-- BACKEND-SPECIFIC TYPES (Not auto-generated)

type BackendAction
    = SubmitItem SubmitItemReqBundle
    | SubmitComment SubmitCommentReqBundle
    | GetFeed GetFeedReqBundle
    | GetItem GetItemReqBundle
    | GetTags GetTagsReqBundle

type alias StandardServerContext =
    { requestId : String
    , sessionId : Maybe String
    , userId : Maybe String
    , host : String
    }

type alias SubmitItemReqBundle =
    { context : StandardServerContext
    , input : SubmitItemReq
    , data : SubmitItemData
    }

type alias SubmitCommentReqBundle =
    { context : StandardServerContext
    , input : SubmitCommentReq
    }

type alias GetFeedReqBundle =
    { context : StandardServerContext
    , input : GetFeedReq
    }

type alias GetItemReqBundle =
    { context : StandardServerContext
    , input : GetItemReq
    }

type alias GetTagsReqBundle =
    { context : StandardServerContext
    , input : GetTagsReq
    }

-- Bundle encoders
submitItemReqBundleEncoder : SubmitItemReqBundle -> Json.Encode.Value
submitItemReqBundleEncoder bundle =
    Json.Encode.object
        [ ( "context", standardServerContextEncoder bundle.context )
        , ( "input", submitItemReqEncoder bundle.input )
        , ( "data", submitItemDataEncoder bundle.data )
        ]

submitCommentReqBundleEncoder : SubmitCommentReqBundle -> Json.Encode.Value
submitCommentReqBundleEncoder bundle =
    Json.Encode.object
        [ ( "context", standardServerContextEncoder bundle.context )
        , ( "input", submitCommentReqEncoder bundle.input )
        ]

getFeedReqBundleEncoder : GetFeedReqBundle -> Json.Encode.Value
getFeedReqBundleEncoder bundle =
    Json.Encode.object
        [ ( "context", standardServerContextEncoder bundle.context )
        , ( "input", getFeedReqEncoder bundle.input )
        ]

getItemReqBundleEncoder : GetItemReqBundle -> Json.Encode.Value
getItemReqBundleEncoder bundle =
    Json.Encode.object
        [ ( "context", standardServerContextEncoder bundle.context )
        , ( "input", getItemReqEncoder bundle.input )
        ]

getTagsReqBundleEncoder : GetTagsReqBundle -> Json.Encode.Value
getTagsReqBundleEncoder bundle =
    Json.Encode.object
        [ ( "context", standardServerContextEncoder bundle.context )
        , ( "input", getTagsReqEncoder bundle.input )
        ]

-- StandardServerContext encoder
standardServerContextEncoder : StandardServerContext -> Json.Encode.Value
standardServerContextEncoder context =
    Json.Encode.object
        [ ( "requestId", Json.Encode.string context.requestId )
        , ( "sessionId", Maybe.withDefault Json.Encode.null (Maybe.map Json.Encode.string context.sessionId) )
        , ( "userId", Maybe.withDefault Json.Encode.null (Maybe.map Json.Encode.string context.userId) )
        , ( "host", Json.Encode.string context.host )
        ]

-- BackendAction encoder
backendActionEncoder : BackendAction -> Json.Encode.Value
backendActionEncoder action =
    case action of
        SubmitItem bundle ->
            Json.Encode.object [ ( "SubmitItem", submitItemReqBundleEncoder bundle ) ]
        SubmitComment bundle ->
            Json.Encode.object [ ( "SubmitComment", submitCommentReqBundleEncoder bundle ) ]
        GetFeed bundle ->
            Json.Encode.object [ ( "GetFeed", getFeedReqBundleEncoder bundle ) ]
        GetItem bundle ->
            Json.Encode.object [ ( "GetItem", getItemReqBundleEncoder bundle ) ]
        GetTags bundle ->
            Json.Encode.object [ ( "GetTags", getTagsReqBundleEncoder bundle ) ]
"#;
    
    let full_backend_content = backend_content + backend_additions;
    fs::write("../app/horatio/server/src/Api/Backend.elm", full_backend_content).unwrap();
    println!("✅ Generated app/horatio/server/src/Api/Backend.elm");
    
    // Generate Api.Schema module for frontend
    let mut schema_buffer = Vec::new();
    elm_rs::export!("Api.Schema", &mut schema_buffer, {
        encoders: [
            GetFeedReq,
            GetFeedRes,
            FeedItem,
            MicroblogItem,
            SubmitItemReq,
            SubmitItemRes,
            SubmitCommentReq,
            SubmitCommentRes,
            ItemComment,
            GetTagsReq,
            GetTagsRes,
            GetItemReq,
            GetItemRes,
        ],
        decoders: [
            GetFeedReq,
            GetFeedRes,
            FeedItem,
            MicroblogItem,
            SubmitItemReq,
            SubmitItemRes,
            SubmitCommentReq,
            SubmitCommentRes,
            ItemComment,
            GetTagsReq,
            GetTagsRes,
            GetItemReq,
            GetItemRes,
        ],
    }).unwrap();
    
    let mut schema_content = String::from_utf8(schema_buffer).unwrap();
    
    // Remove unnecessary imports for frontend schema
    schema_content = schema_content
        .replace("import Http\n", "")
        .replace("import Url.Builder\n", "");
        
    fs::write("../app/horatio/web/src/Api/Schema.elm", schema_content).unwrap();
    println!("✅ Generated app/horatio/web/src/Api/Schema.elm");
    
    println!("✨ Successfully generated complete Elm types with all encoders and decoders!");
}