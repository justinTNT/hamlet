/**
 * Basic API Routes Middleware
 */

import { fileURLToPath } from 'url';
import path from 'path';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function createAPIRoutes(server) {
    console.log('🛣️ Setting up API routes');
    
    // Serve static files from the built web app
    const webPath = path.join(__dirname, '../../../app/horatio/web/dist');
    server.app.use(express.static(webPath));
    
    // Root route serves the web application
    server.app.get('/', (req, res) => {
        res.sendFile(path.join(webPath, 'index.html'));
    });
    
    server.app.get('/api/status', (req, res) => {
        res.json({
            tenant: req.tenant.host,
            features: server.loader.getLoadedFeatures(),
            timestamp: new Date().toISOString()
        });
    });
    
    // Note: 404 handler for unknown API routes moved to end of middleware chain
    
    return {
        cleanup: async () => console.log('🧹 API routes cleanup')
    };
}