# Sprint 3 Complete - Hamlet CLI

## Summary

Sprint 3 successfully created the hamlet CLI package that serves as the central orchestration point for the Hamlet build system. This implements the key architectural change of making regeneration explicit through `hamlet gen` commands.

## Completed Items

### 1. hamlet-core Package ✓
- Created `/packages/hamlet-core/` with path discovery utilities
- Implements Two-Zone Architecture awareness (Glue vs Skeletons)
- Provides shared constants and path helpers
- Full test coverage with jest

### 2. hamlet-cli Package ✓
- Created `/packages/hamlet-cli/` with commander-based CLI
- Implements all planned commands:
  - `hamlet gen` - Full generation with contract checking
  - `hamlet gen:elm` - Elm-only generation
  - `hamlet gen:wasm` - WASM-only generation  
  - `hamlet watch` - Watch mode with smart regeneration
  - `hamlet serve` - Dev server with hot reload
- Integrates with hamlet-contracts for integrity checking
- Beautiful error messages with chalk

### 3. Generation Script Updates (Partial) ✓
- Created `shared/generation/paths.js` for centralized path handling
- Created `shared/generation/parse_rust_models.js` for model parsing
- Created `database_queries_v2.js` as example of .hamlet-gen output
- Created `generate-all-v2.js` master script using new paths
- CLI intelligently detects v2 vs v1 scripts

## Key Architecture Decisions

1. **Graceful Migration**: CLI checks for v2 scripts first, falls back to v1
2. **Path Centralization**: All path logic in hamlet-core, reused everywhere
3. **Contract Integration**: hamlet gen checks contracts before regenerating
4. **Two-Zone Compliance**: Glue goes to .hamlet-gen/, Skeletons stay in src/

## Next Steps

To fully complete the migration to .hamlet-gen:
1. Update remaining generation scripts (api_routes, browser_storage, etc.) to v2
2. Update vite-plugin-buildamp to watch .hamlet-gen/contracts.json
3. Test full workflow with a real project
4. Update documentation

## Usage

```bash
# Install hamlet CLI globally (from packages/hamlet-cli)
npm link

# In a project directory
hamlet gen          # Generate all code
hamlet gen --force  # Force regeneration
hamlet gen:elm      # Elm only
hamlet gen:wasm     # WASM only
hamlet watch        # Watch mode
hamlet serve        # Dev server
```

## Testing

The CLI includes comprehensive tests in `/packages/hamlet-cli/tests/`:
- `cli.test.js` - Command parsing and help
- `gen.test.js` - Generation logic with mocks
- Run with: `npm test` (requires jest with ESM support)