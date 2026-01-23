module BuildAmp.Sse exposing (..)

{-| Auto-Generated Server-Sent Events Types and Encoders

Use these types and encoders when broadcasting SSE events from handlers.

Example:
    Services.broadcast "new_comment_event" (Sse.encodeNewCommentEvent event)

DO NOT EDIT - Changes will be overwritten

-}

import Json.Encode as Encode


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
    ,     text : String
    ,     timestamp : Int
    }


-- EVENT ENCODERS

encodeCommentModeratedEvent : CommentModeratedEvent -> Encode.Value
encodeCommentModeratedEvent commentModeratedEvent =
    Encode.object
        [ ( "comment_id", Encode.string commentModeratedEvent.commentId )
        , ( "removed", Encode.bool commentModeratedEvent.removed )
        ]


encodeCommentRemovedEvent : CommentRemovedEvent -> Encode.Value
encodeCommentRemovedEvent commentRemovedEvent =
    Encode.object
        [ ( "comment_id", Encode.string commentRemovedEvent.commentId )
        , ( "post_id", Encode.string commentRemovedEvent.postId )
        , ( "timestamp", Encode.int commentRemovedEvent.timestamp )
        ]


encodeNewCommentEvent : NewCommentEvent -> Encode.Value
encodeNewCommentEvent newCommentEvent =
    Encode.object
        [ ( "id", Encode.string newCommentEvent.id )
        , ( "item_id", Encode.string newCommentEvent.itemId )
        , ( "guest_id", Encode.string newCommentEvent.guestId )
        , ( "parent_id", Maybe.withDefault Encode.null (Maybe.map Encode.string newCommentEvent.parentId) )
        , ( "author_name", Encode.string newCommentEvent.authorName )
        , ( "text", Encode.string newCommentEvent.text )
        , ( "timestamp", Encode.int newCommentEvent.timestamp )
        ]
