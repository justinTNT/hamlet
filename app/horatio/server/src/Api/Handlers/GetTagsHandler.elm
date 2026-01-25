module Api.Handlers.GetTagsHandler exposing (main)

{-| Auto-generated Script runner for GetTags

This file wires up the Script-based handler with Backend.Runtime.
Business logic lives in Api.Scripts.GetTags

DO NOT EDIT - Regenerate with: buildamp gen handlers --regenerate GetTags

-}

import Api.Scripts.GetTags as Handler
import Backend.Runtime as Runtime


main =
    Runtime.run
        { handler = Handler.handler
        , decodeRequest = Handler.decodeRequest
        , encodeResponse = Handler.encodeResponse
        }
