#!/bin/bash
# Hamlet Extension Build Script
# Copies boilerplate from hamlet-extension, compiles Elm, builds with Vite

set -e

TARGET="${1:-chrome}"

if [[ "$TARGET" != "chrome" && "$TARGET" != "firefox" ]]; then
    echo "Usage: ./build.sh [chrome|firefox]"
    exit 1
fi

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
HAMLET_EXT="../../../packages/hamlet-extension"

echo "🎯 Building for $TARGET..."

echo "📄 Setting up manifest..."
cp "manifest.$TARGET.json" manifest.json

echo "📦 Copying boilerplate from hamlet-extension..."
cp "$HAMLET_EXT/popup.html" src/popup.html
cp "$HAMLET_EXT/popup.js" src/popup.js
cp "$HAMLET_EXT/background.js" src/background.js

echo "🌳 Compiling Elm..."
elm make src/Popup.elm --output src/elm.js --optimize

echo "🔨 Building with Vite..."
npx vite build

echo "📋 Copying elm.js to dist..."
cp src/elm.js dist/src/elm.js

ZIPNAME="horatio-extension-$TARGET.zip"
echo "📦 Packaging extension..."
rm -f "$ZIPNAME"
cd dist && zip -r "../$ZIPNAME" . && cd ..

echo "✅ Build complete for $TARGET!"
echo "   Development: load dist/ as unpacked extension"
echo "   Distribution: $ZIPNAME"
