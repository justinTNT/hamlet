# Vite Plugin BuildAmp Migration Guide

## Current State (2026-01)

The Vite plugin is now a purely reactive adapter, following the "Vite reacts; Hamlet decides" principle. Code generation is handled by the standalone `buildamp` CLI.

### Architecture

- **BuildAmp CLI** (`packages/buildamp/`): Handles all code generation
- **Vite Plugin** (`packages/vite-plugin-buildamp/`): Reactive HMR integration only

### What the Plugin Does

1. **Watches `.hamlet-gen/contracts.json`** for changes
2. **Triggers HMR** when contracts update
3. **Sets up import aliases** for generated code

### What the Plugin Does NOT Do

- No Rust file watching (use `buildamp gen` or file watchers)
- No WASM build orchestration
- No cargo/wasm-pack execution

### Usage

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

### Development Workflow

1. **Make changes to Rust models** in `app/{project}/models/`
2. **Run `buildamp gen`** to regenerate code
3. **Plugin detects contract changes** and triggers HMR
4. **Browser reloads** with updated code

### Import Aliases

The plugin automatically configures:
- `@hamlet-gen` → `.hamlet-gen/` directory
- `@generated` → `.hamlet-gen/` directory (alias)

---

## Historical Notes

### Sprint 1 Changes (Original Migration)

The plugin was refactored from 305 LOC to 56 LOC:
- Removed all orchestration logic
- Simplified to reactive-only behavior
- Extracted orchestration to `buildamp` CLI

This separation enables:
- Future support for other build tools (Bun, webpack)
- Consistent behavior across environments
- Cleaner separation of concerns
