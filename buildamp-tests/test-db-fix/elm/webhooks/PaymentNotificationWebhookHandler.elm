module Webhooks.PaymentNotificationWebhookHandler exposing (..)

-- Auto-generated outgoing webhook handler
-- Sends PaymentNotificationWebhook to external services
-- Generated from: stripe_payment_webhook.rs

import Json.Decode
import Json.Encode
import Http
import Api exposing (PaymentNotificationWebhook)

type Msg
    = WebhookSuccess String
    | WebhookError Http.Error
    | WebhookTimeout

-- Send PaymentNotificationWebhook to external service
sendPaymentNotificationWebhook : String -> PaymentNotificationWebhook -> Cmd Msg
sendPaymentNotificationWebhook targetUrl webhook =
    Http.request
        { method = "POST"
        , headers = [
    , Http.header "Authorization" webhook.authorization
    , Http.header "Content-Type" webhook.content_type
    ]
        , url = targetUrl
        , body = Http.jsonBody (paymentnotificationwebhookEncoder webhook)
        , expect = Http.expectString (\result ->
            case result of
                Ok response -> WebhookSuccess response
                Err error -> WebhookError error
        )
        , timeout = Just 30000  -- 30 seconds
        , tracker = Nothing
        }

-- Build headers for outgoing request
buildHeaders : PaymentNotificationWebhook -> List Http.Header
buildHeaders webhook =
    [ Http.header "Content-Type" "application/json"
    , Http.header "Authorization" webhook.authorization
    , Http.header "Content-Type" webhook.content_type
    ]
