# Multi-App Support: Test Impacts

## Areas Impacted by Multi-App Changes

### 1. ✅ hamlet-core Tests
- **Status**: Already updated
- Added tests for env var and package.json config
- Tests multi-app path discovery

### 2. ❌ Generation Tests (`packages/hamlet-server/tests/generation/`)
- **Issue**: Hardcoded paths to old structure
- Files checking for `packages/hamlet-server/generated/` (now empty)
- Files checking for `app/generated/` (deleted)
- Files checking for `app/horatio/server/generated/` (deleted)

**Affected Files**:
- `generation.test.js` - expects files in old locations
- `dependency-order.test.js` - creates temp dirs with hardcoded paths

### 3. ⚠️ dev-server.js
- **Issue**: Has its own hardcoded path discovery
- **Status**: Not referenced in package.json anymore
- **Action**: Can be left as-is or deleted

### 4. ✅ Horatio Server Tests
- **Status**: Should be unaffected
- Located in `app/horatio/server/tests/`
- Test TEA handlers and integration

### 5. ✅ shared/generation Scripts
- **Status**: Already use hamlet-core
- Will automatically support multi-app

## Recommended Actions

### Option 1: Update Generation Tests (Recommended)
Update the tests to:
1. Use hamlet-core for path discovery
2. Check for files in `.hamlet-gen/` locations
3. Create proper test fixtures

### Option 2: Skip/Disable Outdated Tests
Since we're moving to hamlet-cli:
1. Mark old generation tests as skipped
2. Create new tests for hamlet-cli commands
3. Remove tests for deprecated functionality

### Option 3: Minimal Fix
1. Create dummy files in expected locations for tests
2. Add note that these tests are for legacy compatibility
3. Plan to remove in next major version

## Test Commands to Verify

```bash
# Check hamlet-core multi-app support
cd packages/hamlet-core && npm test

# Check generation tests (will likely fail)
cd packages/hamlet-server && npm test

# Check hamlet-cli (should pass)
cd packages/hamlet-cli && npm test

# Full test suite
./run_all_tests_fixed.sh
```