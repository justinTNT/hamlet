-- Enable UUID extension for auto-generated IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set default UUID generation for item_comments (convert UUID to TEXT)
ALTER TABLE item_comments ALTER COLUMN id SET DEFAULT uuid_generate_v4()::TEXT;