-- Add updated_at columns and soft delete support to all tables
-- This ensures all tables support the standard updated_at = NOW() pattern
-- and provides soft delete functionality for data safety

-- Add updated_at to tag table
ALTER TABLE tag ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
-- Add soft delete to tag table
ALTER TABLE tag ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;

-- Add updated_at to guest table if it doesn't exist
ALTER TABLE guest ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
-- Add soft delete to guest table
ALTER TABLE guest ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;

-- Add updated_at to item_comment table if it doesn't exist
ALTER TABLE item_comment ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
-- Add soft delete to item_comment table
ALTER TABLE item_comment ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;

-- Add updated_at to item_tag table if it doesn't exist
ALTER TABLE item_tag ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
-- Add soft delete to item_tag table
ALTER TABLE item_tag ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;

-- Add updated_at to microblog_item table if it doesn't exist
ALTER TABLE microblog_item ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
-- Add soft delete to microblog_item table
ALTER TABLE microblog_item ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;

-- Create triggers to automatically update the updated_at column on updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for all tables
DROP TRIGGER IF EXISTS update_tag_updated_at ON tag;
CREATE TRIGGER update_tag_updated_at BEFORE UPDATE ON tag FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_guest_updated_at ON guest;
CREATE TRIGGER update_guest_updated_at BEFORE UPDATE ON guest FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_item_comment_updated_at ON item_comment;
CREATE TRIGGER update_item_comment_updated_at BEFORE UPDATE ON item_comment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_item_tag_updated_at ON item_tag;
CREATE TRIGGER update_item_tag_updated_at BEFORE UPDATE ON item_tag FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_microblog_item_updated_at ON microblog_item;
CREATE TRIGGER update_microblog_item_updated_at BEFORE UPDATE ON microblog_item FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();