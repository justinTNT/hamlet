# Horatio Reader: BuildAmp Demonstration

The horatio microblog reader showcases BuildAmp's core value proposition: **eliminating JSON codec drudgery** through automatic type sharing between Rust and Elm.

## 🎯 What BuildAmp Solves

**The Problem:** Maintaining type-safe communication between Elm frontend and backend requires:
- Manual JSON decoders/encoders in Elm
- Keeping types synchronized between languages  
- Runtime errors when types drift
- Massive boilerplate for nested types

**BuildAmp Solution:** Single source of truth in Rust → automatic Elm types

## 📋 Live Demonstration

### 1. Manual vs BuildAmp Comparison

**See:** `apps/web/src/ManualExample.elm` - Shows the manual approach
- ~50 lines of boilerplate per type
- Error-prone field name typos
- No compile-time safety
- Maintenance nightmare

**Compare with:** `apps/web/src/Api/Schema.elm` - BuildAmp generated
- Zero boilerplate 
- Compile-time type safety
- Automatic maintenance

### 2. Type Evolution Demo

**Try this:** Add a field to `MicroblogItem` in `src/models/feed/feed_domain.rs`

```rust
#[buildamp_domain]  
pub struct MicroblogItem {
    // ... existing fields ...
    pub new_field: String,  // Add this
}
```

**Watch:** 
1. Save the Rust file
2. BuildAmp automatically regenerates Elm types
3. `Api.Schema.MicroblogItem` now includes `new_field`
4. No manual work required!

*Example: We added `view_count: i32` to demonstrate this*

### 3. Development Flow

**The Magic:**
```
Rust Change → WASM Compilation → Elm Type Generation → HMR Update
     ↓              ↓                    ↓               ↓
   1 second      automatic           automatic      browser updates
```

**Developer Experience:**
- Edit Rust types
- Elm immediately gets new types
- Compile-time errors if mismatched
- No manual JSON codec maintenance

## 🚀 Key Features Demonstrated

### Database Integration
- **Database types:** `DatabaseId<T>`, `DefaultValue<T>`, `Timestamp`
- **Manifest system:** Automatic context hydration from database
- **Migration generation:** SQL schema from Rust types

### Build Integration  
- **Vite plugin:** Seamless integration with existing workflows
- **File watching:** Rust changes trigger automatic rebuilds
- **HMR support:** Browser updates without refresh
- **Error handling:** Graceful fallbacks when builds fail

### Type Safety Pipeline
```
Rust Domain Model → BuildAmp Macros → Elm Types → JSON Codecs
       ↓                  ↓              ↓           ↓
  Single source      Code generation   Type safety  Zero runtime errors
```

## 🔄 How to Run the Demo

### Prerequisites
```bash
# Install dependencies
npm install
cargo install wasm-pack

# Setup database (optional)
docker-compose up -d
```

### Development Server
```bash
# Backend
cd apps/server && npm run dev

# Frontend  
cd apps/web && npm run dev

# Extension (optional)
cd apps/extension && npm run dev
```

### Live Coding Demo
1. **Show current types:** Open `apps/web/src/Api/Schema.elm`
2. **Edit Rust model:** Add field to `src/models/feed/feed_domain.rs`
3. **Watch regeneration:** Save file, observe automatic Elm updates
4. **Demonstrate usage:** Use new field in `apps/web/src/Main.elm`
5. **Show compile safety:** Try using non-existent field → compile error

## 💡 Value Proposition Summary

- Never write JSON decoders again
- Compile-time type safety with backend
- Automatic type updates when backend changes

**tuned to:**
- simple projects defined by internal complexity / minimal surface area
- Minimal surface area - just solves the boundary problem
- Works with existing tools (Vite, npm, cargo)
- Progressive enhancement - add features as needed

---

**The horatio reader proves BuildAmp delivers on its promise: "The obvious way to solve the Elm client↔server boundary."**
