module Sse.NewCommentEvent exposing (..)

{-| NewCommentEvent SSE Model
-}

import Api.SubmitComment exposing (CommentItem)

type alias NewCommentEvent = CommentItem
