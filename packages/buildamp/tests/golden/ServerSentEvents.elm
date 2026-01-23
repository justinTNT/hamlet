module BuildAmp.ServerSentEvents exposing (..)

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

type alias CommentRemovedEvent =
    {     comment_id : String
    ,     post_id : String
    ,     timestamp : Int
    }


-- EVENT DECODERS

decodeCommentRemovedEvent : Decode.Decoder CommentRemovedEvent
decodeCommentRemovedEvent =
    Decode.succeed CommentRemovedEvent
        |> andMap (Decode.field "comment_id" Decode.string)
        |> andMap (Decode.field "post_id" Decode.string)
        |> andMap (Decode.field "timestamp" Decode.int)


-- SSE HELPERS

-- SSE Event Union Type
type SSEEvent
    = UnknownEvent String    | CommentRemovedEventEvent CommentRemovedEvent


-- SSE Event Decoder
decodeSSEEvent : String -> String -> Result Decode.Error SSEEvent
decodeSSEEvent eventType jsonData =
    case eventType of
        "comment_removed_event" -> Decode.map CommentRemovedEventEvent decodeCommentRemovedEvent
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