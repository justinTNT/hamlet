-- Migration: Add removed field to item_comment for admin moderation
-- This field allows admins to hide comments without soft-deleting them

ALTER TABLE item_comment
ADD COLUMN IF NOT EXISTS removed BOOLEAN NOT NULL DEFAULT false;

-- Index for finding removed comments
CREATE INDEX IF NOT EXISTS idx_item_comment_removed ON item_comment(removed);
