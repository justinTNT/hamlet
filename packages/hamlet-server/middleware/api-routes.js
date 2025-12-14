/**
 * Basic API Routes Middleware
 */

export default function createAPIRoutes(server) {
    console.log('🛣️ Setting up API routes');
    
    server.app.get('/api/status', (req, res) => {
        res.json({
            tenant: req.tenant.host,
            features: server.loader.getLoadedFeatures(),
            timestamp: new Date().toISOString()
        });
    });
    
    // 404 for unknown API routes
    server.app.use('/api/*', (req, res) => {
        res.status(404).json({
            error: 'API endpoint not found',
            path: req.path
        });
    });
    
    return {
        cleanup: async () => console.log('🧹 API routes cleanup')
    };
}