-- Tag table (singular to match Rust model)
CREATE TABLE IF NOT EXISTS tag (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at BIGINT NOT NULL,
    UNIQUE(host, name)
);

CREATE INDEX IF NOT EXISTS idx_tag_host ON tag(host);

-- ItemTag table (Many-to-Many)
CREATE TABLE IF NOT EXISTS item_tag (
    item_id TEXT NOT NULL REFERENCES microblog_item(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
    host TEXT NOT NULL,
    created_at BIGINT NOT NULL,
    PRIMARY KEY (item_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_item_tag_tag_id ON item_tag(tag_id);
CREATE INDEX IF NOT EXISTS idx_item_tag_host ON item_tag(host);
