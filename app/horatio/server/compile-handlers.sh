#!/bin/bash
# Auto-generated Elm handler compilation script
# Run this from app/{appName}/server/ directory

set -e

echo "🔨 Compiling Elm handlers..."
# Auto-discover all .elm files in the api directory
for elm_file in src/Api/Handlers/*.elm; do
    if [ -f "$elm_file" ]; then
        # Extract filename without path and extension
        basename=$(basename "$elm_file" .elm)
        
        echo "Compiling $basename..."
        elm make "$elm_file" --output="$basename.js" && mv "$basename.js" "$basename.cjs"
    fi
done

echo "🔨 Compiling Elm event handlers..."
# Auto-discover all .elm files in the events directory
for elm_file in src/Events/Handlers/*.elm; do
    if [ -f "$elm_file" ]; then
        basename=$(basename "$elm_file" .elm)

        echo "Compiling $basename..."
        elm make "$elm_file" --output="$basename.js" && mv "$basename.js" "$basename.cjs"
    fi
done

echo "✅ All handlers compiled successfully!"
