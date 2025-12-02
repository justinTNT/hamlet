ALTER TABLE item_comments ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES item_comments(id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON item_comments(parent_id);
