# BuildAmp File Organization Strategy

**Core Principle**: Clean separation between domain-specific models and universal system concerns, with minimal decorations and filename-based code generation.

## File Structure

```
models/
  domain/
    # Domain-specific models - everything for one business concept
    comments_db.rs         # Database persistence model
    comments_api.rs        # API request/response endpoints  
    comments_sse.rs        # Server-sent events for comments
    comments_ws.rs         # WebSocket messages for comments
    comments_sto.rs        # Client storage models for comments
    
    users_db.rs           # Database persistence model
    users_api.rs          # API request/response endpoints
    users_sse.rs          # Server-sent events for users
    users_sto.rs          # Client storage models for users
    
    posts_db.rs           # Database persistence model  
    posts_api.rs          # API request/response endpoints
    posts_sse.rs          # Server-sent events for posts
    posts_sto.rs          # Client storage models for posts
    
  universal/
    # Cross-cutting system concerns not tied to specific domains
    system_sse.rs         # SystemAlert, GlobalNotification, MaintenanceMode
    coordination_ws.rs    # CursorPosition, TypingIndicator, PresenceUpdate
    client_sto.rs         # UserPreferences, UIState, ViewportState
    email_webhooks.rs     # SendGrid, Mailgun, Postmark integrations
    payment_webhooks.rs   # Stripe, PayPal, Square integrations  
    file_webhooks.rs      # Cloudinary, ImageKit, CDN integrations
    maintenance_events.rs # Background cleanup, digest generation
    notification_events.rs # Email sending, SMS, push notifications
```

## File Naming Convention

**Consistent suffixes indicate purpose**:
- `*_db.rs` → Database persistence models (JSONB storage)
- `*_api.rs` → API request/response endpoints
- `*_sse.rs` → Server-sent event types  
- `*_ws.rs` → WebSocket message types
- `*_sto.rs` → Client storage types (localStorage/sessionStorage)
- `*_webhooks.rs` → External service integrations
- `*_events.rs` → Background event queue types

## Code Generation Strategy

**Filename-based detection**: BuildAmp scans file paths to determine what code to generate.

### Database Models (`*_db.rs`)
```rust
// models/domain/comments_db.rs
pub struct Comment {
    pub id: String,
    pub text: String,
    pub author_id: String,
    pub created_at: i64,
}

// Generates simple JSONB table:
// CREATE TABLE comments (id TEXT PRIMARY KEY, data JSONB, host TEXT, created_at TIMESTAMP, updated_at TIMESTAMP);
```

### API Endpoints (`*_api.rs`)  
```rust
// models/domain/comments_api.rs
#[GET("/api/comments/{comment_id}")]
pub struct GetCommentReq {
    pub comment_id: String,        // Path parameter
    pub include_replies: bool,     // Query parameter
}

#[POST("/api/comments")]
pub struct SubmitCommentReq {
    pub text: String,              // JSON body
    pub item_id: String,           // JSON body  
}
```

### Server-Sent Events (`*_sse.rs`)
```rust
// models/domain/comments_sse.rs  
pub struct CommentAdded {
    pub comment_id: String,
    pub item_id: String,
    pub author_name: String,
    pub text: String,
    pub timestamp: i64,
}

// models/universal/system_sse.rs
pub struct SystemAlert {
    pub message: String,
    pub severity: String,
    pub expires_at: i64,
}
```

### WebSocket Messages (`*_ws.rs`)
```rust
// models/domain/comments_ws.rs
pub struct LiveCommentEdit {
    pub comment_id: String,
    pub user_id: String,
    pub text_delta: String,
    pub cursor_position: u32,
}

// models/universal/coordination_ws.rs
pub struct CursorPosition {
    pub x: i32,
    pub y: i32,
    pub user_id: String,
    pub item_id: String,
}
```

### Client Storage (`*_sto.rs`)
```rust
// models/domain/comments_sto.rs
pub struct CommentDraft {
    pub text: String,
    pub item_id: String,
    pub last_saved: i64,
}

// models/universal/client_sto.rs  
pub struct UserPreferences {
    pub theme: String,
    pub notifications: bool,
    pub language: String,
}
```

### External Webhooks (`*_webhooks.rs`)
```rust
// models/universal/email_webhooks.rs
#[target(
    url = "https://api.sendgrid.com/v3/mail/send",
    method = "POST",
    auth = "Bearer {SENDGRID_API_KEY}"
)]
pub struct SendGridEmail {
    pub to: String,
    pub subject: String,
    pub html_content: String,
}
```

### Background Events (`*_events.rs`)
```rust
// models/universal/notification_events.rs
pub struct SendWelcomeEmail {
    pub email: String,
    pub name: String,
    pub delay_minutes: u32,
}

pub struct SendPasswordReset {
    pub user_id: String,
    pub reset_token: String,
    pub delay_minutes: u32,
}
```

## Design Principles

### 1. Minimal Decorations
- **Pure Rust structs** wherever possible
- **Only annotate when necessary**: APIs need routing (`#[GET("/path")]`), webhooks need targets (`#[target(...)]`)
- **No derive macros** - filename determines behavior

### 2. Filename-Based Generation
- **File location drives code generation** - no hidden configuration
- **Clear intent** - filename tells you exactly what the code does
- **Tool-agnostic** - any Rust tool can parse these files

### 3. Domain-Centric Organization  
- **Everything for a domain in one place** - all Comment models together
- **Universal concerns separated** - system-wide features clearly identified
- **Consistent naming** - same suffixes across all domains

### 4. Sweet Spot Focus
- **"Sprinkling on" real-time features** - not complex state management
- **Simple background processing** - not enterprise workflow engines
- **Basic file handling** - not complex media pipelines
- **Type-safe external calls** - not integration platforms

## Generated Code Examples

**Each file type generates appropriate Elm functions**:

```elm
-- From comments_api.rs
Api.submitComment : SubmitCommentReq -> Cmd Msg
Api.getComment : GetCommentReq -> Task Error GetCommentRes

-- From comments_sse.rs  
SSE.subscribeToComments : String -> (CommentAdded -> msg) -> Sub msg

-- From comments_ws.rs
WebSocket.sendLiveEdit : LiveCommentEdit -> Cmd Msg
WebSocket.subscribeLiveEdits : String -> (LiveCommentEdit -> msg) -> Sub msg

-- From comments_sto.rs
Storage.saveCommentDraft : CommentDraft -> Cmd Msg  
Storage.loadCommentDraft : String -> Task Never (Maybe CommentDraft)

-- From email_webhooks.rs
Webhook.sendGridEmail : SendGridEmail -> Cmd Msg

-- From notification_events.rs  
Events.scheduleSendWelcomeEmail : SendWelcomeEmail -> Cmd Msg
```

## Implementation Priority

**Focus on high-impact, low-complexity features first**:

1. **Background Event Queue** (foundational)
2. **Type-Safe Key-Value Store** (client coordination)  
3. **Server-Sent Events** (real-time updates)
4. **File/Blob Handling** (complete type-safe pipeline)
5. **Basic Schema Generation** (simple table creation)
6. **WebSocket Support** (gaming/collaboration) 
7. **External Webhooks** (external service integration)
8. **Structured Logging** (enhanced observability)

## Usage Philosophy

**BuildAmp is a helper, not a framework**:
- **Lots of client-server, little client-side** ✅ "We got you covered"
- **Little client-server, lots of client-side** 🤷‍♂️ "Not a worry - use other tools"  
- **Lots of both** ❌ "Wrong approach - you need specialized architecture"

**Perfect for**: Adding real-time features to content sites, background processing for APIs, simple file uploads, basic client storage.

**Not for**: Complex SPAs, offline-first apps, heavy client-side data processing, real-time collaborative platforms.

This file organization strategy ensures BuildAmp stays focused on its sweet spot while providing clean, predictable patterns for users to follow.