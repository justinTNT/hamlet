module Api.Handlers.SubmitItemHandler exposing (main)

{-| Auto-generated Script runner for SubmitItem

This file wires up the Script-based handler with Backend.Runtime.
Business logic lives in Api.Scripts.SubmitItem

DO NOT EDIT - Regenerate with: buildamp gen handlers --regenerate SubmitItem

-}

import Api.Scripts.SubmitItem as Handler
import Backend.Runtime as Runtime


main =
    Runtime.run
        { handler = Handler.handler
        , decodeRequest = Handler.decodeRequest
        , encodeResponse = Handler.encodeResponse
        }
