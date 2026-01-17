# Schema-Driven Admin UI (The Compromise)

## Vision
The Admin UI is a **Generic Shell** that learns what to display by reading a `schema.json` file at runtime.
*   **No Code Gen:** We do not generate Elm code for every model.
*   **No WASM:** We do not use binary reflection or heavy clients.
*   **Just JSON:** The interface is defined by data.

## Architecture

### 1. The Schema Generator
We add a new generator to `packages/buildamp` (or repurpose `admin.js`) to output a JSON manifest of all Rust models.

**Output: `public/hamlet-schema.json`**
```json
{
  "models": {
    "User": {
      "primaryKey": "id",
      "fields": [
        { "name": "email", "type": "String", "required": true },
        { "name": "role", "type": "Enum", "options": ["Admin", "User"] },
        { "name": "active", "type": "Bool" }
      ]
    },
    "Comment": {
      "fields": [
        { "name": "body", "type": "Text" },
        { "name": "user_id", "type": "Reference", "target": "User" }
      ]
    }
  }
}
```

### 2. The Generic Admin Shell (Elm)
A single, static Elm application that never needs recompilation when models change.

*   **Init:** Fetch `hamlet-schema.json`.
*   **View:**
    *   Sidebar: Loop through `schema.models.keys` -> Render Links.
    *   Table: Loop through `schema.models[current].fields` -> Render Columns.
    *   Form: Loop through `schema.models[current].fields` -> Render Inputs.

### 3. The Backend (Node + Elm)
*   **API:** Standard generic endpoints:
    *   `GET /api/admin/:resource`
    *   `POST /api/admin/:resource`
    *   `PUT /api/admin/:resource/:id`
*   **Validation:** The server implementation (Elm/Rust) uses the *real* types to validate. If the generic UI sends bad data, the server returns a 400 error, which the generic UI displays.

## Advantages
1.  **Zero Build Step:** Adding a field in Rust makes it appear in the Admin UI instantly (after server restart).
2.  **Small Bundle:** The Admin UI is one standard size, not growing with every table.
3.  **Simplicity:** No complex WASM loaders, no generated Elm encoders. Just a JSON file.

## Implementation Steps
1.  **Update Generator:** Modify `generators/admin.js` to produce `schema.json` instead of `.elm` files.
2.  **Build Shell:** Create the generic Elm Schema Browser.
3.  **Generic API:** Ensure `hamlet-server` has a generic CRUD handler (or generated generic handlers) that can accept dynamic JSON.
