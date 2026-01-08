# Sprint 4: Migration & Templates

## Objective
Migrate the existing ecosystem (Templates and Horatio) to the new **Two-Zone Architecture** established in Sprint 3. Ensure "Legacy" paths are fully deprecated and removed.

## Scope
1.  **Update `packages/create-buildamp`**: Ensure new projects start with the correct structure.
2.  **Migrate `Horatio`**: Move the main app to the new structure.
3.  **Cleanup**: Delete legacy generation code and directories.

## Phase 1: Update Templates (`packages/create-buildamp`)
The "New Project" experience must align with `hamlet-cli`.

### Tasks
- [x] **Update Template Structure**:
    - ✅ Renamed directories: `frontend` → `web`, `backend` → `server`
    - ✅ No `generated/` folders in template
    - ✅ Added `.hamlet-gen/` to `.gitignore`
    - ✅ Updated `package.json` to depend on `hamlet-cli`
    - ✅ Updated `package.json` scripts to use `hamlet gen` instead of `npm run generate`
- [x] **Update `elm.json`**:
    - ✅ Added `"../.hamlet-gen/elm"` to `source-directories`
- [x] **Updated Dependencies**:
    - ✅ Added `@libsql/client` to server/package.json

## Phase 2: Migrate Horatio (`app/horatio`)
The "Existing Project" must be ported.

### Tasks
- [x] **Dependency Updates**:
    - ✅ Added `hamlet-cli` to root package.json devDependencies
    - ✅ Added `@libsql/client` to `app/horatio/server/package.json`
- [x] **Script Updates**:
    - ✅ Replaced `"generate": "node ..."` with `"generate": "hamlet gen"`
    - ✅ Updated `"dev:server"` to use `hamlet serve`
- [x] **Path & Config Updates**:
    - ✅ Updated `web/elm.json`: Added `"src/.hamlet-gen/elm"` to source-directories
    - ✅ Updated `server/elm.json`: Added `".hamlet-gen/elm"` to source-directories
    - ✅ No direct imports found that need updating (yet)
- [x] **Delete Legacy**:
    - ✅ Deleted `app/generated/`
    - ✅ Deleted `app/horatio/server/generated/`

## Phase 3: Global Cleanup
Removing the scaffolding that got us here.

### Tasks
- [x] **Delete `packages/hamlet-server/generated`**:
    - ✅ Cleared all files from directory
    - ✅ No `@libsql/client` was in hamlet-server to remove
- [x] **Remove Legacy Scripts**:
    - ✅ Deleted `.buildamp/generate-all.js`
    - ✅ Deleted `.buildamp/generate-all-v2.js`
    - ✅ `dev-server.js` no longer referenced in package.json

## Verification Checks
1.  [ ] **Fresh Install**: `git clean -fdx && npm install && hamlet gen`. Does it work?
2.  [ ] **Dev Server**: `hamlet serve`. Does Horatio boot?
3.  [ ] **Edit & Watch**: Change a Rust model. Does `hamlet watch` warn? Does `hamlet gen` update `.hamlet-gen`? Does the app compile?

## Risks
*   **Import Paths**: Moving generated files from `packages/hamlet-server` to local `.hamlet-gen` will break imports in `server.js`. We need to use module aliasing (via `package.json` `imports` or just relative paths) to make this clean.
    *   *Decision*: Use relative paths for now (e.g., `import db from './.hamlet-gen/db.js'`) to be explicit.

### Feature: Multi-App Support (Local Dev)
The user needs to swap between `horatio` and local examples (`app/playground`) without committing changes.
*   **Mechanism**:
    1.  **Default**: `package.json` at root defines `hamlet: { defaultApp: "horatio" }`.
    2.  **Override**: `HAMLET_APP` environment variable (via `.env` which is gitignored).
    3.  **Core Update**: `discoverProjectPaths` in `hamlet-core` must check `process.env.HAMLET_APP` -> `config.defaultApp` -> Fallback.
    4.  **Action**: Refactor `hamlet-core` to remove hardcoded `horatio` string.
