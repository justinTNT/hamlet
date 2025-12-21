-- Convert microblog_items to JsonBlob structure
-- Migrate from flat columns to structured JSONB data field

-- Add the new JSONB data column
ALTER TABLE microblog_items ADD COLUMN IF NOT EXISTS data JSONB;

-- Add view_count column
ALTER TABLE microblog_items ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

-- Migrate existing data to JSONB structure (only if data column is NULL)
UPDATE microblog_items 
SET data = json_build_object(
    'title', title,
    'link', COALESCE(link, ''),
    'image', COALESCE(image, ''), 
    'extract', COALESCE(extract, ''),
    'owner_comment', owner_comment
)
WHERE data IS NULL;

-- Verify data migration (all rows should have non-null data)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM microblog_items WHERE data IS NULL) THEN
        RAISE EXCEPTION 'Data migration failed: found rows with NULL data column';
    END IF;
    
    -- Log successful migration
    RAISE NOTICE 'Successfully migrated % rows to JSONB structure', 
        (SELECT COUNT(*) FROM microblog_items);
END $$;

-- Make data column NOT NULL after successful migration
ALTER TABLE microblog_items ALTER COLUMN data SET NOT NULL;

-- Note: item_tags table already exists from migration 002_tags.sql
-- No tag migration needed since tags column doesn't exist in current schema

-- Drop the old flat columns (commented out for safety - uncomment after verification)
-- ALTER TABLE microblog_items DROP COLUMN IF EXISTS title;
-- ALTER TABLE microblog_items DROP COLUMN IF EXISTS link;
-- ALTER TABLE microblog_items DROP COLUMN IF EXISTS image;
-- ALTER TABLE microblog_items DROP COLUMN IF EXISTS extract; 
-- ALTER TABLE microblog_items DROP COLUMN IF EXISTS owner_comment;


-- The table now matches the Rust structure:
-- pub struct MicroblogItem {
--     pub id: DatabaseId<String>,           // id column
--     pub data: JsonBlob<MicroblogItemData>, // data JSONB column
--     pub created_at: Timestamp,            // created_at column  
--     pub view_count: i32,                  // view_count column
-- }
-- 
-- pub struct ItemTag {
--     pub item_id: String,                  // item_id column
--     pub tag_id: DatabaseId<String>,       // tag_id column
-- }