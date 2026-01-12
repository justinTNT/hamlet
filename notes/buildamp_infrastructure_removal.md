# BuildAmp Infrastructure Functions Removal

## Context
The `buildamp_infrastructure` module references were causing test failures after the recent "refine roles of wasm and buildamp" commit. Investigation showed these functions were:
1. Never actually called anywhere in the codebase
2. Only existed as WASM exports
3. Intended for future infrastructure manifest features

## Changes Made
1. **Removed from src/lib.rs:**
   - `requires_events_infrastructure()`
   - `get_events_infrastructure_sql()`
   - `get_infrastructure_manifest()`

2. **Removed from template/src/lib.rs:**
   - Same three functions
   - Removed `pub mod buildamp_infrastructure;` declaration

3. **Cleaned up:**
   - Did not add any stub modules
   - Left comment: "Infrastructure functions removed - not used in the codebase"

## Result
- Core Rust tests should now compile and run without the `buildamp_infrastructure` module error
- No functionality lost since these functions were never actually used
- Cleaner codebase without unused future intentions