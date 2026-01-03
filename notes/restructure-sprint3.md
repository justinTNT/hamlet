# Sprint 3: Core Command (CLI)

## Objective
Establish the `hamlet` Command Line Interface (CLI) as the central orchestration tool. `hamlet` decides; tools like Vite just react.

## Scope
- Create `packages/hamlet-cli`.
- Extract orchestration logic from `dev-server.js` and `vite-plugin-buildamp`.
- Implement `hamlet gen` (explicit generation, integrates `hamlet-contracts`).
- Implement `hamlet watch` (informational watcher using `hamlet-contracts`).
- Implement `hamlet serve` (dev server wrapper).

## Day 1: The CLI Package

### New Shared Package: `hamlet-core`
- Create `packages/hamlet-core` for shared utilities
- Contains `discoverProjectPaths()` and path constants
- Used by: `hamlet-cli`, `hamlet-server`, `hamlet-contracts`
- Eliminates duplication and ensures consistency

### Architecture
- **Dependencies**: 
  - `commander` for argument parsing
  - `hamlet-contracts` for integrity checking
  - `hamlet-core` for path discovery
- **Entry point**: `packages/hamlet-cli/bin/hamlet.js`.

### Commands
1.  **`hamlet gen`**:
    *   Creates `.hamlet-gen/` directory if missing
    *   Runs all 9 phases + WASM build
    *   Updates generation scripts to write to `.hamlet-gen/` 
    *   Uses `hamlet-contracts.saveContract()` to persist hash
2.  **`hamlet gen:elm`**:
    *   Runs only phases 1-8 (skip WASM)
    *   Useful for quick iteration on templates
3.  **`hamlet gen:wasm`**:
    *   Runs only WASM build
    *   Useful for Rust-only changes
4.  **`hamlet watch`**:
    *   Watches `src/models/*.rs` (or `app/horatio/models`).
    *   On change, calls `hamlet-contracts.checkIntegrity()`.
    *   Logs "⚠️  Contract Dirty" warning.
    *   Does NOT auto-regenerate (respecting "Rust Once").
5.  **`hamlet serve`**:
    *   Checks if `.hamlet-gen/` exists and has valid contracts
    *   If missing/invalid: Beautiful error message directing to run `hamlet gen`
    *   Otherwise: Spawns dev server (wraps dev-server.js minus generation)

## Day 2: Orchestration Extraction
### Migration source: `dev-server.js`
*   Move `discoverProjectPaths`, `getGenerationPhaseForFile`, `regenerateCodeForFile` logic into `hamlet-cli`.
*   Ensure `hamlet-cli` can import the generator functions from `shared/generation`.

### Verification
*   Run `hamlet gen` -> Verify `contracts.json` updates.
*   Run `hamlet gen` -> Verify `.hamlet-gen/` populates.
*   Run `hamlet watch` -> Modify Rust -> Verify warning.

### Tests to Write
**`packages/hamlet-cli/tests/gen.test.js`**
- [ ] `hamlet gen` creates `.hamlet-gen/` directory if missing
- [ ] `hamlet gen` updates `contracts.json` hash
- [ ] `hamlet gen` produces expected JS/Elm outputs (smoke test)
- [ ] `hamlet gen` respects `--dry-run` (if we add it?)

**`packages/hamlet-cli/tests/gen-variants.test.js`**
- [ ] `hamlet gen:elm` runs only phases 1-8 (no WASM)
- [ ] `hamlet gen:wasm` runs only WASM build
- [ ] `hamlet gen:wasm` does NOT update contracts.json

**`packages/hamlet-cli/tests/watch.test.js`**
- [ ] `hamlet watch` detects changes in `.rs` files
- [ ] `hamlet watch` logs specific warning message on dirty
- [ ] `hamlet watch` does NOT trigger regeneration

**`packages/hamlet-cli/tests/serve.test.js`**
- [ ] `hamlet serve` shows beautiful error when `.hamlet-gen/` missing
- [ ] `hamlet serve` shows error when contracts are dirty
- [ ] `hamlet serve` starts dev server when contracts are valid

**`packages/hamlet-core/tests/paths.test.js`**
- [ ] `discoverProjectPaths()` finds correct directories
- [ ] Path constants are consistent across packages

## Success Criteria
- [ ] `hamlet` command exists.
- [ ] `hamlet gen` successfully runs the full generation suite.
- [ ] `contract` integrity is enforced/updated by the CLI.
- [ ] `dev-server.js` is reduced to just serving content (no watching/generating).
- [ ] All tests passing
