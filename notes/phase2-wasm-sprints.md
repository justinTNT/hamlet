# Phase 2: Add WASM Generation to BuildAmp

## Status: COMPLETE ✅

Completed: 2026-01-16

| Sprint | Tests | Status |
|--------|-------|--------|
| 1: Basic WASM Build | 20 tests | ✅ Complete |
| 2: Contract Integration | 19 tests | ✅ Complete |
| 3: Status Command | 16 tests | ✅ Complete |
| 4: Documentation | - | ✅ Complete |

**Total tests added**: 55 tests (now 111 total in BuildAmp)

### Key Files Created/Modified
- `packages/buildamp/lib/generators/wasm.js` - WASM generator with wasm-pack
- `packages/buildamp/core/contracts.js` - Added `isWasmDirty`, `getWasmStatus`, `updateWasmContract`
- `packages/buildamp/lib/orchestrator.js` - Added `getStatus()`, updated `status()`
- `packages/buildamp/tests/wasm.test.js` - 20 tests
- `packages/buildamp/tests/wasm-contracts.test.js` - 19 tests
- `packages/buildamp/tests/status.test.js` - 16 tests

---

## Goal
Wire up existing WASM infrastructure to BuildAmp CLI, enabling:
```bash
buildamp gen:wasm          # Compile all models to WASM
buildamp gen:wasm api      # Compile only API models (future)
buildamp status            # Show WASM build status
```

## Current State

WASM infrastructure already exists:

```
/                           # Root Cargo.toml = proto-rust crate
├── src/lib.rs              # WASM exports via wasm-bindgen
├── pkg-web/                # Browser WASM output (453KB)
│   ├── proto_rust.js
│   ├── proto_rust.d.ts
│   └── proto_rust_bg.wasm
├── pkg-node/               # Node.js WASM output (267KB)
│   ├── proto_rust.js
│   └── proto_rust_bg.wasm
└── packages/buildamp/
    └── lib/orchestrator.js # Has stub: generateWasm()
```

### Existing WASM API (pkg-web/proto_rust.d.ts)
- `dispatcher(endpoint, wire, context)` - Route to handler
- `validate_manifest()` - Verify model configuration
- `encode_request(endpoint, json)` - Encode request for wire
- `decode_response(endpoint, wire)` - Decode wire to JSON
- `generate_migrations()` - SQL migration generation
- `get_endpoint_manifest()` - Endpoint metadata
- `get_context_manifest()` - Context metadata
- `get_openapi_spec()` - OpenAPI spec generation

### BuildAmp CLI Status
- `gen:wasm` command exists (cli.js:36)
- `generateWasm()` function is a stub (orchestrator.js:49-53)
- Contract system is complete (core/contracts.js)

---

## Sprint 1: Basic WASM Build Integration

**Goal**: Wire wasm-pack to `buildamp gen:wasm`

### Tasks

1. **Create WASM generator** (`lib/generators/wasm.js`)
   ```javascript
   export async function generateWasm(config = {}) {
       const { target = 'web', outDir } = config;

       // Detect project root (has Cargo.toml)
       const projectRoot = findProjectRoot();

       // Run wasm-pack build
       await execAsync(`wasm-pack build --target ${target} --out-dir ${outDir}`);

       return { generated: true, target, outDir };
   }
   ```

2. **Update orchestrator to use new generator**
   - Import from `./generators/wasm.js`
   - Remove inline stub function

3. **Add wasm-pack detection**
   - Check if wasm-pack is installed
   - Provide helpful error message if missing

4. **Support both web and node targets**
   - `buildamp gen:wasm` → defaults to web
   - `buildamp gen:wasm --target node` → node target
   - Output to `pkg-web/` or `pkg-node/`

### Files to Modify
- Create: `packages/buildamp/lib/generators/wasm.js`
- Modify: `packages/buildamp/lib/orchestrator.js` (remove stub, import generator)
- Modify: `packages/buildamp/lib/cli.js` (add --target option)

### Verification
```bash
buildamp gen:wasm
# Should run wasm-pack build and output to pkg-web/

ls pkg-web/
# proto_rust.js, proto_rust_bg.wasm, etc.
```

---

## Sprint 2: Contract Integration for WASM

**Goal**: Track WASM build status in contract system

### Tasks

1. **Extend contracts.json schema**
   ```json
   {
     "modelHash": "abc123...",
     "files": { "api/comment.rs": "def456..." },
     "generatedAt": "2026-01-16T...",
     "wasm": {
       "web": {
         "builtAt": "2026-01-16T...",
         "sourceHash": "abc123..."
       },
       "node": {
         "builtAt": "2026-01-16T...",
         "sourceHash": "abc123..."
       }
     }
   }
   ```

2. **Update WASM generator to update contracts**
   - After successful build, record hash and timestamp
   - Enable incremental builds (skip if clean)

3. **Add WASM dirty checking to contracts.js**
   ```javascript
   export async function isWasmDirty(target, contractsPath) {
       const contracts = loadContracts(contractsPath);
       const wasmInfo = contracts.wasm?.[target];

       if (!wasmInfo) return true; // Never built

       return wasmInfo.sourceHash !== contracts.modelHash;
   }
   ```

4. **Skip rebuild if WASM is current**
   ```bash
   buildamp gen:wasm
   # ✓ WASM is up to date (skipping build)

   buildamp gen:wasm --force
   # Forces rebuild even if clean
   ```

### Files to Modify
- Modify: `packages/buildamp/core/contracts.js` (add WASM tracking)
- Modify: `packages/buildamp/lib/generators/wasm.js` (integrate contracts)
- Modify: `packages/buildamp/lib/cli.js` (add --force flag)

### Verification
```bash
# First build
buildamp gen:wasm
# 🦀 Building WASM (web)...
# ✓ WASM built successfully

# No changes - should skip
buildamp gen:wasm
# ✓ WASM is up to date (skipping build)

# Force rebuild
buildamp gen:wasm --force
# 🦀 Building WASM (web)...
```

---

## Sprint 3: Status Command Implementation

**Goal**: Implement `buildamp status` to show generation state

### Tasks

1. **Implement status() in orchestrator.js**
   ```javascript
   export async function status() {
       const paths = discoverProjectPaths();
       const contractsPath = path.join(paths.genDir, 'contracts.json');

       // Get contract status
       const contractStatus = await getContractStatus(paths.modelsDir, contractsPath);

       // Get WASM status
       const wasmWebStatus = await getWasmStatus('web', contractsPath);
       const wasmNodeStatus = await getWasmStatus('node', contractsPath);

       // Display status
       console.log('📊 BuildAmp Status');
       console.log('');
       console.log('Models:');
       displayContractStatus(contractStatus);
       console.log('');
       console.log('WASM:');
       displayWasmStatus('web', wasmWebStatus);
       displayWasmStatus('node', wasmNodeStatus);
   }
   ```

2. **Create status display helpers**
   - Show when last built
   - Show if outdated (with changed files)
   - Show suggested commands

3. **Example output**
   ```
   📊 BuildAmp Status
      App: horatio

   Models:
      ✓ Clean (last generated: 2 hours ago)

   WASM:
      web:  ✓ Current (built: 30 min ago)
      node: ✗ Outdated - models changed
            → Run 'buildamp gen:wasm --target node'

   Generators:
      ✓ db      - up to date
      ✗ api     - 2 files changed
            Changed: api/comment.rs, api/user.rs
            → Run 'buildamp gen api'
      ✓ elm     - up to date
   ```

### Files to Modify
- Modify: `packages/buildamp/lib/orchestrator.js` (implement status)
- Modify: `packages/buildamp/core/contracts.js` (add getWasmStatus)

### Verification
```bash
buildamp status
# Shows detailed status of all generators and WASM
```

---

## Sprint 4: Tests and Documentation

**Goal**: Comprehensive tests and documentation

### Tasks

1. **Add WASM generator tests**
   - Test wasm-pack detection
   - Test build execution (mocked)
   - Test target selection

2. **Add contract WASM tests**
   - Test WASM dirty checking
   - Test contract update after build
   - Test incremental skip

3. **Add status command tests**
   - Test clean state display
   - Test dirty state display
   - Test WASM status display

4. **Update documentation**
   - Update README.md with WASM commands
   - Update js-to-wasm-migration.md to mark Phase 2 complete
   - Add examples to CLAUDE.md

### Files to Create/Modify
- Create: `packages/buildamp/tests/wasm.test.js`
- Modify: `packages/buildamp/tests/orchestrator.test.js` (add status tests)
- Modify: `README.md`
- Modify: `CLAUDE.md`

### Verification
```bash
./run_all_tests.sh
# All tests pass including new WASM tests
```

---

## Summary

| Sprint | Goal | LOC Estimate |
|--------|------|--------------|
| 1 | Basic wasm-pack integration | ~100 lines |
| 2 | Contract system integration | ~80 lines |
| 3 | Status command | ~60 lines |
| 4 | Tests and docs | ~150 lines |

**Total**: ~390 lines of new code

### Dependencies
- `wasm-pack` must be installed (`cargo install wasm-pack`)
- Rust toolchain with `wasm32-unknown-unknown` target

### Not in Scope (Future)
- Per-model-dir WASM builds (e.g., `buildamp gen:wasm api`)
- WASM optimization flags (size vs speed)
- WASM feature flags
- Browser vs Node auto-detection
