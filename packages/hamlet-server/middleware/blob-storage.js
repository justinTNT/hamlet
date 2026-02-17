/**
 * Blob Storage Middleware
 * Provides tenant-isolated file storage with metadata tracking.
 * Pluggable adapter: local filesystem (default) or S3-compatible (R2, Minio, AWS).
 * Follows key-value-store.js pattern: register service, implement cleanup.
 */

import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

/**
 * Match a mime type against a pattern (e.g. "image/*" matches "image/png")
 */
function mimeMatches(mime, pattern) {
    if (pattern === '*/*') return true;
    if (pattern === mime) return true;
    if (pattern.endsWith('/*')) {
        const prefix = pattern.slice(0, pattern.indexOf('/'));
        return mime.startsWith(prefix + '/');
    }
    return false;
}

/**
 * Check if a mime type is allowed by any of the configured patterns
 */
function isMimeAllowed(mime, allowedMimes) {
    if (!allowedMimes || allowedMimes.length === 0) return true;
    return allowedMimes.some(pattern => mimeMatches(mime, pattern));
}

// =============================================================================
// STORAGE ADAPTERS
// =============================================================================

/**
 * Local filesystem adapter.
 * Writes blobs to storage/blobs/{host}/{id} on disk.
 */
function createLocalAdapter(config) {
    const storageRoot = config.storageRoot || path.join(process.cwd(), 'storage', 'blobs');
    const maxSizeBytes = config.maxSizeBytes || 10 * 1024 * 1024;

    function ensureDir(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    function blobPath(host, id) {
        return path.join(storageRoot, host, id);
    }

    return {
        name: 'local',

        /**
         * Write a stream to disk. Returns { bytesWritten }.
         */
        async write(host, id, stream) {
            const hostDir = path.join(storageRoot, host);
            ensureDir(hostDir);

            const filePath = blobPath(host, id);
            let bytesWritten = 0;

            await new Promise((resolve, reject) => {
                const ws = fs.createWriteStream(filePath);

                stream.on('data', (chunk) => {
                    bytesWritten += chunk.length;
                    if (bytesWritten > maxSizeBytes) {
                        stream.destroy();
                        ws.destroy();
                        try { fs.unlinkSync(filePath); } catch (_) { /* ignore */ }
                        reject(new Error('FILE_TOO_LARGE'));
                        return;
                    }
                    ws.write(chunk);
                });

                stream.on('end', () => {
                    ws.end(() => resolve());
                });

                stream.on('error', (err) => {
                    ws.destroy();
                    try { fs.unlinkSync(filePath); } catch (_) { /* ignore */ }
                    reject(err);
                });

                ws.on('error', (err) => {
                    try { fs.unlinkSync(filePath); } catch (_) { /* ignore */ }
                    reject(err);
                });
            });

            return { bytesWritten };
        },

        /**
         * Read a blob as a readable stream. Returns stream or null.
         */
        read(host, id) {
            const filePath = blobPath(host, id);
            if (!fs.existsSync(filePath)) return null;
            return fs.createReadStream(filePath);
        },

        /**
         * Delete a blob from disk.
         */
        remove(host, id) {
            const filePath = blobPath(host, id);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        },

        /**
         * Build the public URL for a blob.
         * Local adapter serves through the Express route.
         */
        url(host, id) {
            return `/api/blobs/${id}`;
        },
    };
}

/**
 * S3-compatible adapter.
 * Works with AWS S3, Cloudflare R2, Minio, and any S3-compatible service.
 *
 * Config:
 *   blob.adapter = 's3'
 *   blob.s3.bucket       — bucket name (required)
 *   blob.s3.region        — region (default: 'auto')
 *   blob.s3.endpoint      — custom endpoint URL (required for R2/Minio)
 *   blob.s3.accessKeyId   — access key
 *   blob.s3.secretAccessKey — secret key
 *   blob.s3.publicUrl     — base URL for public reads (optional, falls back to Express route)
 *   blob.s3.forcePathStyle — use path-style URLs (default: true for non-AWS)
 */
function createS3Adapter(config) {
    const s3Config = config.s3 || {};
    const bucket = s3Config.bucket;
    if (!bucket) {
        throw new Error('blob.s3.bucket is required for S3 adapter');
    }

    const maxSizeBytes = config.maxSizeBytes || 10 * 1024 * 1024;
    const publicUrl = s3Config.publicUrl || null;

    // Lazy-load the S3 client to avoid requiring the SDK when not using S3
    let s3Client = null;

    async function getClient() {
        if (s3Client) return s3Client;

        // Dynamically import the AWS SDK v3 — must be installed separately
        const { S3Client } = await import('@aws-sdk/client-s3');
        s3Client = new S3Client({
            region: s3Config.region || 'auto',
            endpoint: s3Config.endpoint || undefined,
            credentials: (s3Config.accessKeyId && s3Config.secretAccessKey) ? {
                accessKeyId: s3Config.accessKeyId,
                secretAccessKey: s3Config.secretAccessKey,
            } : undefined,
            forcePathStyle: s3Config.forcePathStyle !== false,
        });
        return s3Client;
    }

    /**
     * S3 object key: {host}/{id}
     */
    function objectKey(host, id) {
        return `${host}/${id}`;
    }

    return {
        name: 's3',

        async write(host, id, stream) {
            const client = await getClient();
            const { Upload } = await import('@aws-sdk/lib-storage');

            // Collect stream into buffer for content-length (S3 needs it for small objects)
            // For large objects, @aws-sdk/lib-storage handles multipart automatically
            const upload = new Upload({
                client,
                params: {
                    Bucket: bucket,
                    Key: objectKey(host, id),
                    Body: stream,
                },
            });

            const result = await upload.done();
            // S3 Upload doesn't directly report bytes. We track via metadata insert.
            // Return 0 and let the caller count if needed.
            return { bytesWritten: 0 };
        },

        async read(host, id) {
            const client = await getClient();
            const { GetObjectCommand } = await import('@aws-sdk/client-s3');

            try {
                const response = await client.send(new GetObjectCommand({
                    Bucket: bucket,
                    Key: objectKey(host, id),
                }));
                return response.Body; // readable stream
            } catch (err) {
                if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
                    return null;
                }
                throw err;
            }
        },

        async remove(host, id) {
            const client = await getClient();
            const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');

            await client.send(new DeleteObjectCommand({
                Bucket: bucket,
                Key: objectKey(host, id),
            }));
        },

        url(host, id) {
            if (publicUrl) {
                return `${publicUrl.replace(/\/$/, '')}/${objectKey(host, id)}`;
            }
            // Fall back to the Express route
            return `/api/blobs/${id}`;
        },
    };
}

// =============================================================================
// MIDDLEWARE ENTRY POINT
// =============================================================================

export default function createBlobStorage(server) {
    const blobConfig = server.config.blob || {};
    const maxSizeBytes = blobConfig.maxSizeBytes || 10 * 1024 * 1024;
    const allowedMimes = blobConfig.allowedMimes || ['image/*'];

    // Select adapter
    const adapterName = blobConfig.adapter || 'local';
    let adapter;
    if (adapterName === 's3') {
        adapter = createS3Adapter(blobConfig);
        console.log(`📎 Setting up blob storage (s3 → ${blobConfig.s3?.bucket})`);
    } else {
        adapter = createLocalAdapter(blobConfig);
        console.log('📎 Setting up blob storage (local)');
    }

    // =========================================================================
    // SERVICE METHODS
    // =========================================================================

    async function put(host, stream, metadata) {
        const id = randomUUID();

        const { bytesWritten } = await adapter.write(host, id, stream);

        // Insert metadata row if database is available
        const db = server.getService('database');
        if (db) {
            await db.pool.query(
                `INSERT INTO blob_metadata (id, host, original_name, mime_type, size_bytes)
                 VALUES ($1, $2, $3, $4, $5)`,
                [id, host, metadata.filename || 'unknown', metadata.mimeType || null, bytesWritten || null]
            );
        }

        const url = adapter.url(host, id);
        return { id, url };
    }

    async function get(host, id) {
        const row = await meta(host, id);
        if (!row) return null;

        const stream = await adapter.read(host, id);
        if (!stream) return null;

        return {
            stream,
            mime: row.mime_type,
            filename: row.original_name
        };
    }

    async function meta(host, id) {
        const db = server.getService('database');
        if (!db) return null;

        const result = await db.pool.query(
            'SELECT * FROM blob_metadata WHERE id = $1 AND host = $2',
            [id, host]
        );
        return result.rows[0] || null;
    }

    async function deleteFn(host, id) {
        const row = await meta(host, id);
        if (!row) return;

        await adapter.remove(host, id);

        const db = server.getService('database');
        if (db) {
            await db.pool.query(
                'DELETE FROM blob_metadata WHERE id = $1 AND host = $2',
                [id, host]
            );
        }
    }

    // =========================================================================
    // HTTP ROUTES
    // =========================================================================

    // POST /api/blobs — multipart upload (unauthenticated)
    server.app.post('/api/blobs', async (req, res) => {
        const host = req.tenant?.host || 'localhost';

        const contentType = req.headers['content-type'] || '';
        if (!contentType.includes('multipart/form-data')) {
            return res.status(400).json({ error: 'Expected multipart/form-data' });
        }

        try {
            const { default: Busboy } = await import('busboy');

            const bb = Busboy({
                headers: req.headers,
                limits: { fileSize: maxSizeBytes, files: 1 }
            });

            let fileProcessed = false;
            let uploadPromise = null;
            let uploadError = null;

            bb.on('file', (fieldname, stream, info) => {
                const { filename, mimeType } = info;

                if (fileProcessed) {
                    stream.resume();
                    return;
                }
                fileProcessed = true;

                if (!isMimeAllowed(mimeType, allowedMimes)) {
                    stream.resume();
                    uploadError = { status: 415, message: `Mime type not allowed: ${mimeType}` };
                    return;
                }

                let truncated = false;
                stream.on('limit', () => {
                    truncated = true;
                });

                // Store the promise so we can await it in 'close'
                uploadPromise = put(host, stream, { filename, mimeType })
                    .then(result => {
                        if (truncated) {
                            deleteFn(host, result.id).catch(() => {});
                            throw { status: 413, message: 'File exceeds size limit' };
                        }
                        return result;
                    })
                    .catch(err => {
                        if (err.message === 'FILE_TOO_LARGE') {
                            throw { status: 413, message: 'File exceeds size limit' };
                        }
                        throw { status: err.status || 500, message: err.message };
                    });
            });

            bb.on('close', async () => {
                if (uploadError) {
                    return res.status(uploadError.status).json({ error: uploadError.message });
                }
                if (!uploadPromise) {
                    return res.status(400).json({ error: 'No file uploaded' });
                }
                try {
                    const result = await uploadPromise;
                    res.status(201).json(result);
                } catch (err) {
                    res.status(err.status || 500).json({ error: err.message });
                }
            });

            bb.on('error', (err) => {
                console.error('❌ Blob upload error:', err);
                res.status(500).json({ error: 'Upload failed' });
            });

            req.pipe(bb);

        } catch (err) {
            console.error('❌ Blob upload error:', err);
            res.status(500).json({ error: 'Upload failed' });
        }
    });

    // GET /api/blobs/:id — stream download (unauthenticated)
    server.app.get('/api/blobs/:id', async (req, res) => {
        const host = req.tenant?.host || 'localhost';
        const { id } = req.params;

        try {
            const blob = await get(host, id);
            if (!blob) {
                return res.status(404).json({ error: 'Blob not found' });
            }

            if (blob.mime) {
                res.setHeader('Content-Type', blob.mime);
            }
            if (blob.filename) {
                res.setHeader('Content-Disposition', `inline; filename="${blob.filename}"`);
            }

            blob.stream.pipe(res);
        } catch (err) {
            console.error('❌ Blob download error:', err);
            res.status(500).json({ error: 'Download failed' });
        }
    });

    // DELETE /api/blobs/:id — remove blob + metadata (hostAdmin+)
    const requireAuth = server.requireAuth || ((level) => (req, res, next) => next());
    server.app.delete('/api/blobs/:id', requireAuth('hostAdmin'), async (req, res) => {
        const host = req.tenant?.host || 'localhost';
        const { id } = req.params;

        try {
            const row = await meta(host, id);
            if (!row) {
                return res.status(404).json({ error: 'Blob not found' });
            }

            await deleteFn(host, id);
            res.json({ success: true });
        } catch (err) {
            console.error('❌ Blob delete error:', err);
            res.status(500).json({ error: 'Delete failed' });
        }
    });

    // =========================================================================
    // SERVICE REGISTRATION
    // =========================================================================

    const blobService = {
        put,
        get,
        meta,
        delete: deleteFn,
        adapter: adapter.name,
        config: { maxSizeBytes, allowedMimes },
        mimeMatches,
        isMimeAllowed,

        cleanup: async () => {
            console.log('🧹 Cleaning up blob storage');
        }
    };

    server.registerService('blob', blobService);
    return blobService;
}
