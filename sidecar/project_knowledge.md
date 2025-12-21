# Hamlet Project Knowledge

## Testing Infrastructure

### Location
- **Framework unit tests**: `/tests/` (18 test files)
- **Framework integration tests**: `/framework-tests/` (20 projects + 4 scripts)
- **Application tests**: `app/horatio/server/__tests__/` (2 test files)
- **Test commands**: 
  - Framework unit: `cargo test` (from project root)
  - Framework integration: `cd framework-tests && ./test-*.js`
  - Application: `npm test` (from app/horatio/server)

### Test Files Overview
**Rust tests (181 total tests, 4 currently failing intentionally)**:
- `api_codegen_test.rs`, `context_gen.rs`, `database_types_test.rs`
- `e2e_auto_discovery_test.rs`, `elm_gen.rs`, `event_types_test.rs`
- `event_validation_session_test.rs`, `infrastructure_detection_test.rs`
- `macro_test.rs`, `session_sse_integration_test.rs`, `sse_codegen_test.rs`
- `sse_effect_test.rs`, `sse_tests.rs`, `storage_codegen_test.rs`
- `storage_types_test.rs`, `validation_aliases_test.rs`, `validation_integration_test.rs`
- `validation_types_test.rs`, `host_isolation_test.rs`, `tea_handler_lifecycle_test.rs`

**Framework integration tests (20 projects + 4 scripts)**:
- `test-validation/` - Full validation system with models/API/DB
- `test-handlers-webhooks/` - TEA handler and webhook generation
- `test-codegen-output/` - Code generation pipeline verification  
- `test-elm-generation/` - Elm code generation validation
- `test-decoration-comparison/` - Manual vs auto-decoration testing
- `test-auto-decoration.js`, `test-integration.js`, `test-simple.js` - Framework validation scripts
- Plus 16 other specialized framework test projects

**Application tests (31 total tests, all passing)**:
- `kv-store.test.js` - KV store testing (tenant isolation, TTL, cleanup)  
- `sse-integration.test.js` - SSE event handling and connection management

### Current Test Coverage
- ✅ API validation framework (Rust)
- ✅ BuildAmp macro system (Rust)  
- ✅ KV store functionality (JavaScript) - **31 tests**
- ✅ SSE event handling (JavaScript)
- ✅ Database types generation (Rust)
- ✅ Event system validation (Rust)
- ✅ Host isolation framework tests (Rust) - **9 tests**
- ❌ TEA Handler lifecycle management (Rust) - **4 failing tests guide future work**
- ❌ GetFeed multi-stage loading
- ❌ Gradual identity system

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
- **Framework tests**: All validation tests now pass (172 tests passing)
- **Intentional test failures**: 4 TEA handler lifecycle tests fail by design to guide HMR bug fixes
- **Import errors**: `BuildAmpEndpoint` macro has unresolved imports in some tests
- **Missing coverage**: GetFeed multi-stage loading, gradual identity system

### TEA Handler Issues (Critical)
- **HMR lifecycle bug**: Hot module reload creates multiple TEA handler instances
- **Port message collision**: Data gets routed to wrong handler instance  
- **State contamination**: Old handler state persists after code changes
- **Test coverage**: 4 failing tests in `tea_handler_lifecycle_test.rs` document these issues
- **Workaround**: Restart server after Elm handler changes
- **Priority**: High - affects all TEA handler development

### Database Schema Evolution
- **Host isolation**: Added host columns to all tables (item_tags was missing)
- **Gradual identity**: Added author_name column with snapshot pattern
- **Schema consistency**: Database now matches Rust models exactly

### Opportunities
- ✅ KV store testing: Comprehensive (31 tests covering tenant isolation, TTL, cleanup)
- ✅ SSE testing: Event serialization, connection management
- ✅ Host isolation testing: Framework tests validate automatic SQL filtering (9 tests)
- ✅ TEA handler lifecycle: Failing tests document HMR issues for future fixes (4 tests)
- ❌ Integration testing: End-to-end workflow verification
- ❌ GetFeed multi-stage loading tests: Data transformation pipeline validation
- ❌ Gradual identity tests: Guest creation, name generation, snapshot behavior