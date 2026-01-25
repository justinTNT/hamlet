module Api.Handlers.GetItemHandler exposing (main)

{-| Auto-generated Script runner for GetItem

This file wires up the Script-based handler with Backend.Runtime.
Business logic lives in Api.Scripts.GetItem

DO NOT EDIT - Regenerate with: buildamp gen handlers --regenerate GetItem

-}

import Api.Scripts.GetItem as Handler
import Backend.Runtime as Runtime


main =
    Runtime.run
        { handler = Handler.handler
        , decodeRequest = Handler.decodeRequest
        , encodeResponse = Handler.encodeResponse
        }
