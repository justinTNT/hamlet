# JSON to WASM Migration Plan

## Current State

The Hamlet not-a-framework currently uses JSON serialization through Elm ports for all cross-boundary communication:

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

1. **Missed WASM Opportunity**: Rust models already have `elm_rs` capability
2. **Better Architecture**: WASM can provide validated business logic in a sandboxed environment

## Proposed WASM Architecture

### Model Discovery
Hamlet already identifies models by file location - WASM generation uses the same pattern:
- `app/{project}/models/db/*.rs` → Database models
- `app/{project}/models/storage/*.rs` → Storage models  
- `app/{project}/models/api/*.rs` → API models
- `app/{project}/models/kv/*.rs` → KV models
- `app/{project}/models/sse/*.rs` → SSE event models
- `app/{project}/models/events/*.rs` → Event sourcing models

No macro attributes needed - the generator adds appropriate derives based on location.

### WASM-First Architecture

BuildAmp compiles Rust models directly to WASM modules that include:
- Validation logic
- Business rules
- JSON serialization/deserialization
- Type information

```bash
buildamp gen:wasm api
# Output: api.wasm (runtime module with JSON support)
```

### CLI Design

The CLI follows `buildamp gen[:target] [model-dir]` pattern:

- `target` (optional): `wasm`, `elm`, `sql`, `ts` - defaults to all
- `model-dir` (optional): `api`, `db`, `storage`, `kv`, `sse`, `events`, `config` - defaults to all

```bash
# Primary usage - generate all targets for a model type
buildamp gen api          # All targets for api/ models
buildamp gen db           # All targets for db/ models
buildamp gen storage      # All targets for storage/ models
buildamp gen              # All targets for all model types

# Filtered - specific output only
buildamp gen:wasm api     # Only WASM for api models (most common)
buildamp gen:wasm         # Only WASM for all model types
buildamp gen:elm api      # Only Elm types for api models
buildamp gen:sql db       # Only SQL migrations for db models
```

### Code Generation (Optional)
For users who want generated types, BuildAmp can also generate from Rust source:
- **Elm Types** - Type definitions and JSON encoders/decoders
- **JavaScript** - API routes, database queries
- **SQL** - Database migrations
- **TypeScript** - Type definitions
- Future: **Swift**, **Kotlin**, **GraphQL** schemas

### Benefits of WASM-First Approach
- **Type Safety**: WASM validates at runtime, generated code matches source
- **Simplicity**: JSON remains the transport format - debuggable and standard
- **Flexibility**: Use just WASM, or WASM + generated code
- **No Drift**: All generation from single Rust source
- **Progressive**: Start with WASM, add generation as needed

Treating WASM generation as an automatic dependency of other generators, not a separate step users manage, solves the risk of drift from wasm vs more auditable targets.

### Tests

Update and add existing hamlet-cli tests to the run_all_tests.sh script to ensure the cli commands (including gen:wasm) are properly tested.

## BuildAmp Tool Restructuring

As part of the WASM migration, BuildAmp will be extracted as a standalone tool, with Hamlet CLI orchestrating it:
We keep both tools in the monorepo for easier development, but they're separate packages with separate responsibilities.
The hamlet CLI depends on and orchestrates buildamp, but buildamp has no knowledge of Hamlet.


### Tool Separation Architecture

#### BuildAmp (Standalone WASM & Code Generator)
```bash
# Generate WASM modules (most common use case)
buildamp gen:wasm api     # WASM for api models
buildamp gen:wasm db      # WASM for db models
buildamp gen:wasm         # WASM for all model types

# Generate all targets for a model type
buildamp gen api          # All targets (wasm, elm, js) for api models
buildamp gen db           # All targets for db models
buildamp gen              # All targets for all model types

# Generate specific output only
buildamp gen:elm api      # Elm types for api models
buildamp gen:sql db       # SQL migrations for db models
buildamp gen:ts api       # TypeScript definitions for api models
```

#### Hamlet CLI (Framework Orchestrator)
```bash
# Orchestrates BuildAmp for complete framework generation
hamlet gen  # Calls buildamp gen for all relevant targets on all present model types
hamlet serve
hamlet watch

# Provides:
# - Beautiful error messages
# - File clobber protection
# - Project structure management
# - .hamlet-gen/ coordination
```

### Migration Benefits

1. **Lower barrier to entry**: Developers can use just BuildAmp for API contracts
2. **Progressive adoption**: Start with API, add other model types as needed
3. **Framework independence**: BuildAmp users don't need Hamlet
4. **Clear separation**: WASM generation vs not-a-framework orchestration

BuildAmp - Raw Power

  buildamp gen:wasm api
  buildamp gen:elm api
  # Direct, no safety rails, overwrites files
  # "Here's your WASM and generated code"

Hamlet CLI - Safety & Beauty

  hamlet gen
  # ✓ Checking existing files...
  # ✓ Backing up Database.elm (modified locally)
  #  ApiClient.elm has local changes:
  #   - Line 42: Custom helper function detected
  #   - Line 67: Manual type annotation added
  # ? Proceed and move local changes to Database.local.elm? (Y/n)

Hamlet's File System Intelligence

  - Detect manual edits in generated files
  - Preserve custom code by moving to .local.elm files
  - Smart merging when possible
  - Beautiful diffs showing what will change
  - Rollback capability if generation goes wrong

### Error Message Examples

#### BuildAmp (raw)
  Error: Parse failed at models/api/comment.rs:42

#### Hamlet (beautiful)
  🚫 Unable to parse API model

     models/api/comment.rs
     42 | pub field: Unknown<Type>
                     ^^^^^^^^^^^

     BuildAmp doesn't recognize the type 'Unknown<Type>'.
     Did you mean one of these?
     • Option<Type>
     • Vec<Type>  
     • DatabaseId<Type>

  This separation makes both tools better:
  - BuildAmp stays simple and focused
  - Hamlet adds the DX polish and safety
  - Power users can use BuildAmp directly


### Implementation Strategy

The tool separation should happen alongside WASM implementation:

1. **Phase 1**: Extract BuildAmp with current code generation
   - Establish standalone tool interface
   - Move generation logic out of hamlet-cli
   - Set up well-structured modules (not plugins)

2. **Phase 2**: Add WASM generation to BuildAmp
   - Add gen:wasm command for runtime modules
   - Keep existing generators (gen:elm, gen:sql, etc.)
   - All using JSON for transport

3. **Phase 3**: Hamlet CLI focuses on developer experience
   - Beautiful error messages
   - Smart file management
   - Progress visualization
   - Best practice enforcement

### Module Structure (Not Plugins)

BuildAmp uses well-structured modules for each model type:
```
  hamlet/
├── app/horatio/           # Example Hamlet app
├── packages/
│   ├── hamlet-server/     # Runtime not-a-framework
│   ├── hamlet-cli/        # The 'hamlet' command
│   └── buildamp/          # The 'buildamp' command (standalone)
│       └── generators/
│           ├── api.js      # Most complex - validation, injection
│           ├── postgres.js # SQL generation from db models
│           ├── storage.js  # Browser localStorage
│           └── events.js   # Job queue integration
├── bin/
│   ├── hamlet.js          # #!/usr/bin/env node
│   └── buildamp.js        # #!/usr/bin/env node

```

Monorepo Structure

Future additions (GraphQL, MongoDB) come via PRs to add new modules, not through a plugin system. This keeps BuildAmp's type understanding deep and code generation accurate.

## Simple Architecture: Direct Generation

### WASM Generation
BuildAmp compiles Rust models to WASM modules with JSON support:

```bash
buildamp gen:wasm api
# Output: api.wasm (validates and processes JSON)
```

### Code Generation
BuildAmp generates types directly from Rust source:

```bash
buildamp gen:elm api      # Elm types & decoders for api models
buildamp gen:sql db       # SQL migrations for db models
buildamp gen:ts api       # TypeScript definitions for api models
```

## Technical Implementation

### WASM with JSON Transport
BuildAmp generates WASM modules that work with JSON:

```rust
#[wasm_bindgen]
pub fn validate_comment(json: &str) -> Result<String, JsValue> {
    let comment: Comment = serde_json::from_str(json)?;
    comment.validate()?; // Rich validation logic
    Ok(serde_json::to_string(&comment)?)
}
```

This approach uses WASM for validation and business logic while maintaining compatibility with existing tools

## Contract System Integration

The BuildAmp contract system plays a crucial role in the WASM architecture by preventing drift and enabling intelligent incremental builds:

### Preventing WASM/Code Drift
The contract system ensures WASM modules stay synchronized with Rust models:
```bash
# Server startup checks
✓ Verifying WASM matches models...
✗ Warning: api.wasm built from outdated models
  Changed: models/api/comment.rs
  Run 'buildamp gen:wasm api' to synchronize
```

### Smart Incremental Builds
The contract system tracks hashes to avoid unnecessary WASM compilation:
```bash
buildamp gen:elm api
# Contract system checks:
# - WASM hash matches stored hash? ✓
# - Skip expensive WASM compilation
# - Generate only Elm types (100ms vs 10s)
```

### Build Intelligence
Contracts provide transparency into build state:
```bash
buildamp status
✓ WASM current (built: 2 hours ago)
✗ Elm types outdated - api/user.rs modified
✓ SQL migrations current
→ Run 'buildamp gen:elm api' to sync
```

### Developer Benefits
- **Performance**: Skip WASM compilation when models unchanged
- **Correctness**: Catch drift between WASM and generated code
- **Observability**: Clear visibility into what needs rebuilding
- **Confidence**: Know exactly when WASM matches your models

The contract system transforms from bookkeeping to a build intelligence layer that makes WASM development predictable and debuggable.

## Estimated Impact

- **Code Reduction**: Eliminate manual encoder/decoder maintenance
- **Type Safety**: Runtime validation matches compile-time types
- **Developer Experience**: Single source of truth for all types
- **Flexibility**: Use WASM where needed, keep JSON for debugging

This migration provides better architecture without sacrificing debuggability or developer experience.

