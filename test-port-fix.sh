#!/bin/bash

echo "Testing Horatio server integration tests with unique ports..."

cd app/horatio/server

echo "Running tests sequentially to verify port fix..."
npm test -- tests/integration/tea-handler-state-corruption.test.js
echo "State corruption test done"
sleep 2

npm test -- tests/integration/tea-handler-pool.test.js  
echo "Pool test done"
sleep 2

npm test -- tests/integration/tea-handler-performance.test.js
echo "Performance test done"

echo "All tests completed. Check for port conflict errors above."