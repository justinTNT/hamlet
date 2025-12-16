# Phase 1 Event System Audit & Implementation Plan

## Current State Assessment

**✅ What's Already Built:**
- Database schema for events with DLQ (004_background_events.sql)
- Basic event processor with retry logic (event-processor.js)
- Generated Elm Events interface (Generated/Events.elm)
- Basic event models (email_events.rs, sse_events.rs)
- Infrastructure for BuildAmp macros (BuildAmpEndpoint, BuildAmpElm, etc.)
- TEA handler architecture foundation (detailed in TEA_HANDLER_IMPLEMENTATION.md)

**❌ Missing Core Components:**
- **No BuildAmpEvent macro** - Phase 1 requires `#[derive(BuildAmpEvent)]` for type generation
- **Missing session_id column** - Event schema lacks first-class session targeting
- **No SSE integration** - Events can't trigger SSE notifications 
- **No webhook system** - No incoming webhook → event triggering
- **No service call system** - No outbound service integration
- **Basic event processor** - Hardcoded handlers vs generated from Rust types

**🔧 Implementation Gaps:**
- Event type generation is hardcoded in Generated/Events.elm vs auto-generated from Rust
- No session store integration for first-class session targeting
- Missing capability detection (events vs SSE vs services)
- No connection between events and SSE notifications

## Phase 1.5 Readiness

**Cannot start Phase 1.5 (WebSockets) until Phase 1 is complete** because:
- Session-based targeting foundation missing
- Event orchestration for connection management incomplete
- Type generation system needs BuildAmpEvent macro

## Design Philosophy: Minimal Decorations

**APIs need decorations (because they need HTTP metadata):**
```rust
// src/models/api/comments.rs
#[buildamp(path = "SubmitComment")]
pub struct SubmitCommentReq {
    #[buildamp(Required, MaxLength(500))]
    pub text: String,
    #[buildamp(Inject = "user_id")]
    pub author_id: String,
}
```

**Everything else is pure Rust:**
```rust
// src/models/events/email.rs
pub struct SendWelcomeEmail {
    pub email: String,
    pub name: String,
}

// src/models/db/posts.rs
pub struct Post {
    pub id: String,
    pub title: String,
}
```

## Implementation Plan

### 1. Complete Event Store Foundation (Week 1-2)
- **Add BuildAmpEvent macro** to .buildamp/macros/src/lib.rs
- **Update database schema**: Add session_id column to events table
- **Enhance event processor**: Auto-detect event handlers from generated types
- **Session store integration**: Generate session context types

### 2. Event Type Generation System (Week 2-3)
- **Auto-generation**: Replace hardcoded Events.elm with detection from src/models/events/
- **BuildAmpEvent derive**: Generate scheduling functions per event type
- **Context preservation**: Session + host + user context capture

### 3. Enhanced SSE Integration (Week 3-4)
- **SSE + Events connection**: Events can trigger SSE notifications with session targeting
- **Generated SSE types**: From src/models/sse/ with BuildAmpSSE macro
- **Session-based routing**: SSE messages to specific session IDs

### 4. Webhook + Service Call Systems (Week 4-5)
- **Incoming webhooks**: BuildAmpWebhook macro for /webhooks/* endpoints
- **Outbound services**: BuildAmpServiceCall for external API integration
- **Event triggering**: Webhooks create background events

### 5. Polish & Integration Testing (Week 5-6)
- **End-to-end workflows**: File upload → processing → SSE notification
- **Multi-stage events**: Event chains with proper correlation tracking
- **Error handling**: Enhanced DLQ and retry mechanisms

## Immediate Refactor: Minimal Decorations

### Changes Needed:
1. **Rename `buildamp_api` → `buildamp`** (it's the only decorated component)
2. **Remove decorations from non-API files**
3. **Auto-apply traits based on file location**
4. **Generate interfaces from pure structs**

### File Convention = Auto-Decoration:
```rust
// src/models/events/*.rs → Auto gets: Debug, Clone, Serialize, Deserialize
// src/models/db/*.rs    → Auto gets: Debug, Clone, Serialize, Deserialize, BuildAmpElm
// src/models/sse/*.rs   → Auto gets: Debug, Clone, Serialize, Deserialize
// src/models/storage/*.rs → Auto gets: Debug, Clone, Serialize, Deserialize, BuildAmpElm
```

## Success Criteria Mapping
- ✅ Multi-stage workflows → Event chains with correlation IDs
- ✅ Persistent scheduling → Enhanced event processor with proper delays
- ✅ Type-safe service calls → BuildAmpServiceCall macro + retry logic
- ✅ SSE workflow updates → Events trigger session-targeted SSE messages
- ✅ Webhook integration → Incoming webhooks create typed events

## Next Steps
1. **Start with buildamp_api → buildamp rename** - Foundation cleanup
2. **Remove unnecessary decorations** - Clean up non-API models
3. **Auto-apply traits by file location** - Convention over configuration
4. **Test and commit** - Ensure no regressions

This completes the "half-implemented" event system mentioned in the roadmap and provides the foundation needed for Phase 1.5 WebSockets.