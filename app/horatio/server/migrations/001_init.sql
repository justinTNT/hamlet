-- Microblog Items
CREATE TABLE IF NOT EXISTS microblog_item (
    id TEXT PRIMARY KEY,
    host TEXT NOT NULL,
    title TEXT NOT NULL,
    link TEXT NOT NULL,
    image TEXT NOT NULL,
    extract TEXT NOT NULL,
    owner_comment TEXT NOT NULL,
    created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_items_host ON microblog_item(host);
CREATE INDEX IF NOT EXISTS idx_items_timestamp ON microblog_item(created_at DESC);

-- Item Comments
CREATE TABLE IF NOT EXISTS item_comment (
    id TEXT PRIMARY KEY,
    host TEXT NOT NULL,
    item_id TEXT NOT NULL REFERENCES microblog_item(id),
    guest_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_item_id ON item_comment(item_id);

-- Guests
CREATE TABLE IF NOT EXISTS guest (
    id TEXT PRIMARY KEY,
    host TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at BIGINT NOT NULL
);

-- Seed Data (Idempotent)
INSERT INTO microblog_item (id, host, title, link, image, extract, owner_comment, created_at)
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
