# Server-Side Validation: Pure Elm Model

**Status: COMPLETED**

## The Decision
We cancelled the "Isomorphic WASM" initiative.
- **Reason:** High complexity, low ROI.
- **Replacement:** Standard Elm JSON Encoders/Decoders on both Client and Server.

## The Architecture

### 1. The Source of Truth (Rust)
- Data models are defined in `app/*/models/**/*.rs`.
- These remain the definition of the schema.

### 2. The Generator (`packages/buildamp/lib/generators/elm.js`)
- Parses Rust structs.
- Generates **Elm Types**.
- Generates **Elm JSON Encoders** (for sending).
- Generates **Elm JSON Decoders** (for receiving).

### 3. The Role of Rust (`src/lib.rs`)
Rust is **NOT** used for runtime validation of requests.
It is used ONLY for:
- **Introspection:** `get_endpoint_manifest`, `get_context_manifest`.
- **SQL Generation:** `generate_migrations`.
- **Build-Time Safety:** The `buildamp` macro ensures your models are physically compile-able.

### 4. Data Flow

#### Client Side (Browser)
1. **Action:** User clicks "Save".
2. **Encode:** Elm converts `User` -> JSON String (via generated Encoder).
3. **Transport:** POST /api/save.

#### Server Side (Node + Elm Worker)
1. **Receive:** Node.js receives JSON string.
2. **Handoff:** Node passes JSON to Elm Worker via Port.
3. **Decode:** Elm Worker converts JSON String -> `User` (via generated Decoder).
   - **Success:** `update` function processes logic.
   - **Failure:** `Result.Err` returned (Validation Failure).

## Completed Actions
- [x] Deleted `buildamp-wasm.js` (server middleware that mocked WASM layer)
- [x] Removed `encode_request` and `encode_response` passthrough functions from `src/lib.rs`
- [x] Updated template `packages/create-buildamp/template/src/lib.rs`
- [x] Elm generators produce full JSON codecs (enc/dec) for all relevant models

## Conclusion
The system is **Elm-Symmetric**. Validation happens inside the Elm runtime on the server. Rust is used purely for Schema Definition/Modeling, not Runtime Validation.
