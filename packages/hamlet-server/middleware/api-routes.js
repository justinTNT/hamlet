/**
 * API Routes Middleware
 *
 * Registers auto-generated API routes from BuildAmp
 * Dev mode: Uses Vite middleware for HMR
 * Prod mode: Serves static files from dist/
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV !== 'production';

// Resolve index.html path: try host-specific first, fall back to default
function resolveIndexPath(server, baseDir, host) {
    const hostDir = server.services['host-dir'];
    if (hostDir?.hasHostAsset(host, 'index.html')) {
        return hostDir.getHostAssetPath(host, 'index.html');
    }
    const hostPath = path.join(baseDir, 'hosts', host, 'index.html');
    if (fs.existsSync(hostPath)) {
        return hostPath;
    }
    return path.join(baseDir, 'index.html');
}

export default async function createAPIRoutes(server) {
    console.log('🛣️ Setting up API routes');

    const appName = server.config.application || 'horatio';
    const webDir = path.join(__dirname, `../../../app/${appName}/web`);
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

    // Register auto-generated API routes from BuildAmp
    try {
        const apiRoutesPath = path.join(__dirname, `../../../app/${appName}/server/.generated/api-routes.js`);
        if (fs.existsSync(apiRoutesPath)) {
            const { default: registerApiRoutes } = await import(apiRoutesPath);
            registerApiRoutes(server);
        } else {
            console.warn('⚠️  No api-routes.js found at', apiRoutesPath);
        }
    } catch (error) {
        console.warn('⚠️  Auto-generated routes not available:', error.message);
    }

    // Catch-all 404 for unknown API routes (must come after generated routes)
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
                appType: 'custom'  // Don't let Vite handle HTML - our fallback does
            });
            server.app.use(viteServer.middlewares);
            console.log('⚡ Vite dev server enabled (HMR active)');

            // SPA fallback - serve index.html for client-side routes
            const publicDir = path.join(webDir, 'public');
            server.app.get('*', async (req, res) => {
                try {
                    const host = req.tenant?.host || 'localhost';
                    const indexPath = resolveIndexPath(server, publicDir, host);
                    let indexHtml = fs.readFileSync(indexPath, 'utf-8');
                    indexHtml = await viteServer.transformIndexHtml(req.originalUrl, indexHtml);
                    res.status(200).set({ 'Content-Type': 'text/html' }).end(indexHtml);
                } catch (e) {
                    console.error('SPA fallback error:', e);
                    res.status(500).send('Server error');
                }
            });
        } catch (e) {
            console.warn('⚠️ Vite not available, falling back to static serving:', e.message);
            const publicDir = path.join(webDir, 'public');
            server.app.use(express.static(publicDir));
            server.app.get('*', (req, res) => {
                const host = req.tenant?.host || 'localhost';
                res.sendFile(resolveIndexPath(server, publicDir, host));
            });
        }
    } else {
        // Prod mode: Serve pre-built static files
        server.app.use(express.static(distPath));
        server.app.get('*', (req, res) => {
            const host = req.tenant?.host || 'localhost';
            res.sendFile(resolveIndexPath(server, distPath, host));
        });
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
