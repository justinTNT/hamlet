use std::collections::HashMap;

/// Generate SQL CREATE TABLE statements from BuildAmp domain types
///
/// DEPRECATED: This function uses hardcoded table definitions.
/// Prefer using the JavaScript SQL generator which parses Rust models directly:
///   buildamp gen:sql  (or buildamp gen db)
///
/// The JavaScript generator in packages/buildamp/lib/generators/sql.js
/// automatically parses app/{project}/models/db/*.rs and generates
/// schema.sql with proper type mappings.
///
/// This WASM function is kept for backward compatibility but may be removed.
pub fn generate_migration_sql() -> String {
    let mut sql_statements = Vec::new();

    // DEPRECATED: These are hardcoded definitions that can get out of sync.
    // Use `buildamp gen db` instead which parses the actual Rust model files.
    let tables = get_domain_type_definitions();
    
    for (table_name, fields) in tables {
        let create_statement = generate_create_table(&table_name, &fields);
        sql_statements.push(create_statement);
    }
    
    sql_statements.join("\n\n")
}

fn get_domain_type_definitions() -> HashMap<String, Vec<FieldDefinition>> {
    let mut tables = HashMap::new();
    
    // MicroblogItem
    tables.insert("microblog_items".to_string(), vec![
        FieldDefinition {
            name: "id".to_string(),
            rust_type: RustType::DatabaseId,
            sql_type: SqlType::Text,
            constraints: vec![Constraint::PrimaryKey, Constraint::Default("gen_random_uuid()".to_string())],
        },
        FieldDefinition {
            name: "title".to_string(), 
            rust_type: RustType::Required,
            sql_type: SqlType::Text,
            constraints: vec![Constraint::NotNull],
        },
        FieldDefinition {
            name: "link".to_string(),
            rust_type: RustType::Optional, 
            sql_type: SqlType::Text,
            constraints: vec![], // Optional = no NOT NULL constraint
        },
        FieldDefinition {
            name: "image".to_string(),
            rust_type: RustType::Optional,
            sql_type: SqlType::Text, 
            constraints: vec![],
        },
        FieldDefinition {
            name: "extract".to_string(),
            rust_type: RustType::Optional,
            sql_type: SqlType::Text,
            constraints: vec![],
        },
        FieldDefinition {
            name: "owner_comment".to_string(),
            rust_type: RustType::DefaultValue("LGTM".to_string()),
            sql_type: SqlType::Text,
            constraints: vec![Constraint::NotNull, Constraint::Default("'LGTM'".to_string())],
        },
        FieldDefinition {
            name: "timestamp".to_string(),
            rust_type: RustType::Timestamp,
            sql_type: SqlType::BigInt,
            constraints: vec![Constraint::NotNull, Constraint::Default("extract(epoch from now())".to_string())],
        },
    ]);
    
    // ItemComment
    tables.insert("item_comments".to_string(), vec![
        FieldDefinition {
            name: "id".to_string(),
            rust_type: RustType::DatabaseId,
            sql_type: SqlType::Text,
            constraints: vec![Constraint::PrimaryKey, Constraint::Default("gen_random_uuid()".to_string())],
        },
        FieldDefinition {
            name: "item_id".to_string(),
            rust_type: RustType::Required,
            sql_type: SqlType::Text,
            constraints: vec![Constraint::NotNull],
        },
        FieldDefinition {
            name: "guest_id".to_string(),
            rust_type: RustType::Required,
            sql_type: SqlType::Text,
            constraints: vec![Constraint::NotNull],
        },
        FieldDefinition {
            name: "parent_id".to_string(),
            rust_type: RustType::Optional,
            sql_type: SqlType::Text,
            constraints: vec![], // Optional
        },
        FieldDefinition {
            name: "author_name".to_string(),
            rust_type: RustType::Required,
            sql_type: SqlType::Text,
            constraints: vec![Constraint::NotNull],
        },
        FieldDefinition {
            name: "text".to_string(),
            rust_type: RustType::Required,
            sql_type: SqlType::Text,
            constraints: vec![Constraint::NotNull],
        },
        FieldDefinition {
            name: "timestamp".to_string(),
            rust_type: RustType::Timestamp,
            sql_type: SqlType::BigInt,
            constraints: vec![Constraint::NotNull, Constraint::Default("extract(epoch from now())".to_string())],
        },
    ]);
    
    // Tag
    tables.insert("tags".to_string(), vec![
        FieldDefinition {
            name: "id".to_string(),
            rust_type: RustType::DatabaseId,
            sql_type: SqlType::Text,
            constraints: vec![Constraint::PrimaryKey, Constraint::Default("gen_random_uuid()".to_string())],
        },
        FieldDefinition {
            name: "name".to_string(),
            rust_type: RustType::Required,
            sql_type: SqlType::Text,
            constraints: vec![Constraint::NotNull],
        },
    ]);
    
    // Guest
    tables.insert("guests".to_string(), vec![
        FieldDefinition {
            name: "id".to_string(),
            rust_type: RustType::DatabaseId,
            sql_type: SqlType::Text,
            constraints: vec![Constraint::PrimaryKey, Constraint::Default("gen_random_uuid()".to_string())],
        },
        FieldDefinition {
            name: "session_id".to_string(),
            rust_type: RustType::Required,
            sql_type: SqlType::Text,
            constraints: vec![Constraint::NotNull],
        },
        FieldDefinition {
            name: "created_at".to_string(),
            rust_type: RustType::Timestamp,
            sql_type: SqlType::BigInt,
            constraints: vec![Constraint::NotNull, Constraint::Default("extract(epoch from now())".to_string())],
        },
    ]);
    
    tables
}

fn generate_create_table(table_name: &str, fields: &[FieldDefinition]) -> String {
    let mut sql = format!("-- Generated from Rust domain types\nCREATE TABLE {} (\n", table_name);
    
    let field_definitions: Vec<String> = fields.iter()
        .map(|field| generate_field_definition(field))
        .collect();
    
    sql.push_str(&format!("    {}", field_definitions.join(",\n    ")));
    sql.push_str("\n);");
    
    sql
}

fn generate_field_definition(field: &FieldDefinition) -> String {
    let mut parts = vec![field.name.clone()];
    
    // Add SQL type
    parts.push(field.sql_type.to_sql());
    
    // Add constraints
    for constraint in &field.constraints {
        parts.push(constraint.to_sql());
    }
    
    parts.join(" ")
}

#[derive(Debug, Clone)]
struct FieldDefinition {
    name: String,
    #[allow(dead_code)]
    rust_type: RustType,
    sql_type: SqlType,
    constraints: Vec<Constraint>,
}

#[derive(Debug, Clone)]
enum RustType {
    Required,           // String
    Optional,           // Option<String>
    #[allow(dead_code)]
    DefaultValue(String), // DefaultValue<T>
    DatabaseId,         // DatabaseId<T>
    Timestamp,          // Timestamp
}

#[derive(Debug, Clone)]
enum SqlType {
    Text,
    BigInt,
    #[allow(dead_code)]
    Uuid,
}

impl SqlType {
    fn to_sql(&self) -> String {
        match self {
            SqlType::Text => "TEXT".to_string(),
            SqlType::BigInt => "BIGINT".to_string(),
            SqlType::Uuid => "UUID".to_string(),
        }
    }
}

#[derive(Debug, Clone)]
enum Constraint {
    PrimaryKey,
    NotNull,
    Default(String),
}

impl Constraint {
    fn to_sql(&self) -> String {
        match self {
            Constraint::PrimaryKey => "PRIMARY KEY".to_string(),
            Constraint::NotNull => "NOT NULL".to_string(), 
            Constraint::Default(value) => format!("DEFAULT {}", value),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_migration_sql() {
        let sql = generate_migration_sql();
        
        // Should contain our tables
        assert!(sql.contains("CREATE TABLE microblog_items"));
        assert!(sql.contains("CREATE TABLE item_comments"));
        assert!(sql.contains("CREATE TABLE tags"));
        assert!(sql.contains("CREATE TABLE guests"));
        
        // Should respect our type mappings
        assert!(sql.contains("owner_comment TEXT NOT NULL DEFAULT 'LGTM'"));
        assert!(sql.contains("link TEXT,")); // Optional field, no NOT NULL
        assert!(sql.contains("timestamp BIGINT NOT NULL DEFAULT extract(epoch from now())"));
        assert!(sql.contains("id TEXT PRIMARY KEY DEFAULT gen_random_uuid()"));
    }
    
    #[test]
    fn test_field_generation() {
        let field = FieldDefinition {
            name: "test_field".to_string(),
            rust_type: RustType::DefaultValue("hello".to_string()),
            sql_type: SqlType::Text,
            constraints: vec![Constraint::NotNull, Constraint::Default("'hello'".to_string())],
        };
        
        let result = generate_field_definition(&field);
        assert_eq!(result, "test_field TEXT NOT NULL DEFAULT 'hello'");
    }
}