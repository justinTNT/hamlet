# Host Keys + Auth-Gated Endpoints

## Scope

Framework-level host key infrastructure with auth-gated API endpoints. This is task 1 of 3 (host keys → project key admin auth → multi-project routing).

## Model

Three tiers, derived from key presence:

| Tier | Key | Meaning |
|------|-----|---------|
| `Visitor` | None | Read-only public access |
| `Contributor` | Host key (`X-Hamlet-Host-Key`) | Can post to that host |
| `Admin` | Project key (`X-Hamlet-Project-Key`) | Superuser (future task) |

The framework provides the tier type and key resolution. Apps define finer roles within tiers independently.

## Changes

### 1. Framework auth type: `Interface.Api`

Add to `Interface.Api` (or a new `Interface.Auth`):

```elm
type AuthLevel
    = Visitor
    | Contributor
    | Admin
```

API models declare auth requirements:

```elm
-- app/horatio/models/Api/SubmitItem.elm
type alias Auth =
    { level : Contributor }
```

Endpoints without an `Auth` type alias default to `Visitor` (no auth required). The generator reads the `Auth` type and produces route-level middleware.

**Files:**
- `packages/buildamp/lib/generators/api.js` — parse `Auth` type alias, emit middleware config
- `app/horatio/server/.generated/api-routes.js` — generated routes include auth middleware
- New: auth level type definition (wherever `Interface.Api` types live)

### 2. Database: `hamlet_host_keys` table

Framework-level table. Plaintext key storage. Column named `target_host` (not `host`) to avoid tenant isolation machinery.

```sql
CREATE TABLE IF NOT EXISTS hamlet_host_keys (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    target_host TEXT NOT NULL,
    key TEXT NOT NULL,
    label TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    revoked_at TIMESTAMP
);

CREATE INDEX idx_hamlet_host_keys_active
    ON hamlet_host_keys(target_host) WHERE revoked_at IS NULL;
```

**Files:**
- New: `packages/hamlet-server/migrations/001_host_keys.sql`
- `packages/hamlet-server/middleware/database.js` — run framework migrations before app migrations

### 3. Middleware: key resolution

New middleware that resolves auth tier from request headers and sets it on the request. Does NOT enforce policy — just resolves.

```
Every request:
  1. Check X-Hamlet-Project-Key header → if valid: req.authLevel = 'admin'
  2. Check X-Hamlet-Host-Key header → look up in hamlet_host_keys
     for target_host = req.tenant.host, revoked_at IS NULL
     → if valid: req.authLevel = 'contributor'
  3. Otherwise: req.authLevel = 'visitor'
```

Separate enforcement middleware (generated per-route):

```javascript
function requireAuth(level) {
    const levels = { visitor: 0, contributor: 1, admin: 2 };
    return (req, res, next) => {
        if (levels[req.authLevel] >= levels[level]) return next();
        res.status(401).json({ error: `Requires ${level} access` });
    };
}
```

**Files:**
- New: `packages/hamlet-server/middleware/auth-resolver.js` — resolves tier from headers
- `packages/hamlet-server/core/middleware-loader.js` — load auth-resolver early in stack

### 4. Generator: auth-aware route generation

The API generator (`api.js`) already parses API model files. Extend it to:

1. Detect `type alias Auth` in the model file
2. Read the `level` field value (`Visitor`, `Contributor`, `Admin`)
3. Emit `requireAuth('contributor')` middleware on that route in `api-routes.js`

Currently `api-routes.js` generates routes like:

```javascript
router.post('/SubmitItem', async (req, res) => { ... });
```

Becomes:

```javascript
router.post('/SubmitItem', requireAuth('contributor'), async (req, res) => { ... });
```

Endpoints without `Auth` get no middleware (public by default).

**Files:**
- `packages/buildamp/lib/generators/api.js` — parse Auth type, pass level to route gen
- `packages/buildamp/core/elm-parser-ts.js` — may need to extract Auth type alias
- `app/horatio/server/.generated/api-routes.js` — generated output changes

### 5. Admin UI: host key management

Add `/_keys` routes to `admin-api.js` for CRUD on `hamlet_host_keys`:

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/admin/api/_keys` | Existing admin auth | List keys for current host |
| `POST` | `/admin/api/_keys` | Existing admin auth | Create `{ target_host, label }` → returns key |
| `DELETE` | `/admin/api/_keys/:id` | Existing admin auth | Revoke (set `revoked_at`) |

For now, these use the existing `HAMLET_ADMIN_TOKEN` auth (unchanged). The project key rename happens in task 2.

Admin UI (`index.js`) gets a new "Host Keys" section — table of keys with create/revoke actions.

**Files:**
- `packages/hamlet-server/middleware/admin-api.js` — add `/_keys` routes
- `app/horatio/admin/web/src/index.js` — host keys management UI

### 6. Extension changes

**Popup.elm — HostConfig:**

```elm
type alias HostConfig =
    { name : String
    , url : String
    , adminToken : String   -- keep for now (task 2 renames to projectKey)
    , hostKey : String      -- NEW: for posting
    }
```

Settings form adds "Host Key" field per host.

**popup.js / background.js — send host key with API requests:**

The extension needs to pass `hostKey` from popup through to background.js, which sends it as `X-Hamlet-Host-Key` header on API requests.

Current message format: `{ endpoint, body, apiUrl, correlationId }`
New: `{ endpoint, body, apiUrl, correlationId, hostKey }`

**Files:**
- `app/horatio/extension/src/Popup.elm` — HostConfig, settings form, pass hostKey in requests
- `packages/hamlet-extension/popup.js` — include hostKey in outbound messages
- `packages/hamlet-extension/background.js` — send X-Hamlet-Host-Key header

### 7. Horatio API models: add Auth

Add `Auth` type alias to write endpoints:

- `app/horatio/models/Api/SubmitItem.elm` — `type alias Auth = { level : Contributor }`
- `app/horatio/models/Api/SubmitComment.elm` — `type alias Auth = { level : Contributor }`

Read endpoints (`GetFeed`, `GetItem`, `GetTags`, `GetItemsByTag`) have no `Auth` → public.

## Files summary

| File | Change |
|------|--------|
| New: `packages/hamlet-server/migrations/001_host_keys.sql` | Framework migration |
| New: `packages/hamlet-server/middleware/auth-resolver.js` | Key resolution middleware |
| `packages/hamlet-server/middleware/database.js` | Run framework migrations |
| `packages/hamlet-server/middleware/admin-api.js` | `/_keys` CRUD routes |
| `packages/hamlet-server/core/middleware-loader.js` | Load auth-resolver |
| `packages/buildamp/lib/generators/api.js` | Parse Auth, emit requireAuth middleware |
| `packages/buildamp/core/elm-parser-ts.js` | Extract Auth type alias |
| `app/horatio/admin/web/src/index.js` | Host keys management UI |
| `app/horatio/extension/src/Popup.elm` | HostConfig.hostKey, settings form |
| `packages/hamlet-extension/popup.js` | Pass hostKey in messages |
| `packages/hamlet-extension/background.js` | Send X-Hamlet-Host-Key header |
| `app/horatio/models/Api/SubmitItem.elm` | Add Auth type alias |
| `app/horatio/models/Api/SubmitComment.elm` | Add Auth type alias |

## What this does NOT change

- Admin auth (`HAMLET_ADMIN_TOKEN`) — unchanged, task 2
- `openAdmin` query param flow — unchanged, task 2
- Multi-project routing — task 3
- Extension `adminToken` field — kept as-is, task 2 renames

## Verification

1. Run `buildamp gen` — generated routes include `requireAuth('contributor')` for SubmitItem/SubmitComment
2. Start server — `hamlet_host_keys` table auto-created
3. `GET /api/GetFeed` — works without any key (visitor)
4. `POST /api/SubmitItem` without key — 401
5. Open admin UI (existing HAMLET_ADMIN_TOKEN flow) — create host key for localhost
6. Enter host key in extension settings
7. `POST /api/SubmitItem` with host key — succeeds
8. Revoke key in admin UI → submit fails
9. Existing tests pass (no auth model = no auth required = backward compatible)
