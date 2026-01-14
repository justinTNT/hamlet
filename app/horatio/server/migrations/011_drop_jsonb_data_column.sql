-- Remove the JSONB data column from microblog_item
-- Reverting to flat columns for business model properties
-- JSONB is reserved for pass-through data, not well-defined fields

-- Drop the data column (flat columns already contain the same data)
ALTER TABLE microblog_item DROP COLUMN IF EXISTS data;

-- Make optional fields nullable (aligning SQL with Rust Option<String> types)
ALTER TABLE microblog_item ALTER COLUMN link DROP NOT NULL;
ALTER TABLE microblog_item ALTER COLUMN image DROP NOT NULL;
ALTER TABLE microblog_item ALTER COLUMN extract DROP NOT NULL;
