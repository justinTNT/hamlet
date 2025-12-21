-- Microblog Items
CREATE TABLE IF NOT EXISTS microblog_items (
    id TEXT PRIMARY KEY,
    host TEXT NOT NULL,
    title TEXT NOT NULL,
    link TEXT NOT NULL,
    image TEXT NOT NULL,
    extract TEXT NOT NULL,
    owner_comment TEXT NOT NULL,
    timestamp BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_items_host ON microblog_items(host);
CREATE INDEX IF NOT EXISTS idx_items_timestamp ON microblog_items(timestamp DESC);

-- Item Comments
CREATE TABLE IF NOT EXISTS item_comments (
    id TEXT PRIMARY KEY,
    host TEXT NOT NULL,
    item_id TEXT NOT NULL REFERENCES microblog_items(id),
    guest_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    text TEXT NOT NULL,
    timestamp BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_item_id ON item_comments(item_id);

-- Guests
CREATE TABLE IF NOT EXISTS guests (
    id TEXT PRIMARY KEY,
    host TEXT NOT NULL,
    name TEXT NOT NULL
);

-- Seed Data (Idempotent)
INSERT INTO microblog_items (id, host, title, link, image, extract, owner_comment, timestamp)
VALUES (
    '1',
    'localhost',
    'Welcome to localhost',
    'https://example.com',
    'https://placehold.co/600x400',
    'This is the first post on this microblog.',
    'Enjoy the feed!',
    1672531200000
) ON CONFLICT (id) DO NOTHING;
