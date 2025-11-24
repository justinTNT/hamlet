# Hamlet Framework Specification

**Hamlet** is a full-stack application framework that enforces a "Single Source of Truth" architecture using Rust, WebAssembly, and Elm.

## Core Philosophy
*   **Isomorphic Core:** Business logic lives in Rust and runs everywhere (Client & Server) via WASM.
*   **Type Safety:** Frontend types (Elm) are generated from Backend types (Rust).
*   **Build Integration:** Seamless integration via Vite.

## The Hamlet Architecture

### 1. The `vite-plugin-hamlet`
Instead of a standalone CLI, the core developer experience is driven by a Vite plugin. This plugin transforms `npm run dev` into a full-stack development environment.

**Responsibilities:**
*   **Watch Rust Sources:** Monitors `core/**/*.rs` for changes.
*   **Auto-Generate:** Triggers the schema generator to update Elm types on save.
*   **Auto-Compile:** Triggers `wasm-pack` to rebuild the binary on save.
*   **HMR:** Injects the updated WASM and Elm modules into the browser without a refresh.
*   **Bootstrapping:** Automatically handles WASM initialization boilerplate, so the user just imports the module.

### 2. Project Structure (Opinionated)
Hamlet enforces a strict monorepo structure to make the plugin work zero-config:
*   `/core` (Rust): The source of truth.
*   `/frontend` (Elm): The viewer.
*   `/backend` (Node.js/Rust): The server.

### 3. The CLI (`hamlet`)
The CLI is reduced to a simple scaffolding tool:
*   `hamlet new <name>`: Generates the directory structure and pre-configured `vite.config.js`.

## Architectural constraints for Applications
To remain compatible with Hamlet, an application (like Horatio) must:
1.  Define all shared data structures in a specific Rust module (e.g., `core/src/schema.rs`).
2.  Implement specific traits (`Elm`, `ElmEncode`, `ElmDecode`) on these structures.
3.  Expose specific WASM entry points (`decode_request`, `encode_response`) that the framework glue expects.

## Future Roadmap for Hamlet
1.  **Abstracting the Glue:** Move the boilerplate `decode_request` / `encode_response` WASM functions into a `hamlet` crate, so user code only has to implement a `Handler` trait.
2.  **Backend Independence:** Make the backend interchangeable (Node.js, Deno, Bun, or Native Rust).
3.  **Extension Support:** First-class support for generating Browser Extension manifests and build scripts via the Vite plugin.
