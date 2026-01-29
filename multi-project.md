# Multi-Project Hosting

A single Hamlet server can host multiple independent projects sharing common infrastructure.

## Architecture

```
hamlet-server/
  config.json:
    projects:
      - /app/horatio
      - /app/othello
      - /app/macbeth
```

Each project has its own host directories:

```
/app/horatio/hosts/blog.example.com/
/app/horatio/hosts/news.example.com/
/app/othello/hosts/theatre.example.com/
```

## Routing

Routing is by hostname, not path prefix. The server scans all project host directories and builds a hostname → project mapping:

| Hostname | Project |
|----------|---------|
| blog.example.com | horatio |
| news.example.com | horatio |
| theatre.example.com | othello |

Request to `blog.example.com/api/GetFeed`:
1. Lookup hostname → horatio project
2. Route to horatio's `GetFeedHandler`
3. Inject `host: "blog.example.com"` into handler context for tenant scoping

## Database

Single shared database per server. Projects have distinct tables by virtue of distinct models:

- horatio: `microblog_item`, `item_comment`, ...
- othello: `theatre_post`, `actor_profile`, ...

Multi-tenancy within each project uses the existing `host` column scoping.

## Shared Events

Framework-level background events operate across all projects:

| Event | Description |
|-------|-------------|
| `SoftDeleteCleanup` | Purge aged-out soft-deleted records |
| `SessionExpiry` | Clean expired sessions |

These scan all tables with the relevant markers (e.g., `deleted_at` column) regardless of which project owns them. Configuration per-table (retention periods, etc.) can live in schema annotations.

## Handler Loading

Server loads handlers from multiple project paths:

```
/app/horatio/server/.hamlet-gen/handlers/
/app/othello/server/.hamlet-gen/handlers/
```

Handler namespacing is implicit - each project defines its own API endpoints in its own `shared/Api/` directory. No naming conflicts because `GetFeed` in horatio is a different handler binary than `GetPosts` in othello.

## What Changes

| Component | Current | Multi-Project |
|-----------|---------|---------------|
| Host dir polling | Single project path | Multiple project paths |
| Handler loading | Single `.hamlet-gen/` | Multiple, keyed by project |
| Hostname lookup | Direct to handlers | Hostname → project → handlers |
| Database | Unchanged | Unchanged (already shared) |
| Events | Per-project | Framework-level + per-project |

## What Stays The Same

- BuildAmp generation (per-project, unchanged)
- Elm handler architecture
- Multi-tenancy via host column
- API contract system
- Vite dev server (per-project)

## Key storage

Admin Key (Per Host):
Where: Store in the Database (e.g., a host_secrets table).
Why: Hosts are dynamic. You want to create/rotate keys per-tenant without deeper re-configuration.
Access: Your Script will just DB Query it: DB.query "SELECT key FROM host_secrets...".

Project Key (Bootstrap Secret):
Where: Store in config.json (server-side) or ENV_VAR.
Why: It identifies the "owner" of the running code instance. It shouldn't change often.
Access: We will inject this into the Handler's Context (securely) so your Script can verify req.key == context.projectKey. this key is used to update the per-host admin keys.

both keys are configured in the extension.

