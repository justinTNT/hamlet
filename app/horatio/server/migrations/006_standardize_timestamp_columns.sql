-- Standardize timestamp columns to use 'created_at' for framework compatibility
-- This aligns app tables with framework conventions and generic query builder expectations

-- Update microblog_items table
ALTER TABLE microblog_items RENAME COLUMN timestamp TO created_at;

-- Update item_comments table
ALTER TABLE item_comments RENAME COLUMN timestamp TO created_at;

-- Update existing indexes to use new column name
DROP INDEX IF EXISTS idx_items_timestamp;
CREATE INDEX IF NOT EXISTS idx_items_created_at ON microblog_items(created_at DESC);

-- Note: idx_comments_item_id remains unchanged as it doesn't involve timestamp column