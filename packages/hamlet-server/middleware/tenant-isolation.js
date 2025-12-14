/**
 * Tenant Isolation Middleware
 * Host-based tenant routing and isolation
 */

function extractTenantHost(req) {
    const host = req.get('Host') || req.hostname || 'localhost';
    return host.split(':')[0]; // Remove port
}

export default function createTenantIsolation(server) {
    console.log('🏠 Setting up tenant isolation');
    
    server.app.use((req, res, next) => {
        req.tenant = {
            host: extractTenantHost(req),
            isolated: true
        };
        
        res.set('X-Tenant-Host', req.tenant.host);
        next();
    });
    
    const tenantService = {
        extractHost: extractTenantHost,
        validateAccess: (req, resourceTenant) => req.tenant.host === resourceTenant,
        getTenantContext: (req) => ({ host: req.tenant.host }),
        cleanup: async () => console.log('🧹 Tenant isolation cleanup')
    };
    
    server.registerService('tenant', tenantService);
    return tenantService;
}