-- Fix table names to match code generation expectations
-- Rename plural tables to singular to match Rust models

-- Rename tables (if they exist with plural names)
ALTER TABLE IF EXISTS guests RENAME TO guest;
ALTER TABLE IF EXISTS microblog_items RENAME TO microblog_item; 
ALTER TABLE IF EXISTS item_comments RENAME TO item_comment;
ALTER TABLE IF EXISTS tags RENAME TO tag;
ALTER TABLE IF EXISTS item_tags RENAME TO item_tag;

-- Update foreign key references that might point to old table names
-- (Note: Foreign keys should automatically update with table renames in PostgreSQL)

-- Rename indexes to match new table names
DROP INDEX IF EXISTS idx_items_host;
DROP INDEX IF EXISTS idx_items_timestamp;
DROP INDEX IF EXISTS idx_comments_item_id;
DROP INDEX IF EXISTS idx_tags_host;
DROP INDEX IF EXISTS idx_item_tags_tag_id;
DROP INDEX IF EXISTS idx_item_tags_host;

-- Recreate indexes with correct names
CREATE INDEX IF NOT EXISTS idx_items_host ON microblog_item(host);
CREATE INDEX IF NOT EXISTS idx_items_timestamp ON microblog_item(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_item_id ON item_comment(item_id);
CREATE INDEX IF NOT EXISTS idx_tag_host ON tag(host);
CREATE INDEX IF NOT EXISTS idx_item_tag_tag_id ON item_tag(tag_id);
CREATE INDEX IF NOT EXISTS idx_item_tag_host ON item_tag(host);