import { HamletServer } from '../../../packages/hamlet-server/core/server.js';
import createAdminApi from '../../../packages/hamlet-server/middleware/admin-api.js';
import createAdminAuth from '../../../packages/hamlet-server/middleware/admin-auth.js';
import createDbQueries from './.hamlet-gen/database-queries.js';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Custom configuration for Horatio
const config = {
    port: process.env.PORT || 3000,
    application: 'horatio',
    poolSize: 5,
    features: {
        database: true, // Enable PostgreSQL integration
        kv: true,       // Enable key-value store
        sse: true,      // Enable server-sent events  
        wasm: true      // Enable BuildAmp WASM integration
    },
    // PostgreSQL configuration
    database: {
        user: String(process.env.POSTGRES_USER || 'admin'),
        password: String(process.env.POSTGRES_PASSWORD || 'password'), 
        host: String(process.env.POSTGRES_HOST || '127.0.0.1'),
        database: String(process.env.POSTGRES_DB || 'horatio'),
        port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
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

// Admin UI HTML routes (with authentication)
const adminAuth = createAdminAuth();

server.app.get('/admin', adminAuth, (req, res) => {
    res.redirect('/admin/ui/');
});

// Note: Don't apply auth to /admin/ui/* because static files need to load first
// The Elm app will handle authentication via API calls

await server.start();

// Extend database service with app-specific generated queries
const db = server.getService('database');
if (db) {
    const dbQueries = createDbQueries(db.pool);
    db.extend(dbQueries);
    console.log('✅ Database service extended with Horatio queries');
}

// Register admin API after server starts (so database service is available)
console.log('🔧 Registering admin API...');
createAdminApi(server);

console.log(`Horatio Backend running at http://localhost:${config.port}`);
console.log(`Server-Sent Events available at http://localhost:${config.port}/events/*`);
console.log(`Session API available at http://localhost:${config.port}/api/session/*`);
console.log(`Admin UI available at http://localhost:${config.port}/admin/ui`);
console.log(`Admin API available at http://localhost:${config.port}/admin/api/*`);
if (process.env.HAMLET_ADMIN_TOKEN) {
    console.log(`🔒 Admin access protected by HAMLET_ADMIN_TOKEN`);
} else {
    console.log(`⚠️  Admin access disabled - set HAMLET_ADMIN_TOKEN environment variable`);
}
