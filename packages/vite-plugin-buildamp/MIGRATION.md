# Vite Plugin BuildAmp Migration Guide

## Sprint 1 Changes

The Vite plugin has been refactored to become a purely reactive adapter, following the "Vite reacts; Hamlet decides" principle.

### What Changed

1. **Removed all orchestration logic** (305 → 56 LOC)
   - No more Rust file watching
   - No more WASM build orchestration
   - No more cargo/wasm-pack execution

2. **Simplified to reactive-only behavior**
   - Watches `.hamlet-gen/contracts.json` for changes
   - Triggers HMR when contracts update
   - Sets up import aliases for generated code

3. **Extracted orchestration to separate file**
   - See `orchestration-extracted.js` for removed logic
   - This will move to `hamlet gen` command in Sprint 2

### New Usage

```javascript
// vite.config.js
import buildampPlugin from 'vite-plugin-buildamp';

export default {
  plugins: [
    buildampPlugin({
      projectRoot: process.cwd(), // Optional, defaults to cwd
      elm: {}, // Pass-through options for elm plugin
      wasm: {} // Pass-through options for wasm plugin
    })
  ]
}
```

### HMR Behavior

The plugin now:
- Only watches `.hamlet-gen/contracts.json`
- Triggers full page reload when contracts change
- Does NOT watch Rust files or owned Elm code

### Import Aliases

The plugin automatically configures:
- `@hamlet-gen` → `.hamlet-gen/` directory
- `@generated` → `.hamlet-gen/` directory (alias)

### Migration Steps

1. Update your vite config to use the new simplified options
2. Use `hamlet gen` (coming in Sprint 2) to regenerate code
3. The plugin will detect contract changes and reload automatically