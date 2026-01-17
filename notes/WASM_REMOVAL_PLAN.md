# WASM Removal Plan

## Context
Per SERVER_SIDE_VALIDATION_PLAN.md, WASM is cancelled. Validation moves to Elm decoders (generated from Rust).

## Files to DELETE

### BuildAmp WASM Generator & Tests
- `packages/buildamp/lib/generators/wasm.js`
- `packages/buildamp/tests/wasm.test.js`
- `packages/buildamp/tests/wasm-e2e.test.js`
- `packages/buildamp/tests/wasm-contracts.test.js`
- `packages/buildamp/tests/wasm-api-codec.test.js` (if exists)

### WASM Output Directories
- `pkg-web/` (or add to .gitignore)
- `pkg-node/` (or add to .gitignore)

## Files to REFACTOR

### 1. `packages/hamlet-server/middleware/api-routes.js`
**Add:** `registerApiRoutes(server)` call (import from `../generated/api-routes.js`)

### 2. `packages/hamlet-server/middleware/buildamp-wasm.js`
**Delete entirely** (functionality moved to api-routes.js)

### 3. `packages/hamlet-server/core/middleware-loader.js`
**Remove:** `hasWASM` feature detection and `buildamp-wasm` middleware loading
**Note:** `api-routes` middleware already loaded, no new loading needed

### 4. `packages/buildamp/lib/cli.js`
**Remove:** `gen:wasm` command and `--target` option

### 5. `packages/buildamp/lib/orchestrator.js`
**Remove:** WASM-related orchestration logic

### 6. `packages/buildamp/lib/generators/index.js`
**Remove:** WASM generator export

### 7. `packages/buildamp/lib/index.js`
**Remove:** WASM-related exports

### 8. `packages/vite-plugin-buildamp/index.js`
**Remove:** WASM path config, WASM-related HMR

### 9. `app/horatio/web/src/index.js`
**Remove:** WasmService import and usage, WASM error page
**Keep:** Elm app initialization, RPC handler (but remove WASM encoding calls)

### 10. `app/horatio/web/vite.config.js`
**Remove:** serve-wasm plugin, pkgWebDir references

## Files to UPDATE (minor)

### Tests with WASM mentions
- `packages/buildamp/tests/cli.test.js` - remove gen:wasm tests
- `packages/buildamp/tests/orchestrator.test.js` - remove WASM references
- `packages/buildamp/tests/status.test.js` - remove WASM status tests
- `packages/hamlet-server/tests/*.test.js` - remove WASM references

### Template files (create-buildamp)
- `packages/create-buildamp/template/web/vite.config.js`
- `packages/create-buildamp/template/web/src/index.js`
- `packages/create-buildamp/template/server/server.js`

## Execution Order

1. **Add registerApiRoutes to api-routes.js middleware**
2. **Update middleware-loader.js** (remove buildamp-wasm loading)
3. **Delete buildamp-wasm.js**
4. **Remove WASM from CLI** (cli.js, orchestrator.js)
5. **Remove WASM generator** (delete wasm.js, update index.js exports)
6. **Delete WASM tests**
7. **Update browser code** (index.js, vite.config.js)
8. **Update templates** (create-buildamp)
9. **Clean up remaining test files**

## Verification
- `./run_all_tests.sh` passes
- `buildamp gen` works without WASM
- App starts and serves API routes
- No "wasm" references in active code (grep check)
