# BuildAmp Code Readability Review

*Focusing purely on human readability and maintainability concerns*

## 🔍 **Macro & Convention Clarity Issues**

### **Inconsistent Naming Patterns**
```rust
// Mixed naming schemes create confusion
#[buildamp_domain]  // snake_case
#[buildamp_api]     // snake_case  
#[api(path = "GetFeed")]  // but then camelCase paths
```
**Human preference**: Pick one convention. Either `#[buildamp(domain)]` or separate macros, but be consistent.

### **Magic Behavior Not Obvious**
```rust
#[buildamp_domain] 
pub struct MicroblogItem { ... }
```
**Problem**: Nothing in the code tells you what `#[buildamp_domain]` actually does. Is it serialization? Validation? Code generation?

**Human preference**: Either inline docs (`/// Generates Elm types + JSON codecs`) or more descriptive names (`#[generate_elm_bindings]`).

## 📁 **File Organization Confusion**

### **Scattered Related Code**
```
src/models/feed.rs       // MicroblogItem + API requests
src/models/comments.rs   // But comments are IN MicroblogItem?  
src/models/fingerprint.rs // Completely different concern
```
**Human preference**: Either group by feature (`feed/` folder with `item.rs`, `api.rs`) or by type (`domain.rs`, `api.rs`, `utils.rs`).

### **File Contents Don't Match Names**
`feed.rs` contains both domain objects AND API definitions. Should be `feed_api.rs` or split into separate files.

## 🔗 **Import & Dependency Clarity**

### **Unclear Module Dependencies**
```rust
use crate::models::tags::Tag;
use crate::models::comments::ItemComment;
```
**Problem**: Forces readers to mentally map the module tree. Which models depend on which others?

**Human preference**: Either co-locate dependent types or use explicit re-exports (`pub use crate::models::*;`).

### **Plugin Configuration Mystery**
```javascript
buildampPlugin({
    crateDir: path.resolve(__dirname, '../../'),
    wasmOutDirWeb: 'pkg-web',
    wasmOutDirNode: 'pkg-node'
})
```
**Problem**: Default paths are magic. Why `../../`? What if my structure is different?

**Human preference**: Explicit defaults in code comments or auto-detection with fallbacks.

## 🔧 **Function & Logic Readability**

### **Server Context Hydration Magic**
```javascript
const contextType = endpointDef.context_type;
const contextDefs = contextManifest.filter(c => c.type === contextType);
```
**Problem**: Manifest-driven logic is opaque. Hard to debug when it breaks.

**Human preference**: Either inline documentation explaining the manifest format, or wrapper functions with descriptive names (`fetchTagsForContext()`, `fetchGuestBySession()`).

### **Error Handling Inconsistency** 
```rust
.expect("Invalid fingerprint data");  // Panics in WASM
```
```javascript
} catch (e) {
    console.error("Failed to generate session ID:", e);
    window.HAMLET_SESSION_ID = "fallback-session-id";
}
```
**Problem**: Rust panics vs JavaScript graceful fallbacks. Inconsistent error philosophy.

## 🎨 **Visual & Cognitive Load**

### **Dense Type Definitions**
```rust
#[buildamp_api]
#[api(path = "SubmitItem", bundle_with = "SubmitItemData")]
pub struct SubmitItemReq {
    #[serde(default)]
    pub host: String,
    #[api(Required)]
    pub title: String,
    // ... many more fields
}
```
**Problem**: Heavy annotation noise. Hard to see the actual data structure.

**Human preference**: Group annotations or use builder patterns to separate concerns.

### **Fingerprinting Algorithm Opacity**
```rust
let mut combined = Vec::new();
combined.extend_from_slice(canvas_hash.as_bytes());
combined.extend_from_slice(webgl_hash.as_bytes());
// ...
```
**Problem**: No comments explaining WHY this specific combination or order matters.

**Human preference**: Comments explaining the entropy strategy and collision resistance approach.

## 🔄 **State & Flow Clarity**

### **Plugin Lifecycle Confusion**
```javascript
configureServer(server) {
    buildWasm();  // When does this happen?
    // Watch Rust files
    watcher.on('change', async (file) => {
        await buildWasm();  // And this?
        server.ws.send({ type: 'full-reload' });
    });
}
```
**Problem**: Build timing is unclear. What happens on first run vs rebuilds?

**Human preference**: Clear state machine or documented lifecycle phases.

### **Session ID Flow Opacity**
Session IDs are generated in browser, sent in headers, used in server, but the full flow isn't obvious from any single file.

**Human preference**: Either sequence diagrams in docs or "data flow" comments tracing the ID lifecycle.

## 💭 **Human Cognitive Preferences**

**Most developers prefer**:
1. **Explicit over magical** - Show what's happening, even if verbose
2. **Co-located related code** - Don't make people jump between files for one feature
3. **Consistent error handling** - Pick panic vs graceful degradation and stick to it
4. **Self-documenting names** - `generateSessionIdFromBrowserFingerprint()` vs `create_session_id()`
5. **Clear dependencies** - Obvious what depends on what
6. **Debuggable abstractions** - Easy to trace when things break

**The core code is solid** - these are purely human readability preferences that would make the codebase more approachable for new contributors.