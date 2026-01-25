module Api.Handlers.GetItemsByTagHandler exposing (main)

{-| Auto-generated Script runner for GetItemsByTag

This file wires up the Script-based handler with Backend.Runtime.
Business logic lives in Api.Scripts.GetItemsByTag

DO NOT EDIT - Regenerate with: buildamp gen handlers --regenerate GetItemsByTag

-}

import Api.Scripts.GetItemsByTag as Handler
import Backend.Runtime as Runtime


main =
    Runtime.run
        { handler = Handler.handler
        , decodeRequest = Handler.decodeRequest
        , encodeResponse = Handler.encodeResponse
        }
