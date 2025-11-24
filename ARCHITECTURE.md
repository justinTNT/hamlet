# Architecture Decisions

This document records key architectural decisions and the proven system design of the Horatio project.

## 1. The "Single Source of Truth" (Schema Generation)

### Goal
To eliminate client-server type mismatches by generating frontend types directly from the backend definition.

### Decision (2025-11-24)
- **Tool:** `elm_rs` crate.
- **Workflow:**
    1.  Data types are defined as Rust structs/enums in `proto-rust/src/shared_types.rs`.
    2.  These types derive `Elm`, `ElmEncode`, and `ElmDecode` traits.
    3.  A generator tool (`schema_generator`) runs the `elm_rs::export!` macro.
    4.  This produces a valid `frontend/src/Api/Schema.elm` file containing Elm type aliases, JSON encoders, and JSON decoders.
- **Justification:** `elm_rs` proved superior to intermediate solutions (like `ts-rs`) because it generates native Elm encoders/decoders, offering a complete, type-safe bridge with minimal friction.

## 2. The "Isomorphic Core" (WASM)

### Goal
To share logic and data processing code between the Browser (Elm/JS) and the Server (Node.js) without rewriting it.

### Proven Architecture
- **Core:** The `proto-rust` crate contains the business entities and protocol logic.
- **Compilation:** It is compiled to WebAssembly (`.wasm`) using `wasm-pack build --target web`.
- **Client Integration:**
    - The frontend loads the WASM module via Vite plugins (`vite-plugin-wasm`).
    - JavaScript acts as the "Protocol Brain," calling WASM functions (`encode_request`, `decode_response`) to process data flowing in and out of the Elm application via ports.
- **Server Integration:**
    - The Node.js backend imports the *exact same* WASM package.
    - It uses complementary WASM functions (`decode_request`, `encode_response`) to handle incoming API calls.
- **Outcome:** We achieved true code sharing. The same compiled artifact processes data on both sides of the network boundary.

## 3. Frontend-Backend Protocol

### Pattern
- **RPC-style:** The Elm client sends command objects (e.g., `GetClassWithStudentsReq`).
- **Transport:** HTTP POST to `/api`.
- **Correlation:** Requests use a UUID `correlationId` to map responses back to the originating Elm message, decoupling the network layer from the UI update cycle.