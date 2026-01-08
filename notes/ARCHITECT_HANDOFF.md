# Architect's Handoff Note
**Date**: 2026-01-04
**Status**: Sprint 3 Complete | Sprint 4 Ready for Execution

## Overview
This workspace has been guided by an "Architect" persona. We have successfully planned the restructure and implemented the Core CLI (Sprint 3). The next session should focus purely on **Execution of Sprint 4**.

## Current State
*   **Sprint 3 (CLI)**: Implemented. `hamlet-contracts`, `hamlet-core`, and `hamlet-cli` are scaffolded and basic tests pass.
*   **Sprint 4 (Migration)**: Fully planned in `notes/restructure-sprint4.md`.

## Immediate Next Actions
Start **Sprint 4 Execution** with the following priorities:

1.  **Template Fixes (`packages/create-buildamp`)**:
    *   Rename directories: `frontend` -> `web`, `backend` -> `server`.
    *   Ensure no `generated` folders exist in the template.

2.  **Core Feature (`packages/hamlet-core`)**:
    *   Implement `HAMLET_APP` environment variable support in `discoverProjectPaths`.
    *   Allow overriding the default project (so we can run examples locally).

3.  **Framework Fix (`packages/hamlet-server`)**:
    *   **CRITICAL**: `core/server.js` currently hardcodes paths to `app/horatio`.
    *   Refactor `HamletServer` to accept `dbQueries` and `apiRoutes` as dependency injection in the constructor, rather than importing them statically.

4.  **Horatio Migration**:
    *   Update `Horatio/server/server.js` to import generated code from `.hamlet-gen` and pass it to `new HamletServer()`.

## Source of Truth
*   **Master Plan**: `restructure.md`
*   **Execution Plan**: `notes/restructure-sprint4.md`
*   **Checklist**: `task.md`

*Good luck with the migration!*
