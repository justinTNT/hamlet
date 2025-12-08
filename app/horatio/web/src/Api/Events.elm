module Api.Events exposing
    ( SSEEvent(..)
    , SSEEventData(..)
    , NewPostData
    , NewCommentData
    , ConnectionData
    , HeartbeatData
    , sseEventDecoder
    , sseSubscription
    )

import Json.Decode as Decode
import Time


-- SSE Event Types

type SSEEvent
    = SSEConnection ConnectionData
    | SSEHeartbeat HeartbeatData
    | SSENewPost NewPostData
    | SSENewComment NewCommentData
    | SSEUnknown String Decode.Value


type alias ConnectionData =
    { message : String
    , host : String
    , timestamp : Int
    }


type alias HeartbeatData =
    { timestamp : Int
    }


type alias NewPostData =
    { postId : String
    , title : String
    , authorName : String
    , authorId : String
    , extract : Maybe String
    , tags : List String
    , timestamp : Int
    , link : Maybe String
    , image : Maybe String
    }


type alias NewCommentData =
    { commentId : String
    , postId : String
    , authorName : String
    , authorId : String
    , text : String
    , timestamp : Int
    }


-- Decoders

connectionDataDecoder : Decode.Decoder ConnectionData
connectionDataDecoder =
    Decode.map3 ConnectionData
        (Decode.field "message" Decode.string)
        (Decode.field "host" Decode.string)
        (Decode.field "timestamp" Decode.int)


heartbeatDataDecoder : Decode.Decoder HeartbeatData
heartbeatDataDecoder =
    Decode.map HeartbeatData
        (Decode.field "timestamp" Decode.int)


newPostDataDecoder : Decode.Decoder NewPostData
newPostDataDecoder =
    Decode.map8 NewPostData
        (Decode.field "post_id" Decode.string)
        (Decode.field "title" Decode.string)
        (Decode.field "author_name" Decode.string)
        (Decode.field "author_id" Decode.string)
        (Decode.field "extract" (Decode.nullable Decode.string))
        (Decode.field "tags" (Decode.list Decode.string))
        (Decode.field "timestamp" Decode.int)
        |> Decode.andThen (\f ->
            Decode.map2 f
                (Decode.field "link" (Decode.nullable Decode.string))
                (Decode.field "image" (Decode.nullable Decode.string))
        )


newCommentDataDecoder : Decode.Decoder NewCommentData
newCommentDataDecoder =
    Decode.map6 NewCommentData
        (Decode.field "comment_id" Decode.string)
        (Decode.field "post_id" Decode.string)
        (Decode.field "author_name" Decode.string)
        (Decode.field "author_id" Decode.string)
        (Decode.field "text" Decode.string)
        (Decode.field "timestamp" Decode.int)


sseEventDecoder : Decode.Decoder SSEEvent
sseEventDecoder =
    Decode.field "type" Decode.string
        |> Decode.andThen
            (\eventType ->
                case eventType of
                    "connection" ->
                        Decode.field "data" connectionDataDecoder
                            |> Decode.map SSEConnection

                    "heartbeat" ->
                        Decode.map SSEHeartbeat heartbeatDataDecoder

                    "new_post" ->
                        Decode.field "data" newPostDataDecoder
                            |> Decode.map SSENewPost

                    "new_comment" ->
                        Decode.field "data" newCommentDataDecoder
                            |> Decode.map SSENewComment

                    unknown ->
                        Decode.map (SSEUnknown unknown)
                            (Decode.field "data" Decode.value)
            )


-- SSE Subscription Port
-- This would typically be defined in your main module with ports

{-
Example usage in your main Elm application:

port sseMessages : (String -> msg) -> Sub msg

sseSubscription : (SSEEvent -> msg) -> Sub msg
sseSubscription toMsg =
    sseMessages
        (\jsonString ->
            case Decode.decodeString sseEventDecoder jsonString of
                Ok event ->
                    toMsg event
                
                Err _ ->
                    -- Handle decode error or ignore
                    toMsg (SSEUnknown "decode_error" (Encode.string jsonString))
        )

-- JavaScript side (in your index.html or ports.js):
if (app.ports && app.ports.sseMessages) {
    const eventSource = new EventSource('/events/stream');
    
    eventSource.onmessage = function(event) {
        try {
            const data = JSON.parse(event.data);
            app.ports.sseMessages.send(JSON.stringify(data));
        } catch (e) {
            console.error('Failed to parse SSE message:', e);
        }
    };
    
    eventSource.onerror = function(event) {
        console.error('SSE error:', event);
    };
}
-}

-- For now, provide a placeholder function
sseSubscription : (SSEEvent -> msg) -> Sub msg
sseSubscription _ =
    Sub.none


-- Utility functions for working with SSE events

isNewContent : SSEEvent -> Bool
isNewContent event =
    case event of
        SSENewPost _ ->
            True
            
        SSENewComment _ ->
            True
            
        _ ->
            False


getEventTimestamp : SSEEvent -> Int
getEventTimestamp event =
    case event of
        SSEConnection data ->
            data.timestamp
            
        SSEHeartbeat data ->
            data.timestamp
            
        SSENewPost data ->
            data.timestamp
            
        SSENewComment data ->
            data.timestamp
            
        SSEUnknown _ _ ->
            0


formatEventTime : Int -> String
formatEventTime timestamp =
    -- Convert timestamp to readable format
    -- This is a simple example - you might want to use Time.Extra or similar
    let
        date = Time.millisToPosix timestamp
    in
    "Just now"  -- Placeholder - implement proper formatting as needed