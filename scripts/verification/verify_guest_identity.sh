#!/bin/bash

# Ensure server is running (assumed)
API_URL="http://localhost:3000"
SESSION_ID="test-session-$(date +%s)"

echo "Testing Guest Identity with Session ID: $SESSION_ID"

# 0. Create an Item first
echo "0. Creating an item..."
ITEM_RES=$(curl -s -X POST "$API_URL/SubmitItem" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Item for Comments",
    "link": "http://example.com",
    "image": "",
    "extract": "Testing comments...",
    "owner_comment": "",
    "tags": []
  }')

# Extract ID using node
ITEM_ID=$(echo "$ITEM_RES" | node -e "const res = JSON.parse(fs.readFileSync(0)); console.log(res.SubmitItemSuccess ? res.SubmitItemSuccess.id : res.item.id)")

if [ $? -ne 0 ]; then
    echo "Failed to create item. Response: $ITEM_RES"
    exit 1
fi

echo "Created Item ID: $ITEM_ID"
echo -e "\n"

# 1. First Comment (Should create guest)
echo "1. Submitting first comment..."
curl -X POST "$API_URL/SubmitComment" \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: $SESSION_ID" \
  -d '{
    "item_id": "'"$ITEM_ID"'",
    "text": "First comment from guest",
    "author_name": "Guest User",
    "parent_id": null
  }'

echo -e "\n"

# 2. Verify Guest Creation
echo "2. Verifying guest creation in DB..."
node $(dirname "$0")/verify_guest_db.mjs "$SESSION_ID"

# 3. Second Comment (Should reuse guest)
echo "3. Submitting second comment..."
curl -X POST "$API_URL/SubmitComment" \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: $SESSION_ID" \
  -d '{
    "item_id": "'"$ITEM_ID"'",
    "text": "Second comment from guest",
    "author_name": "Guest User",
    "parent_id": null
  }'

echo -e "\n"

# 4. Verify Guest Reuse (Count should still be 1 for this ID)
echo "4. Verifying guest reuse..."
node $(dirname "$0")/verify_guest_db.mjs "$SESSION_ID"
