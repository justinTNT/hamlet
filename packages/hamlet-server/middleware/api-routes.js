/**
 * Basic API Routes Middleware
 *
 * Dev mode: Uses Vite middleware for HMR
 * Prod mode: Serves static files from dist/
 */

import { fileURLToPath } from 'url';
import path from 'path';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV !== 'production';

export default async function createAPIRoutes(server) {
    console.log('🛣️ Setting up API routes');

    const webDir = path.join(__dirname, '../../../app/horatio/web');
    const distPath = path.join(webDir, 'dist');

    let viteServer = null;

    // API routes first (before Vite middleware)
    server.app.get('/api/status', (req, res) => {
        res.json({
            tenant: req.tenant.host,
            features: server.loader.getLoadedFeatures(),
            timestamp: new Date().toISOString()
        });
    });

    // Catch-all 404 for unknown API routes (must come before Vite/static middleware)
    server.app.all('/api/*', (req, res) => {
        res.status(404).json({ error: `Unknown API endpoint: ${req.path}` });
    });

    // Static/Vite middleware last (fallback for non-API requests)
    if (isDev) {
        // Dev mode: Use Vite middleware for HMR
        try {
            const { createServer: createViteServer } = await import('vite');
            viteServer = await createViteServer({
                root: webDir,
                server: { middlewareMode: true },
                appType: 'custom'
            });
            server.app.use(viteServer.middlewares);
            console.log('⚡ Vite dev server enabled (HMR active)');
        } catch (e) {
            console.warn('⚠️ Vite not available, falling back to static serving:', e.message);
            server.app.use(express.static(distPath));
        }
    } else {
        // Prod mode: Serve pre-built static files
        server.app.use(express.static(distPath));
        console.log('📦 Serving static files from dist/');
    }

    return {
        viteServer,
        cleanup: async () => {
            if (viteServer) {
                await viteServer.close();
            }
            console.log('🧹 API routes cleanup');
        }
    };
}
