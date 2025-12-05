# BuildAmp Roadmap

Priority-ordered list of infrastructure features to add to BuildAmp.

## High Priority (Foundational)

### 1. Background Event Queue
**Status**: Next to implement  
**Why first**: Foundational for delayed actions, file processing, webhooks  
**Details**: See `background_event_queue.md`

### 2. Type-Safe Key-Value Store  
**Status**: Pending
**Why important**: Client coordination, caching, session management
**Details**: See `keyvalue_store.md`

## Medium Priority (Core Features)

### 3. Server-Sent Events
**Status**: Pending
**Why important**: 80% of real-time needs, simpler than WebSocket
**Details**: See `server_sent_events.md`

### 4. Enhanced Database Migrations
**Status**: Pending  
**Why important**: Auto-generate from type changes, prevent drift
**Details**: See `enhanced_migrations.md`

### 5. File/Blob Handling
**Status**: Pending
**Why important**: Complete type-safe pipeline for files
**Details**: See `file_blob_handling.md`

## Lower Priority (Advanced Features)

### 6. WebSocket Support
**Status**: Pending
**Why later**: Complex, mainly for gaming/collaborative apps
**Details**: See `websocket_support.md`

### 7. External Webhooks
**Status**: Pending  
**Why later**: Builds on background processing + file handling
**Details**: See `external_webhooks.md`

### 8. Structured Logging
**Status**: Pending
**Why later**: Enhancement of existing capability
**Details**: See `structured_logging.md`

## Architecture Principles

All features follow the same pattern:
- **Define types in Rust** → **Generate Elm interfaces** → **Handle infrastructure**
- Respect tenant isolation (host-based)
- Integrate with existing context/validation patterns
- Generate actual code, not just runtime behavior