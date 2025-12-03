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

## Implementation Plan
1.  **Refactor `src/lib.rs`**: Update `get_context_manifest` and `get_endpoint_manifest` to handle errors.
2.  **Update `server.js`**:
    -   Call the manifest functions safely.
    -   Implement the "Startup Log" using the data returned.
    -   Fail startup if manifest is invalid.
3.  **Verify**: Intentionally break a manifest (e.g., invalid JSON serialization) and verify it reports the error instead of failing silently.