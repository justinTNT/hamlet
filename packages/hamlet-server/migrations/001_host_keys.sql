-- Framework migration: hamlet_host_keys table
-- Stores host-level API keys for auth-gated endpoints.
-- Column named target_host (not host) to avoid tenant isolation machinery.

CREATE TABLE IF NOT EXISTS hamlet_host_keys (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    target_host TEXT NOT NULL,
    key TEXT NOT NULL,
    label TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    revoked_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hamlet_host_keys_active
    ON hamlet_host_keys(target_host) WHERE revoked_at IS NULL;
