# JSON to WASM Migration Plan

## Current State (Sprint 4)

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

1. **Performance Overhead**: Every operation involves JSON stringify/parse
2. **Type Safety Issues**: JSON loses type information, requires manual validation
3. **Maintenance Burden**: Manual encoder/decoder maintenance for every type
4. **Missed WASM Opportunity**: Rust models already have `elm_rs` capability

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

### Two-Stage Generation Architecture

#### Stage 1: Rust → WASM + IR (Compilation)
BuildAmp compiles each model directory into:
1. **WASM Module** - Actual runtime code with binary/JSON serialization
2. **Golden IR** - Type schema exported from the compiled WASM

```bash
buildamp compile app/myproject/models/api
# Outputs:
#   pkg-api/api.wasm         (runtime module)
#   pkg-api/api-schema.json  (type information)
```

This stage handles ALL Rust work:
- Parse Rust structs and annotations
- Compile business logic to WASM
- Choose serialization (binary for internal, JSON for webhooks/services)
- Export type registry as Golden IR

#### Stage 2: IR → Code Generation (Transformation)
Simple generators consume the IR to produce:
- **Elm Types** - Type definitions and encoders/decoders
- **JavaScript** - API routes, database queries
- **SQL** - Database migrations
- **TypeScript** - Type definitions
- Future: **Swift**, **Kotlin**, **GraphQL** schemas

```bash
# These generators ONLY read JSON, no Rust parsing
cat pkg-api/api-schema.json | buildamp-gen-elm > ApiClient.elm
cat pkg-db/db-schema.json | buildamp-gen-postgres > migrations.sql
```

### Benefits of Two-Stage Approach
- **Type Safety**: WASM and generated code share same source
- **Performance**: Binary serialization for all internal operations
- **Simplicity**: Generators are just JSON transformers
- **Correctness**: Schema comes from compiled code, can't drift
- **Extensibility**: New generators don't need Rust knowledge

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

## BuildAmp Tool Restructuring

As part of the WASM migration, BuildAmp will be extracted as a standalone tool, with Hamlet CLI orchestrating it:
We keep both tools in the monorepo for easier development, but they're separate packages with separate responsibilities.
The hamlet CLI depends on and orchestrates buildamp, but buildamp has no knowledge of Hamlet.


### Tool Separation Architecture

#### BuildAmp (Standalone WASM Generator)
```bash
# Direct usage - single directory focus
buildamp app/myproject/models/api --output pkg-web
buildamp app/myproject/models/db --output pkg-web

# Understands model semantics for optimal WASM generation:
# - API: validation, injection, request/response pairing
# - DB: DatabaseId<T>, Timestamp, relationships
# - Storage/KV/SSE/Events: serialization patterns
```

#### Hamlet CLI (Framework Orchestrator)
```bash
# Orchestrates multiple BuildAmp calls
hamlet gen  # Calls buildamp for each model type
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

  buildamp app/myproject/models/api --output pkg-web
  # Direct, no safety rails, overwrites files
  # "Here's your WASM, handle it carefully"

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

1. **Phase 1**: Extract BuildAmp with current JSON generation
   - Establish standalone tool interface
   - Move generation logic out of hamlet-cli
   - Set up well-structured modules (not plugins)

2. **Phase 2**: Add WASM generation to BuildAmp
   - Each module (api, db, storage, etc.) gains WASM capability
   - JSON becomes legacy mode
   - Structured logging and observability built-in

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

Future additions (GraphQL, MongoDB) come via PRs to add new modules, not through a plugin system. This keeps BuildAmp's type understanding deep and WASM generation optimal.

## Two-Stage Compilation Process

### Stage 1: Rust Compilation (BuildAmp Core)
All Rust work happens in one place:

```bash
# Compile models to WASM + export Golden IR
buildamp compile app/myproject/models/api
```

This produces:
```
pkg-api/
├── api.wasm          # Runtime module (with binary/JSON serialization)
└── api-schema.json   # Golden IR (type information)
```

The WASM module includes:
- Business logic (validation, transformations)
- Serialization (Bincode for internal, JSON for external)
- Schema export function

### Stage 2: Code Generation (Simple Transformers)
Generators only work with the Golden IR:

```bash
# No Rust parsing, just JSON transformation
cat pkg-api/api-schema.json | buildamp-gen-elm > ApiClient.elm
cat pkg-db/db-schema.json | buildamp-gen-postgres > migrations.sql
cat pkg-api/api-schema.json | buildamp-gen-typescript > api.d.ts
```

### Why This Architecture Wins

1. **No Regex Parsing** - Rust compiler does the hard work
2. **Single Source of Truth** - Schema comes from compiled code
3. **Easy Generator Development** - Just transform JSON to code
4. **Language Agnostic** - Write generators in any language
5. **Can't Drift** - Types match runtime behavior exactly

### Example Golden IR
```json
{
  "Comment": {
    "fields": [
      {
        "name": "id",
        "type": "DatabaseId<String>",
        "metadata": {
          "generated": true,
          "primary_key": true
        }
      },
      {
        "name": "text",
        "type": "String",
        "validation": {
          "required": true,
          "min_length": 1,
          "max_length": 500
        }
      }
    ]
  }
}
```

This IR contains everything generators need without requiring Rust knowledge.


## Technical Notes: Binary Serialization Strategy

### Zero-Copy Binary Format
Instead of passing JSON through wasm-bindgen (which still incurs JS string overhead), we'll use a binary format:

**Recommended: Bincode**
- Already compatible with Serde (which we have)
- True zero-copy deserialization in WASM
- Compact binary representation
- Battle-tested in production

### Implementation Pattern
```rust
// Instead of JSON strings through wasm-bindgen
#[wasm_bindgen]
pub fn handle_api_request(json: &str) -> String {
    let req: Request = serde_json::from_str(json)?; // Slow!
}

// Use raw bytes with Bincode
#[wasm_bindgen]
pub fn handle_api_request(bytes: &[u8]) -> Vec<u8> {
    let req: Request = bincode::deserialize(bytes)?; // Fast!
    let resp = process(req);
    bincode::serialize(&resp)? // Fast!
}
```

### Performance Gains for Large Data
For operations like "huge feed lists":
- **JSON**: Parse string → JS objects → stringify → parse again
- **Bincode**: Direct byte buffer → WASM → bytes out
- No intermediate JS object creation
- No string allocation/parsing overhead

### Elm Integration
Generate Elm functions that:
1. Use Elm's `Bytes.Encode` to create byte buffers
2. Pass raw bytes to WASM (via ports or direct call)
3. Use `Bytes.Decode` to read response bytes
4. BuildAmp generates all the Elm encoder/decoder boilerplate

### Migration Path
1. Add `bincode` to Cargo.toml (trivial)
2. Update WASM functions to use `&[u8]` instead of `&str`
3. Generate Elm `Bytes` encoders/decoders instead of JSON
4. Existing JSON can be fallback during transition

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

