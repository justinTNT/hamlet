-- Tags
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host TEXT NOT NULL,
    name TEXT NOT NULL,
    UNIQUE(host, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_host ON tags(host);

-- Item Tags (Many-to-Many)
CREATE TABLE IF NOT EXISTS item_tags (
    item_id TEXT NOT NULL REFERENCES microblog_items(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_item_tags_tag_id ON item_tags(tag_id);
