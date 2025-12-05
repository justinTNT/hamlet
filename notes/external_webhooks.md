# External Webhooks

**Priority**: Low (builds on background processing)
**Use Case**: Type-safe external service integrations, reliable delivery

## Core Concept

Type-safe outbound webhooks with target annotations, authentication, and retry logic. Integrated with background event processing for reliable delivery.

## Webhook Definitions

Webhook types are defined in regular Rust files with target configuration. BuildAmp detects from filename and generates reliable delivery.

```rust
// models/webhooks/email_webhooks.rs
#[target(
    url = "https://api.sendgrid.com/v3/mail/send",
    method = "POST", 
    auth = "Bearer {SENDGRID_API_KEY}",
    headers = { "Content-Type" = "application/json" }
)]
pub struct SendGridEmail {
    pub personalizations: Vec<Personalization>,
    pub from: EmailAddress,
    pub subject: String,
    pub content: Vec<EmailContent>,
}

#[target(
    url = "https://api.mailgun.net/v3/{MAILGUN_DOMAIN}/messages",
    method = "POST",
    auth = "Basic {MAILGUN_API_KEY}",
    content_type = "application/x-www-form-urlencoded"
)]
pub struct MailgunEmail {
    pub from: String,
    pub to: String,
    pub subject: String,
    pub html: Option<String>,
    pub text: Option<String>,
}

// models/webhooks/payment_webhooks.rs
#[target(
    url = "https://api.stripe.com/v1/payment_intents",
    method = "POST",
    auth = "Bearer {STRIPE_SECRET_KEY}",
    retry_policy = "exponential",
    timeout = "30s"
)]
pub struct StripePaymentIntent {
    pub amount: i64,
    pub currency: String,
    pub customer: Option<String>,
    pub metadata: std::collections::HashMap<String, String>,
}

// models/webhooks/file_webhooks.rs
#[target(
    url = "https://api.cloudinary.com/v1_1/{CLOUD_NAME}/image/upload", 
    method = "POST",
    auth = "Basic {CLOUDINARY_AUTH}",
    file_upload = true
)]
pub struct CloudinaryUpload {
    pub public_id: String,
    pub folder: Option<String>,
    pub transformation: Option<String>,
    pub file_data: Vec<u8>,  // File content
}

#[derive(BuildAmpWebhook)]
#[target(
    url = env!("CUSTOM_SERVICE_URL"),
    method = "POST",
    headers = { "X-API-Version" = "2024-01-01" },
    timeout = "60s"
)]
pub struct CustomAPICall {
    pub operation: String,
    pub data: serde_json::Value,
}
```

## Generated Elm Integration

```elm
-- Auto-generated webhook triggers
module BuildAmp.Webhooks exposing (..)

-- Generated trigger functions
triggerSendGridEmail : SendGridEmailPayload -> Cmd Msg
triggerStripePaymentIntent : StripePaymentIntentPayload -> Cmd Msg
triggerCloudinaryUpload : CloudinaryUploadPayload -> Cmd Msg

-- Generated response types
type SendGridResponse
    = EmailSent String  -- Message ID
    | EmailFailed String  -- Error message

type StripeResponse  
    = PaymentCreated StripePaymentIntent
    | PaymentFailed String

-- Webhook status tracking
type WebhookStatus
    = Pending
    | Sending
    | Sent WebhookResponse
    | Failed String Int  -- Error message, attempt count
```

## Webhook Execution Infrastructure

```sql
-- Webhook execution tracking
CREATE TABLE webhook_executions (
    id UUID PRIMARY KEY,
    webhook_type TEXT NOT NULL,        -- "SendGridEmail", "StripePaymentIntent"
    target_url TEXT NOT NULL,
    payload JSONB NOT NULL,
    headers JSONB,
    status TEXT DEFAULT 'pending',     -- pending, sending, sent, failed, dead_letter
    response_status INTEGER,           -- HTTP status code
    response_body TEXT,
    error_message TEXT,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    sent_at TIMESTAMP,
    correlation_id UUID,               -- Links to original event
    application TEXT NOT NULL,
    host TEXT NOT NULL
);

CREATE INDEX idx_webhook_executions_status ON webhook_executions(status);
CREATE INDEX idx_webhook_executions_retry ON webhook_executions(next_retry_at) WHERE status = 'failed';
CREATE INDEX idx_webhook_executions_app_host ON webhook_executions(application, host);
```

## Webhook Processing

### 1. Webhook Scheduling (via Background Events)
```elm
-- In EventLogic.elm
processEvent : Event -> (List Effect, Response)
processEvent event =
    case event.event_type of
        "SendWelcomeEmail" ->
            [ TriggerWebhook "SendGridEmail"
                { personalizations = [
                    { to = [{ email = event.payload.email, name = event.payload.name }]
                    , subject = "Welcome to our platform!"
                    }
                  ]
                , from = { email = "noreply@example.com", name = "Our Platform" }
                , content = [
                    { type = "text/html"
                    , value = renderEmailTemplate "welcome" event.payload
                    }
                  ]
                }
            ]
            
        "ProcessPayment" ->
            [ TriggerWebhook "StripePaymentIntent"
                { amount = event.payload.amount_cents
                , currency = "usd" 
                , customer = event.payload.stripe_customer_id
                , metadata = { 
                    "order_id" = event.payload.order_id,
                    "user_id" = event.context.user_id
                  }
                }
            ]
            
        "UploadTocdn" ->
            [ TriggerWebhook "CloudinaryUpload"
                { public_id = event.payload.file_id
                , folder = "user_uploads/" ++ event.context.user_id
                , file_data = readFileData event.payload.file_path
                }
            ]
```

### 2. Webhook Executor (Background Service)
```javascript
// Background webhook processor
async function processWebhookQueue() {
    const pendingWebhooks = await pool.query(`
        SELECT * FROM webhook_executions 
        WHERE (status = 'pending' OR (status = 'failed' AND next_retry_at <= NOW()))
          AND attempts < max_attempts
        ORDER BY created_at ASC
        LIMIT 50
    `);
    
    for (const webhook of pendingWebhooks.rows) {
        await executeWebhook(webhook);
    }
}

async function executeWebhook(webhook) {
    try {
        // Mark as sending
        await pool.query(
            'UPDATE webhook_executions SET status = $1, attempts = attempts + 1 WHERE id = $2',
            ['sending', webhook.id]
        );
        
        // Get webhook configuration
        const config = getWebhookConfig(webhook.webhook_type);
        
        // Prepare request
        const requestOptions = {
            method: config.method,
            url: interpolateUrl(config.url, process.env),
            headers: {
                ...config.headers,
                'Authorization': interpolateAuth(config.auth, process.env)
            },
            body: webhook.payload,
            timeout: config.timeout || 30000
        };
        
        // Execute request
        const response = await fetch(requestOptions.url, requestOptions);
        const responseText = await response.text();
        
        if (response.ok) {
            // Success
            await pool.query(`
                UPDATE webhook_executions 
                SET status = 'sent', response_status = $1, response_body = $2, sent_at = NOW()
                WHERE id = $3
            `, [response.status, responseText, webhook.id]);
            
            // Trigger success event
            await scheduleEvent({
                event_type: "WebhookSuccess",
                payload: { 
                    webhook_id: webhook.id,
                    webhook_type: webhook.webhook_type,
                    response: responseText 
                },
                correlation_id: webhook.correlation_id
            });
        } else {
            throw new Error(`HTTP ${response.status}: ${responseText}`);
        }
        
    } catch (error) {
        await handleWebhookFailure(webhook, error.message);
    }
}

async function handleWebhookFailure(webhook, errorMessage) {
    const nextRetryDelay = Math.min(Math.pow(2, webhook.attempts) * 1000, 300000); // Max 5 minutes
    const nextRetryAt = new Date(Date.now() + nextRetryDelay);
    
    if (webhook.attempts >= webhook.max_attempts) {
        // Move to dead letter queue
        await pool.query(`
            UPDATE webhook_executions 
            SET status = 'dead_letter', error_message = $1
            WHERE id = $2
        `, [errorMessage, webhook.id]);
        
        // Trigger failure event
        await scheduleEvent({
            event_type: "WebhookFailed", 
            payload: { 
                webhook_id: webhook.id,
                webhook_type: webhook.webhook_type,
                error: errorMessage 
            },
            correlation_id: webhook.correlation_id
        });
    } else {
        // Schedule retry
        await pool.query(`
            UPDATE webhook_executions 
            SET status = 'failed', error_message = $1, next_retry_at = $2
            WHERE id = $3
        `, [errorMessage, nextRetryAt, webhook.id]);
    }
}
```

## Service-Specific Integrations

### Email Services
```rust
// Mailgun integration
#[derive(BuildAmpWebhook)]
#[target(
    url = "https://api.mailgun.net/v3/{MAILGUN_DOMAIN}/messages",
    method = "POST",
    auth = "Basic {MAILGUN_API_KEY}",
    content_type = "application/x-www-form-urlencoded"
)]
pub struct MailgunEmail {
    pub from: String,
    pub to: String,
    pub subject: String,
    pub html: Option<String>,
    pub text: Option<String>,
    pub template: Option<String>,
    pub template_variables: Option<serde_json::Value>,
}

// Postmark integration  
#[derive(BuildAmpWebhook)]
#[target(
    url = "https://api.postmarkapp.com/email",
    method = "POST",
    auth = "X-Postmark-Server-Token: {POSTMARK_TOKEN}",
    headers = { "Accept" = "application/json" }
)]
pub struct PostmarkEmail {
    pub from: String,
    pub to: String,
    pub subject: String,
    pub html_body: Option<String>,
    pub text_body: Option<String>,
    pub template_alias: Option<String>,
    pub template_model: Option<serde_json::Value>,
}
```

### Payment Processing
```rust
// PayPal integration
#[derive(BuildAmpWebhook)]
#[target(
    url = "https://api.paypal.com/v2/checkout/orders",
    method = "POST",
    auth = "Bearer {PAYPAL_ACCESS_TOKEN}",
    timeout = "60s"
)]
pub struct PayPalOrder {
    pub intent: String,  // "CAPTURE" or "AUTHORIZE"
    pub purchase_units: Vec<PayPalPurchaseUnit>,
    pub application_context: Option<PayPalApplicationContext>,
}

// Square integration
#[derive(BuildAmpWebhook)]
#[target(
    url = "https://connect.squareup.com/v2/payments", 
    method = "POST",
    auth = "Bearer {SQUARE_ACCESS_TOKEN}",
    headers = { "Square-Version" = "2024-01-30" }
)]
pub struct SquarePayment {
    pub source_id: String,
    pub amount_money: SquareAmount,
    pub idempotency_key: String,
    pub order_id: Option<String>,
}
```

### File Processing Services
```rust
// ImageKit integration
#[derive(BuildAmpWebhook)]
#[target(
    url = "https://upload.imagekit.io/api/v1/files/upload",
    method = "POST", 
    auth = "Basic {IMAGEKIT_PRIVATE_KEY}",
    file_upload = true
)]
pub struct ImageKitUpload {
    pub file: Vec<u8>,
    pub file_name: String,
    pub folder: Option<String>,
    pub tags: Option<Vec<String>>,
    pub transformation: Option<String>,
}

// FFmpeg cloud service
#[derive(BuildAmpWebhook)]
#[target(
    url = "https://api.video-service.com/v1/transcode",
    method = "POST",
    auth = "Bearer {VIDEO_SERVICE_TOKEN}",
    timeout = "300s"  // 5 minutes for video processing
)]
pub struct VideoTranscode {
    pub input_url: String,
    pub output_format: String,
    pub quality: String,
    pub callback_url: String,  // Where to send results
}
```

## Response Handling

### Webhook Success/Failure Events
```elm
-- Handle webhook responses in business logic
processEvent : Event -> (List Effect, Response)
processEvent event =
    case event.event_type of
        "WebhookSuccess" ->
            case event.payload.webhook_type of
                "SendGridEmail" ->
                    [ UpdateUserRecord event.context.user_id "email_sent" True
                    , LogInfo "Email sent successfully"
                    ]
                    
                "StripePaymentIntent" ->
                    let
                        paymentData = decodeStripeResponse event.payload.response
                    in
                    [ UpdateOrderStatus paymentData.metadata.order_id "payment_processing"
                    , ScheduleEvent
                        { event_type = "CheckPaymentStatus"
                        , delay_minutes = 5
                        , payload = { payment_intent_id = paymentData.id }
                        }
                    ]
                    
        "WebhookFailed" ->
            case event.payload.webhook_type of
                "SendGridEmail" ->
                    [ LogError "Email delivery failed"
                    , ScheduleEvent  -- Try alternative email service
                        { event_type = "SendEmailViaMailgun"
                        , delay_minutes = 5
                        , payload = event.payload
                        }
                    ]
                    
                "CloudinaryUpload" ->
                    [ LogError "CDN upload failed"
                    , UpdateFileStatus event.payload.file_id "upload_failed"
                    , NotifyUser event.context.user_id "File upload failed"
                    ]
```

### Webhook Response Processing
```elm
-- Process responses from external services
processWebhookResponse : WebhookResponse -> Context -> (List Effect, Response)
processWebhookResponse response ctx =
    case response.webhook_type of
        "VideoTranscode" ->
            let
                transcodeResult = decodeTranscodeResponse response.body
            in
            [ UpdateFileRecord
                { file_id = transcodeResult.original_file_id
                , processed_url = transcodeResult.output_url
                , status = "ready"
                }
            , TriggerWebhook "CloudinaryUpload"  -- Move to CDN
                { public_id = transcodeResult.original_file_id
                , file_url = transcodeResult.output_url
                }
            , NotifyUser transcodeResult.user_id "Video processing complete"
            ]
            
        "PayPalOrder" ->
            let
                orderData = decodePayPalResponse response.body
            in
            [ UpdateOrderRecord
                { order_id = orderData.custom_id
                , paypal_order_id = orderData.id
                , approval_url = orderData.links.approve
                }
            , NotifyUser ctx.user_id "Payment ready for approval"
            ]
```

## Webhook Testing & Development

### Test Mode Configuration
```rust
#[derive(BuildAmpWebhook)]
#[target(
    url = if_env!("DEVELOPMENT", "http://localhost:4040/test-webhook", "https://api.stripe.com/v1/payment_intents"),
    method = "POST",
    auth = if_env!("DEVELOPMENT", "", "Bearer {STRIPE_SECRET_KEY}")
)]
pub struct StripePaymentIntent {
    // Same struct, different targets for dev/prod
}
```

### Webhook Simulation
```javascript
// Development webhook simulator
app.post('/test-webhook/:service', (req, res) => {
    const { service } = req.params;
    
    // Simulate different response scenarios
    switch (service) {
        case 'sendgrid':
            res.json({ message_id: 'test_' + crypto.randomUUID() });
            break;
            
        case 'stripe':
            res.json({
                id: 'pi_test_' + crypto.randomUUID(),
                status: 'requires_payment_method',
                client_secret: 'test_secret'
            });
            break;
            
        case 'error':
            res.status(500).json({ error: 'Simulated webhook failure' });
            break;
    }
});
```

## Benefits

- **Type safety**: External API calls validated at compile time
- **Reliable delivery**: Automatic retries with exponential backoff
- **Dead letter queue**: Failed webhooks for manual inspection
- **Environment config**: Different URLs/auth for dev/staging/prod
- **Response handling**: Business logic reacts to webhook outcomes
- **Integration**: Works seamlessly with background events
- **Observability**: Full audit trail of external service calls

## Use Cases

### Communication
- Transactional emails (welcome, password reset)
- SMS notifications via Twilio
- Push notifications via Firebase
- Slack/Discord integration

### Payments
- Payment processing (Stripe, PayPal, Square)
- Subscription management
- Invoice generation
- Fraud detection services

### File Processing
- Image optimization (Cloudinary, ImageKit) 
- Video transcoding (Mux, AWS Elemental)
- Document conversion (Pandadoc, DocuSign)
- AI/ML processing (OpenAI, Google Vision)

### Analytics & Marketing
- Event tracking (Mixpanel, Amplitude)
- CRM updates (HubSpot, Salesforce)  
- Marketing automation (Mailchimp, ConvertKit)
- Error tracking (Sentry, Rollbar)

## Implementation Notes

- Start with simple HTTP POST webhooks
- Add authentication interpolation from environment variables
- Implement circuit breaker for failing services
- Add webhook response caching for idempotency
- Consider webhook signing for security
- Monitor webhook performance and success rates

## Integration Points

- **Background events**: Primary trigger mechanism
- **Dead letter queue**: Failed webhook handling
- **Key-value store**: Webhook rate limiting, response caching
- **File processing**: Upload results to external services  
- **SSE**: Real-time webhook status updates