-- Framework migration: blob_metadata table
-- Stores metadata for uploaded blobs (files).
-- Actual file data lives on disk at storage/blobs/{host}/{id}.

CREATE TABLE IF NOT EXISTS blob_metadata (
    id TEXT PRIMARY KEY,
    host TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT,
    size_bytes INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blob_metadata_host ON blob_metadata(host);
