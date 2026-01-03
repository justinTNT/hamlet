#!/bin/bash

# Quick test status checker
# Runs each test suite and reports actual exit codes

echo "🔍 BuildAmp Test Status Checker"
echo "================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to check a single test
check_test() {
    local name="$1"
    local dir="$2"
    local cmd="$3"
    
    echo -n "Checking $name... "
    
    if [ ! -d "$dir" ]; then
        echo -e "${YELLOW}SKIP${NC} (directory not found)"
        return
    fi
    
    cd "$dir" 2>/dev/null
    
    # Run command silently and check exit code
    if $cmd >/dev/null 2>&1; then
        echo -e "${GREEN}PASS${NC}"
    else
        local exit_code=$?
        echo -e "${RED}FAIL${NC} (exit code: $exit_code)"
        
        # Run again with output for debugging
        echo "  Running with output for debugging:"
        $cmd 2>&1 | head -20
        echo "  ..."
    fi
    
    cd - >/dev/null
}

# Setup Node environment if available
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh" 2>/dev/null
command -v nvm >/dev/null 2>&1 && nvm use stable >/dev/null 2>&1

echo "Test Suite Status:"
echo "------------------"

# Check each test suite
check_test "Rust Core" "." "cargo test --quiet"
check_test "Hamlet Server" "packages/hamlet-server" "npm test"
check_test "Create-BuildAmp" "packages/create-buildamp" "npm test"
check_test "Horatio Server" "app/horatio/server" "timeout 10 npm test"

echo ""
echo "Individual Test Verification:"
echo "-----------------------------"

# Check specific test files that might be failing
echo ""
echo "Checking Hamlet Server generation tests specifically:"
cd packages/hamlet-server 2>/dev/null && npx jest tests/generation/elm-handlers.test.js --silent 2>&1 | grep -E "(PASS|FAIL|✓|✗)" | head -10
cd - >/dev/null

echo ""
echo "Checking Create-BuildAmp admin tests specifically:"
cd packages/create-buildamp 2>/dev/null && node --test tests/admin-middleware.test.js 2>&1 | grep -E "(ok|not ok|✓|✗)" | head -10
cd - >/dev/null

echo ""
echo "✅ = Test actually passes"
echo "❌ = Test actually fails"
echo "The original test runner may have exit code handling issues."