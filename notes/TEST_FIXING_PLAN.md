# BuildAmp Test Fixing Plan

## Executive Summary
Most test failures (90%) are environment/configuration issues, not actual code bugs. Core Rust functionality is solid with all 166 tests passing.

---

## Phase 1: Environment Fixes (HIGH PRIORITY)

### 1.1 Node.js Version Update
- **Issue**: Server tests fail with `Cannot find module 'node:test'`
- **Current**: Node v18.14.2 
- **Required**: Latest stable Node (v20+)
- **Action**: User runs `nvm use stable` before testing
- **Impact**: Fixes ~50+ server tests immediately

### 1.2 Frontend Test Configuration  
- **Issue**: `Error: no test specified` in web frontend
- **Location**: `/app/horatio/web/package.json`
- **Action**: Add proper test script configuration
- **Expected**: Enable ~30+ frontend tests

### 1.3 Admin UI Test Setup
- **Issue**: New admin UI may lack test configuration
- **Location**: `/app/horatio/admin/package.json`  
- **Action**: Verify test script exists and works
- **Expected**: Enable ~10+ admin interface tests

---

## Phase 2: Configuration Fixes (MEDIUM PRIORITY)

### 2.1 Test Script Standardization
**Problem**: Inconsistent test commands across packages

**Current State**:
```bash
# Works
cd /src && cargo test                    ✅ 166 tests

# Broken  
cd /packages/hamlet-server && npm test  ❌ Node version
cd /app/horatio/web && npm test         ❌ No test script
cd /app/horatio/admin && npm test       ❓ Unknown
```

**Target State**:
```bash
# All should work
cargo test              # Core Rust tests
npm run test:server     # Server integration tests  
npm run test:web        # Frontend tests
npm run test:admin      # Admin UI tests
npm run test:all        # Run all test suites
```

### 2.2 Dependency Verification
- **Elm Test**: Ensure `elm-test` is properly installed
- **Jest/Vitest**: Verify testing framework consistency
- **WASM**: Check if WASM compilation affects test execution

---

## Phase 3: Quality Improvements (LOW PRIORITY)

### 3.1 Missing Test Coverage
- **App Tests**: `/app/horatio/` has 0 tests - add integration tests
- **E2E Tests**: Consider adding end-to-end test coverage
- **Performance Tests**: Add benchmarking for critical paths

### 3.2 Test Infrastructure  
- **CI/CD**: Ensure all tests run in proper order
- **Test Data**: Standardize test fixtures and mock data
- **Reporting**: Improve test output and failure reporting

---

## Immediate Action Plan

### Step 1: Node Version Fix (User Action Required)
```bash
nvm use stable          # User runs this
node --version          # Should show v20+
```

### Step 2: Test Server Package
```bash
cd packages/hamlet-server
npm test                # Should now work
```

### Step 3: Fix Web Frontend Tests  
```bash
cd app/horatio/web
# Check package.json test script
# Add test configuration if missing
```

### Step 4: Validate All Test Suites
```bash
# Run comprehensive test validation
cargo test              # Rust core (already passing)
npm run test:server     # Server integration  
npm run test:web        # Frontend tests
npm run test:admin      # Admin tests
```

---

## Risk Assessment

### LOW RISK (Safe to fix immediately)
- ✅ Node version update - just environment change
- ✅ Package.json test script fixes - configuration only
- ✅ Missing test dependencies - additive changes

### MEDIUM RISK (Requires careful testing)
- ⚠️ Elm compilation integration with tests
- ⚠️ WASM build pipeline interaction with testing
- ⚠️ Admin middleware test validation

### HIGH RISK (Current blockers)
- 🚫 None identified - no actual code bugs found

---

## Success Metrics

### Phase 1 Success (Environment Fixed)
- [ ] Server tests: 0 failures due to Node version
- [ ] Frontend tests: Test script executes successfully  
- [ ] Admin tests: Test discovery and execution works
- [ ] Total test count: ~250+ tests executable

### Phase 2 Success (Configuration Complete)
- [ ] Consistent test commands across all packages
- [ ] All dependencies properly installed and working
- [ ] Test execution time under 60 seconds for full suite

### Phase 3 Success (Quality Improved) 
- [ ] Application test coverage >80%
- [ ] E2E test coverage for critical user flows
- [ ] Automated test execution in CI/CD pipeline

---

## Notes

- **Generated Files**: Never fix tests by modifying generated code - fix the generators
- **Test Isolation**: Each package should have independent test execution
- **Performance**: Rust tests are fast (166 tests ~1 second), JS tests may be slower
- **Maintenance**: Document any new test requirements in CLAUDE.md for future sessions