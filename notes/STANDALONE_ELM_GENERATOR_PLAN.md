# BuildAmp Explicit Configuration Plan

## Philosophy
**"Strict Instructions > Magic Defaults"**
We reject "Zero-Config" magic. Every user, whether using the standard Hamlet directory structure or a custom setup, should explicitly tell BuildAmp where to find models and where to put output.

## The Interface

### CLI Command
Review the `package.json` scripts in existing templates. We will standardize on:

```bash
# Standard Hamlet App
npx buildamp gen:elm \
  --src ./app/horatio/models \
  --dest ./app/horatio/web/src/.hamlet-gen \
  --features db,api,kv

# Standalone Library Usage
npx buildamp gen:elm \
  --src ./src/lib.rs \
  --dest ./elm/src/Generated \
  --features types-only
```

### Config File (`buildamp.json`)
For complex setups, we support a config file, but we **prefer** explicit CLI flags in `package.json` scripts so the configuration is visible right next to the command.

## Implementation Details

1.  **Refactor Generators:**
    *   `generators/elm.js` must accept `sourcePath` and `outputPath` as required arguments.
    *   Remove all logic that tries to "guess" paths based on `server.config.application`.

2.  **Update Templates:**
    *   Modify `packages/create-buildamp/templates/default/package.json`.
    *   Add explicit flags to the `gen` scripts.

## Outcome
*   **Naive User:** Sees explicit paths in their `package.json`. If they move a folder, they know exactly what to update.
*   **Power User:** Can use BuildAmp in *any* project folder structure by just adjusting the flags.
