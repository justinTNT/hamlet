# Sub-Project: Manifest System

## Status: Proposal / Discussion

## Context
The user has proposed treating the Manifest System as a distinct sub-project. This document serves as the central design and planning artifact for this initiative.

## Overview

The BuildAmp framework uses a "manifest" system to dynamically discover and expose type definitions and endpoint configurations to the Elm frontend. This system uses the `inventory` crate for runtime collection of macro-generated registrations.

## Current Implementation

### Context Manifest (`get_context_manifest()`)

```rust
#[wasm_bindgen]
pub fn get_context_manifest() -> String {
    let definitions: Vec<serde_json::Value> = inventory::iter::<elm_export::ContextDefinition>
        .into_iter()
        .map(|def| {
            serde_json::json!({
                "type": def.type_name,
                "field": def.field_name,
                "source": def.source
            })
        })
        .collect();
    serde_json::to_string(&definitions).unwrap_or_else(|_| "[]".to_string())
}
```

**Purpose**: Collects dependency injection sources from `#[dependency(source = "...")]` attributes.

**Example Registration Source**:
```rust
#[buildamp_domain]
pub struct SubmitCommentData {
    #[dependency(source = "table:guests:by_session")]
    pub existing_guest: Option<Guest>,
    pub fresh_guest_id: String,
    pub fresh_comment_id: String,
}
```

### Endpoint Manifest (`get_endpoint_manifest()`)

```rust
#[wasm_bindgen]
pub fn get_endpoint_manifest() -> String {
    let definitions: Vec<serde_json::Value> = inventory::iter::<elm_export::EndpointDefinition>
        .into_iter()
        .map(|def| {
            serde_json::json!({
                "endpoint": def.endpoint,
                "request_type": def.request_type,
                "context_type": def.context_type
            })
        })
        .collect();
    serde_json::to_string(&definitions).unwrap_or_else(|_| "[]".to_string())
}
```

**Purpose**: Collects API endpoint definitions from `#[buildamp_api]` decorated structs.

**Example Registration Source**:
```rust
#[buildamp_api]
#[api(path = "GetFeed")]
pub struct GetFeedReq {
    #[serde(default)]
    #[api(Inject = "host")]
    pub host: String,
}
```

## Problems Identified

### 1. **Silent Failures**
```rust
.unwrap_or_else(|_| "[]".to_string())
```
- Serialization errors are swallowed
- Users get empty manifests with no error indication
- No way to distinguish between "no definitions" vs "serialization failed"

### 2. **Invisible Registration Process**
- Macro-generated `inventory::submit!()` calls are hidden from users
- No compile-time validation that registrations occurred
- No way to inspect what was actually registered without runtime execution

### 3. **Runtime-Only Discovery**
- Manifests are only populated after WASM compilation and execution
- Cannot validate manifest completeness during development
- Build system cannot catch missing registrations

### 4. **Opaque Dependencies**
- `inventory` crate magic is completely hidden from users
- Users have no mental model of how their decorations become manifest entries
- Debugging requires deep framework knowledge

### 5. **Error-Prone Registration Chain**
```
User Code → Macro Expansion → inventory::submit!() → Runtime Collection → JSON Serialization
```
Each step can fail silently, making root cause analysis difficult.

## Current Usage Patterns

### Context Dependencies
From `comments_domain.rs`:
```rust
#[dependency(source = "table:guests:by_session")]
pub existing_guest: Option<Guest>,
```

Expected manifest entry:
```json
{
  "type": "SubmitCommentData", 
  "field": "existing_guest",
  "source": "table:guests:by_session"
}
```

### API Endpoints
From `feed_api.rs`:
```rust
#[buildamp_api]
#[api(path = "GetFeed")]
pub struct GetFeedReq { ... }
```

Expected manifest entry:
```json
{
  "endpoint": "GetFeed",
  "request_type": "GetFeedReq", 
  "context_type": "StandardServerContext"
}
```

## Framework Integration Points

### 1. **Elm Code Generation**
- Manifests drive Elm type generation
- Missing manifest entries = missing Elm types
- Silent failures break the entire Elm interface

### 2. **Server Routing** 
- Endpoint manifest drives request routing
- Missing endpoints = 404 errors with no clear cause

### 3. **Dependency Injection**
- Context manifest drives server-side data fetching
- Missing context entries = runtime dependency injection failures

## Design Philosophy
> "I love invisible magic, hate silent failure. Invisibility can be complemented by tasteful human friendly reporting."

**Goal**: Keep the registration "magical" (macros + inventory) but make the *result* of that magic visible and robust.

## Proposed Improvements

### 1. Eliminate Silent Failures
**Current**: `unwrap_or_else(|_| "[]".to_string())` swallows serialization errors.
**Proposed**:
-   Change return type to `Result<String, String>` (or handle error internally by returning a JSON error object).
-   Log errors to console/stderr when generation fails.
-   **Strict Mode**: If manifest generation fails, the application should probably crash or refuse to start, rather than running with an empty configuration.

### 2. Human-Friendly Reporting ("The Magic Reveal")
Since registration is invisible, we need a way to "reveal" what happened.
**Proposed**:
-   **Startup Log**: When the server starts, print a pretty summary of the loaded manifest.
    ```text
    [BuildAmp] Loaded Manifest:
    ├── Endpoints (4)
    │   ├── GetFeed (Context: StandardServerContext)
    │   ├── SubmitComment (Context: SubmitCommentData)
    │   └── ...
    └── Context Sources (2)
        ├── table:guests:by_session
        └── table:tags
    ```
-   **Debug Endpoint**: `/api/manifest/debug` could return the raw JSON + any validation warnings.

### 3. Validation
-   Check for duplicate endpoints.
-   Check for missing context sources (e.g., an endpoint requests `MyData` but `MyData` isn't registered).
-   Report these validation errors clearly on startup.

### 4. Domain-Specific Error Scenarios
We should tailor error messages to the specific "tripwires" of our architecture:

#### A. The "Ghost Dependency" (Context Mismatch)
**Scenario**: Endpoint requests `#[dependency(source = "table:unknown")]`.
**Report**:
> "Endpoint `SubmitItem` needs context from `table:unknown`, but I don't know how to fetch that.
> Known sources: `table:guests`, `table:items`, `table:tags`."

#### B. The "Orphaned Relationship" (Foreign Key Mismatch)
**Scenario**: A `SubmitComment` payload refers to an `item_id` that doesn't exist, or the relationship is misconfigured in the DB.
**Report**:
> "Constraint Violation: You tried to attach a comment to item `123`, but that item doesn't exist.
> (Database error: `foreign key constraint "item_comments_item_id_fkey"`)

#### C. The "Shape Mismatch" (Rust vs DB)
**Scenario**: Rust struct expects `author_name`, but DB query returns `name`.
**Report**:
> "Data Shape Mismatch: The context query for `SubmitCommentData` returned a row missing the field `author_name`.
> Received keys: `[id, name, host]`. Expected: `[id, author_name, host]`."

#### D. The "Duplicate Endpoint"
**Scenario**: Copy-paste error leads to two endpoints with `path = "SubmitComment"`.
**Report**:
> "Ambiguous Routing: Both `SubmitCommentReq` and `SubmitReplyReq` claim the path `SubmitComment`.
> Please rename one of them."

### 5. Migration Integration (Schema Validation)
To validate "Ghost Dependencies" and "Shape Mismatches", the server must know the *actual* database schema.

**Strategy: Runtime Introspection**
1.  **Run Migrations**: Ensure DB is up-to-date.
2.  **Introspect**: Query `information_schema` to build a map of `Table -> Set<Column>`.
3.  **Cross-Check**:
    -   For every `#[dependency(source = "table:T")]`, verify table `T` exists.
    -   (Advanced) Verify that the columns expected by the Rust struct (if we can infer them) exist in `T`.

## Implementation Plan
1.  **Refactor `src/lib.rs`**: Update `get_context_manifest` and `get_endpoint_manifest` to handle errors.
2.  **Update `server.js`**:
    -   **Step 1: Run Migrations** (Existing).
    -   **Step 2: Load Manifests** (Handle errors).
    -   **Step 3: Introspect DB**: Fetch schema metadata.
    -   **Step 4: Validate**: Check Manifest against DB Schema.
    -   **Step 5: Report**: Print the "Startup Log" with validation results.
    -   **Step 6: Start Server** (or fail if strict mode).
3.  **Verify**: Create a migration that drops a column, then try to start the server with a Manifest that expects it.