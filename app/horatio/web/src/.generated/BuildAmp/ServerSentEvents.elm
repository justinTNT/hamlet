module BuildAmp.ServerSentEvents exposing (..)

{-| Auto-Generated Server-Sent Events Types and Decoders

DO NOT EDIT - Changes will be overwritten

-}

import Json.Decode as Decode exposing (Decoder)
import Json.Encode as Encode


-- Helper for pipeline decoding
andMap : Decoder a -> Decoder (a -> b) -> Decoder b
andMap =
    Decode.map2 (|>)


-- EVENT TYPES

type alias CommentModeratedEvent =
    {     commentId : String
    ,     removed : Bool
    }


type alias CommentRemovedEvent =
    {     commentId : String
    ,     postId : String
    ,     timestamp : Int
    }


type alias NewCommentEvent =
    {     id : String
    ,     itemId : String
    ,     guestId : String
    ,     parentId : Maybe String
    ,     authorName : String
    ,     text : Encode.Value
    ,     timestamp : Int
    }


-- EVENT DECODERS

decodeCommentModeratedEvent : Decode.Decoder CommentModeratedEvent
decodeCommentModeratedEvent =
    Decode.succeed CommentModeratedEvent
        |> andMap (Decode.field "comment_id" Decode.string)
        |> andMap (Decode.field "removed" Decode.bool)


decodeCommentRemovedEvent : Decode.Decoder CommentRemovedEvent
decodeCommentRemovedEvent =
    Decode.succeed CommentRemovedEvent
        |> andMap (Decode.field "comment_id" Decode.string)
        |> andMap (Decode.field "post_id" Decode.string)
        |> andMap (Decode.field "timestamp" Decode.int)


decodeNewCommentEvent : Decode.Decoder NewCommentEvent
decodeNewCommentEvent =
    Decode.succeed NewCommentEvent
        |> andMap (Decode.field "id" Decode.string)
        |> andMap (Decode.field "item_id" Decode.string)
        |> andMap (Decode.field "guest_id" Decode.string)
        |> andMap (Decode.field "parent_id" (Decode.maybe Decode.string))
        |> andMap (Decode.field "author_name" Decode.string)
        |> andMap (Decode.field "text" Decode.value)
        |> andMap (Decode.field "timestamp" Decode.int)
