# Background Event Queue

**Priority**: High (foundational)
**Use Case**: Delayed actions, reliable background processing, complex workflows

## Core Concept

Server-side handlers schedule events for background processing. Separate thread/process consumes events and executes business logic.

## Event Schema

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY,
  application TEXT NOT NULL,    -- "horatio", "chess_app", etc
  host TEXT NOT NULL,          -- tenant isolation
  session_id TEXT,             -- first-class session targeting for SSE/WebSocket
  stream_id TEXT,              -- optional grouping within tenant
  event_type TEXT NOT NULL,    -- "SendWelcomeEmail", "ProcessVideo"
  correlation_id UUID,         -- trace back to original request
  payload JSONB,
  execute_at TIMESTAMP DEFAULT NOW(),
  context JSONB,               -- preserved context snapshot (no longer needs session_id)
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  attempts INTEGER DEFAULT 0,  -- retry tracking
  max_attempts INTEGER DEFAULT 3,
  next_retry_at TIMESTAMP,
  error_details TEXT,          -- failure information
  priority TEXT DEFAULT 'normal'  -- high/normal/low
);

CREATE INDEX IF NOT EXISTS idx_events_pending ON events(execute_at, processed) WHERE NOT processed;
CREATE INDEX IF NOT EXISTS idx_events_app_host ON events(application, host);
CREATE INDEX IF NOT EXISTS idx_events_correlation ON events(correlation_id);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id, processed);
```

## Event Type Definitions

Event types are defined in regular Rust files. BuildAmp detects the purpose from filename and generates appropriate scheduling functions.

### Delayed Actions
```rust
// models/events/email_events.rs
pub struct SendWelcomeEmail {
    pub email: String,
    pub name: String,
    pub delay_minutes: u32,
}

pub struct SendPasswordReset {
    pub user_id: String,
    pub reset_token: String,
    pub delay_minutes: u32,
}
```

### Recurring Tasks
```rust
// models/events/maintenance_events.rs  
pub struct CleanupTempFiles {
    pub older_than_days: u32,
    pub max_files: Option<u32>,
}

pub struct GenerateDailyDigest {
    pub for_date: String,
    pub subscriber_count: u32,
}
```

### Background Processing
```rust
// models/events/file_events.rs
pub struct ProcessVideo {
    pub file_id: String,
    pub quality: String,
    pub target_formats: Vec<String>,
}

pub struct ProcessImageUpload {
    pub file_id: String,
    pub generate_thumbnails: bool,
    pub optimize_quality: u8,
}
```

### Workflow Chains
```rust
// models/events/workflow_events.rs
pub struct UserOnboardingStep {
    pub user_id: String,
    pub step_number: u8,
    pub step_type: String,
}
```

## Flow

**1. REST Handler Schedules Event**:
```elm
-- In Elm business logic
processRegistration : RegistrationReq -> Context -> (List Effect, Response)
processRegistration req ctx =
    [ Insert "users" userData
    , ScheduleEvent 
        { application = "horatio"
        , host = ctx.host
        , session_id = ctx.sessionId  -- first-class session targeting
        , event_type = "SendWelcomeEmail"
        , correlation_id = ctx.request_id
        , delay_minutes = 10
        , payload = { email = req.email, name = req.name }
        }
    ]
```

**2. Background Event Processor** (separate thread):
```javascript
// Every 30-60 seconds, check for due events
const dueEvents = await pool.query(`
  SELECT * FROM events 
  WHERE execute_at <= NOW() 
    AND processed = FALSE 
    AND attempts < max_attempts
  ORDER BY priority DESC, execute_at ASC
  LIMIT 100
`);

for (event of dueEvents.rows) {
  try {
    // Call specialized Elm EventLogic
    const result = await Elm.EventLogic.init();
    result.ports.process.send(event);
    
    // Mark processed
    await pool.query('UPDATE events SET processed = TRUE WHERE id = $1', [event.id]);
  } catch (error) {
    // Handle retry logic
    await handleEventFailure(event, error);
  }
}
```

**3. Event-Specific Elm Logic**:
```elm
-- EventLogic.elm (separate from main Logic.elm)
processEvent : Event -> (List Effect, Response)
processEvent event =
    case event.event_type of
        "SendWelcomeEmail" ->
            [ TriggerWebhook "SendGridEmail" 
                { to = event.payload.email
                , subject = "Welcome!"
                , template = "welcome_template"
                }
            ]
        
        "ProcessVideo" ->
            [ TriggerWebhook "FFMpegService"
                { file_id = event.payload.file_id
                , operation = "transcode"
                , quality = event.payload.quality
                }
            , ScheduleEvent  -- Chain next step
                { event_type = "NotifyVideoReady"
                , delay_minutes = 15
                , payload = { file_id = event.payload.file_id }
                }
            ]
```

## Key Benefits

- **Reliable**: Events persisted, retry on failure
- **Context preservation**: Full context snapshot at event creation  
- **Elm business logic**: Same patterns as REST handlers
- **Non-blocking**: Fast user responses, heavy work happens later
- **Tenant isolation**: Events respect host boundaries
- **Correlation tracking**: Full request tracing
- **Retry logic**: Exponential backoff for failed events

## Use Cases

- **Email workflows**: Welcome emails, password resets, notifications
- **File processing**: Video transcoding, image optimization  
- **Data cleanup**: Delete temp files, archive old data
- **External API calls**: Payment processing, analytics updates
- **Complex workflows**: Multi-step processes with delays
- **Scheduled maintenance**: Database cleanup, report generation

## Implementation Notes

- Start with simple cron-based polling (every 30-60 seconds)
- Single background thread initially
- Context snapshot includes: host, user_id, session_id, permissions
- Events can schedule other events (workflow chains)
- Failed events retry with exponential backoff
- Priority ordering: high priority events processed first

## Session Store Integration

**Generated Session Types**: Define session context in Rust, hook into Express session store:

```rust
// models/session.rs - application defines session shape
#[derive(BuildAmpSession, Debug, Clone)]
pub struct AppSession {
    pub channel: String,
    pub room: String,
    // OR user_id, OR game_state, OR whatever app needs
    // OR empty struct if session_id alone is sufficient
}
```

**Generated session operations**:
```elm
-- Available in requests, events, and SSE contexts
updateSessionContext : AppSession -> Context -> Effect
getSessionContext : Context -> AppSession

-- Session ID always available
type alias Context = 
    { sessionId : String
    , session : AppSession  -- typed session data
    , host : String
    }
```

## Integration Points

- **File processing**: Upload → immediate response → background processing
- **Webhooks**: Reliable delivery via event queue
- **Real-time**: Events can trigger SSE/WebSocket notifications using session_id targeting
- **Database**: Same transaction boundaries as main handlers
- **Key-value store**: Events can update shared state
- **Session store**: Express session integration with typed context