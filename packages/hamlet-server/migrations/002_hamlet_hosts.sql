CREATE TABLE IF NOT EXISTS hamlet_hosts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    hostname TEXT NOT NULL UNIQUE,
    project TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
