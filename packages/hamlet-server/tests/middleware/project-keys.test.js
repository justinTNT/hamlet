/**
 * Tests for per-project key auth (auth-resolver + admin-auth multi-project support)
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import createAuthResolver, { requireAuth } from '../../middleware/auth-resolver.js';
import createAdminAuth from '../../middleware/admin-auth.js';
import createAdminApi from '../../middleware/admin-api.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal mock server wired with auth-resolver for the given config.
 * Returns the express app so we can fire supertest requests through it.
 */
function buildServer(config, dbOverrides = {}) {
    const app = express();
    app.use(express.json());

    const mockDb = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        ...dbOverrides
    };

    const server = {
        app,
        config,
        getService: jest.fn().mockReturnValue(mockDb),
    };

    // Mount auth-resolver (registers its middleware on app)
    createAuthResolver(server);

    return { app, server, mockDb };
}

/**
 * Attach a terminal route that echoes back auth fields so supertest can inspect them.
 */
function addEchoRoute(app) {
    app.get('/echo-auth', (req, res) => {
        res.json({
            authLevel: req.authLevel,
            authProject: req.authProject ?? null,
        });
    });
}

// ---------------------------------------------------------------------------
// auth-resolver: per-project keys
// ---------------------------------------------------------------------------

describe('Auth Resolver — per-project keys', () => {
    const projectKeys = {
        horatio: 'horatio-secret',
        othello: 'othello-secret',
    };

    let app;

    beforeEach(() => {
        delete process.env.HAMLET_PROJECT_KEY;
        ({ app } = buildServer({ projectKeys }));
        addEchoRoute(app);
    });

    test('recognises horatio key and sets authProject', async () => {
        const res = await request(app)
            .get('/echo-auth')
            .set('X-Hamlet-Project-Key', 'horatio-secret');

        expect(res.body.authLevel).toBe('projectAdmin');
        expect(res.body.authProject).toBe('horatio');
    });

    test('recognises othello key and sets authProject', async () => {
        const res = await request(app)
            .get('/echo-auth')
            .set('X-Hamlet-Project-Key', 'othello-secret');

        expect(res.body.authLevel).toBe('projectAdmin');
        expect(res.body.authProject).toBe('othello');
    });

    test('rejects an unknown key', async () => {
        const res = await request(app)
            .get('/echo-auth')
            .set('X-Hamlet-Project-Key', 'wrong-key');

        expect(res.body.authLevel).toBe('noAdmin');
        expect(res.body.authProject).toBeNull();
    });

    test('no header → noAdmin', async () => {
        const res = await request(app).get('/echo-auth');

        expect(res.body.authLevel).toBe('noAdmin');
        expect(res.body.authProject).toBeNull();
    });

    test('ignores legacy env var when projectKeys are configured', async () => {
        process.env.HAMLET_PROJECT_KEY = 'legacy-env-secret';

        // Rebuild server so auth-resolver picks up env at init time
        const { app: freshApp } = buildServer({ projectKeys });
        addEchoRoute(freshApp);

        const res = await request(freshApp)
            .get('/echo-auth')
            .set('X-Hamlet-Project-Key', 'legacy-env-secret');

        // The env key should NOT grant access when projectKeys is populated
        expect(res.body.authLevel).toBe('noAdmin');
    });

    test('skips undefined/null values in projectKeys', async () => {
        const { app: freshApp } = buildServer({
            projectKeys: {
                horatio: 'horatio-secret',
                disabled: undefined,
                alsoDisabled: null,
            },
        });
        addEchoRoute(freshApp);

        // Valid key still works
        const good = await request(freshApp)
            .get('/echo-auth')
            .set('X-Hamlet-Project-Key', 'horatio-secret');
        expect(good.body.authLevel).toBe('projectAdmin');
        expect(good.body.authProject).toBe('horatio');

        // Falsy values don't match
        const bad = await request(freshApp)
            .get('/echo-auth')
            .set('X-Hamlet-Project-Key', 'undefined');
        expect(bad.body.authLevel).toBe('noAdmin');
    });
});

// ---------------------------------------------------------------------------
// auth-resolver: legacy env-var fallback
// ---------------------------------------------------------------------------

describe('Auth Resolver — legacy env-var fallback', () => {
    beforeEach(() => {
        delete process.env.HAMLET_PROJECT_KEY;
    });

    test('falls back to HAMLET_PROJECT_KEY when no projectKeys configured', async () => {
        process.env.HAMLET_PROJECT_KEY = 'legacy-secret';

        const { app } = buildServer({}); // no projectKeys
        addEchoRoute(app);

        const res = await request(app)
            .get('/echo-auth')
            .set('X-Hamlet-Project-Key', 'legacy-secret');

        expect(res.body.authLevel).toBe('projectAdmin');
        // Legacy path does NOT set authProject
        expect(res.body.authProject).toBeNull();
    });

    test('legacy env var rejects wrong key', async () => {
        process.env.HAMLET_PROJECT_KEY = 'legacy-secret';

        const { app } = buildServer({});
        addEchoRoute(app);

        const res = await request(app)
            .get('/echo-auth')
            .set('X-Hamlet-Project-Key', 'nope');

        expect(res.body.authLevel).toBe('noAdmin');
    });

    test('no env var and no projectKeys → noAdmin for any key', async () => {
        const { app } = buildServer({});
        addEchoRoute(app);

        const res = await request(app)
            .get('/echo-auth')
            .set('X-Hamlet-Project-Key', 'anything');

        expect(res.body.authLevel).toBe('noAdmin');
    });
});

// ---------------------------------------------------------------------------
// admin-auth: projectKeys parameter
// ---------------------------------------------------------------------------

describe('Admin Auth — projectKeys parameter', () => {
    test('enables admin when projectKeys has entries', () => {
        const mw = createAdminAuth({ horatio: 'key1', othello: 'key2' });
        const req = { authLevel: 'projectAdmin', tenant: { host: 'localhost' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();

        mw(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.isAdmin).toBe(true);
    });

    test('disables admin when projectKeys is empty and no env var', () => {
        delete process.env.HAMLET_PROJECT_KEY;
        const mw = createAdminAuth({});

        const req = {};
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();

        mw(req, res, next);

        expect(res.status).toHaveBeenCalledWith(503);
        expect(next).not.toHaveBeenCalled();
    });

    test('falls back to env var when projectKeys is empty', () => {
        process.env.HAMLET_PROJECT_KEY = 'legacy';
        const mw = createAdminAuth({});

        const req = { authLevel: 'projectAdmin', tenant: { host: 'localhost' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();

        mw(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.isAdmin).toBe(true);

        delete process.env.HAMLET_PROJECT_KEY;
    });
});

// ---------------------------------------------------------------------------
// Full stack: auth-resolver → admin-auth → admin-api (multi-project)
// ---------------------------------------------------------------------------

describe('Full stack — multi-project admin API', () => {
    const projectKeys = {
        horatio: 'horatio-secret',
        othello: 'othello-secret',
    };

    let app, mockDb;

    beforeEach(() => {
        delete process.env.HAMLET_PROJECT_KEY;

        app = express();
        app.use(express.json());

        mockDb = {
            query: jest.fn().mockImplementation((sql, params) => {
                if (sql.includes('SELECT COUNT')) {
                    return Promise.resolve({ rows: [{ total: 0 }] });
                }
                return Promise.resolve({ rows: [] });
            }),
        };

        const server = {
            app,
            config: { projectKeys },
            getService: jest.fn().mockReturnValue(mockDb),
        };

        // Wire up auth-resolver then admin-api (which creates admin-auth internally)
        createAuthResolver(server);
        createAdminApi(server);
    });

    test('horatio key can access admin API', async () => {
        const res = await request(app)
            .get('/admin/api/guest')
            .set('X-Hamlet-Project-Key', 'horatio-secret')
            .set('Host', 'test.com');

        expect(res.status).toBe(200);
    });

    test('othello key can access admin API', async () => {
        const res = await request(app)
            .get('/admin/api/guest')
            .set('X-Hamlet-Project-Key', 'othello-secret')
            .set('Host', 'test.com');

        expect(res.status).toBe(200);
    });

    test('wrong key is rejected by admin API', async () => {
        const res = await request(app)
            .get('/admin/api/guest')
            .set('X-Hamlet-Project-Key', 'wrong')
            .set('Host', 'test.com');

        expect(res.status).toBe(401);
    });

    test('no key is rejected by admin API', async () => {
        const res = await request(app)
            .get('/admin/api/guest')
            .set('Host', 'test.com');

        expect(res.status).toBe(401);
    });
});

// ---------------------------------------------------------------------------
// requireAuth enforcement
// ---------------------------------------------------------------------------

describe('requireAuth enforcement', () => {
    test('projectAdmin satisfies projectAdmin requirement', () => {
        const mw = requireAuth('projectAdmin');
        const req = { authLevel: 'projectAdmin' };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();

        mw(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    test('hostAdmin does not satisfy projectAdmin requirement', () => {
        const mw = requireAuth('projectAdmin');
        const req = { authLevel: 'hostAdmin' };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();

        mw(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
    });

    test('hostAdmin satisfies hostAdmin requirement', () => {
        const mw = requireAuth('hostAdmin');
        const req = { authLevel: 'hostAdmin' };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();

        mw(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    test('projectAdmin satisfies hostAdmin requirement', () => {
        const mw = requireAuth('hostAdmin');
        const req = { authLevel: 'projectAdmin' };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();

        mw(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    test('noAdmin fails hostAdmin requirement', () => {
        const mw = requireAuth('hostAdmin');
        const req = { authLevel: 'noAdmin' };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();

        mw(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
    });
});
