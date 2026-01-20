-- Migration: Convert item_comment.text from TEXT to RichContent (JSONB)
-- This converts plain text comments to the RichContent format used by ProseMirror/TipTap
-- Idempotent: only converts if column is still TEXT type

DO $$
BEGIN
    -- Only alter if column is TEXT (not already JSONB)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'item_comment'
        AND column_name = 'text'
        AND data_type = 'text'
    ) THEN
        ALTER TABLE item_comment
        ALTER COLUMN text TYPE JSONB
        USING jsonb_build_object(
            'type', 'doc',
            'content', jsonb_build_array(
                jsonb_build_object(
                    'type', 'paragraph',
                    'content', jsonb_build_array(
                        jsonb_build_object('type', 'text', 'text', text)
                    )
                )
            )
        );
        RAISE NOTICE 'Converted item_comment.text from TEXT to JSONB';
    ELSE
        RAISE NOTICE 'item_comment.text is already JSONB, skipping conversion';
    END IF;
END $$;
