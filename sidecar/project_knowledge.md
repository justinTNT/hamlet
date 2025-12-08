# Hamlet Project Knowledge

## Testing Infrastructure

### Location
- **Rust tests**: `/tests/macro_test.rs`, `/tests/elm_gen.rs`, `/tests/context_gen.rs`
- **Test command**: `cargo test` (from project root)
- **No JavaScript tests**: Package.json shows `"test": "echo \"Error: no test specified\" && exit 1"`

### Test Patterns
- **BuildAmp validation testing**: Comprehensive tests for API validation attributes (`#[api(Required)]`, `#[api(Email)]`, etc.)
- **Macro testing**: Tests for code generation and derive macros
- **Context injection**: Testing request context handling and tenant isolation

### Current Test Coverage
- ✅ API validation framework
- ✅ BuildAmp macro system
- ❌ KV store functionality
- ❌ SSE event handling  
- ❌ Integration tests
- ❌ JavaScript infrastructure

### Testing Philosophy
- **Type-driven**: Focus on validation and type safety
- **Pattern verification**: Ensure architectural consistency
- **Macro correctness**: Verify code generation works correctly

## Build System

### Commands
- **Start server**: `npm run start` 
- **Development**: `npm run dev` (nodemon)
- **Elm build**: `npm run build:elm`
- **Event processor**: `npm run events` / `npm run events:dev`

### Dependencies
- **Node.js**: >=20.0.0 (via .nvmrc and package.json engines)
- **PostgreSQL**: Docker Compose setup in `docker-compose.yml`
- **Elm**: For frontend logic compilation

## Architecture Patterns

### Multi-tenancy
- **Host header extraction**: `req.get('Host') || 'localhost'`
- **Tenant isolation**: Separate data stores per host across all systems
- **Consistent pattern**: KV store, SSE connections, database queries all use host

### Data Flow
- **Request validation**: Rust macros → WASM → JavaScript
- **Effect execution**: Elm → Effects → Database/Events
- **Real-time**: SSE broadcasts after successful DB commits

### File Organization
- **Storage types**: `src/models/storage/*_storage.rs` (auto-discovered)
- **Event types**: `src/models/events/*.rs`
- **API endpoints**: Auto-generated from Rust types
- **Elm helpers**: Generated to match Rust types

## Development Workflow

### Sidecar Usage
- **Port 7888**: nREPL server for interactive verification
- **Main check**: `(check)` runs all consistency verifications
- **Focused checks**: `(check-kv)`, `(check-sse)`, etc.

### Common Patterns
- **Add new storage type**: Create `*_storage.rs` → Auto-discovery → Elm helpers
- **Add new endpoint**: Rust type → BuildAmp validation → Server integration
- **Real-time events**: Define in Rust → SSE broadcasting → Elm subscriptions

## Known Issues

### Test Setup
- **Import errors**: `BuildAmpEndpoint` macro has unresolved imports
- **Missing JavaScript tests**: No test framework setup for Node.js code
- **No integration tests**: Only unit tests for Rust validation

### Opportunities
- **KV store testing**: Tenant isolation, TTL, cleanup
- **SSE testing**: Event serialization, connection management
- **Integration testing**: End-to-end workflow verification