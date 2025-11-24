# Roadmap

*This is a living document. The next step is always at the top. Completed steps are moved to the "DONE" section at the bottom.*

# Horatio Microblog Roadmap

**Goal:** Build a multi-tenant, distributed Microblogging platform.
*   **Core:** Rust/WASM shared logic (`proto-rust`).
*   **Reader:** Elm Website (public feed, guest comments).
*   **Writer:** Browser Extension (curation tool for owners).
*   **Backend:** Node.js (multi-tenant storage).

---

## NEXT: Phase 1 - The Shared Schema (Completed)

**Goal:** Define the canonical data model in Rust and auto-generate the Elm schema.

**Plan:**
1.  **Refactor `shared_types.rs`:**
    *   Remove `Student`/`Class` types.
    *   Define `MicroblogItem` (id, title, link, image, extract, owner_comment, timestamp).
    *   Define `Guest` (id, name, auth_provider).
    *   Define `ItemComment` (id, item_id, guest_id, text, timestamp).
    *   Define API Structs:
        *   `GetFeedReq` (tenant_id/host).
        *   `SubmitItemReq` (tenant_id, item_data).
        *   `SubmitCommentReq` (tenant_id, comment_data).
2.  **Validation:** Implement basic validation logic in `lib.rs` (e.g., valid URL check).
3.  **Generate:** Run the `schema_generator` to update `Api/Schema.elm`.

---

## Phase 2: The Backend (Multi-Tenant) (Completed)

**Goal:** Update the Node.js server to support the new schema and multi-tenancy.

**Plan:**
1.  Update `server.js` to read the `Host` header (or a custom `X-Tenant-ID` header for local testing) to identify the tenant.
2.  Implement in-memory storage partitioned by tenant.
3.  Handle `SubmitItem`, `GetFeed`, and `SubmitComment`.

---

## Phase 3: The Reader (Elm Website) (Completed)

**Goal:** Convert the current Elm POC into the public Microblog feed.

**Plan:**
1.  Refactor `Main.elm` to render a list of `MicroblogItem` cards.
2.  Add a "Login" / "Comment" flow for Guests.

---

## Phase 4: The Writer (Browser Extension)

**Goal:** Create a browser extension to push content.

**Plan:**
1.  Scaffold a new directory `extension`.
2.  Package the WASM core for the extension background script.
3.  Create a popup UI to scrape the current tab and submit to the backend.

---
---

# DONE (POC Phase)

## Completed Achievements
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
