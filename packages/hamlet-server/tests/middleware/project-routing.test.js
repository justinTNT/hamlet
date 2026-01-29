/**
 * Tests for multi-project routing
 *
 * Verifies that:
 *   - Project router dispatch correctly routes /api/* requests
 *   - Generated routes (which register at /api/X) match without double-prefix
 *   - req.project is set and used for router lookup
 *   - Unknown projects fall through to the catch-all 404
 */

import { jest } from '@jest/globals';
import express, { Router } from 'express';
import request from 'supertest';

describe('Project Routing', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());
    });

    /**
     * Simulate the middleware-loader's project router dispatch.
     * This is the exact pattern from middleware-loader.js.
     */
    function mountProjectDispatch(app, getRouter) {
        app.use((req, res, next) => {
            if (!req.path.startsWith('/api/')) return next();
            const router = getRouter(req.project);
            if (router) {
                router(req, res, next);
            } else {
                next();
            }
        });
    }

    /**
     * Simulate what generated api-routes.js does:
     * registers routes on server.app with full /api/... paths.
     */
    function registerGeneratedRoutes(router) {
        // Mimics: server.app.post('/api/GetFeed', handler)
        router.post('/api/GetFeed', (req, res) => {
            res.json({ endpoint: 'GetFeed', project: req.project });
        });
        router.post('/api/SubmitComment', (req, res) => {
            res.json({ endpoint: 'SubmitComment', project: req.project });
        });
    }

    test('routes /api requests to the correct project router', async () => {
        const projectRouter = Router();
        registerGeneratedRoutes(projectRouter);

        // Set req.project before dispatch (simulates host-resolver)
        app.use((req, res, next) => {
            req.project = 'horatio';
            next();
        });

        mountProjectDispatch(app, (project) => {
            if (project === 'horatio') return projectRouter;
            return null;
        });

        // Catch-all 404 (simulates api-routes.js)
        app.all('/api/*', (req, res) => {
            res.status(404).json({ error: 'Unknown API endpoint' });
        });

        const response = await request(app)
            .post('/api/GetFeed')
            .send({});

        expect(response.status).toBe(200);
        expect(response.body.endpoint).toBe('GetFeed');
        expect(response.body.project).toBe('horatio');
    });

    test('routes do not double-prefix /api/api/', async () => {
        const projectRouter = Router();
        registerGeneratedRoutes(projectRouter);

        app.use((req, res, next) => {
            req.project = 'horatio';
            next();
        });

        mountProjectDispatch(app, () => projectRouter);

        app.all('/api/*', (req, res) => {
            res.status(404).json({ error: 'Unknown API endpoint' });
        });

        // /api/api/GetFeed should NOT match — that would be the double-prefix bug
        const response = await request(app)
            .post('/api/api/GetFeed')
            .send({});

        expect(response.status).toBe(404);
    });

    test('falls through to 404 when no project router exists', async () => {
        app.use((req, res, next) => {
            req.project = 'nonexistent';
            next();
        });

        mountProjectDispatch(app, () => null);

        app.all('/api/*', (req, res) => {
            res.status(404).json({ error: 'Unknown API endpoint' });
        });

        const response = await request(app)
            .post('/api/GetFeed')
            .send({});

        expect(response.status).toBe(404);
    });

    test('non-API paths bypass project router dispatch', async () => {
        const projectRouter = Router();
        projectRouter.get('/health', (req, res) => {
            res.json({ wrong: true });
        });

        app.use((req, res, next) => {
            req.project = 'horatio';
            next();
        });

        mountProjectDispatch(app, () => projectRouter);

        // Register a non-API route on the main app
        app.get('/health', (req, res) => {
            res.json({ status: 'ok' });
        });

        const response = await request(app).get('/health');

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
        expect(response.body.wrong).toBeUndefined();
    });

    test('multiple projects route to separate routers', async () => {
        const horatioRouter = Router();
        horatioRouter.post('/api/GetFeed', (req, res) => {
            res.json({ project: 'horatio' });
        });

        const othelloRouter = Router();
        othelloRouter.post('/api/GetFeed', (req, res) => {
            res.json({ project: 'othello' });
        });

        const routers = { horatio: horatioRouter, othello: othelloRouter };

        // Simulate host-resolver setting different projects based on header
        app.use((req, res, next) => {
            req.project = req.get('X-Test-Project') || 'horatio';
            next();
        });

        mountProjectDispatch(app, (project) => routers[project] || null);

        app.all('/api/*', (req, res) => {
            res.status(404).json({ error: 'Unknown API endpoint' });
        });

        const horatioRes = await request(app)
            .post('/api/GetFeed')
            .set('X-Test-Project', 'horatio')
            .send({});

        expect(horatioRes.status).toBe(200);
        expect(horatioRes.body.project).toBe('horatio');

        const othelloRes = await request(app)
            .post('/api/GetFeed')
            .set('X-Test-Project', 'othello')
            .send({});

        expect(othelloRes.status).toBe(200);
        expect(othelloRes.body.project).toBe('othello');
    });
});
