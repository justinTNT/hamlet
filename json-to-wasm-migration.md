# JSON to WASM Migration Plan

## Current State (Sprint 4)

The Hamlet framework currently uses JSON serialization through Elm ports for all cross-boundary communication:

### Areas Using JSON Serialization

1. **Browser Storage** (`StoragePorts.elm`)
   - Uses `Json.Encode.Value` and `Json.Decode.Value` for localStorage operations
   - Manual encoders/decoders in helper modules

2. **Database Operations** (TEA handlers)
   - Database queries go through ports with JSON encoding
   - Results come back through ports with JSON decoding
   - High overhead for frequent operations

3. **API Client** (`ApiClient.elm`)
   - All API requests use JSON encoding
   - All API responses use JSON decoding

4. **KV Store Operations**
   - Redis operations through JSON-encoded ports
   - Every get/set involves serialization

5. **Service Integrations**
   - HTTP requests to external services use JSON
   - Responses decoded from JSON

6. **SSE (Server-Sent Events)**
   - Event streaming from server to clients
   - Events serialized as JSON (NewCommentEvent, UserPresenceEvent, etc.)
   - High overhead for real-time streaming
   - Each connected client receives JSON-encoded events

7. **Event Sourcing System**
   - Background event processing (ProcessVideoEvent, SendWelcomeEmail)
   - Event persistence in database as JSON
   - Event replay and recovery through JSON deserialization
   - Worker processes consume JSON-encoded events

## Why This Needs to Change

1. **Performance Overhead**: Every operation involves JSON stringify/parse
2. **Type Safety Issues**: JSON loses type information, requires manual validation
3. **Maintenance Burden**: Manual encoder/decoder maintenance for every type
4. **Missed WASM Opportunity**: Rust models already have `elm_rs` capability

## Proposed WASM Architecture

### Enable BuildAmp Macros
All Rust models need proper macro attributes:
- `#[buildamp_db]` for database models
- `#[buildamp_storage]` for storage models  
- `#[buildamp_api]` for API models
- `#[buildamp_kv]` for KV models
- `#[buildamp_sse]` for SSE event models
- `#[buildamp_event]` for event sourcing models

These macros add `elm_rs::Elm, elm_rs::ElmEncode, elm_rs::ElmDecode` derives.

### WASM Binding Generation
Create generators that produce:
- Direct WASM functions for database operations
- Direct localStorage access through WASM
- Binary serialization for API communication
- Direct Redis access through WASM
- Binary SSE event streaming
- Binary event store persistence and replay

### Benefits
- **Type Safety**: Direct Rust→Elm type mapping
- **Performance**: No JSON overhead
- **Simplicity**: No manual encoders/decoders
- **Correctness**: Single source of truth in Rust

## Implementation Priority

1. **Storage Operations** - Highest frequency, biggest impact
2. **SSE Event Streaming** - Real-time performance critical
3. **Database Queries** - Critical path for all requests
4. **API Communication** - User-facing performance
5. **Event Sourcing** - Background processing performance
6. **KV Store** - Backend performance
7. **Service Integration** - Lower priority

## Migration Strategy

This should be done as a separate focused effort after Sprint 4 completion:
1. Add macro attributes to all models
2. Generate WASM bindings alongside current JSON
3. Gradually migrate each subsystem
4. Remove JSON code once WASM is proven
5. Performance benchmarks at each stage
6. add hamlet-cli tests to the run_all_tests.sh script to ensure the cli commands (including gen:wasm) are properly tested.


## Technical Notes

- The `wasm-bindgen` infrastructure is already in place
- Models need `#[wasm_bindgen]` compatible derives
- Consider using `bincode` or similar for binary serialization
- May need custom WASM modules for each subsystem

## Estimated Impact

Based on typical JSON overhead:
- 50-80% reduction in serialization time
- 30-50% reduction in memory usage
- Significant reduction in code complexity
- Elimination of encoder/decoder bugs

**SSE-specific improvements:**
- Reduced bandwidth usage for event streams
- Lower server CPU usage per connected client
- Ability to handle more concurrent SSE connections
- Faster event delivery to clients

This migration represents a major architectural improvement that will benefit all BuildAmp applications.
