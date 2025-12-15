#!/bin/bash
# Auto-generated Elm handler compilation script
# Run this from app/horatio/server/ directory

set -e
echo "🔨 Compiling Elm handlers..."

echo "Compiling SubmitCommentHandler..."
elm make src/Api/Handlers/SubmitCommentHandler.elm --output=SubmitCommentHandler.cjs --optimize
echo "Compiling GetFeedHandler..."
elm make src/Api/Handlers/GetFeedHandler.elm --output=GetFeedHandler.cjs --optimize
echo "Compiling SubmitItemHandler..."
elm make src/Api/Handlers/SubmitItemHandler.elm --output=SubmitItemHandler.cjs --optimize
echo "Compiling GetTagsHandler..."
elm make src/Api/Handlers/GetTagsHandler.elm --output=GetTagsHandler.cjs --optimize

echo "✅ All handlers compiled successfully!"
