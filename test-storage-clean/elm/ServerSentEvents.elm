module ServerSentEvents exposing (..)

-- Auto-generated ServerSentEvents module
-- Contains real-time event types for SSE/WebSocket
-- Generated from: src/models/sse/

import Json.Decode
import Json.Encode

-- Server Sent Events types discovered:
-- - CommentDeletedEvent
-- - NewCommentEvent
-- - NewPostEvent
-- - PostDeletedEvent
-- - TypingIndicatorEvent
-- - UserPresenceEvent

-- ServerSentEvents framework features:
-- ✅ Real-time event broadcasting
-- ✅ Session-targeted delivery
-- ✅ Event type discrimination
-- ✅ JSON serialization for wire protocol
-- ✅ WebSocket/SSE protocol support

type alias CommentDeletedEvent =
    {
      comment_id : String,
      post_id : String,
      author_id : String,
      timestamp : Int
    }

type alias NewCommentEvent =
    {
      comment_id : String,
      post_id : String,
      parent_comment_id : Maybe String,
      author_name : String,
      author_id : String,
      text : String,
      timestamp : Int
    }

type alias NewPostEvent =
    {
      post_id : String,
      title : String,
      author_name : String,
      author_id : String,
      extract : Maybe String,
      tags : List String,
      timestamp : Int,
      link : Maybe String,
      image : Maybe String
    }

type alias PostDeletedEvent =
    {
      post_id : String,
      author_id : String,
      timestamp : Int
    }

type alias TypingIndicatorEvent =
    {
      user_id : String,
      display_name : String,
      post_id : String,
      is_typing : Bool,
      timestamp : Int
    }

type alias UserPresenceEvent =
    {
      user_id : String,
      display_name : String,
      status : String,
      last_seen : Maybe Int
    }
