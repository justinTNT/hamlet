#!/bin/bash
# Safe handler regeneration script
# This script backs up existing handlers before regenerating them

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Safe Handler Regeneration Script${NC}"
echo "======================================"

# Find the project handlers directory
HANDLERS_DIR="$PROJECT_ROOT/app/horatio/server/src/Api/Handlers"

if [ ! -d "$HANDLERS_DIR" ]; then
    echo -e "${RED}❌ Handlers directory not found: $HANDLERS_DIR${NC}"
    exit 1
fi

# Create backup directory with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$HANDLERS_DIR/.backups/$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}📦 Backing up existing handlers to: $BACKUP_DIR${NC}"

# Backup all existing Elm handlers
BACKED_UP=0
for file in "$HANDLERS_DIR"/*.elm; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        cp "$file" "$BACKUP_DIR/$filename"
        echo "   ✓ Backed up $filename"
        BACKED_UP=$((BACKED_UP + 1))
    fi
done

if [ $BACKED_UP -eq 0 ]; then
    echo -e "${YELLOW}   No existing handlers to backup${NC}"
else
    echo -e "${GREEN}   Backed up $BACKED_UP handlers${NC}"
fi

# Create a restore script for this backup
cat > "$BACKUP_DIR/restore.sh" << 'EOF'
#!/bin/bash
# Restore handlers from this backup

BACKUP_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
HANDLERS_DIR="$( cd "$BACKUP_DIR/../.." && pwd )"

echo "🔄 Restoring handlers from backup..."
for file in "$BACKUP_DIR"/*.elm; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        cp "$file" "$HANDLERS_DIR/$filename"
        echo "   ✓ Restored $filename"
    fi
done
echo "✅ Restore complete!"
EOF
chmod +x "$BACKUP_DIR/restore.sh"

# Keep only the last 5 backups
echo -e "${YELLOW}🧹 Cleaning old backups...${NC}"
BACKUP_COUNT=$(ls -1d "$HANDLERS_DIR/.backups"/*/ 2>/dev/null | wc -l)
if [ $BACKUP_COUNT -gt 5 ]; then
    ls -1dt "$HANDLERS_DIR/.backups"/*/ | tail -n +6 | xargs rm -rf
    echo "   ✓ Removed old backups, keeping last 5"
fi

# Ask for confirmation before regenerating
echo ""
echo -e "${YELLOW}⚠️  Ready to regenerate handlers${NC}"
echo "   This will:"
echo "   1. Delete all current handler files"
echo "   2. Regenerate handlers from templates"
echo "   3. You'll need to restore business logic manually"
echo ""
read -p "Continue with regeneration? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}❌ Regeneration cancelled${NC}"
    echo ""
    echo "Your backup is available at:"
    echo "   $BACKUP_DIR"
    echo ""
    echo "To restore from this backup, run:"
    echo "   $BACKUP_DIR/restore.sh"
    exit 0
fi

# Remove existing handlers
echo -e "${YELLOW}🗑️  Removing existing handlers...${NC}"
rm -f "$HANDLERS_DIR"/*.elm

# Run the generation
echo -e "${BLUE}🔨 Running handler generation...${NC}"
cd "$PROJECT_ROOT"
node -e "import('./shared/generation/elm_handlers.js').then(m => m.generateElmHandlers())"

echo ""
echo -e "${GREEN}✅ Regeneration complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Compare with backup: $BACKUP_DIR"
echo "2. Restore business logic from backups"
echo "3. Compile handlers: cd app/horatio/server && ./compile-handlers.sh"
echo ""
echo "To restore from backup, run:"
echo "   $BACKUP_DIR/restore.sh"