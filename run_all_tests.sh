#!/bin/bash

# BuildAmp Comprehensive Test Runner
# Centralizes all test execution with proper environment setup

set -e  # Exit on any error

echo "🧪 BuildAmp Complete Test Suite Runner"
echo "======================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_SUITES=()

# Function to run a test suite
run_test_suite() {
    local name="$1"
    local directory="$2"
    local command="$3"
    local description="$4"

    echo ""
    echo -e "${BLUE}🔄 Running: $name${NC}"
    echo "   Directory: $directory"
    echo "   Command: $command"
    echo "   Description: $description"
    echo "   ----------------------------------------"

    TESTS_RUN=$((TESTS_RUN + 1))

    if [ -d "$directory" ]; then
        local exit_code=0
        (cd "$directory" && eval "$command") || exit_code=$?

        if [ $exit_code -eq 0 ]; then
            echo -e "${GREEN}✅ $name: PASSED${NC}"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo -e "${RED}❌ $name: FAILED (exit code: $exit_code)${NC}"
            TESTS_FAILED=$((TESTS_FAILED + 1))
            FAILED_SUITES+=("$name")
        fi
    else
        echo -e "${YELLOW}⚠️  $name: DIRECTORY NOT FOUND - $directory${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        FAILED_SUITES+=("$name (directory missing)")
    fi
}

# Store original directory
ORIGINAL_DIR=$(pwd)

echo "📋 Pre-flight checks..."

# Setup Node.js environment
echo "🔧 Setting up Node.js environment..."
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"  # Load nvm

# Use Node 20
echo "📦 Switching to Node 20..."
nvm use 20
echo "✅ Node version: $(node --version)"
echo "✅ npm version: $(npm --version)"

echo ""
echo "🚀 Starting comprehensive test execution..."
echo ""
echo "📊 Test Inventory:"
echo "======================="
echo "   • Horatio Server tests: TEA handler pools, performance (3 tests)"
echo "   • Hamlet Server tests: core, middleware, security (61 tests)"
echo "   • Create-BuildAmp tests: CLI parsing, codegen (17 tests)"
echo "   • BuildAmp Package tests: CLI, orchestrator, generators (331 tests)"
echo "   • BuildAmp Integration tests: file generation checks"
echo "   • Golden Model Verification: reference app + admin UI"
echo ""
echo "   🎯 TOTAL: 6 test suites (~412 tests)"
echo "======================="
echo ""

# Test Suite 1: Horatio Server Tests
run_test_suite \
    "Horatio Server Tests" \
    "/Users/jtnt/Play/hamlet/app/horatio/server" \
    "timeout 30 npm test" \
    "TEA handler pools, performance, state corruption, KV store, SSE integration"

# Test Suite 2: Hamlet Server Tests
run_test_suite \
    "Hamlet Server Tests" \
    "/Users/jtnt/Play/hamlet/packages/hamlet-server" \
    "npm test" \
    "Core functionality: Jest tests for core, database, middleware, security"

# Test Suite 3: Create-BuildAmp Tests
run_test_suite \
    "Create-BuildAmp Tests" \
    "/Users/jtnt/Play/hamlet/packages/create-buildamp" \
    "npm test" \
    "CLI parsing, codegen modes, database/events generation, integration"

# Test Suite 4: BuildAmp Package Tests
run_test_suite \
    "BuildAmp Package Tests" \
    "/Users/jtnt/Play/hamlet/packages/buildamp" \
    "npm test" \
    "CLI commands, orchestrator, core utilities, generators"

# Test Suite 5: BuildAmp Integration Tests
run_test_suite \
    "BuildAmp Integration Tests" \
    "/Users/jtnt/Play/hamlet" \
    "node test-integration.js" \
    "Code generation integration testing"

# Test Suite 6: Golden Model Verification
run_test_suite \
    "Golden Model Verification" \
    "/Users/jtnt/Play/hamlet" \
    "node scripts/verify-reference-app.js && node scripts/verify-reference-admin.js" \
    "Reference app and admin UI verification"

# Return to original directory
cd "$ORIGINAL_DIR"

echo ""
echo "=============================="
echo "🏁 Test Execution Complete"
echo "=============================="
echo ""
echo "📊 Final Results Summary:"
echo "   Total test suites run: $TESTS_RUN"
echo -e "   ${GREEN}✅ Passed: $TESTS_PASSED${NC}"
echo -e "   ${RED}❌ Failed: $TESTS_FAILED${NC}"

if [ ${#FAILED_SUITES[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}Failed test suites:${NC}"
    for suite in "${FAILED_SUITES[@]}"; do
        echo -e "   ${RED}• $suite${NC}"
    done
    exit 1
else
    echo ""
    echo -e "${GREEN}🎉 All 6 test suites passed (~412 tests)${NC}"
    exit 0
fi
