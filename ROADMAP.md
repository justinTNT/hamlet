# Roadmap

*This is a living document. The next step is always at the top. Completed steps are moved to the "DONE" section at the bottom.*

# Horatio Microblog Roadmap

**Goal:** Build a multi-tenant, distributed Microblogging platform.
*   **Core:** Rust/WASM shared logic (`proto-rust`).
*   **Reader:** Elm Website (public feed, guest comments).
*   **Writer:** Browser Extension (curation tool for owners).
*   **Backend:** Node.js (multi-tenant storage).

---

## NEXT: Technical Debt - Repair Vite Build

**Goal:** Restore the `vite-plugin-elm` integration to enable Hot Module Replacement (HMR) and simplify the build process. Currently, we are using a manual `elm make` workaround.

**Tasks:**
1.  Investigate why `vite-plugin-elm` produced broken code (`ReferenceError`).
2.  Re-enable the plugin in `vite.config.js`.
3.  Restore `index.js` to import `Main.elm` directly.
4.  Verify HMR works.

---

## Phase 4: The Writer (Browser Extension)

**Goal:** Create a browser extension to push content.

**Plan:**
1.  Scaffold a new directory `extension`.
2.  Package the WASM core for the extension background script.
3.  Create a popup UI to scrape the current tab and submit to the backend.

---

## Phase 5: Persistence via Hasura

**Goal:** Replace the in-memory backend storage with a persistent Hasura (GraphQL on Postgres) database.

**Plan:**
1.  **Infrastructure:** Provision a Hasura instance (local Docker or Cloud).
2.  **Schema Mirroring:** Create Hasura tables matching the Rust `shared_types.rs` (Items, Guests, Comments).
3.  **Backend Integration:** Update `backend/server.js` to:
    *   Construct GraphQL mutations.
    *   Forward validated `MicroblogItem` data to Hasura.
    *   Retrieve feeds via GraphQL queries.
4.  **Auth:** (Optional) Use the "Guest" identity to generate JWTs for Hasura role-based access.

---
---

# DONE

## Phase 3: The Reader (Elm Website)

- **Status:** Completed.
- **Outcome:** Refactored `Main.elm` to use the new `MicroblogItem` schema. Configured the app to fetch the feed on load and display items. Note: Currently using manual `elm make` for compilation.

## Phase 2: The Backend (Multi-Tenant)

- **Status:** Completed.
- **Outcome:** Updated `server.js` to support the new schema and multi-tenancy. Implemented in-memory storage partitioned by tenant and handled `SubmitItem` and `GetFeed` requests using WASM for validation/encoding.

## Phase 1 - The Shared Schema

- **Status:** Completed.
- **Outcome:** Refactored `shared_types.rs` with the new Microblog schema. Implemented basic validation in `lib.rs` and successfully generated the `Api/Schema.elm` file using the `schema_generator` (via `elm_rs`).

## POC Phase Achievements
*   **Isomorphic Rust Core:** Shared logic compiled to WASM.
*   **Type-Safe Schemas:** Automated generation via `elm_rs`.
*   **Robust RPC:** Correlation-ID based request/response.
*   **End-to-End Flow:** Proven with the Student/Class POC.


- **Status:** Completed.
- **Outcome:** Successfully automated the generation of `frontend/src/Api/Schema.elm` from the Rust types in `shared_types.rs` using the `elm_rs` crate. This establishes Rust as the single source of truth and removes the risk of manual type synchronization errors.

## C: Hardened the Protocol
- **Status:** Completed.
- **Outcome:** Implemented advanced RPC type safety using a correlation-ID pattern in Elm and added robust, structured error handling for "sad paths". A real `fetch` call was added to the JavaScript layer to prove network initiation.

## B: Retrofitted Real Rust/WASM Protocol Core

- **Status:** Completed.
- **Outcome:** Created the `proto-rust` crate and compiled it to WebAssembly using `wasm-pack`. The frontend JavaScript was updated to load and use this WASM module for its core logic, proving the integration is seamless and does not require changes to the Elm application's interface.

## A: Proved Frontend Schema and RPC Ergonomics

- **Status:** Completed.
- **Outcome:** Validated the core frontend architecture. We proved that we could generate Elm types from a schema and that making API calls from Elm using a port-based RPC layer felt clean and maintainable. This was tested with a fake JavaScript "protocol brain".

---
# DEFERRED / ABANDONED

## Implement Schema Generation via `ts-rs`

- **Status:** Abandoned.
- **Outcome:** This task was attempted but proved to be much more complex than anticipated. Both `serde-reflection` and `ts-rs` presented significant challenges in generating clean, usable Elm code without a much more sophisticated and dedicated generator tool.
- **Decision:** To maintain project velocity, we are reverting to a manually-maintained `Api/Schema.elm` file. While this introduces a risk of client-server types drifting out of sync, it is the most pragmatic solution for now. A robust, automated single-source-of-truth generator remains a desirable but non-trivial future goal.
