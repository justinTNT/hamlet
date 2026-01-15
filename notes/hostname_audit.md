# Hamlet Hostname/Tenant Coupling Audit

## Summary

Hamlet is **multi-tenant-first** with no single-tenant mode. Host isolation is woven through every layer.

---

## Layer 1: Always-On Middleware

| Middleware | Host Usage | Optional? |
|------------|-----------|-----------|
| `tenant-isolation.js` | Extracts host from `Host` header, attaches `req.tenant` | **No** - everything depends on it |
| `session-cookies.js` | Stores host in session metadata | **No** - always loaded |
| `host-html.js` | Serves `{hostname}.html` if exists | **Yes** - graceful fallback |

---

## Layer 2: Database Schema

Every table has `host TEXT NOT NULL`:

| Table | Host Usage |
|-------|-----------|
| `microblog_item` | Field + index (`idx_items_host`) |
| `item_comment` | Field only |
| `guest` | Field only |
| `tag` | Field + index + `UNIQUE(host, name)` constraint |
| `item_tag` | Field + index |
| `buildamp_events` | Field + composite indexes |
| `buildamp_dlq` | Field + composite index |

**23 host-related schema references** across migrations.

---

## Layer 3: Query Layer

| File | Host Injection |
|------|---------------|
| `database.js` | All find/create/update/delete methods require host |
| `elm-service.js` | Transparently injects `host` into every `dbCreate` (line 386) |
| `admin-api.js` | Filters all results by host, removes host from response |

---

## Layer 4: Response Headers

- `X-Tenant-Host` header added to every response (tenant-isolation.js line 20)

---

## What's Already Optional (Good)

1. **host-html.js** - Falls back gracefully if no `{hostname}.html`
2. **KV Store** - Feature flag `features.kv`
3. **SSE** - Feature flag `features.sse`
4. **Database** - Feature flag `features.database`

---

## What Could Be Made Optional

1. **X-Tenant-Host header** - Just noise for single-tenant apps
2. **Host metadata in sessions** - Useful for auditing, not critical

---

## What Should Stay Mandatory (When DB Enabled)

1. **Host field in database** - Data isolation is critical for security
2. **Host injection in queries** - Prevents cross-tenant data leaks
3. **Host in Elm handler context** - Security boundary

---

## Options

### Option A: Single-Tenant Mode Flag

Add `features.multiTenant: true|false`:
- When false, inject `{ host: 'default', isolated: false }` to all requests
- Pros: Clean opt-out
- Cons: DB still has host column, migrations need thought

### Option B: Keep Current + Minor Tweaks (Recommended)

- Make `X-Tenant-Host` header opt-in
- Document that single-tenant apps just use consistent hostname
- No schema changes

### Option C: Upstream Solution (Future)

Your unikernel shims plan - host handling moves outside Hamlet entirely.

---

## Key Insight

The tight coupling is **intentional security design**. Host isolation at the database layer prevents:
- Cross-tenant data leaks
- Accidental data mixing
- Security vulnerabilities from missing WHERE clauses

The "cost" for single-tenant apps is minimal (one extra column, automatic filtering).

---

## Future Direction: Unmanaged Stores (`xdb/`)

For "bring your own database" scenarios, the Hamlet-like solution is a new model type:

```
models/
  db/          # Managed - Hamlet owns schema, injects host, migrations
  xdb/         # Unmanaged - User owns store, Hamlet just generates Elm types
  api/         # API contracts
```

**Managed (`db/`)** - Current behavior:
- Hamlet generates migrations
- Host field auto-injected
- Full tenant isolation

**Unmanaged (`xdb/`)** - Future:
- User owns the schema/store
- No host injection
- Hamlet only generates Elm types and decoders
- User implements the actual queries

This pattern extends to other stores:
- Unmanaged Postgres (existing schema)
- MongoDB (community adapter)
- Hasura (community adapter)

Each generates Elm types from Rust models, but runtime implementation differs.

**Decision:** No changes now. Current multi-tenant `db/` is the happy path. Add `xdb/` when someone needs it - good first contribution opportunity.
