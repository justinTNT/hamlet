# Phase 3: CLI Cleanup & Migration Generation

## Status: IN PROGRESS (Sprints 1-3 Complete)

## Goal
Clean up the BuildAmp CLI to use consistent naming and complete the migration generation story.

**Primary commands (most common):**
```bash
buildamp gen [interface]      # all targets for one interface
buildamp gen                  # everything
buildamp gen:wasm [interface] # WASM only
buildamp status               # what needs rebuilding
```

**Secondary commands (target-specific, rare):**
```bash
buildamp gen:js [interface]   # JavaScript glue only
buildamp gen:elm [interface]  # Elm types only
buildamp gen:wasm [interface] # WASM only
```

**Note**: `gen:sql`, `gen:admin`, `gen:handlers` don't need standalone commands.
They're always included when running `gen db` or `gen api` respectively.
If the model changed, you need all the generated artifacts to stay in sync.

---

## Sprint 1: CLI Naming Cleanup

**Goal**: Rename confusing target commands, consolidate to `gen:js`

### Current State (confusing)
```bash
gen:db       # looks like interface, actually generates JS queries
gen:api      # looks like interface, actually generates JS routes
gen:storage  # looks like interface, actually generates JS storage
gen:kv       # looks like interface, actually generates JS kv
gen:sse      # looks like interface, actually generates JS sse
```

### Target State (clear)
```bash
gen:js db       # JS queries for db
gen:js api      # JS routes for api
gen:js storage  # JS storage helpers
gen:js kv       # JS kv functions
gen:js sse      # JS sse handlers
```

### Tasks

1. **Update cli.js**
   - Remove individual `gen:db`, `gen:api`, etc. commands
   - Add single `gen:js [interface]` command
   - Keep `gen:wasm`, `gen:elm`, `gen:admin`, `gen:handlers`

2. **Update orchestrator.js**
   - Add `js` to targetGenerators that dispatches to correct generator based on interface
   - Update modelDirGenerators:
     ```javascript
     const modelDirGenerators = {
         db: ['js', 'elm', 'admin'],      // js → db.js (queries)
         api: ['js', 'elm', 'handlers'],  // js → api.js (routes)
         storage: ['js', 'elm'],          // js → storage.js
         kv: ['js', 'elm'],               // js → kv.js
         sse: ['js', 'elm'],              // js → sse.js
         events: ['elm'],
         config: ['elm'],
     };
     ```
   - The `js` target needs to know which generator to call based on interface context

3. **Update tests**
   - Update cli.test.js for new command structure
   - Update orchestrator.test.js for new target names

4. **Backwards compatibility (optional)**
   - Keep old commands as hidden aliases with deprecation warning
   - Or just remove them (breaking change but cleaner)

### Files to Modify
- `packages/buildamp/lib/cli.js`
- `packages/buildamp/lib/orchestrator.js`
- `packages/buildamp/tests/cli.test.js`
- `packages/buildamp/tests/orchestrator.test.js`

### Verification
```bash
buildamp gen:js db      # generates database-queries.js
buildamp gen:js api     # generates api-routes.js
buildamp gen db         # runs js + elm + admin
```

---

## Sprint 2: SQL Generator (JavaScript Approach) ✅ COMPLETE

**Goal**: Generate SQL schema from Rust models using JavaScript parsing (same pattern as other generators)

### Approach Change
Instead of extending the Rust proc macro (complex), we created a JavaScript generator
that parses Rust model files directly. This follows the existing pattern of db.js,
elm.js, and other generators.

### What Was Done

1. **Created `lib/generators/sql.js`**
   - Parses Rust db models using regex (like db.js)
   - Maps Rust types to SQL types:
     - `DatabaseId<T>` → `TEXT PRIMARY KEY DEFAULT gen_random_uuid()`
     - `Timestamp` → `BIGINT NOT NULL DEFAULT extract(epoch from now())`
     - `Option<T>` → nullable (no NOT NULL)
     - `String` → `TEXT NOT NULL`
     - `i32` → `INTEGER NOT NULL DEFAULT 0`
     - `Vec<T>` → `JSONB NOT NULL DEFAULT '[]'::jsonb`
   - Adds standard columns: host, created_at, updated_at, deleted_at
   - Generates tenant isolation index

2. **Wired into orchestrator**
   - Added `sql` to targetGenerators
   - Added `sql` to db model-dir: `db: ['js', 'elm', 'admin', 'sql']`

3. **Added deprecation note to migration_gen.rs**
   - The hardcoded WASM version is deprecated
   - Points to JavaScript generator as source of truth

### Files Modified
- Created: `packages/buildamp/lib/generators/sql.js`
- Modified: `packages/buildamp/lib/generators/index.js`
- Modified: `packages/buildamp/lib/orchestrator.js`
- Modified: `src/framework/migration_gen.rs` (deprecation note)
- Created: `packages/buildamp/tests/sql.test.js`

### Verification
```bash
buildamp gen db        # includes sql generator
buildamp gen:sql       # SQL only (if needed)
# Outputs: app/{project}/server/migrations/schema.sql
```

---

## Sprint 3: Migra Integration (Optional)

**Status**: IMPLEMENTED (but optional - requires migra + DATABASE_URL)

The SQL generator (`sql.js`) already includes migra integration with graceful degradation.
If migra is installed and DATABASE_URL is set, it will generate incremental migrations.

### How It Works

1. **schema.sql** is always generated
2. If migra is available AND DATABASE_URL is set:
   - Creates temp database with new schema
   - Runs migra to diff current → new
   - Outputs `migrations/NNN_auto.sql` with ALTER statements
   - Cleans up temp database

### Usage
```bash
# Schema only (always works)
buildamp gen db

# With migration diffing (requires migra + DATABASE_URL)
DATABASE_URL=postgresql:///mydb buildamp gen db
```

### Prerequisites
- `pip install migra` for incremental migrations
- PostgreSQL CLI tools (`createdb`, `dropdb`, `psql`)

---

## Sprint 4: Documentation Update

**Goal**: Update docs to reflect current reality

### Tasks

1. **Update js-to-wasm-migration.md**
   - Fix CLI examples to use new command structure
   - Update Contract System section (now mtime-based, not hash-based)
   - Mark Phase 1 & 2 complete
   - Add Phase 3 status

2. **Update phase2-wasm-sprints.md**
   - Note the mtime simplification
   - Mark fully complete

3. **Update README.md**
   - Fix CLI examples
   - Add gen:sql documentation

4. **Update CLAUDE.md**
   - Update CLI commands section

### Files to Modify
- `/js-to-wasm-migration.md`
- `/notes/phase2-wasm-sprints.md`
- `/README.md`
- `/CLAUDE.md`

---

## Future (Not Phase 3)

### Hamlet CLI DX Layer
The beautiful error messages, file protection, and progress visualization mentioned in the migration doc could be a Phase 4:

- `hamlet gen` wrapper around `buildamp gen`
- Detect manual edits in generated files
- Smart file backups
- Beautiful error formatting
- Progress visualization

This is lower priority than getting the core BuildAmp CLI clean and complete.

---

## Summary

| Sprint | Goal | Status |
|--------|------|--------|
| 1 | CLI naming cleanup (gen:js) | ✅ COMPLETE |
| 2 | SQL generator (JavaScript approach) | ✅ COMPLETE |
| 3 | Migra integration | ✅ IMPLEMENTED (optional) |
| 4 | Documentation update | PENDING |

**Approach Change**: Sprint 2 originally planned proc macro extension, but JavaScript parsing
approach was chosen instead - simpler and follows existing generator patterns.

### Remaining Work
- Sprint 4: Update documentation to reflect new CLI structure and SQL generation
