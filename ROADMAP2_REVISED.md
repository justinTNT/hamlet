# Hamlet Framework Roadmap 2.0 - Revised

## Vision
Hamlet provides **type-safe client-server boundaries** with **web-native capabilities** for modern PWA development. Focus on eliminating JSON codec drudgery while enabling mobile-like experiences through standard web APIs.

## Current State
- ✅ **Core Framework**: Rust→Elm type generation working
- ✅ **Database Integration**: Automatic migrations, tenant isolation
- ✅ **Middleware Stack**: KV store, sessions with tenant isolation  
- ✅ **Demo Application**: Horatio microblog proves the concept
- ✅ **Background Events**: Basic event queue with retry/DLQ in Horatio (see `notes/background_event_queue.md` - half-implemented)
- ✅ **Session Management**: HTTP session cookies replacing fingerprinting
- ✅ **SSE Infrastructure**: Basic server-sent events (half-implemented)

## Event Store Foundation

**Configuration-driven capabilities:**

### With Database + Event Store Enabled
```rust
[hamlet.features]
database = true
event_store = true  // Adds ES tables to existing database
```

**Full Capabilities:**
- ✅ **Multi-stage workflows** - Chain operations reliably
- ✅ **Persistent delayed/scheduled events** - Survive restarts
- ✅ **Reliable service calls** - Retry logic, delivery guarantees  
- ✅ **Workflow status/history** - Track progress, audit trail
- ✅ **Failed event recovery** - Dead letter queue, retry operations
- ✅ **Correlation tracking** - Trace related events

### Without Database OR Event Store Disabled
```rust
[hamlet.features]
database = false  // OR event_store = false
```

**Best-Effort Capabilities:**
- ❌ **Multi-stage workflows** - Not available
- ✅ **Volatile delayed events** - setTimeout/setInterval (lost on restart)
- ✅ **Fire-and-forget service calls** - HTTP requests (no retries)
- ❌ **Status/history/recovery/correlation** - Not available

## Major Components (Revised Priority Order)

### 🎯 **Phase 1: Complete Event System (Immediate - 4-6 weeks)**

The event system is the **foundation** that everything else builds on. Currently half-implemented in Horatio (see `notes/background_event_queue.md` for existing design).

**Correct implementation order:**

#### 1.1 Complete Event Store Foundation
Build on existing Horatio event infrastructure (`notes/background_event_queue.md`):
- Database schema needs session_id column addition
- Basic background processor exists  
- Elm EventLogic pattern established
- Need: Type generation + session store integration + enhanced capabilities

#### 1.2 Event Store Type Generation
```rust
// Multi-stage workflow events
#[derive(BuildAmpEvent, Debug, Clone)]
pub enum ProcessingWorkflow {
    // Stage 1
    StartImageProcessing { file_id: String, user_id: String },
    // Stage 2  
    ImageProcessed { file_id: String, result_url: String },
    // Stage 3
    ThumbnailGenerated { file_id: String, thumb_url: String },
    // Stage 4
    ProcessingComplete { file_id: String, cdn_url: String },
}

// Delayed/scheduled events
#[derive(BuildAmpEvent, Debug, Clone)]  
pub enum ScheduledEvent {
    SendWelcomeEmail { user_email: String, delay_minutes: u32 },
    CleanupTempFiles { older_than_days: u32 },
    GenerateDailyDigest { for_date: String },
}

// External service integration events
#[derive(BuildAmpEvent, Debug, Clone)]
pub enum ServiceCallEvent {
    SendEmail { to: String, template: String, data: serde_json::Value },
    PostToSlack { channel: String, message: String },
    ProcessPayment { payment_id: String, amount: u32 },
}
```

#### 1.3 Generated Elm Interfaces

**With Event Store:**
```elm
-- Generated: ReliableEvents.elm
module ReliableEvents exposing (..)

-- Multi-stage workflows
startImageWorkflow : String -> String -> Cmd WorkflowId
getWorkflowStatus : WorkflowId -> Cmd WorkflowStatus

-- Persistent scheduling  
scheduleWelcomeEmail : String -> Int -> Cmd EventId
scheduleCleanup : Int -> Cmd EventId

-- Reliable service calls
sendEmailReliable : EmailData -> Cmd DeliveryId
retryFailedDelivery : DeliveryId -> Cmd ()
```

**Without Event Store:**
```elm
-- Generated: ImmediateEvents.elm  
module ImmediateEvents exposing (..)

-- Single-shot operations only
processImageNow : String -> Cmd ()

-- Volatile scheduling
scheduleVolatileEmail : EmailData -> Int -> Cmd TimerHandle
cancelVolatileTimer : TimerHandle -> Cmd ()

-- Fire-and-forget calls
sendEmailImmediate : EmailData -> Cmd ()
```

#### 1.4 Enhanced SSE Integration
```rust
// SSE events with session-based targeting
#[derive(BuildAmpSSE, Debug, Clone)]
pub enum SSEMessage {
    // Real-time events
    NewPost { post_id: String, title: String, author: String },
    CommentAdded { post_id: String, comment_text: String },
    UserJoined { user_name: String },
    
    // Workflow status updates via SSE
    WorkflowProgress { workflow_id: String, stage: String, percent: f32 },
    WorkflowComplete { workflow_id: String, result: String },
}
```

**Generated SSE with session targeting:**
```elm
-- Generated SSE effects for business logic
type Effect 
    = SSEBroadcast (List SessionId) SSEMessage
    | SendToSession SessionId SSEMessage  
    | BroadcastAll SSEMessage

-- Generated client subscription (automatic connection management)
subscriptions : Model -> Sub Msg
subscriptions model =
    onSSEMessage SSEMessageReceived
```

#### 1.5 Webhook System (Incoming)
```rust
// Incoming webhooks that trigger events
#[derive(BuildAmpWebhook, Debug, Clone)]
pub enum IncomingWebhook {
    StripePayment {
        endpoint: "/webhooks/stripe",
        event_types: vec!["payment_intent.succeeded"],
        triggers: ProcessingWorkflow::ProcessPayment,
    },
    GitHubPush {
        endpoint: "/webhooks/github", 
        event_types: vec!["push"],
        triggers: ProcessingWorkflow::BuildDeploy,
    },
}
```

**Generated webhook endpoints that create events.**

#### 1.6 Service Calls (Outbound)
```rust
// Outbound service integrations
#[derive(BuildAmpServiceCall, Debug, Clone)]
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
```

**Dependencies**: Builds on existing Horatio event infrastructure  
**Deliverables**:
- Event store schema update (add session_id column)  
- Generated session store integration (Rust→Elm session types, Express hooks)
- Complete event store type generation
- Generated Elm event interfaces (reliable vs immediate)
- Enhanced SSE with session-based targeting
- Incoming webhook system  
- Outbound service call system

---

### 🔗 **Phase 1.5: WebSocket Implementation (2-3 weeks)**

Client↔client messaging with server-mediated routing.

```rust
// Type-safe client messaging
#[derive(BuildAmpWebSocket, Debug, Clone)]
pub enum GameMessage {
    PlayerMove { game_id: String, x: i32, y: i32 },
    ChatMessage { text: String },
    GameState { board: Vec<Vec<i32>> },
}
```

**Generated Elm interface:**
- Always-available send functions: `sendGameMove` (A<==>B), `sendChatMessage` (broadcast)
- Optional subscriptions: `onGameMove`, `onChatMessage` 
- Server-controlled connections: `onWebSocketConnect`, `onWebSocketDisconnect`
- No room abstractions - server handles routing via Elm business logic

**Dependencies**: Event system (for connection orchestration)
**Deliverables**:
- Type-safe WebSocket message generation
- Server-mediated connection management  
- Client state awareness interface

---

### 📁 **Phase 2: File Upload Types (4-6 weeks)**

Essential for real applications. Web-native file handling with event integration.

#### 2.1 Type-Safe File Upload
```rust
#[derive(BuildAmpFileUpload, Debug, Clone)]
pub struct PhotoUploadReq {
    pub album_id: String,
    pub caption: Option<String>,
    pub constraints: FileConstraints,
}

#[derive(BuildAmpElm, Debug, Clone)]
pub struct FileConstraints {
    pub max_size_mb: u32,
    pub allowed_types: Vec<String>,
    pub image_max_dimensions: Option<(u32, u32)>,
}
```

#### 2.2 Event Integration
**With Event Store**: Upload → immediate response → background processing workflow
**Without Event Store**: Upload → synchronous processing

#### 2.3 Storage Abstraction
- Local filesystem for development
- S3/CloudFlare R2 for production
- Generated upload handling and serving

**Dependencies**: Event system (for background processing)
**Deliverables**: 
- Generated multipart form handling
- File constraint validation
- Storage backend abstraction
- Event-driven processing workflows

---

### 📱 **Phase 3: Web-Native Capabilities (6-8 weeks)**

Mobile-like experience through standard web APIs.

#### 3.1 Device Capabilities
```rust
#[derive(BuildAmpCapability, Debug, Clone)]
pub enum LocationCapability {
    GetLocation { accuracy: LocationAccuracy, timeout_ms: u32 },
    LocationSuccess { lat: f64, lng: f64, accuracy: f64 },
    PermissionDenied,
    Unavailable,
}
```

#### 3.2 Generated JavaScript Handlers
- GPS, Clipboard, File picker capabilities
- Permission handling and fallbacks
- Auto-setup with Elm apps

#### 3.3 PWA Infrastructure
- Service worker for app shell caching
- Fast startup optimization
- Offline form queuing (integrates with event system)

**Dependencies**: None (standalone capability generation)
**Deliverables**:
- Generated capability interfaces
- PWA infrastructure utilities  
- Fast startup service worker

---

### ⚙️ **Phase 4: Background Workers (6-8 weeks)**

Type-safe worker communication for CPU-intensive tasks.

#### 4.1 Worker Communication Types
```rust
#[derive(BuildAmpWorker, Debug, Clone)]  
pub enum ImageWorker {
    ProcessImage { image_data: Vec<u8>, width: u32 },
    ProcessingProgress { percent: f32 },
    ProcessingComplete { result_url: String },
    ProcessingFailed { error: String },
}
```

#### 4.2 Generated Worker Infrastructure
- Type-safe postMessage handling
- Worker lifecycle management
- Integration with event system (workers can trigger events)

**Dependencies**: Event system (for worker→event integration)
**Deliverables**:
- Generated worker communication
- Background task processing
- Event system integration

---

### 📚 **Phase 5: Developer Experience (Ongoing/Parallel)**

Enhanced tooling and documentation.

#### 5.1 OpenAPI Generation
- Generate documentation for all middleware endpoints
- Interactive Swagger UI for testing
- Type-safe client SDK generation

#### 5.2 Development Tools  
- Hot reloading for capabilities
- Debug utilities for PWA features
- Testing harness for offline scenarios
- Event system debugging tools

#### 5.3 Documentation & Examples
- Complete API documentation
- Integration guides
- Best practices
- Reference applications

**Dependencies**: None (can run parallel to other phases)
**Deliverables**:
- Comprehensive API documentation
- Developer debugging tools
- Example applications

---

## Architecture Principles

1. **Type-Safe Boundaries First**: All communication defined in Rust, generated for Elm
2. **Event-Driven Foundation**: Multi-stage workflows and reliable integrations via event store
3. **Graceful Degradation**: Apps work without event store, get enhanced capabilities with it
4. **Web-Native**: Standard web APIs, not native app emulation
5. **Configuration-Driven**: Features enabled/disabled via build configuration
6. **Small App Focused**: Perfect for solo developers and small teams

## Success Criteria

### Phase 1 (Event System)
- [ ] Complete existing event store foundation from Horatio
- [ ] Multi-stage workflows with reliable execution
- [ ] Persistent scheduling that survives restarts  
- [ ] Type-safe service calls with retry logic
- [ ] Enhanced SSE with workflow status updates
- [ ] Incoming webhooks triggering background workflows

### Phase 1.5 (WebSocket)
- [ ] WebSocket client↔client messaging with server-mediated routing

### Phase 2 (Files)
- [ ] Upload files with type-safe constraints
- [ ] Background processing via event workflows
- [ ] Production-ready storage backends

### Phase 3 (Capabilities)
- [ ] GPS location with permission handling  
- [ ] File picker with camera capture
- [ ] PWA installs and launches instantly
- [ ] Offline forms queue for background processing

### Phase 4 (Workers)
- [ ] CPU-intensive work in background workers
- [ ] Type-safe worker communication
- [ ] Workers can trigger event workflows

### Phase 5 (DevEx)
- [ ] Interactive API documentation
- [ ] Development debugging tools
- [ ] Comprehensive guides and examples

## Risk Mitigation

### Technical Risks
- **Event System Complexity**: Start with Horatio's working foundation, enhance incrementally
- **Configuration Management**: Clear build-time feature detection
- **Cross-Browser Compatibility**: Focus on modern browsers, document requirements

### Scope Risks
- **Feature Creep**: Maintain focus on type-safe boundaries, not business logic
- **Event Store Over-Engineering**: Provide clear degradation path
- **PWA Complexity**: Use standard service worker patterns

### Delivery Risks  
- **Phase Dependencies**: Event system foundation enables everything else
- **Documentation Debt**: Write docs as features are built
- **Testing Coverage**: Build test infrastructure alongside features

## Next Steps

1. **Week 1-2**: Complete event store type generation and Elm interface generation
2. **Week 3-4**: Enhance SSE with event system integration  
3. **Week 5-6**: Implement incoming webhooks and service calls
4. **Week 7-8**: Polish event system and begin Phase 2 planning

This roadmap balances the event-driven foundation Hamlet needs with the practical boundaries that eliminate development friction.
