/**
 * Blob Storage Middleware Tests
 *
 * Tests the blob service, local adapter, S3 adapter config, mime validation,
 * and HTTP route handlers.
 */

import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Readable } from 'stream';

// We need to import the middleware to test it
import createBlobStorage from '../../middleware/blob-storage.js';

// =============================================================================
// HELPERS
// =============================================================================

function createMockServer(configOverrides = {}) {
    const services = new Map();
    const routes = { get: [], post: [], delete: [] };

    const app = {
        get: jest.fn((path, ...handlers) => {
            routes.get.push({ path, handlers });
        }),
        post: jest.fn((path, ...handlers) => {
            routes.post.push({ path, handlers });
        }),
        delete: jest.fn((path, ...handlers) => {
            routes.delete.push({ path, handlers });
        }),
    };

    return {
        app,
        routes,
        config: {
            blob: {
                maxSizeBytes: 1024 * 1024, // 1 MB for tests
                allowedMimes: ['image/*'],
                ...configOverrides,
            },
        },
        registerService: jest.fn((name, service) => {
            services.set(name, service);
        }),
        getService: jest.fn((name) => services.get(name) || null),
        requireAuth: jest.fn((level) => (req, res, next) => next()),
        _services: services,
    };
}

function createReadableStream(data) {
    const stream = new Readable();
    stream.push(Buffer.isBuffer(data) ? data : Buffer.from(data));
    stream.push(null);
    return stream;
}

function createMockDbPool() {
    return {
        pool: {
            query: jest.fn().mockResolvedValue({ rows: [] }),
        },
    };
}

// =============================================================================
// SERVICE REGISTRATION & CONFIGURATION
// =============================================================================

describe('Blob Storage - Service Registration', () => {
    let tmpDir;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hamlet-blob-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('registers blob service on server', () => {
        const server = createMockServer({ storageRoot: tmpDir });
        createBlobStorage(server);

        expect(server.registerService).toHaveBeenCalledWith('blob', expect.objectContaining({
            put: expect.any(Function),
            get: expect.any(Function),
            meta: expect.any(Function),
            delete: expect.any(Function),
            cleanup: expect.any(Function),
        }));
    });

    test('reports local adapter name', () => {
        const server = createMockServer({ storageRoot: tmpDir });
        const service = createBlobStorage(server);

        expect(service.adapter).toBe('local');
    });

    test('exposes config on service', () => {
        const server = createMockServer({ storageRoot: tmpDir, maxSizeBytes: 5000 });
        const service = createBlobStorage(server);

        expect(service.config.maxSizeBytes).toBe(5000);
        expect(service.config.allowedMimes).toEqual(['image/*']);
    });

    test('mounts POST, GET, DELETE routes', () => {
        const server = createMockServer({ storageRoot: tmpDir });
        createBlobStorage(server);

        expect(server.app.post).toHaveBeenCalledWith('/api/blobs', expect.any(Function));
        expect(server.app.get).toHaveBeenCalledWith('/api/blobs/:id', expect.any(Function));
        // DELETE has auth middleware as second arg
        expect(server.app.delete).toHaveBeenCalledWith(
            '/api/blobs/:id',
            expect.any(Function),
            expect.any(Function)
        );
    });

    test('DELETE route uses requireAuth', () => {
        const server = createMockServer({ storageRoot: tmpDir });
        createBlobStorage(server);

        expect(server.requireAuth).toHaveBeenCalledWith('hostAdmin');
    });
});

// =============================================================================
// MIME VALIDATION
// =============================================================================

describe('Blob Storage - Mime Validation', () => {
    let service;

    beforeEach(() => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hamlet-blob-test-'));
        const server = createMockServer({ storageRoot: tmpDir });
        service = createBlobStorage(server);
    });

    test('mimeMatches exact match', () => {
        expect(service.mimeMatches('image/png', 'image/png')).toBe(true);
    });

    test('mimeMatches wildcard subtype', () => {
        expect(service.mimeMatches('image/png', 'image/*')).toBe(true);
        expect(service.mimeMatches('image/jpeg', 'image/*')).toBe(true);
    });

    test('mimeMatches rejects wrong type', () => {
        expect(service.mimeMatches('text/plain', 'image/*')).toBe(false);
        expect(service.mimeMatches('application/pdf', 'image/*')).toBe(false);
    });

    test('mimeMatches universal wildcard', () => {
        expect(service.mimeMatches('anything/here', '*/*')).toBe(true);
    });

    test('isMimeAllowed checks against list', () => {
        expect(service.isMimeAllowed('image/png', ['image/*'])).toBe(true);
        expect(service.isMimeAllowed('text/plain', ['image/*'])).toBe(false);
        expect(service.isMimeAllowed('text/plain', ['image/*', 'text/*'])).toBe(true);
    });

    test('isMimeAllowed allows everything when no patterns', () => {
        expect(service.isMimeAllowed('anything', [])).toBe(true);
        expect(service.isMimeAllowed('anything', null)).toBe(true);
    });
});

// =============================================================================
// LOCAL ADAPTER — PUT / GET / DELETE
// =============================================================================

describe('Blob Storage - Local Adapter Operations', () => {
    let tmpDir, server, service, mockDb;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hamlet-blob-test-'));
        mockDb = createMockDbPool();
        server = createMockServer({ storageRoot: tmpDir });
        // Register a mock database service so metadata queries work
        server._services.set('database', mockDb);
        service = createBlobStorage(server);
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('put writes file to disk and returns id + url', async () => {
        const stream = createReadableStream('hello world');
        const result = await service.put('testhost', stream, {
            filename: 'test.png',
            mimeType: 'image/png',
        });

        expect(result.id).toBeDefined();
        expect(typeof result.id).toBe('string');
        expect(result.id.length).toBeGreaterThan(0);
        expect(result.url).toBe(`/api/blobs/${result.id}`);

        // Verify file exists on disk
        const filePath = path.join(tmpDir, 'testhost', result.id);
        expect(fs.existsSync(filePath)).toBe(true);
        expect(fs.readFileSync(filePath, 'utf-8')).toBe('hello world');
    });

    test('put inserts metadata row', async () => {
        const stream = createReadableStream('data');
        const result = await service.put('testhost', stream, {
            filename: 'photo.jpg',
            mimeType: 'image/jpeg',
        });

        expect(mockDb.pool.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO blob_metadata'),
            expect.arrayContaining([result.id, 'testhost', 'photo.jpg', 'image/jpeg'])
        );
    });

    test('put creates host directory if missing', async () => {
        const stream = createReadableStream('test');
        await service.put('newhost', stream, { filename: 'f.png', mimeType: 'image/png' });

        expect(fs.existsSync(path.join(tmpDir, 'newhost'))).toBe(true);
    });

    test('put rejects oversized files', async () => {
        // Server configured with 1MB limit; send 2MB
        const bigData = Buffer.alloc(2 * 1024 * 1024, 'x');
        const stream = createReadableStream(bigData);

        await expect(
            service.put('testhost', stream, { filename: 'big.png', mimeType: 'image/png' })
        ).rejects.toThrow('FILE_TOO_LARGE');
    });

    test('put enforces tenant isolation via host directory', async () => {
        const s1 = createReadableStream('host-a-data');
        const s2 = createReadableStream('host-b-data');

        const r1 = await service.put('host-a', s1, { filename: 'a.png', mimeType: 'image/png' });
        const r2 = await service.put('host-b', s2, { filename: 'b.png', mimeType: 'image/png' });

        // Files in separate directories
        expect(fs.existsSync(path.join(tmpDir, 'host-a', r1.id))).toBe(true);
        expect(fs.existsSync(path.join(tmpDir, 'host-b', r2.id))).toBe(true);
        expect(fs.existsSync(path.join(tmpDir, 'host-a', r2.id))).toBe(false);
    });

    test('get returns null when metadata missing', async () => {
        mockDb.pool.query.mockResolvedValueOnce({ rows: [] });
        const result = await service.get('testhost', 'nonexistent-id');
        expect(result).toBeNull();
    });

    test('get returns stream with mime and filename', async () => {
        // Write a file
        const stream = createReadableStream('image data');
        const { id } = await service.put('testhost', stream, {
            filename: 'cat.png',
            mimeType: 'image/png',
        });

        // Mock the metadata query for get
        mockDb.pool.query.mockResolvedValueOnce({
            rows: [{ id, host: 'testhost', original_name: 'cat.png', mime_type: 'image/png', size_bytes: 10 }],
        });

        const blob = await service.get('testhost', id);
        expect(blob).not.toBeNull();
        expect(blob.mime).toBe('image/png');
        expect(blob.filename).toBe('cat.png');
        expect(blob.stream).toBeDefined();

        // Read the stream
        const chunks = [];
        for await (const chunk of blob.stream) {
            chunks.push(chunk);
        }
        expect(Buffer.concat(chunks).toString()).toBe('image data');
    });

    test('meta returns null when no database service', async () => {
        // Create a server without database
        const noDB = createMockServer({ storageRoot: tmpDir });
        const svc = createBlobStorage(noDB);
        const result = await svc.meta('host', 'id');
        expect(result).toBeNull();
    });

    test('delete removes file and metadata', async () => {
        // Write a file
        const stream = createReadableStream('to delete');
        const { id } = await service.put('testhost', stream, {
            filename: 'del.png',
            mimeType: 'image/png',
        });

        const filePath = path.join(tmpDir, 'testhost', id);
        expect(fs.existsSync(filePath)).toBe(true);

        // Mock metadata query for delete
        mockDb.pool.query.mockResolvedValueOnce({
            rows: [{ id, host: 'testhost', original_name: 'del.png', mime_type: 'image/png' }],
        });

        await service.delete('testhost', id);

        // File should be gone
        expect(fs.existsSync(filePath)).toBe(false);

        // Should have called DELETE on the DB
        expect(mockDb.pool.query).toHaveBeenCalledWith(
            expect.stringContaining('DELETE FROM blob_metadata'),
            [id, 'testhost']
        );
    });

    test('delete is a no-op for nonexistent blob', async () => {
        mockDb.pool.query.mockResolvedValueOnce({ rows: [] });
        // Should not throw
        await service.delete('testhost', 'nonexistent');
    });

    test('tenant isolation: host A cannot read host B blob', async () => {
        const stream = createReadableStream('secret');
        const { id } = await service.put('host-a', stream, {
            filename: 's.png',
            mimeType: 'image/png',
        });

        // Query for host-b should return no rows
        mockDb.pool.query.mockResolvedValueOnce({ rows: [] });
        const result = await service.get('host-b', id);
        expect(result).toBeNull();
    });
});

// =============================================================================
// S3 ADAPTER CONFIGURATION
// =============================================================================

describe('Blob Storage - S3 Adapter Config', () => {
    test('s3 adapter throws if bucket not set', () => {
        const server = createMockServer({ adapter: 's3', s3: {} });
        expect(() => createBlobStorage(server)).toThrow('blob.s3.bucket is required');
    });

    test('s3 adapter reports adapter name', () => {
        const server = createMockServer({
            adapter: 's3',
            s3: { bucket: 'test-bucket' },
        });

        // It won't actually connect — just constructs the adapter
        const service = createBlobStorage(server);
        expect(service.adapter).toBe('s3');
    });

    test('s3 adapter still mounts routes', () => {
        const server = createMockServer({
            adapter: 's3',
            s3: { bucket: 'test-bucket' },
        });

        createBlobStorage(server);
        expect(server.app.post).toHaveBeenCalledWith('/api/blobs', expect.any(Function));
        expect(server.app.get).toHaveBeenCalledWith('/api/blobs/:id', expect.any(Function));
    });
});

// =============================================================================
// HTTP ROUTE HANDLERS
// =============================================================================

describe('Blob Storage - HTTP Routes', () => {
    let tmpDir, server, mockDb;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hamlet-blob-test-'));
        mockDb = createMockDbPool();
        server = createMockServer({ storageRoot: tmpDir });
        server._services.set('database', mockDb);
        createBlobStorage(server);
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    function getRouteHandler(method, routePath) {
        const routes = server.routes[method];
        const route = routes.find(r => r.path === routePath);
        // Last handler (after any middleware)
        return route ? route.handlers[route.handlers.length - 1] : null;
    }

    test('POST /api/blobs rejects non-multipart requests', async () => {
        const handler = getRouteHandler('post', '/api/blobs');
        expect(handler).toBeDefined();

        const req = {
            tenant: { host: 'testhost' },
            headers: { 'content-type': 'application/json' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Expected multipart/form-data' });
    });

    test('GET /api/blobs/:id returns 404 for missing blob', async () => {
        const handler = getRouteHandler('get', '/api/blobs/:id');
        expect(handler).toBeDefined();

        mockDb.pool.query.mockResolvedValueOnce({ rows: [] });

        const req = {
            tenant: { host: 'testhost' },
            params: { id: 'nonexistent' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            setHeader: jest.fn(),
        };

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    test('DELETE /api/blobs/:id returns 404 for missing blob', async () => {
        const handler = getRouteHandler('delete', '/api/blobs/:id');
        expect(handler).toBeDefined();

        mockDb.pool.query.mockResolvedValueOnce({ rows: [] });

        const req = {
            tenant: { host: 'testhost' },
            params: { id: 'nonexistent' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });
});
