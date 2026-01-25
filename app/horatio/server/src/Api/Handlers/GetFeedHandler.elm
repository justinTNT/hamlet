module Api.Handlers.GetFeedHandler exposing (main)

{-| Auto-generated Script runner for GetFeed

This file wires up the Script-based handler with Backend.Runtime.
Business logic lives in Api.Scripts.GetFeed

DO NOT EDIT - Regenerate with: buildamp gen handlers --regenerate GetFeed

-}

import Api.Scripts.GetFeed as Handler
import Backend.Runtime as Runtime


main =
    Runtime.run
        { handler = Handler.handler
        , decodeRequest = Handler.decodeRequest
        , encodeResponse = Handler.encodeResponse
        }
