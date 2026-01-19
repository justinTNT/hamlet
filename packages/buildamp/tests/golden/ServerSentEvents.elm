module Generated.ServerSentEvents exposing (..)

{-| Auto-Generated Server-Sent Events Types and Decoders

DO NOT EDIT - Changes will be overwritten

-}

import Json.Decode as Decode exposing (Decoder)
import Json.Decode.Pipeline exposing (required, optional, hardcoded)


-- Helper for pipeline decoding
andMap : Decoder a -> Decoder (a -> b) -> Decoder b
andMap =
    Decode.map2 (|>)


-- EVENT TYPES

type alias CommentDeletedEvent =
    {     comment_id : String
    ,     post_id : String
    ,     author_id : String
    ,     timestamp : Int
    }


type alias NewCommentEvent =
    {     comment_id : String
    ,     post_id : String
    ,     parent_comment_id : Maybe String
    ,     author_name : String
    ,     author_id : String
    ,     text : String
    ,     timestamp : Int
    }


type alias NewPostEvent =
    {     post_id : String
    ,     title : String
    ,     author_name : String
    ,     author_id : String
    ,     extract : Maybe String
    ,     tags : List String
    ,     timestamp : Int
    ,     link : Maybe String
    ,     image : Maybe String
    }


type alias PostDeletedEvent =
    {     post_id : String
    ,     author_id : String
    ,     timestamp : Int
    }


type alias TypingIndicatorEvent =
    {     user_id : String
    ,     display_name : String
    ,     post_id : String
    ,     is_typing : Bool
    ,     timestamp : Int
    }


type alias UserPresenceEvent =
    {     user_id : String
    ,     display_name : String
    ,     status : String
    ,     last_seen : Maybe String
    }


-- EVENT DECODERS

decodeCommentDeletedEvent : Decode.Decoder CommentDeletedEvent
decodeCommentDeletedEvent =
    Decode.succeed CommentDeletedEvent
        |> andMap (Decode.field "comment_id" Decode.string)
        |> andMap (Decode.field "post_id" Decode.string)
        |> andMap (Decode.field "author_id" Decode.string)
        |> andMap (Decode.field "timestamp" Decode.int)


decodeNewCommentEvent : Decode.Decoder NewCommentEvent
decodeNewCommentEvent =
    Decode.succeed NewCommentEvent
        |> andMap (Decode.field "comment_id" Decode.string)
        |> andMap (Decode.field "post_id" Decode.string)
        |> andMap (Decode.field "parent_comment_id" (Decode.maybe Decode.string))
        |> andMap (Decode.field "author_name" Decode.string)
        |> andMap (Decode.field "author_id" Decode.string)
        |> andMap (Decode.field "text" Decode.string)
        |> andMap (Decode.field "timestamp" Decode.int)


decodeNewPostEvent : Decode.Decoder NewPostEvent
decodeNewPostEvent =
    Decode.succeed NewPostEvent
        |> andMap (Decode.field "post_id" Decode.string)
        |> andMap (Decode.field "title" Decode.string)
        |> andMap (Decode.field "author_name" Decode.string)
        |> andMap (Decode.field "author_id" Decode.string)
        |> andMap (Decode.field "extract" (Decode.maybe Decode.string))
        |> andMap (Decode.field "tags" (Decode.list Decode.string))
        |> andMap (Decode.field "timestamp" Decode.int)
        |> andMap (Decode.field "link" (Decode.maybe Decode.string))
        |> andMap (Decode.field "image" (Decode.maybe Decode.string))


decodePostDeletedEvent : Decode.Decoder PostDeletedEvent
decodePostDeletedEvent =
    Decode.succeed PostDeletedEvent
        |> andMap (Decode.field "post_id" Decode.string)
        |> andMap (Decode.field "author_id" Decode.string)
        |> andMap (Decode.field "timestamp" Decode.int)


decodeTypingIndicatorEvent : Decode.Decoder TypingIndicatorEvent
decodeTypingIndicatorEvent =
    Decode.succeed TypingIndicatorEvent
        |> andMap (Decode.field "user_id" Decode.string)
        |> andMap (Decode.field "display_name" Decode.string)
        |> andMap (Decode.field "post_id" Decode.string)
        |> andMap (Decode.field "is_typing" Decode.bool)
        |> andMap (Decode.field "timestamp" Decode.int)


decodeUserPresenceEvent : Decode.Decoder UserPresenceEvent
decodeUserPresenceEvent =
    Decode.succeed UserPresenceEvent
        |> andMap (Decode.field "user_id" Decode.string)
        |> andMap (Decode.field "display_name" Decode.string)
        |> andMap (Decode.field "status" Decode.string)
        |> andMap (Decode.field "last_seen" (Decode.maybe Decode.string))


-- SSE HELPERS

-- SSE Event Union Type
type SSEEvent
    = UnknownEvent String    | CommentDeletedEventEvent CommentDeletedEvent
    | NewCommentEventEvent NewCommentEvent
    | NewPostEventEvent NewPostEvent
    | PostDeletedEventEvent PostDeletedEvent
    | TypingIndicatorEventEvent TypingIndicatorEvent
    | UserPresenceEventEvent UserPresenceEvent


-- SSE Event Decoder
decodeSSEEvent : String -> String -> Result Decode.Error SSEEvent
decodeSSEEvent eventType jsonData =
    case eventType of
        "comment_deleted_event" -> Decode.map CommentDeletedEventEvent decodeCommentDeletedEvent
        "new_comment_event" -> Decode.map NewCommentEventEvent decodeNewCommentEvent
        "new_post_event" -> Decode.map NewPostEventEvent decodeNewPostEvent
        "post_deleted_event" -> Decode.map PostDeletedEventEvent decodePostDeletedEvent
        "typing_indicator_event" -> Decode.map TypingIndicatorEventEvent decodeTypingIndicatorEvent
        "user_presence_event" -> Decode.map UserPresenceEventEvent decodeUserPresenceEvent
        _ -> Ok (UnknownEvent eventType)


-- SSE Connection Helpers

{-| Subscribe to server-sent events
-}
subscribeToSSE : String -> (SSEEvent -> msg) -> Sub msg
subscribeToSSE url toMsg =
    sseSubscription { url = url, onEvent = toMsg }

{-| Port for SSE subscription - implement in JavaScript
-}
port sseSubscription : { url : String, onEvent : SSEEvent -> msg } -> Sub msg