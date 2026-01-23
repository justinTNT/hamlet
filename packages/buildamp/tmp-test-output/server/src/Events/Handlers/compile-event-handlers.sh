#!/bin/bash
# Auto-generated Elm event handler compilation script

set -e
echo "🔨 Compiling Elm event handlers..."

for elm_file in *.elm; do
    if [ -f "$elm_file" ]; then
        basename=$(basename "$elm_file" .elm)
        echo "Compiling $basename..."
        elm make "$elm_file" --output="$basename.js" && mv "$basename.js" "$basename.cjs"
    fi
done

echo "✅ All event handlers compiled successfully!"
