# Structured Logging

**Priority**: Low (enhancement of existing capability) 
**Use Case**: Enhanced observability, debugging, monitoring

## Core Concept

Enhance BuildAmp's existing structured logging with type-safe log definitions, automatic correlation tracking, and integration with all other features.

## Current State

BuildAmp already enables structured logging:
```elm
-- Existing in Logic.elm
effects = [ Log (Json.encode { message = "User created", user_id = userId }) ]
```

```javascript
// Existing in server.js  
if (effect.Log) {
    const logObj = JSON.parse(effect.Log);
    console.log(JSON.stringify(logObj)); // Structured JSON output
}
```

## Enhanced Log Type Definitions

Log types are defined in regular Rust files. BuildAmp detects from filename and generates logging functions.

```rust
// models/logs/user_logs.rs
pub struct UserActionLog {
    pub action: String,
    pub user_id: String,
    pub resource_id: Option<String>,
    pub duration_ms: Option<u64>,
    pub success: bool,
}

pub struct SecurityLog {
    pub event_type: String,       // "login_attempt", "permission_denied"
    pub user_id: Option<String>,
    pub ip_address: String,
    pub user_agent: String,
    pub risk_score: Option<f64>,
}

// models/logs/system_logs.rs
pub struct PerformanceLog {
    pub operation: String,        // "database_query", "external_api_call"
    pub duration_ms: u64,
    pub success: bool,
    pub error_message: Option<String>,
    pub metadata: serde_json::Value,
}

#[derive(BuildAmpLog)] 
pub struct BusinessEventLog {
    pub event_type: String,       // "order_placed", "payment_completed"
    pub entity_id: String,
    pub entity_type: String,      // "order", "user", "payment"
    pub amount: Option<i64>,
    pub currency: Option<String>,
}
```

## Generated Elm Logging Functions

```elm
-- Auto-generated type-safe logging
module BuildAmp.Logging exposing (..)

-- Generated log functions
logUserAction : UserActionLogData -> Cmd Msg
logSecurityEvent : SecurityLogData -> Cmd Msg  
logPerformance : PerformanceLogData -> Cmd Msg
logBusinessEvent : BusinessEventLogData -> Cmd Msg

-- Helper functions
logWithCorrelation : String -> LogData -> Context -> Cmd Msg
logError : String -> String -> Context -> Cmd Msg
logInfo : String -> Context -> Cmd Msg
logDebug : String -> Context -> Cmd Msg

-- Structured log data types (generated)
type alias UserActionLogData = 
    { action : String
    , user_id : String  
    , resource_id : Maybe String
    , duration_ms : Maybe Int
    , success : Bool
    }
```

## Enhanced Server-Side Processing

```javascript
// Enhanced log processor with correlation tracking
function processLogEffect(effect, context) {
    const logData = {
        ...effect.logData,
        
        // Automatic enrichment
        timestamp: new Date().toISOString(),
        application: context.application || 'unknown',
        host: context.host,
        correlation_id: context.correlation_id || context.request_id,
        session_id: context.session_id,
        user_id: context.user_id,
        
        // Request context
        endpoint: context.endpoint,
        request_id: context.request_id,
        
        // Environment info
        environment: process.env.NODE_ENV || 'development',
        version: process.env.APP_VERSION,
        server_id: process.env.SERVER_ID || 'unknown'
    };
    
    // Route to appropriate destination
    switch (effect.log_type) {
        case 'SecurityLog':
            sendToSecurityLogging(logData);
            break;
        case 'PerformanceLog':
            sendToPerformanceMonitoring(logData);
            break;
        case 'BusinessEventLog':
            sendToBusinessAnalytics(logData);
            break;
        default:
            sendToGeneralLogging(logData);
    }
    
    // Also send to console in structured format
    console.log(JSON.stringify(logData));
}
```

## Integration with Other Features

### Background Event Correlation
```elm
-- Automatic correlation tracking across events
processEvent : Event -> Context -> (List Effect, Response)
processEvent event ctx =
    [ LogBusinessEvent
        { event_type = "background_event_processed"
        , entity_id = event.id
        , entity_type = "event"
        , correlation_id = event.correlation_id  -- Links to original request
        }
    , -- other effects
    ]
```

### Webhook Execution Logging
```elm
-- Webhook success/failure logging
processWebhookResult : WebhookResult -> Context -> (List Effect, Response)
processWebhookResult result ctx =
    [ LogPerformance
        { operation = "webhook_execution"
        , duration_ms = result.duration_ms
        , success = result.success
        , error_message = result.error
        , metadata = Json.object
            [ ("webhook_type", Json.string result.webhook_type)
            , ("target_url", Json.string result.target_url)
            , ("response_status", Json.int result.response_status)
            ]
        }
    ] ++ (if not result.success then
            [ LogError "Webhook execution failed" result.error ctx ]
          else [])
```

### File Processing Logging
```elm
-- File upload and processing logging
processFileUpload : FileUploadEvent -> Context -> (List Effect, Response)
processFileUpload upload ctx =
    [ LogUserAction
        { action = "file_uploaded"
        , user_id = ctx.user_id
        , resource_id = Just upload.file_id
        , success = True
        }
    , LogPerformance
        { operation = "file_validation"
        , duration_ms = upload.validation_duration_ms
        , success = upload.validation_success
        }
    , -- schedule background processing
    ]
```

### Real-Time Communication Logging
```elm
-- WebSocket/SSE logging
processWebSocketMessage : WebSocketMessage -> Context -> (List Effect, Response)
processWebSocketMessage msg ctx =
    [ LogUserAction
        { action = "websocket_message_sent"
        , user_id = ctx.user_id
        , resource_id = Just msg.room
        , success = True
        }
    , LogPerformance  
        { operation = "message_broadcast"
        , duration_ms = broadcastDuration
        , success = True
        , metadata = Json.object
            [ ("room", Json.string msg.room)
            , ("message_type", Json.string msg.message_type)
            , ("recipient_count", Json.int msg.recipient_count)
            ]
        }
    ]
```

## Log Aggregation & Analysis

### Log Levels and Filtering
```rust
#[derive(BuildAmpLog)]
#[level("ERROR")]
pub struct ErrorLog {
    pub error_code: String,
    pub error_message: String,
    pub stack_trace: Option<String>,
}

#[derive(BuildAmpLog)]
#[level("INFO")]
pub struct InfoLog {
    pub message: String,
    pub category: String,
}

#[derive(BuildAmpLog)]
#[level("DEBUG")]
pub struct DebugLog {
    pub debug_info: serde_json::Value,
}
```

### Log Sampling
```rust
#[derive(BuildAmpLog)]
#[sample_rate(0.1)]  // Sample 10% of high-volume logs
pub struct HighVolumeLog {
    pub operation: String,
    pub count: u64,
}
```

## Security & Compliance

### PII Scrubbing
```rust
#[derive(BuildAmpLog)]
pub struct UserDataLog {
    pub user_id: String,
    
    #[sensitive]  // Automatically scrubbed in production
    pub email: String,
    
    #[hash]  // Automatically hashed
    pub ip_address: String,
    
    pub action: String,
}
```

### Audit Trail
```elm
-- Automatic audit logging for sensitive operations
processUserDataUpdate : UserUpdateReq -> Context -> (List Effect, Response)
processUserDataUpdate req ctx =
    [ UpdateUser req
    , LogSecurityEvent  -- Automatic audit trail
        { event_type = "user_data_modified"
        , user_id = Just ctx.user_id
        , ip_address = ctx.ip_address
        , user_agent = ctx.user_agent
        , risk_score = Nothing
        }
    , LogUserAction
        { action = "profile_updated"
        , user_id = ctx.user_id
        , resource_id = Just ("user:" ++ ctx.user_id)
        , success = True
        }
    ]
```

## Development vs Production

### Development Logging
```elm
-- Verbose logging in development
logDevelopment : String -> serde_json::Value -> Context -> Cmd Msg
logDevelopment message data ctx =
    if ctx.environment == "development" then
        logDebug message ctx
    else
        Cmd.none
```

### Production Optimizations
```javascript
// Production log processing
function processProductionLogs(logData) {
    // Buffer logs for batch processing
    logBuffer.push(logData);
    
    if (logBuffer.length >= BATCH_SIZE || timeSinceLastFlush > FLUSH_INTERVAL) {
        flushLogBatch(logBuffer);
        logBuffer = [];
    }
}

// Async log shipping to external services
async function flushLogBatch(logs) {
    try {
        // Send to centralized logging (DataDog, Splunk, etc.)
        await sendToLogService(logs);
    } catch (error) {
        // Fallback to local file
        writeToLocalFile(logs);
    }
}
```

## Monitoring & Alerting

### Error Rate Monitoring
```elm
-- Automatic error rate tracking
processError : Error -> Context -> (List Effect, Response)
processError error ctx =
    [ LogError "Application error" error.message ctx
    , IncrementMetric "error_count" 1
    , -- Check if error rate exceeds threshold
      CheckErrorThreshold ctx.host
    ]
```

### Performance Monitoring
```elm
-- Automatic performance logging for slow operations
processSlowOperation : OperationResult -> Context -> (List Effect, Response)  
processSlowOperation result ctx =
    let
        effects = processNormalEffects result ctx
        
        performanceEffects =
            if result.duration_ms > SLOW_OPERATION_THRESHOLD then
                [ LogPerformance
                    { operation = result.operation_name
                    , duration_ms = result.duration_ms  
                    , success = result.success
                    , metadata = result.debug_info
                    }
                , TriggerAlert "slow_operation" result
                ]
            else []
    in
    (effects ++ performanceEffects, result.response)
```

## Benefits

- **Type safety**: Structured logs validated at compile time
- **Automatic enrichment**: Correlation IDs, context data added automatically  
- **Integration**: Works seamlessly with all BuildAmp features
- **Compliance**: Built-in PII scrubbing and audit trails
- **Performance**: Optimized for production with batching and sampling
- **Observability**: Rich context for debugging and monitoring

## Use Cases

### Debugging & Development
- Request/response correlation across background events
- Performance bottleneck identification  
- Error tracking and reproduction
- Feature usage analytics

### Security & Compliance  
- Audit trails for sensitive operations
- Security event detection
- PII access logging
- Compliance reporting

### Business Intelligence
- User behavior analytics
- Feature adoption tracking
- Business process monitoring
- Revenue and conversion metrics

### Operations & Monitoring
- System health monitoring
- Performance trend analysis
- Error rate alerting
- Capacity planning data

## Implementation Notes

- Enhance existing Log effect with type validation
- Add automatic context enrichment in server
- Implement log level filtering and sampling
- Add PII scrubbing for sensitive fields
- Create batching for high-volume production logs
- Support multiple output destinations (console, file, external services)

## Integration Points

- **Background events**: Correlation tracking across async operations
- **Webhooks**: External service call monitoring
- **File processing**: Upload/processing performance tracking
- **Real-time**: WebSocket/SSE connection and message logging
- **Key-value store**: Operation performance and cache hit rates
- **Database migrations**: Schema change audit trail