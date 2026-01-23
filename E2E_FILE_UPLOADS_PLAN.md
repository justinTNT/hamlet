# End-to-End File Upload Implementation Plan

## Goal
Enable **Type-Safe, Blob-Agnostic File Uploads** for Hamlet apps.
This plan prioritizes infrastructure (Blob Adapter) -> Service Logic -> API -> Frontend.

## User Review Required
> [!IMPORTANT]
> **Blob Storage Location**:
> For **Bun (Local)**, uploads will go to `app/{project}/storage/uploads`.
> For **Production**, you will swap the adapter for S3/R2 later.
>
> **Database**:
> A new `file_uploads` table is required. This plan includes the SQL migration.

---

## Phase 1: Infrastructure (The Blob Adapter)
We implement the "Shim" for file storage. This decouples "saving a file" from "the filesystem".

### `packages/hamlet-server`
#### [NEW] [middleware/blob-storage.js](file:///Users/jtnt/Play/hamlet/packages/hamlet-server/middleware/blob-storage.js)
- **Interface**: `put(tenant, key, stream)`, `get(tenant, key)`, `delete(tenant, key)`.
- **Implementation**: `LocalBlobStore` using `fs` (Bun-compatible).
- **Registration**: Registers as `server.services.blob` (accessible by other middleware).

#### [MODIFY] [core/server.js](file:///Users/jtnt/Play/hamlet/packages/hamlet-server/core/server.js)
- Load `blob-storage` middleware by default (or via config).

---

## Phase 2: Backend Logic (The Upload Service)
We need to track *what* files we have, not just store bytes.

### `app/horatio` (and templates)
#### [NEW] [migrations/00X_create_file_uploads.sql](file:///Users/jtnt/Play/hamlet/app/horatio/db/migrations/20260117_create_file_uploads.sql)
- Table: `file_uploads`
- Columns: `id`, `original_name`, `mime_type`, `size`, `blob_key`, `host`, `created_at`.
- Indices: `blob_key`, `host`.

### `packages/hamlet-server`
#### [NEW] [middleware/upload-service.js](file:///Users/jtnt/Play/hamlet/packages/hamlet-server/middleware/upload-service.js)
- **Purpose**: High-level API for handling uploads.
- **Methods**:
    - `acceptUpload(tenant, fileStream, metadata)`:
        1. Generates `file_id`.
        2. Streams to `BlobStore`.
        3. Inserts into `file_uploads`.
        4. Returns `file_id`.
- **Registration**: Registers as `server.services.uploads`.

---

## Phase 3: API Endpoint (The Connector)
The HTTP interface that accepts the multipart POST.

### `packages/hamlet-server`
#### [NEW] [middleware/upload-routes.js](file:///Users/jtnt/Play/hamlet/packages/hamlet-server/middleware/upload-routes.js)
- **Route**: `POST /api/uploads`
- **Logic**:
    - Uses `busboy` (or `multer` if simpler for Bun) to parse multipart.
    - Validates request (size, mime type checking).
    - Calls `server.services.uploads.acceptUpload()`.
    - Returns JSON `{ file_id: "...", url: "..." }`.

---

## Phase 4: Frontend Integration (The Ergonomics)
How the browser talks to Phase 3.

### `packages/buildamp` (Future Generator Work)
- **Goal**: Generate `Api.Upload` Elm module.
- **Status**: This plan focuses on ensuring the **Backend (Phases 1-3)** is ready to accept what the frontend sends.
- **Manual Test**: We will verify Phase 3 using `curl` or a simple HTML form first.

---

## Phase 5: TipTap Image Integration
Now that we have shared rich-text editing via `hamlet-server/rich-text`, we wire it up to the upload infrastructure.

### `packages/hamlet-server`
#### [MODIFY] [package.json](file:///Users/jtnt/Play/hamlet/packages/hamlet-server/package.json)
- Add dependency: `@tiptap/extension-image`

#### [MODIFY] [rich-text/tiptap-editor.js](file:///Users/jtnt/Play/hamlet/packages/hamlet-server/rich-text/tiptap-editor.js)
- Import and configure `Image` extension
- Add 🖼️ toolbar button (between link and headings)
- Button click triggers file picker for images (`accept="image/*"`)
- On file select:
  1. Create `FormData` with file
  2. `POST /api/uploads`
  3. On success: `editor.chain().focus().setImage({ src: response.url }).run()`
  4. On error: Show alert or status message

#### [MODIFY] [rich-text/styles.css](file:///Users/jtnt/Play/hamlet/packages/hamlet-server/rich-text/styles.css)
- Style for images in editor (max-width, cursor, selection ring)
- Optional: drag handle for repositioning

### Configuration
The editor needs to know the upload endpoint. Options:
1. **Convention**: Always `/api/uploads` (simplest)
2. **Config option**: `createRichTextEditor({ uploadEndpoint: '/api/uploads', ... })`

### Flow
```
User clicks 🖼️ → File picker (images only) →
Upload to /api/uploads →
Get { file_id, url } →
editor.chain().setImage({ src: url }).run()
```

### Future Enhancements (not in this phase)
- Drag & drop images into editor
- Paste images from clipboard
- Upload progress indicator
- Image resize handles

---

## Verification Plan

### Automated Tests
1.  **Blob Adapter Test**: fast/unit test.
    - Write "hello.txt" -> Read "hello.txt" -> Delete -> Verify Gone.
2.  **Service Integration Test**:
    - Mock `BlobAdapter`.
    - Call `acceptUpload`.
    - Verify DB row created + Blob method called.

### Manual Verification (Phases 1-4)
1.  Start Server (Bun).
2.  Run migration.
3.  `curl -F "file=@test.png" http://localhost:3000/api/uploads`
4.  Check `storage/uploads` folder for file.
5.  Check `psql` for `file_uploads` row.

### Manual Verification (Phase 5 - TipTap)
1.  Open admin UI with a RichContent field
2.  Click 🖼️ button in toolbar
3.  Select an image file
4.  Verify image appears in editor
5.  Save record, reload, verify image persists
