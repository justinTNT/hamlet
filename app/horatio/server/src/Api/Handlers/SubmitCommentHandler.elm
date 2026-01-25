module Api.Handlers.SubmitCommentHandler exposing (main)

{-| Auto-generated Script runner for SubmitComment

This file wires up the Script-based handler with Backend.Runtime.
Business logic lives in Api.Scripts.SubmitComment

DO NOT EDIT - Regenerate with: buildamp gen handlers --regenerate SubmitComment

-}

import Api.Scripts.SubmitComment as Handler
import Backend.Runtime as Runtime


main =
    Runtime.run
        { handler = Handler.handler
        , decodeRequest = Handler.decodeRequest
        , encodeResponse = Handler.encodeResponse
        }
