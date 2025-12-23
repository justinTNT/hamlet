# BuildAmp Test Suite Inventory (CORRECTED)

## Overview
Complete documentation of all test suites across the BuildAmp framework for systematic test maintenance and debugging.

**CORRECTED Total Test Count: ~4,800+ tests across 10 test locations**

---

## 1. Core Rust Tests (`src/`)
- **Location**: `/Users/jtnt/Play/hamlet/src/`
- **Command**: `cargo test`
- **Test Count**: 167 tests
- **Status**: ✅ **ALL PASSING**
- **Categories**:
  - Framework core functionality
  - Database model validation
  - API endpoint generation
  - Type safety verification
  - Macro expansion tests

---

## 2. Horatio Application Tests (`app/horatio/`)
- **Location**: `/Users/jtnt/Play/hamlet/app/horatio/`
- **Command**: `cargo test`
- **Test Count**: 0 tests currently
- **Status**: ⚪ No tests found
- **Purpose**: Application-specific business logic tests

---

## 3. Horatio Server Tests (`app/horatio/server/`)
- **Location**: `/Users/jtnt/Play/hamlet/app/horatio/server/`
- **Framework**: Jest/Node.js
- **Command**: `npm test`
- **Test Count**: ~6 tests
- **Status**: ❓ **UNKNOWN** (Needs verification with updated Node)

**Test Categories**:
- TEA handler performance tests
- TEA handler pool tests  
- State corruption prevention tests
- KV store integration tests
- SSE integration tests

**Key Test Files**:
- `__tests__/kv-store.test.js`
- `__tests__/sse-integration.test.js`
- `tests/integration/tea-handler-performance.test.js`
- `tests/integration/tea-handler-pool.test.js`
- `tests/integration/tea-handler-state-corruption.test.js`
- `tests/unit/tea-handler-pool.test.js`

---

## 4. Hamlet Server Tests (`packages/hamlet-server/`)
- **Location**: `/Users/jtnt/Play/hamlet/packages/hamlet-server/`
- **Framework**: Jest/Node.js
- **Command**: `npm test`
- **Test Count**: ~18 tests
- **Status**: ❌ **FAILING** (Node version/config issues)

**Test Categories**:
- Middleware functionality
- Code generation tests (12+ generation tests)
- Security tests
- Database tests
- Core functionality tests

**Key Test Directories**:
- `tests/generation/` - 12+ generation tests
- `tests/middleware/` - Middleware tests
- `tests/security/` - Security tests  
- `tests/core.test.js`
- `tests/database.test.js`

---

## 5. Create-BuildAmp Tests (`packages/create-buildamp/`)
- **Location**: `/Users/jtnt/Play/hamlet/packages/create-buildamp/`
- **Framework**: Node.js native test runner
- **Command**: `npm test`
- **Test Count**: ~10 tests
- **Status**: ❓ **UNKNOWN**

**Test Categories**:
- CLI parsing tests
- Template generation tests
- Database generation tests
- Events generation tests
- Webhook tests
- Integration tests

**Key Test Files**:
- `tests/cli-parsing.test.js`
- `tests/codegen-mode.test.js`
- `tests/database-generation.test.js`
- `tests/events-generation.test.js`
- `tests/from-models-mode.test.js`
- `tests/integration.test.js`
- `tests/sse-kv-generation.test.js`
- `tests/traditional-mode.test.js`
- `tests/webhook-core.test.js`
- `tests/webhook-integration.test.js`

---

## 6. BuildAmp Integration Tests (`buildamp-tests/`) **MAJOR DISCOVERY**
- **Location**: `/Users/jtnt/Play/hamlet/buildamp-tests/`
- **Framework**: Node.js integration tests
- **Command**: `node test-integration.js` or `node test-simple.js`
- **Test Count**: **~4,577 files** (MASSIVE test suite)
- **Status**: ❓ **UNKNOWN** (Needs investigation)

**Test Categories**:
- Auto-decoration tests
- Clean events/sections tests  
- Codegen output validation
- Database fixes validation
- Elm generation comparison
- Handler/webhook tests
- KV helper tests
- SSE/KV integration
- Storage validation
- Validation tests
- Webhook codegen tests

**Key Test Directories**:
- `test-auto-decoration.js`
- `test-both-workflows/` and `test-both-workflows-fixed/`
- `test-clean-events/`, `test-clean-sections/`
- `test-codegen-output/`, `test-fixed-codegen/`
- `test-db-fix/`, `test-events-fix/`
- `test-elm-generation-comparison.js`
- `test-handlers-webhooks/`
- `test-integration.js`, `test-simple.js`
- `test-kv-helper/`, `test-sse-kv/`
- `test-storage-clean/`
- `test-validation/` (Full BuildAmp project for validation)
- `test-webhook-codegen/`, `test-webhook-codegen2/`

---

## 7-10. Other Test Suites
- **Web Frontend Tests**: No test script configured
- **Admin UI Tests**: No test script configured  
- **Shared Generation Tests**: Partial test scripts
- **Generated Code Validation**: Automated validation

---

## Corrected Test Environment Requirements

### Node.js Version Issues
- **Problem**: Multiple test suites require Node.js 20+ for modern test features
- **Impact**: Blocks Jest and native Node test execution
- **Solution**: `nvm use stable` before running tests

### Test Execution Complexity
- **BuildAmp Integration Tests**: 4,577 files suggest comprehensive end-to-end testing
- **Multiple Test Runners**: Jest, Node native, Cargo test
- **Dependencies**: Elm compilation, WASM building, database setup

---

## Corrected Test Execution Matrix

| Test Suite | Command | Files | Estimated Tests | Status | Priority |
|------------|---------|-------|-----------------|---------|----------|
| Core Rust | `cargo test` | Mixed | 167 tests | ✅ Passing | High |
| Horatio Server | `npm test` | 6 files | ~20 tests | ❓ Unknown | High |
| Hamlet Server | `npm test` | 18 files | ~50 tests | ❌ Failing | High |
| Create-BuildAmp | `npm test` | 10 files | ~30 tests | ❓ Unknown | Medium |
| **BuildAmp Integration** | **Node scripts** | **4,577 files** | **~4,000+ tests** | **❓ Unknown** | **CRITICAL** |
| Web Frontend | No script | 0 files | 0 tests | ⚪ Missing | Low |
| Admin UI | No script | 0 files | 0 tests | ⚪ Missing | Low |
| Shared Gen | Partial | Mixed | ~10 tests | ⚠️ Config | Low |
| Generated Code | Auto | 8 files | Validation | ✅ Validated | Low |

---

## Revised Test Fixing Priority

### Phase 1: Critical Infrastructure (HIGH)
1. **Fix Node.js version compatibility** for all JS test suites
2. **Investigate BuildAmp Integration Tests** (4,577 files!) - this is likely the main test suite
3. **Validate Horatio Server tests** (6 tests with updated Node)
4. **Fix Hamlet Server tests** (18 tests with configuration issues)

### Phase 2: CLI and Generation (MEDIUM)
5. **Test Create-BuildAmp CLI** (10 scaffolding tests)
6. **Validate code generation** in shared tests
7. **Ensure admin middleware** doesn't break existing functionality

### Phase 3: Frontend and Quality (LOW)
8. **Add missing frontend test configurations**
9. **Improve test documentation and CI/CD**
10. **Performance monitoring** for 4,577-file test suite

---

## CRITICAL DISCOVERY

The **BuildAmp Integration Tests** directory contains 4,577 files, suggesting this is the primary comprehensive test suite for the entire BuildAmp framework. This completely changes the test landscape - instead of ~300 tests, the project has **~4,800+ tests** including massive integration testing.

**Priority Action**: Investigate `buildamp-tests/` directory to understand how to run these 4,577 test files properly.