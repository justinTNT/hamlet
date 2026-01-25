module Api.Schema exposing
    ( GetFeedRes
    , GetItemRes
    , GetItemsByTagRes
    , GetTagsRes
    , SubmitCommentRes
    , SubmitItemRes
    , FeedItem
    , CommentItem
    , MicroblogItem
    )

{-| Re-export types from BuildAmp.ApiClient for backward compatibility.

    Auto-generated module.
-}

import BuildAmp.ApiClient as Client


type alias GetFeedRes =
    Client.GetFeedRes


type alias GetItemRes =
    Client.GetItemRes


type alias GetItemsByTagRes =
    Client.GetItemsByTagRes


type alias GetTagsRes =
    Client.GetTagsRes


type alias SubmitCommentRes =
    Client.SubmitCommentRes


type alias SubmitItemRes =
    Client.SubmitItemRes


type alias FeedItem =
    Client.FeedItem


type alias CommentItem =
    Client.CommentItem


type alias MicroblogItem =
    Client.MicroblogItem
