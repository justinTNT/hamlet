#!/bin/bash
# Merge business logic from backup handlers into newly generated skeletons

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

usage() {
    echo "Usage: $0 <backup-dir> [handler-name]"
    echo ""
    echo "Examples:"
    echo "  $0 .backups/20240111_120000                    # Merge all handlers from backup"
    echo "  $0 .backups/20240111_120000 GetFeedHandlerTEA  # Merge specific handler"
    echo ""
    echo "Available backups:"
    if [ -d "$PROJECT_ROOT/app/horatio/server/src/Api/Handlers/.backups" ]; then
        ls -1d "$PROJECT_ROOT/app/horatio/server/src/Api/Handlers/.backups"/*/ 2>/dev/null | xargs -n1 basename
    fi
    exit 1
}

if [ $# -lt 1 ]; then
    usage
fi

BACKUP_DIR="$1"
SPECIFIC_HANDLER="$2"

# Handle relative or absolute paths
if [[ "$BACKUP_DIR" == /* ]]; then
    # Absolute path
    BACKUP_PATH="$BACKUP_DIR"
else
    # Relative path - assume it's under handlers directory
    BACKUP_PATH="$PROJECT_ROOT/app/horatio/server/src/Api/Handlers/$BACKUP_DIR"
fi

if [ ! -d "$BACKUP_PATH" ]; then
    echo -e "${RED}❌ Backup directory not found: $BACKUP_PATH${NC}"
    usage
fi

HANDLERS_DIR="$PROJECT_ROOT/app/horatio/server/src/Api/Handlers"

echo -e "${BLUE}🔄 Handler Logic Merge Tool${NC}"
echo "=========================="
echo "Backup: $BACKUP_PATH"
echo "Target: $HANDLERS_DIR"
echo ""

# Function to check if a handler has real implementation
has_implementation() {
    local file="$1"
    if grep -q "Debug.todo" "$file" 2>/dev/null; then
        return 1
    fi
    return 0
}

# Function to extract business logic sections
extract_business_logic() {
    local file="$1"
    local output="$2"
    
    # Extract everything after "-- BUSINESS LOGIC" until "-- ENCODING" or "-- PORTS"
    awk '
        /^-- BUSINESS LOGIC/ { capture=1; next }
        /^-- (ENCODING|PORTS|DECODING)/ { capture=0 }
        capture { print }
    ' "$file" > "$output.business"
    
    # Extract custom decoders (usually after encoding section)
    awk '
        /^(microblogItemDbDecoder|timestampDecoder|stringToInt|andMap)/ { capture=1 }
        /^-- / && capture { exit }
        capture { print }
    ' "$file" > "$output.decoders"
    
    # Extract update function implementation
    awk '
        /^update : Msg -> Model -> \( Model, Cmd Msg \)/ { capture=1 }
        /^[a-zA-Z]/ && !($0 ~ /^update/) && !($0 ~ /^    /) && capture { exit }
        capture { print }
    ' "$file" > "$output.update"
    
    # Extract Model type
    awk '
        /^type alias Model =/ { capture=1 }
        /^[a-zA-Z]/ && !($0 ~ /^    /) && capture { exit }
        capture { print }
    ' "$file" > "$output.model"
    
    # Extract Stage type
    awk '
        /^type Stage/ { capture=1; next }
        /^[a-zA-Z]/ && !($0 ~ /^    /) && capture { exit }
        capture { print }
    ' "$file" > "$output.stage"
    
    # Extract Msg type
    awk '
        /^type Msg/ { capture=1; next }
        /^[a-zA-Z]/ && !($0 ~ /^    /) && capture { exit }
        capture { print }
    ' "$file" > "$output.msg"
}

# Process handlers
PROCESSED=0
for backup_file in "$BACKUP_PATH"/*.elm; do
    if [ ! -f "$backup_file" ]; then
        continue
    fi
    
    filename=$(basename "$backup_file")
    handler_name="${filename%.elm}"
    
    # Skip if specific handler requested and this isn't it
    if [ -n "$SPECIFIC_HANDLER" ] && [ "$handler_name" != "$SPECIFIC_HANDLER" ]; then
        continue
    fi
    
    current_file="$HANDLERS_DIR/$filename"
    
    echo -e "${YELLOW}📄 Processing $handler_name...${NC}"
    
    # Check if current file exists
    if [ ! -f "$current_file" ]; then
        echo -e "${RED}   ❌ Current file not found, skipping${NC}"
        continue
    fi
    
    # Check if backup has implementation
    if ! has_implementation "$backup_file"; then
        echo -e "${YELLOW}   ⏭️  Backup has no implementation, skipping${NC}"
        continue
    fi
    
    # Check if current file needs implementation
    if has_implementation "$current_file"; then
        echo -e "${GREEN}   ✓ Current file already has implementation${NC}"
        continue
    fi
    
    # Extract business logic from backup
    TEMP_DIR=$(mktemp -d)
    extract_business_logic "$backup_file" "$TEMP_DIR/backup"
    
    # Create merged file
    cp "$current_file" "$TEMP_DIR/merged.elm"
    
    echo -e "${BLUE}   🔧 Merging business logic...${NC}"
    
    # This is where manual merge would happen
    # For now, we'll just create a guide file
    cat > "$TEMP_DIR/merge-guide.txt" << EOF
MERGE GUIDE for $handler_name
=============================

The following sections were extracted from the backup and need to be merged:

1. Model fields (from backup.model)
   - Add any missing fields to the Model type in the current file

2. Stage values (from backup.stage)
   - Replace placeholder stages with actual implementation stages

3. Msg values (from backup.msg)  
   - Replace placeholder messages with actual implementation messages

4. Update function (from backup.update)
   - Replace the entire update function implementation

5. Business logic functions (from backup.business)
   - Add all functions after the -- BUSINESS LOGIC comment

6. Custom decoders (from backup.decoders)
   - Add these before the -- PORTS section

Remember to:
- Keep the new RequestBundle type structure
- Keep the new init and main signatures
- Update subscriptions if needed
EOF
    
    echo "   📁 Extracted sections saved to: $TEMP_DIR"
    echo "   📋 See merge guide: $TEMP_DIR/merge-guide.txt"
    echo ""
    echo "   Manual merge required. Key sections extracted:"
    echo "   - Model type: $(wc -l < "$TEMP_DIR/backup.model") lines"
    echo "   - Update function: $(wc -l < "$TEMP_DIR/backup.update") lines"
    echo "   - Business logic: $(wc -l < "$TEMP_DIR/backup.business") lines"
    echo "   - Custom decoders: $(wc -l < "$TEMP_DIR/backup.decoders") lines"
    echo ""
    
    PROCESSED=$((PROCESSED + 1))
done

if [ $PROCESSED -eq 0 ]; then
    if [ -n "$SPECIFIC_HANDLER" ]; then
        echo -e "${RED}❌ Handler $SPECIFIC_HANDLER not found in backup${NC}"
    else
        echo -e "${YELLOW}⚠️  No handlers needed merging${NC}"
    fi
else
    echo -e "${GREEN}✅ Processed $PROCESSED handler(s)${NC}"
fi