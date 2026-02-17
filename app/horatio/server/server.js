import { HamletServer } from '../../../packages/hamlet-server/core/server.js';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load .env from app root (one level up from server/)
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Custom configuration for Horatio
const config = {
    port: process.env.PORT || 3000,
    application: 'horatio',              // backward compat
    applications: ['horatio'],            // multi-project list
    defaultProject: 'horatio',            // fallback for unknown hostnames
    poolSize: 5,
    features: {
        database: true, // Enable PostgreSQL integration
        kv: true,       // Enable key-value store
        sse: true,      // Enable server-sent events
        wasm: true,     // Enable BuildAmp WASM integration
        blob: true      // Enable blob storage for file uploads
    },
    // Per-project admin keys (routes env var through config)
    projectKeys: {
        horatio: process.env.HAMLET_PROJECT_KEY || undefined
    },
    // PostgreSQL configuration (from .env)
    database: {
        user: String(process.env.POSTGRES_USER),
        password: String(process.env.POSTGRES_PASSWORD),
        host: String(process.env.POSTGRES_HOST),
        database: String(process.env.POSTGRES_DB),
        port: parseInt(process.env.POSTGRES_PORT, 10),
        migrations: './migrations'
    }
};

// Create and start server
const server = new HamletServer(config);

// Register admin middleware after server creation but before start
console.log('🔧 Setting up admin interface...');

// Serve admin UI static files (no auth needed for static assets)
const adminDistPath = path.join(__dirname, '../admin/dist');

// Serve static assets (JS, CSS, etc.) without authentication
server.app.use('/admin/ui/assets', express.static(path.join(adminDistPath, 'assets')));

// Serve the main admin UI directory without authentication for static files
server.app.use('/admin/ui', express.static(adminDistPath));

// Admin UI redirect (no auth - the Elm app authenticates via API calls with X-Hamlet-Project-Key header)
server.app.get('/admin', (req, res) => {
    // Forward query params (e.g. ?project_key=...) so the JS entrypoint can pick them up
    const qs = req.originalUrl.split('?')[1];
    res.redirect('/admin/ui/' + (qs ? '?' + qs : ''));
});

// Note: Don't apply auth to /admin/ui/* because static files need to load first
// The Elm app will handle authentication via API calls

await server.start();

// Database queries are now loaded per-project by ProjectLoader
console.log(`Horatio Backend running at http://localhost:${config.port}`);
console.log(`Server-Sent Events available at http://localhost:${config.port}/events/*`);
console.log(`Session API available at http://localhost:${config.port}/api/session/*`);
console.log(`Admin UI available at http://localhost:${config.port}/admin/ui`);
console.log(`Admin API available at http://localhost:${config.port}/admin/api/*`);
if (process.env.HAMLET_PROJECT_KEY) {
    console.log(`🔒 Admin access protected by HAMLET_PROJECT_KEY`);
} else {
    console.log(`⚠️  Admin access disabled - set HAMLET_PROJECT_KEY environment variable`);
}
