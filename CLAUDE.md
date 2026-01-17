# Claude Project Memory

## Critical Rules

### agent executes, user runs
the agent's job is to plan and execute coding: not to start and kill servers.
ask the user if you want a server killed or started.

### Generated Files - NEVER MODIFY
- **NEVER** modify any generated files
- Generated files are marked with comments like "Generated from..." or "Auto-generated"
- If something doesn't work with generated files, fix the generator or build process, not the output
- Common generated file patterns:
  - `.hamlet-gen/` directories (clobberable glue code)
  - `Generated/` directories
  - Files with "generated" in path or comments
  - `Storage.elm`, `Database.elm`, API files, etc.

### Code Generation - NEVER HARDCODE BUSINESS MODELS
- **NEVER** put business domain models directly in codegen source files
- Always parse from actual Rust files using existing parsing functions (parseRustDbModels, parseRustKvModels, etc.)
- Follow "Rust once" principle - business logic defined only in Rust, generated everywhere else
- Test mocks can use realistic examples, but generation code must be dynamic

### Server Management
- I do NOT start, stop, or kill servers
- User handles all server management due to node version issues
- I only make code changes and provide guidance

## BuildAmp System Architecture

### Package Structure
- **BuildAmp CLI**: `packages/buildamp/` - standalone code generation tool
  - `bin/buildamp.js` - CLI entry point
  - `lib/cli.js` - Command parsing (commander)
  - `lib/orchestrator.js` - Generation coordination
  - `lib/generators/` - All 8 generators (db, api, storage, kv, sse, elm, handlers, admin)
  - `core/` - Path discovery, contracts, Rust parsing utilities
- **Hamlet Server**: `packages/hamlet-server/` - Runtime framework
- **Vite Plugin**: `packages/vite-plugin-buildamp/` - Dev server integration

### CLI Commands
```bash
buildamp gen              # Generate all code from Rust models
buildamp gen api          # Generate for API models only
buildamp gen db           # Generate for DB models only
buildamp status           # Check generation status vs source models
```

### Contract System
- Tracks model hashes in `contracts.json` for incremental builds
- `buildamp status` shows what needs rebuilding with suggested commands

### Vite Monorepo Structure
- **Build Tool**: Vite handles bundling and workspace dependency resolution
- **Framework Packages**: Single source of truth in `/packages/hamlet-server/`
- **Template Projects**: Reference framework via workspace dependencies, not duplicated files
- **Code Generation**: Generators in `packages/buildamp/lib/generators/`
  - Legacy re-exports in `shared/generation/` for backward compatibility

### TEA Handler Pool System
- Implemented fresh instance pool to fix state corruption bug
- Pool uses utilization-based replacement instead of persistent handlers
- Located in `/packages/hamlet-server/middleware/elm-service.js`
- Replaces persistent HandlerInstance objects with TEAHandlerPool

### Directory Structure
- Web app: `/app/horatio/web/`
- Generated glue: `/app/horatio/web/src/.hamlet-gen/` (Elm) and `/app/horatio/server/.hamlet-gen/` (JS)
- Shared generated: `/app/horatio/shared/Generated/` (Config.elm shared between web/server)
- Server handlers: `/app/horatio/server/src/Api/Handlers/`
- Database migrations: `/app/horatio/server/migrations/`
- Rust models: `/app/horatio/models/` (db, api, storage, kv, sse, events, config)

### Comment Submission System
- Complete implementation with auto-generated UUIDs
- Uses TEA handler pool for isolation
- Database operations include automatic host injection
- SubmitCommentHandlerTEA.elm handles the business logic

## Recent Fixes
- Fixed Storage.elm to properly import from Generated.Storage.GuestSession
- Added vite-plugin-elm for proper Elm compilation in dev server
- Implemented auto-generated UUID migration for seamless ID generation

## Next Milestone: Auto-Generated Admin UI
Plan documented in `notes/admin_ui_plan.md` to extend "Rust once, JSON never" to "Rust once, UI never":
- Auto-generate admin interface from Rust database models
- Read-only table views with columns = struct fields
- CRUD forms with type-appropriate inputs (text, number, checkbox)
- Secure admin API with HAMLET_ADMIN_TOKEN protection
- Tenant-isolated admin interface
- Located at `app/horatio/admin/` with generated `Resources.elm`

## Test Management
- **Centralized test runner**: `./run_all_tests.sh` handles nvm setup and runs all test suites
- **Test suites**: 9 test suites including BuildAmp package tests (111 tests)
- **BuildAmp tests**: `packages/buildamp/tests/` - CLI, orchestrator, contracts, generators, status
- **Fixing plan**: `TEST_FIXING_PLAN.md` provides systematic approach to test failures
- **Core status**: 166 Rust tests always passing; most failures are environment/config issues
