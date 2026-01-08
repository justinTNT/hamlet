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

### Model Discovery
Hamlet already identifies models by file location - WASM generation uses the same pattern:
- `src/models/db/*.rs` → Database models
- `src/models/storage/*.rs` → Storage models  
- `src/models/api/*.rs` → API models
- `src/models/kv/*.rs` → KV models
- `src/models/sse/*.rs` → SSE event models
- `src/models/events/*.rs` → Event sourcing models

No macro attributes needed - the generator adds appropriate derives based on location.

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

1. Generate WASM bindings alongside current JSON
2. Gradually migrate each subsystem
3. Remove JSON code once WASM is proven
4. Performance benchmarks at each stage

### Tests

Update and add existing hamlet-cli tests to the run_all_tests.sh script to ensure the cli commands (including gen:wasm) are properly tested.

## Broader Vision: WASM Generation as a Standalone Tool

While implementing WASM generation for Hamlet, we should architect it as a potentially standalone tool that other frameworks could adopt:

### Design Principles
- **Framework agnostic**: Core WASM generation shouldn't depend on Hamlet-specific concepts
- **Composable**: Output that can be piped, transformed, and integrated into different build systems
- **Minimal opinions**: Just solve "Rust types → WASM" perfectly, nothing more

### Potential Interface
```bash
# Within BuildAmp (primary interface)
buildamp gen:wasm

# Future standalone tool (if extracted)
rust-to-wasm-gen \
  --input src/models \
  --output pkg-web \
  --target js,elm,typescript

# Could eventually support pipeline usage  
buildamp gen:wasm --format json | other-transform
```

### Benefits for the Ecosystem
- **Phoenix/Elixir**: Could use WASM models instead of Ecto schemas for certain use cases
- **SvelteKit**: Type-safe data layer without GraphQL complexity
- **Elm apps**: Direct WASM integration without JSON ports
- **Rust web frameworks**: Share models between server and WASM client code

### Implementation Approach
1. Start with Hamlet's specific needs (stay focused)
2. Keep generation logic cleanly separated from Hamlet framework code
3. Design APIs that could work standalone
4. Consider publishing as separate crate/npm package once stable
5. Let community needs drive generalization (not speculation)

This positions the WASM work as potentially industry-changing while keeping Hamlet itself focused on its "few weird holes" philosophy.


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

*SSE-specific improvements:**
- Reduced bandwidth usage for event streams
- Lower server CPU usage per connected client
- Ability to handle more concurrent SSE connections
- Faster event delivery to clients

This migration represents a major architectural improvement that will benefit all BuildAmp applications.
