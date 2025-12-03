# Database Type System Design

## Overview

BuildAmp now provides explicit database field types that make schema intentions clear in the Rust type system while supporting automatic schema generation and validation.

## Type System

### Core Types

```rust
// Required field - must be provided, cannot be NULL
pub struct Required<T>(pub T);

// Optional field - can be omitted or NULL  
pub struct Optional<T>(pub Option<T>);

// Field with database default - can omit on insert
pub struct Default<T, const DEFAULT: &'static str>;

// Database-generated field - never provided by user
pub struct Generated<T>(pub T);
```

### Usage Examples

```rust
#[buildamp_domain]
pub struct MicroblogItem {
    pub id: DatabaseId<String>,              // Generated primary key
    pub title: Required<String>,             // NOT NULL, no default
    pub link: Optional<String>,              // NULLable, no default
    pub image: Optional<String>,             // NULLable, no default  
    pub owner_comment: Default<String, "LGTM">, // NOT NULL DEFAULT 'LGTM'
    pub timestamp: Timestamp,                // Generated timestamp
}
```

### SQL Mapping

| Rust Type | SQL Schema | Insert Behavior |
|-----------|------------|-----------------|
| `Required<String>` | `field VARCHAR NOT NULL` | Must provide value |
| `Optional<String>` | `field VARCHAR NULL` | Can omit (becomes NULL) |
| `Default<String, "LGTM">` | `field VARCHAR NOT NULL DEFAULT 'LGTM'` | Can omit (uses default) |
| `Generated<u64>` | `field BIGINT NOT NULL DEFAULT nextval(...)` | Never provided by user |

## Ergonomic Features

### Transparent Access
```rust
let title: Required<String> = "My Post".to_string().into();
println!("{}", *title); // Direct access via Deref
```

### From Conversions
```rust
// Natural construction
let required: Required<String> = "value".to_string().into();
let optional: Optional<String> = "value".to_string().into();
let optional_none: Optional<String> = None.into();
let default: Default<String, "LGTM"> = "custom".to_string().into();
```

### Type Aliases
```rust
pub type DatabaseId<T> = Generated<T>;     // Primary keys
pub type AutoIncrement<T> = Generated<T>;  // Auto-increment fields
pub type Timestamp = Generated<u64>;       // Generated timestamps
```

## Advantages

### 1. **Self-Documenting Schema**
The database schema is explicit in the domain model:
```rust
pub owner_comment: Default<String, "LGTM">, // Clear default value
pub parent_id: Optional<String>,             // Clear nullable field
```

### 2. **Compile-Time Validation**
```rust
// This won't compile - can't insert into Generated field
let item = MicroblogItem {
    id: "user-provided-id".into(), // ❌ Compile error
    title: "My Post".into(),
    // ...
};
```

### 3. **Schema Generation**
Macros can introspect these types to generate:
- SQL DDL statements
- Database migrations  
- API validation rules
- Elm type definitions

### 4. **Clear Rust Semantics**
- `Required<T>` - always contains T
- `Optional<T>` - contains Option<T>  
- `Default<T, V>` - contains T, with compile-time default V
- `Generated<T>` - contains T, but user never sets it

## Implementation Status

✅ **Core types implemented** - All wrapper types with ergonomic access  
✅ **Deref traits** - Transparent access to inner values  
✅ **From conversions** - Natural construction syntax  
✅ **Type aliases** - Common patterns like DatabaseId, Timestamp  
✅ **Unit tests** - Verify ergonomic usage works correctly  

🚧 **Next Steps:**
- Macro integration for schema introspection  
- SQL DDL generation from types
- Migration generation
- Update existing models to use new types

## Design Decisions

### Why const generics for defaults?
```rust
Default<String, "LGTM">  // Default value is part of the type
```
This ensures the default value is:
- Compile-time validated
- Part of type introspection  
- Visible in IDE autocompletion
- Impossible to forget or misconfigure

### Why repr(transparent)?
```rust
#[repr(transparent)]
pub struct Required<T>(pub T);
```
This ensures zero-cost abstractions - the wrapper types have no runtime overhead and identical memory layout to the inner type.

### Why separate Optional from Rust's Option?
```rust
pub struct Optional<T>(pub Option<T>);  // vs just Option<T>
```
This makes database intent explicit and allows macro introspection to distinguish between "this field is nullable in the database" vs "this is just an optional parameter in Rust code".