# End-to-End File Upload Implementation Plan

## Goal
Enable **Blob-Agnostic File Uploads** for Hamlet apps.
Infrastructure (Blob Adapter) → Routes (Upload + Download) → TipTap Integration.

## User Review Required
> [!IMPORTANT]
> **Blob Storage Location**:
> For **Local dev**, uploads go to `storage/blobs/{host}/` relative to CWD.
> For **Production**, swap the adapter for S3/R2 later.
>
> **Database**:
> A new framework migration adds the `blob_metadata` table (tracked in `framework_migrations`).

---

## Phase 1: Blob Storage Middleware

A single middleware that owns the storage adapter, the metadata table, and the HTTP routes.
Follows the `key-value-store.js` pattern: registers a service, implements cleanup.

### `packages/hamlet-server`

#### [NEW] `middleware/blob-storage.js`

**Service interface** (registered as `blob`):
```js
{
    put(host, stream, metadata)   → { id, url }
    get(host, id)                 → { stream, mime, filename }
    meta(host, id)                → { id, originalName, mimeType, sizeBytes, createdAt }
    delete(host, id)              → void
    cleanup()                     → void
}
```

- `put` generates a UUID v4 as the blob ID (consistent with existing ID generation).
- Files land in `storage/blobs/{host}/{id}` on the local adapter.
- Metadata row inserted into `blob_metadata` in the same call.

**HTTP routes** (mounted by the middleware itself, like admin-api does):
```
POST   /api/blobs          — multipart upload  → { id, url }
GET    /api/blobs/:id      — stream download (Content-Type from metadata)
DELETE /api/blobs/:id      — remove blob + metadata
```

**Multipart handling**: Use `busboy` (streaming, no temp files, works with Node and Bun).
The upload route is mounted directly on `server.app` before `bodyParser.json()` runs,
or uses `express.raw()` scoped to `/api/blobs` to avoid the JSON parser conflict.

**Auth**: Upload and delete require `hostAdmin` or above. Download is unauthenticated
(blob IDs are unguessable UUIDs, same model as signed URLs without expiry).

**Limits** (configurable via `server.config.blob`):
| Setting        | Default   |
|----------------|-----------|
| `maxSizeBytes` | 10 MB     |
| `allowedMimes` | `image/*` |

#### [NEW] `migrations/003_blob_metadata.sql`

Framework migration (tracked in `framework_migrations`, shared across all projects):
```sql
CREATE TABLE IF NOT EXISTS blob_metadata (
    id TEXT PRIMARY KEY,
    host TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT,
    size_bytes INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_blob_metadata_host ON blob_metadata(host);
```

No foreign key to `hamlet_hosts` — blobs can exist for any tenant hostname,
same as other host-scoped tables.

#### [MODIFY] `core/middleware-loader.js`

Add feature detection and loading:
```js
detectFeatures() {
    return {
        // ...existing...
        hasBlob: this.server.config.features?.blob === true,
    };
}

async loadRequiredMiddleware() {
    // ...after host-resolver, before kv...
    if (features.hasBlob) {
        await this.loadMiddleware('blob-storage');
    }
    // ...
}
```

Blob depends on database (for metadata table) so it loads after the database block.

#### [MODIFY] `package.json`

Add dependency: `busboy`.

### `app/horatio/server/server.js`

Add feature flag:
```js
features: {
    database: true,
    kv: true,
    sse: true,
    wasm: true,
    blob: true     // ← new
}
```

---

## Phase 2: TipTap Image Integration

Wire the rich-text editor to the blob upload infrastructure.

### `packages/hamlet-server`

#### [MODIFY] `package.json`
Add dependency: `@tiptap/extension-image`

#### [MODIFY] `rich-text/tiptap-editor.js`

Current toolbar groups: formatting, headings, lists/blocks, alignment, colours.

Changes:
- Import and register `Image` extension (with `inline: false`).
- Add image button to toolbar group 2 (between link and H1).
- Button click opens a file picker (`accept="image/*"`).
- On file select:
  1. Build `FormData`, append file.
  2. `POST /api/blobs` with appropriate auth header.
  3. On success: `editor.chain().focus().setImage({ src: response.url }).run()`
  4. On error: console.error (no UI chrome needed yet).
- The editor already receives config via its constructor options; add an optional
  `uploadEndpoint` field (default: `'/api/blobs'`).

#### [MODIFY] `rich-text/styles.css`

Add image styles:
```css
.hamlet-rt-editor img {
    max-width: 100%;
    height: auto;
    cursor: default;
}
.hamlet-rt-editor img.ProseMirror-selectednode {
    outline: 2px solid var(--hamlet-accent, #3b82f6);
}
```

### Flow
```
User clicks image button → file picker (images only) →
POST /api/blobs →
{ id, url } →
editor.chain().setImage({ src: url }).run()
```

---

## Verification

### Automated Tests

**Blob adapter** (`tests/middleware/blob-storage.test.js`):
- `put` writes file to disk and inserts metadata row.
- `get` returns readable stream with correct mime type.
- `meta` returns metadata without streaming.
- `delete` removes file and metadata row.
- Tenant isolation: host A cannot read host B's blob.
- Rejects files exceeding `maxSizeBytes`.
- Rejects disallowed mime types.

**Upload route** (supertest):
- `POST /api/blobs` with multipart form data → 201, returns `{ id, url }`.
- `GET /api/blobs/:id` streams file back with correct Content-Type.
- `DELETE /api/blobs/:id` → 204, subsequent GET → 404.
- Missing auth → 401.
- Oversized file → 413.

### Manual Verification

1. Start server, confirm `blob-storage` appears in loaded features.
2. `curl -F "file=@test.png" -H "X-Hamlet-Host-Key: ..." http://localhost:3000/api/blobs`
3. Verify file exists in `storage/blobs/localhost/`.
4. Verify `blob_metadata` row in psql.
5. Open admin UI, edit a RichContent field, click image button, upload, save, reload.

---

## Files Summary

| File | Change |
|------|--------|
| `packages/hamlet-server/middleware/blob-storage.js` | **NEW** — adapter, service, routes |
| `packages/hamlet-server/migrations/003_blob_metadata.sql` | **NEW** — framework migration |
| `packages/hamlet-server/core/middleware-loader.js` | Add `hasBlob` feature detection + loading |
| `packages/hamlet-server/package.json` | Add `busboy`, `@tiptap/extension-image` |
| `packages/hamlet-server/rich-text/tiptap-editor.js` | Image extension + upload button |
| `packages/hamlet-server/rich-text/styles.css` | Image display styles |
| `app/horatio/server/server.js` | Add `blob: true` feature flag |
| `packages/hamlet-server/tests/middleware/blob-storage.test.js` | **NEW** — adapter + route tests |

## Not In Scope
- Drag & drop / paste images into editor
- Upload progress indicator
- Image resize handles
- S3/R2 adapter (swap later — same interface)
- BuildAmp generator for upload types (manual Elm for now)
