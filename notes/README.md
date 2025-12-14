# Hamlet Notes Directory

## Current Documentation

**Primary Roadmap**: `../ROADMAP2_REVISED.md` - Current implementation plan

### Active Design Documents
- `background_event_queue.md` - Event system foundation (half-implemented in Horatio)
- `session_store_integration.md` - Generated session types with Express integration
- `external_service_calls.md` - Outbound service integrations (renamed from webhooks)
- `PHASE1_FILE_UPLOAD_TYPES.md` - File upload type generation design
- `PHASE2_NATIVE_CAPABILITIES.md` - Web-native capability boundaries  
- `PHASE3_BACKGROUND_WORKERS.md` - Worker communication types

### Implementation Reference
- `keyvalue_store.md` - KV store patterns (implemented)
- `enhanced_migrations.md` - Database migration patterns
- `structured_logging.md` - Logging infrastructure
- `buildamp_file_organization.md` - Project structure guide

### Development Guides  
- `DEMO_GUIDE.md` - Demo application walkthrough
- `review_guide.md` - Code review guidelines

## Legacy Documents

The following files are **outdated** but preserved for historical reference:

- `buildamp_roadmap.md` - Original roadmap (superseded by ROADMAP2_REVISED.md)
- `MOBILE_ROADMAP.md` - Mobile strategy (now in Phase 3 of main roadmap)
- `file_blob_handling.md` - File handling design (now in Phase 2 of main roadmap)  
- `server_sent_events.md` - SSE design (now in Phase 1 of main roadmap)
- `websocket_support.md` - WebSocket design (future consideration)

## Architecture Evolution

**Phase 1**: Focus on HTTP boundaries and type generation
**Phase 2**: Event-driven architecture becomes foundation  
**Phase 3**: Web-native capabilities for mobile-like experiences
**Current**: Event system as spine for reliable workflows

See `../ROADMAP2_REVISED.md` for complete current architecture.