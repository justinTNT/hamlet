
use elm_rs::{Elm, ElmDecode, ElmEncode};

// Import all API types
use proto_rust::models::api::feed::*;
use proto_rust::models::api::comment::*;
use proto_rust::models::api::tags::*;
use proto_rust::models::api::item::*;

fn main() {
    // Generate Api.Backend module with all types and codecs
    let mut backend_buffer = Vec::new();
    elm_rs::export!("Api.Backend", &mut backend_buffer, {
        encoders: [
            // Feed types
            GetFeedReq,
            GetFeedRes,
            FeedItem,
            MicroblogItem,
            SubmitItemReq,
            SubmitItemRes,
            SubmitItemData,
            
            // Comment types
            SubmitCommentReq,
            SubmitCommentRes,
            ItemComment,
            
            // Tag types
            GetTagsReq,
            GetTagsRes,
            
            // Item types
            GetItemReq,
            GetItemRes,
        ],
        decoders: [
            // Feed types
            GetFeedReq,
            GetFeedRes,
            FeedItem,
            MicroblogItem,
            SubmitItemReq,
            SubmitItemRes,
            SubmitItemData,
            
            // Comment types
            SubmitCommentReq,
            SubmitCommentRes,
            ItemComment,
            
            // Tag types
            GetTagsReq,
            GetTagsRes,
            
            // Item types
            GetItemReq,
            GetItemRes,
        ],
    }).unwrap();
    
    let backend_content = String::from_utf8(backend_buffer).unwrap();
    std::fs::write("api-backend-generated.elm", backend_content).unwrap();
    
    // Generate Api.Schema module for frontend
    let mut schema_buffer = Vec::new();
    elm_rs::export!("Api.Schema", &mut schema_buffer, {
        encoders: [
            // Only types needed by frontend
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
    
    let schema_content = String::from_utf8(schema_buffer).unwrap();
    std::fs::write("api-schema-generated.elm", schema_content).unwrap();
    
    println!("Generated Api.Backend and Api.Schema with complete types and codecs");
}
