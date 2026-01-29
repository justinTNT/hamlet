# Hamlet Framework Roadmap 2.0 - Revised

## Vision
Hamlet provides **type-safe client-server boundaries** with **web-native capabilities** for modern PWA development. Focus on eliminating JSON codec drudgery while enabling mobile-like experiences through standard web APIs.

## Current State
- ✅ **Core Framework**: Elm->Elm/js/sql type generation working
- ✅ **Database Integration**: Automatic migrations, tenant isolation
- ✅ **Middleware Stack**: KV store, sessions with tenant isolation  
- ✅ **Demo Application**: Horatio microblog proves the concept
- ✅ **Background Events**: Basic event queue with retry/DLQ in Horatio (see `notes/background_event_queue.md` - half-implemented)
- ✅ **Session Management**: HTTP session cookies replacing fingerprinting
- ✅ **SSE Infrastructure**: Basic server-sent events (half-implemented)

## Event Store Foundation

**Configuration-driven capabilities:**

### With Database + Event Store Enabled

**Full Capabilities:**
- ✅ **Multi-stage workflows** - Chain operations reliably
- ✅ **Persistent delayed/scheduled events** - Survive restarts
- ✅ **Reliable service calls** - Retry logic, delivery guarantees  
- ✅ **Workflow status/history** - Track progress, audit trail
- ✅ **Failed event recovery** - Dead letter queue, retry operations
- ✅ **Correlation tracking** - Trace related events

### Without Database OR Event Store Disabled

**Best-Effort Capabilities:**
- ❌ **Multi-stage workflows** - Not available
- ✅ **Volatile delayed events** - setTimeout/setInterval (lost on restart)
- ✅ **Fire-and-forget service calls** - HTTP requests (no retries)
- ❌ **Status/history/recovery/correlation** - Not available

## Major Components (Latest Priorities)

├── 🔄 TEA Handler Lifecycle Management  ← NEW BIG ITEM
  │   ├── Proper HMR cleanup
  │   ├── Handler instance management
  │   ├── Port message routing isolation
  │   └── Graceful handler replacement


---
# TODO


### 🔗 **DEPRIORITISED Phase 1.5: WebSocket Implementation (2-3 weeks)**

Client↔client messaging with server-mediated routing.

```elm
-- Type-safe client messaging (in shared/Ws/GameMessage.elm)
type GameMessage
    = PlayerMove { gameId : String, x : Int, y : Int }
    | ChatMessage { text : String }
    | GameState { board : List (List Int) }
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

### 📁 **Phase 2: PRIORITY - File Upload Types (4-6 weeks)**

Essential for real applications. Web-native file handling with event integration.

see FE2E_FILE_UPLOADS_PLAN.md

#### 2.1 Type-Safe File Upload
```elm
-- In app/models/api/PhotoUpload.elm
type alias PhotoUploadReq =
    { albumId : String
    , caption : Maybe String
    , constraints : FileConstraints
    }

type alias FileConstraints =
    { maxSizeMb : Int
    , allowedTypes : List String
    , imageMaxDimensions : Maybe ( Int, Int )
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

### ⚙️ **Phase 4: Background Workers (6-8 weeks)**

Type-safe worker communication for CPU-intensive tasks.

eg the kind of document analysis required for footnotes

#### 4.1 Worker Communication Types
```elm
-- In app/models/ww/ImageWorker.elm
type ImageWorker
    = ProcessImage { imageData : List Int, width : Int }
    | ProcessingProgress { percent : Float }
    | ProcessingComplete { resultUrl : String }
    | ProcessingFailed { error : String }
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

- Generate documentation for all middleware endpoints
- Interactive Swagger UI for testing
- Type-safe client SDK generation
- Complete API documentation
- Integration guides
- Best practices
- Reference applications


---

## Architecture Principles

1. **Type-Safe Boundaries First**: All communication defined as interfaces to Elm models, with related codecs and types generated for Elm
2. **Event-Driven Foundation**: Multi-stage workflows and reliable integrations via event store
3. **Graceful Degradation**: Apps work without event store, get enhanced capabilities with it
4. **Web-Native**: Standard web APIs, not native app emulation
5. **Configuration-Driven**: Features enabled/disabled via build configuration
6. **Small App Focused**: Perfect for solo developers and small teams

## Success Criteria

### Phase 1 (Event System)
- [x] Multi-stage workflows with reliable execution
- [x] Persistent scheduling that survives restarts  
- [x] Enhanced SSE with workflow status updates

### Phase 1.5 (WebSocket)
- [ ] WebSocket client↔client messaging with server-mediated routing

### Phase 2 (Files)
- [ ] Upload files with type-safe constraints
- [ ] Background processing via event workflows
- [ ] Production-ready storage backends

### Phase 4 (Workers)
- [ ] CPU-intensive work in background workers
- [ ] Type-safe worker communication
- [ ] Workers can trigger event workflows

### Phase 5 (DevEx)
- [-] Interactive API documentation
- [-] Comprehensive guides and examples
- [x] Support basic validation type constructors on models where appropriate ✅ **COMPLETED**

  **Validation Types Implementation - COMPLETED**
  
  Successfully implemented boundary validation system using composable type constructors with convenient type aliases. Provides JSON transport codecs and generates synchronized client-server validation.
  
  Completed features:
  - Core validation type constructors (Bounded, Format, CharSet, Encoding)
  - Convenient type aliases (SafeText, EmailAddress, ValidUrl, etc.)
  - Helper functions for creating validated types
  - Focus on boundary validation only - no business logic creep
  - Composable building blocks rather than limited combinations
  
  Key insight: Only implement validations that belong at the JSON exchange layer:

  #### Models:

  Full validation support:
  - app/models/api  - HTTP request/response boundaries
  - app/models/ws - Real-time message boundaries
  - app/models/ww - Web Worker postMessage boundaries
  - app/models/hooks - Web Worker postMessage boundaries
  - app/models/services - Serialization boundaries

  Event types - special case:
  - app/models/events - auto-apply format("json") validation to payload

  Composable building blocks (expressed in Elm):
  ```elm
  -- Base validation wrapper types
  type alias Bounded a = { value : a, min : Int, max : Int }
  type alias Format a = { value : a, format : String }
  type alias CharSet a = { value : a, charset : String }
  type alias Encoding a = { value : a, encoding : String }

  -- Convenient validated type aliases
  type alias SafeText = Bounded String      -- Range-validated string
  type alias EmailAddress = Format String   -- Email format validated
  type alias ValidUrl = Format String       -- URL format validated
  ```

