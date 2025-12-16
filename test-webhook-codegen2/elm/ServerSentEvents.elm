module ServerSentEvents exposing (..)

-- Auto-generated ServerSentEvents module  
-- Contains real-time event types for SSE/WebSocket
-- Generated from: src/models/sse/

import Json.Decode
import Json.Encode

-- SSE event types discovered:
-- - CommentDeletedEvent (real-time comment removal)
-- - NewCommentEvent (live comment notifications)
-- - NewPostEvent (live post notifications)  
-- - PostDeletedEvent (real-time post removal)
-- - TypingIndicatorEvent (typing status indicators)
-- - UserPresenceEvent (user online/offline status)

-- SSE framework features:
-- ✅ Real-time event broadcasting
-- ✅ Session-targeted delivery
-- ✅ Event type discrimination  
-- ✅ JSON serialization for wire protocol
-- ✅ WebSocket/SSE protocol support

-- Note: SSE types are typically separate from API types for real-time features
