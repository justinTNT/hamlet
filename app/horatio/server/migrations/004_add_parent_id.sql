-- Add parent_id column to item_comment table for threaded comments
ALTER TABLE item_comment ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES item_comment(id);
CREATE INDEX IF NOT EXISTS idx_comment_parent_id ON item_comment(parent_id);