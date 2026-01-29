/**
 * API Routes Middleware
 *
 * Provides:
 *   - GET /api/status (shared)
 *   - ALL /api/* catch-all 404 (shared)
 *   - Static/SPA serving per-project (reads req.project to resolve dist dir)
 *
 * API route registration is handled by ProjectLoader (per-project via proxy).
 * Dev mode: Uses Vite middleware for the defaultProject only.
 * Prod mode: Serves static files from app/{project}/web/dist/.
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

/**
 * Resolve the web directory for a project
 */
function resolveWebDir(projectName) {
    return path.join(__dirname, `../../../app/${projectName}/web`);
}

export default async function createAPIRoutes(server) {
    console.log('🛣️ Setting up API routes');

    const defaultProject = server.config.defaultProject || server.config.application || 'horatio';

    let viteServer = null;

    // API status endpoint (shared, not project-specific)
    server.app.get('/api/status', (req, res) => {
        res.json({
            tenant: req.tenant.host,
            project: req.project || defaultProject,
            features: server.loader.getLoadedFeatures(),
            timestamp: new Date().toISOString()
        });
    });

    // Catch-all 404 for unknown API routes (must come after project router dispatch)
    server.app.all('/api/*', (req, res) => {
        res.status(404).json({ error: `Unknown API endpoint: ${req.path}` });
    });

    // Static/Vite middleware last (fallback for non-API requests)
    if (isDev) {
        // Dev mode: Use Vite middleware for the defaultProject only
        const webDir = resolveWebDir(defaultProject);

        try {
            const { createServer: createViteServer } = await import('vite');

            viteServer = await createViteServer({
                root: webDir,
                server: { middlewareMode: true },
                appType: 'custom'
            });
            server.app.use(viteServer.middlewares);
            console.log('⚡ Vite dev server enabled (HMR active)');

            // SPA fallback - serve index.html for client-side routes
            const publicDir = path.join(webDir, 'public');
            server.app.get('*', async (req, res) => {
                try {
                    const host = req.tenant?.host || 'localhost';
                    const projectName = req.project || defaultProject;
                    const projectPublicDir = path.join(resolveWebDir(projectName), 'public');
                    const baseDir = fs.existsSync(projectPublicDir) ? projectPublicDir : publicDir;
                    const indexPath = resolveIndexPath(server, baseDir, host);
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
            server.app.use((req, res, next) => {
                const projectName = req.project || defaultProject;
                const publicDir = path.join(resolveWebDir(projectName), 'public');
                express.static(publicDir)(req, res, next);
            });
            server.app.get('*', (req, res) => {
                const host = req.tenant?.host || 'localhost';
                const projectName = req.project || defaultProject;
                const publicDir = path.join(resolveWebDir(projectName), 'public');
                res.sendFile(resolveIndexPath(server, publicDir, host));
            });
        }
    } else {
        // Prod mode: Serve pre-built static files per-project
        server.app.use((req, res, next) => {
            const projectName = req.project || defaultProject;
            const distPath = path.join(resolveWebDir(projectName), 'dist');
            express.static(distPath)(req, res, next);
        });
        server.app.get('*', (req, res) => {
            const host = req.tenant?.host || 'localhost';
            const projectName = req.project || defaultProject;
            const distPath = path.join(resolveWebDir(projectName), 'dist');
            res.sendFile(resolveIndexPath(server, distPath, host));
        });
        console.log('📦 Serving static files (project-aware)');
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
