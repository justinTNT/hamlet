-- Migration: Explicit Timestamp Types
--
-- This migration transitions from auto-managed timestamps to explicit types:
-- - CreateTimestamp: TIMESTAMP WITH TIME ZONE (was BIGINT epoch millis)
-- - UpdateTimestamp: TIMESTAMP WITH TIME ZONE (nullable, app-managed)
-- - SoftDelete: BIGINT (nullable, unchanged)
--
-- Also adds missing columns and makes nullable fields properly nullable.
--
-- NOTE: This migration is idempotent - safe to run multiple times.

BEGIN;

-- ============================================================================
-- 1. Drop old auto-update triggers and function
-- ============================================================================

DROP TRIGGER IF EXISTS update_guest_updated_at ON guest;
DROP TRIGGER IF EXISTS update_item_comment_updated_at ON item_comment;
DROP TRIGGER IF EXISTS update_item_tag_updated_at ON item_tag;
DROP TRIGGER IF EXISTS update_microblog_item_updated_at ON microblog_item;
DROP TRIGGER IF EXISTS update_tag_updated_at ON tag;
DROP FUNCTION IF EXISTS update_updated_at_column();

-- ============================================================================
-- 2. Convert created_at from BIGINT (epoch millis) to TIMESTAMP WITH TIME ZONE
--    Only convert if the column is still BIGINT (makes migration idempotent)
-- ============================================================================

DO $$
BEGIN
    -- guest.created_at
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'guest' AND column_name = 'created_at' AND data_type = 'bigint'
    ) THEN
        ALTER TABLE guest ALTER COLUMN created_at DROP DEFAULT;
        ALTER TABLE guest ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE
            USING to_timestamp(created_at / 1000.0);
    END IF;
    ALTER TABLE guest ALTER COLUMN created_at SET DEFAULT NOW();

    -- microblog_item.created_at
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'microblog_item' AND column_name = 'created_at' AND data_type = 'bigint'
    ) THEN
        ALTER TABLE microblog_item ALTER COLUMN created_at DROP DEFAULT;
        ALTER TABLE microblog_item ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE
            USING to_timestamp(created_at / 1000.0);
    END IF;
    ALTER TABLE microblog_item ALTER COLUMN created_at SET DEFAULT NOW();

    -- tag.created_at
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tag' AND column_name = 'created_at' AND data_type = 'bigint'
    ) THEN
        ALTER TABLE tag ALTER COLUMN created_at DROP DEFAULT;
        ALTER TABLE tag ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE
            USING to_timestamp(created_at / 1000.0);
    END IF;
    ALTER TABLE tag ALTER COLUMN created_at SET DEFAULT NOW();

    -- item_comment.created_at
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'item_comment' AND column_name = 'created_at' AND data_type = 'bigint'
    ) THEN
        ALTER TABLE item_comment ALTER COLUMN created_at DROP DEFAULT;
        ALTER TABLE item_comment ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE
            USING to_timestamp(created_at / 1000.0);
    END IF;
    ALTER TABLE item_comment ALTER COLUMN created_at SET DEFAULT NOW();
END $$;

-- ============================================================================
-- 3. Handle updated_at - ensure nullable, drop default (now app-managed)
-- ============================================================================

DO $$
BEGIN
    -- microblog_item.updated_at - ensure nullable and no default
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'microblog_item' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE microblog_item ALTER COLUMN updated_at DROP DEFAULT;
        ALTER TABLE microblog_item ALTER COLUMN updated_at DROP NOT NULL;
    END IF;
END $$;

-- Drop updated_at from tables that no longer have it in the model
ALTER TABLE guest DROP COLUMN IF EXISTS updated_at;
ALTER TABLE tag DROP COLUMN IF EXISTS updated_at;

-- ============================================================================
-- 4. Add missing columns to guest
-- ============================================================================

-- Add picture column (required, default empty string for existing rows)
ALTER TABLE guest ADD COLUMN IF NOT EXISTS picture TEXT;
UPDATE guest SET picture = '' WHERE picture IS NULL;
ALTER TABLE guest ALTER COLUMN picture SET NOT NULL;

-- Add session_id column (required, generate UUIDs for existing rows)
ALTER TABLE guest ADD COLUMN IF NOT EXISTS session_id TEXT;
UPDATE guest SET session_id = gen_random_uuid()::text WHERE session_id IS NULL;
ALTER TABLE guest ALTER COLUMN session_id SET NOT NULL;

-- ============================================================================
-- 5. Make Maybe fields nullable (idempotent - DROP NOT NULL is safe if already nullable)
-- ============================================================================

DO $$
BEGIN
    -- microblog_item: link, image, extract should be nullable
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'microblog_item' AND column_name = 'link' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE microblog_item ALTER COLUMN link DROP NOT NULL;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'microblog_item' AND column_name = 'image' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE microblog_item ALTER COLUMN image DROP NOT NULL;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'microblog_item' AND column_name = 'extract' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE microblog_item ALTER COLUMN extract DROP NOT NULL;
    END IF;

    -- item_comment: parent_id should be nullable (for top-level comments)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'item_comment' AND column_name = 'parent_id' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE item_comment ALTER COLUMN parent_id DROP NOT NULL;
    END IF;
END $$;

-- ============================================================================
-- 6. Ensure deleted_at is nullable BIGINT (SoftDelete type)
--    These are already nullable in most cases, but ensure consistency
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guest' AND column_name = 'deleted_at' AND is_nullable = 'NO') THEN
        ALTER TABLE guest ALTER COLUMN deleted_at DROP NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'microblog_item' AND column_name = 'deleted_at' AND is_nullable = 'NO') THEN
        ALTER TABLE microblog_item ALTER COLUMN deleted_at DROP NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tag' AND column_name = 'deleted_at' AND is_nullable = 'NO') THEN
        ALTER TABLE tag ALTER COLUMN deleted_at DROP NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'item_comment' AND column_name = 'deleted_at' AND is_nullable = 'NO') THEN
        ALTER TABLE item_comment ALTER COLUMN deleted_at DROP NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'item_tag' AND column_name = 'deleted_at' AND is_nullable = 'NO') THEN
        ALTER TABLE item_tag ALTER COLUMN deleted_at DROP NOT NULL;
    END IF;
END $$;

-- ============================================================================
-- 7. Set default UUID generation for primary keys
-- ============================================================================

ALTER TABLE guest ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE microblog_item ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE tag ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE item_comment ALTER COLUMN id SET DEFAULT gen_random_uuid();

COMMIT;
