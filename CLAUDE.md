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

### Vite Monorepo Structure
- **Build Tool**: Vite handles bundling and workspace dependency resolution
- **Framework Packages**: Single source of truth in `/packages/hamlet-server/`
- **Template Projects**: Reference framework via workspace dependencies, not duplicated files
- **Code Generation**: Shared generation scripts in `/shared/generation/` synced to templates

### TEA Handler Pool System
- Implemented fresh instance pool to fix state corruption bug
- Pool uses utilization-based replacement instead of persistent handlers
- Located in `/packages/hamlet-server/middleware/elm-service.js`
- Replaces persistent HandlerInstance objects with TEAHandlerPool

### Directory Structure
- Web app: `/app/horatio/web/`
- Generated files: `/app/generated/` (included in elm.json source-directories)
- Server handlers: `/app/horatio/server/src/Api/Handlers/`
- Database migrations: `/app/horatio/server/migrations/`

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
- **Test documentation**: `TEST_INVENTORY.md` documents all 300+ tests across 7 locations
- **Fixing plan**: `TEST_FIXING_PLAN.md` provides systematic approach to test failures
- **Core status**: 166 Rust tests always passing; most failures are environment/config issues
