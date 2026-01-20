-- Migration: Convert microblog_item.owner_comment and extract from TEXT to RichContent (JSONB)
-- This converts plain text to the RichContent format used by ProseMirror/TipTap
-- Idempotent: only converts if columns are still TEXT type

-- Convert owner_comment to JSONB
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'microblog_item'
        AND column_name = 'owner_comment'
        AND data_type = 'text'
    ) THEN
        ALTER TABLE microblog_item
        ALTER COLUMN owner_comment TYPE JSONB
        USING jsonb_build_object(
            'type', 'doc',
            'content', jsonb_build_array(
                jsonb_build_object(
                    'type', 'paragraph',
                    'content', jsonb_build_array(
                        jsonb_build_object('type', 'text', 'text', owner_comment)
                    )
                )
            )
        );
        RAISE NOTICE 'Converted microblog_item.owner_comment from TEXT to JSONB';
    ELSE
        RAISE NOTICE 'microblog_item.owner_comment is already JSONB, skipping conversion';
    END IF;
END $$;

-- Convert extract to JSONB (nullable field)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'microblog_item'
        AND column_name = 'extract'
        AND data_type = 'text'
    ) THEN
        -- For nullable extract, convert non-null values to RichContent, keep nulls as null
        ALTER TABLE microblog_item
        ALTER COLUMN extract TYPE JSONB
        USING CASE
            WHEN extract IS NULL OR extract = '' THEN NULL
            ELSE jsonb_build_object(
                'type', 'doc',
                'content', jsonb_build_array(
                    jsonb_build_object(
                        'type', 'paragraph',
                        'content', jsonb_build_array(
                            jsonb_build_object('type', 'text', 'text', extract)
                        )
                    )
                )
            )
        END;
        RAISE NOTICE 'Converted microblog_item.extract from TEXT to JSONB';
    ELSE
        RAISE NOTICE 'microblog_item.extract is already JSONB, skipping conversion';
    END IF;
END $$;
