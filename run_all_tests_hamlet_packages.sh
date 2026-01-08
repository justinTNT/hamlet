#!/bin/bash

# Test runner for new hamlet packages
# Tests hamlet-core, hamlet-cli, and hamlet-contracts

echo "🧪 Testing Hamlet Packages"
echo "========================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

TESTS_PASSED=0
TESTS_FAILED=0

# Function to run tests for a package
run_package_test() {
    local package_name="$1"
    local package_dir="packages/$package_name"
    
    echo ""
    echo "📦 Testing $package_name..."
    
    if [ ! -d "$package_dir" ]; then
        echo -e "${RED}❌ Package directory not found: $package_dir${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
    
    cd "$package_dir"
    
    # Check if package.json exists and has test script
    if [ ! -f "package.json" ]; then
        echo -e "${RED}❌ No package.json found${NC}"
        cd - > /dev/null
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
    
    # Run tests
    if npm test 2>&1; then
        echo -e "${GREEN}✅ $package_name tests passed${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ $package_name tests failed${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    cd - > /dev/null
}

# Test each package
run_package_test "hamlet-core"
run_package_test "hamlet-contracts" 
run_package_test "hamlet-cli"

echo ""
echo "========================="
echo "📊 Summary:"
echo "   Passed: $TESTS_PASSED"
echo "   Failed: $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All hamlet package tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi