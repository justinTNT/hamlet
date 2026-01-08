# Generation Test Migration Note

## Status
These generation tests were written for the old auto-generation system that output to:
- `packages/hamlet-server/generated/`
- `app/generated/`
- `app/horatio/server/generated/`

With Sprint 4, we've migrated to:
- hamlet-cli for orchestration
- `.hamlet-gen/` directories for output
- Explicit `hamlet gen` commands

## Current State
- Many tests fail because they look for files in old locations
- The files they're testing have been deleted as part of cleanup
- The generation logic is moving to hamlet-cli

## Recommendation
1. **Short term**: Skip these tests with `test.skip()`
2. **Medium term**: Create new integration tests for `hamlet gen` command
3. **Long term**: Remove these tests once hamlet-cli is fully validated

## Tests That Still Pass
- Simple unit tests that don't depend on file locations
- Model parsing tests
- Pure transformation tests

## Tests That Fail
- File existence checks
- Integration tests reading from old paths
- Tests depending on the full generation pipeline