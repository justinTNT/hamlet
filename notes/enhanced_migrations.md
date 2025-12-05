# Basic Schema Generation

**Priority**: Low (simple table creation)
**Use Case**: Generate simple database tables from domain models

## Core Concept

Generate basic database tables for domain models. Simple JSONB storage with minimal complexity - user manages their own schema evolution.

## Domain Model Tables

```rust
// models/comments/comments_domain.rs
pub struct Comment {
    pub id: String,
    pub text: String,
    pub author_id: String,
    pub created_at: i64,
}

// Generates simple table:
CREATE TABLE comments (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    host TEXT NOT NULL,  -- Tenant isolation
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

// models/users/users_domain.rs
pub struct User {
    pub id: String,
    pub email: String,
    pub name: String,
}

// Generates:
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    host TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## Generated Migration

**BuildAmp detects change and generates**:
```sql
-- migrations/004_add_comment_upvotes.sql
-- Auto-generated from Comment type changes
-- Generated: 2024-12-04 10:30:15

ALTER TABLE item_comments ADD COLUMN upvotes INTEGER DEFAULT 0 NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_upvotes ON item_comments(upvotes);

-- Rollback
-- ALTER TABLE item_comments DROP COLUMN upvotes;
-- DROP INDEX IF EXISTS idx_comments_upvotes;
```

## Migration Annotations

```rust
#[derive(BuildAmpDomain)]
pub struct User {
    pub id: String,
    
    #[migration(default = "''", not_null = true)]
    pub email: String,  // Safe default for NOT NULL columns
    
    #[migration(rename_from = "old_name")]
    pub display_name: String,  // Column rename instead of drop/add
    
    #[migration(index = true)]
    pub created_at: i64,  // Auto-generate index
    
    #[migration(unique = true)]
    pub username: String,  // Unique constraint
    
    #[migration(ignore)]
    pub computed_field: String,  // Don't create DB column
}

#[derive(BuildAmpDomain)]
#[table(name = "users", indexes = ["email", "created_at DESC"])]
pub struct User {
    // Custom table name and composite indexes
}
```

## Schema Tracking

**BuildAmp maintains schema state**:
```rust
// .buildamp/schema_state.json - tracks current schema
{
  "tables": {
    "item_comments": {
      "columns": {
        "id": { "type": "TEXT", "primary_key": true },
        "text": { "type": "TEXT", "not_null": true },
        "author_id": { "type": "TEXT", "not_null": true },
        "created_at": { "type": "BIGINT", "not_null": true },
        "upvotes": { "type": "INTEGER", "default": "0", "not_null": true }
      },
      "indexes": [
        "idx_comments_author_id",
        "idx_comments_created_at",
        "idx_comments_upvotes"
      ]
    }
  },
  "version": "004",
  "last_generated": "2024-12-04T10:30:15Z"
}
```

## Migration Types

### 1. Add Column
```rust
// Adding optional field
#[migration(default = "NULL")]
pub profile_image: Option<String>,

// Adding required field with default
#[migration(default = "0")]
pub score: i32,
```

### 2. Remove Column  
```rust
// Remove field from struct
// BuildAmp detects and generates DROP COLUMN
// Option: #[migration(deprecated)] to mark for removal
```

### 3. Rename Column
```rust
#[migration(rename_from = "old_field_name")]
pub new_field_name: String,
```

### 4. Change Type
```rust
// String -> i64 (with data conversion)
#[migration(convert_from = "TEXT", convert_sql = "CAST(%s AS BIGINT)")]
pub timestamp: i64,

// Enum changes
#[migration(enum_migration = "add_values")]
pub status: UserStatus,  // Added new enum variants
```

### 5. Add Indexes
```rust
#[migration(index = true, unique = false)]
pub email: String,

#[migration(composite_index = ["user_id", "created_at"])]
pub user_activity_log: UserActivityLog,
```

## Migration Generation Process

**Build-time detection**:
```bash
cargo run --bin buildamp migrate

# 1. Parse current Rust types
# 2. Compare with schema_state.json
# 3. Generate migration SQL for differences  
# 4. Update schema_state.json
# 5. Create numbered migration file
```

**Generated migration structure**:
```sql
-- migrations/005_user_email_unique.sql
-- Generated from User type changes
-- Field: email - added unique constraint

BEGIN;

-- Forward migration
ALTER TABLE users ADD CONSTRAINT unique_user_email UNIQUE (email);

-- Validation (optional)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_user_email'
    ) THEN
        RAISE EXCEPTION 'Migration failed: unique constraint not created';
    END IF;
END $$;

COMMIT;

-- Rollback instructions (commented)
-- ALTER TABLE users DROP CONSTRAINT unique_user_email;
```

## Complex Migration Support

**Custom migration logic**:
```rust
#[derive(BuildAmpDomain)]
#[migration(custom_sql = "migrations/custom/normalize_user_data.sql")]
pub struct User {
    // Complex data transformation that needs custom SQL
}
```

**Data migrations alongside schema**:
```sql
-- migrations/006_normalize_tags.sql  
-- Schema change
ALTER TABLE tags ADD COLUMN normalized_name TEXT;

-- Data migration
UPDATE tags SET normalized_name = LOWER(TRIM(name));

-- Add constraint after data migration
ALTER TABLE tags ALTER COLUMN normalized_name SET NOT NULL;
CREATE UNIQUE INDEX idx_tags_normalized ON tags(host, normalized_name);
```

## Safety Features

**Destructive change warnings**:
```rust
// Warns before generating DROP COLUMN
#[migration(confirm_destructive = true)]
// Requires explicit confirmation for data loss operations
```

**Rollback generation**:
```sql
-- Every migration includes rollback instructions
-- migrations/rollback/005_rollback.sql
ALTER TABLE users DROP CONSTRAINT unique_user_email;
```

**Migration validation**:
```rust
// Optional validation after migration
#[migration(validate = "SELECT COUNT(*) FROM users WHERE email IS NULL")]
pub struct User {
    pub email: String,  // Validates no null emails after migration
}
```

## Development Workflow

```bash
# 1. Modify Rust types
# 2. Generate migration
cargo run --bin buildamp migrate --generate

# 3. Review generated SQL
cat migrations/006_add_user_settings.sql

# 4. Apply migration (dev)
cargo run --bin buildamp migrate --apply

# 5. Test rollback capability  
cargo run --bin buildamp migrate --rollback

# 6. Commit migration with code changes
git add migrations/ src/ .buildamp/schema_state.json
git commit -m "Add user settings with DB migration"
```

## Integration Points

- **Background events**: Migration status events
- **Key-value store**: Track migration progress  
- **Webhooks**: Notify external systems of schema changes
- **Structured logging**: Migration audit trail

## Benefits

- **No schema drift**: Database always matches code
- **Safe migrations**: Automatic rollback generation
- **Team coordination**: Migrations in version control
- **Type safety**: Invalid schemas caught at build time
- **Audit trail**: Complete history of schema evolution

## Limitations

- **Complex transformations**: May need custom SQL
- **Production safety**: Requires careful review of generated SQL
- **Large tables**: May need chunked migrations for performance
- **Cross-table constraints**: Complex relationships need manual handling

## Implementation Notes

- Start with simple add/remove column detection
- Generate reversible migrations by default
- Include migration validation checks
- Store schema snapshots for diff generation
- Support both dev (auto-apply) and prod (review-first) workflows