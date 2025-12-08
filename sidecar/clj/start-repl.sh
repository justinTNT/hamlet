#!/bin/bash

# Start the Hamlet sidecar REPL server

echo "🔧 Starting Hamlet Sidecar REPL..."
echo "📍 Working directory: $(pwd)"

# Start the nREPL server with sidecar functions loaded
clojure -M:sidecar

echo "🛑 Sidecar REPL stopped."