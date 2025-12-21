module Webhooks.ProcessVideoWebhook exposing (..)

-- Auto-generated webhook handler
-- Handles outgoing webhooks for ProcessVideo events

import Json.Decode
import Json.Encode
import Http
import Api exposing (ProcessVideo)

type Msg
    = WebhookSuccess String
    | WebhookError Http.Error

-- Send webhook for ProcessVideo event
sendProcessVideoWebhook : String -> ProcessVideo -> Cmd Msg
sendProcessVideoWebhook webhookUrl event =
    Http.post
        { url = webhookUrl
        , body = Http.jsonBody (processvideoEncoder event)
        , expect = Http.expectString (\result ->
            case result of
                Ok response -> WebhookSuccess response
                Err error -> WebhookError error
        )
        }

-- Webhook payload builder
buildWebhookPayload : ProcessVideo -> Json.Encode.Value
buildWebhookPayload event =
    Json.Encode.object
        [ ( "event_type", Json.Encode.string "ProcessVideo" )
        , ( "event_data", processvideoEncoder event )
        , ( "timestamp", Json.Encode.int 0 ) -- TODO: Add actual timestamp
        ]
