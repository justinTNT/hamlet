/**
 * Admin Authentication Middleware
 * Protects admin routes with HAMLET_ADMIN_TOKEN verification
 * 
 * Security model:
 * - Simple token-based authentication via environment variable
 * - Token can be provided via:
 *   - Authorization header: `Bearer <token>`
 *   - Query parameter: ?admin_token=<token>
 *   - Cookie: admin_token=<token>
 * - Still respects tenant isolation - admin sees only their tenant's data
 */

export default function createAdminAuthMiddleware() {
    const adminToken = process.env.HAMLET_ADMIN_TOKEN;

    if (!adminToken) {
        console.warn('⚠️  HAMLET_ADMIN_TOKEN not set - admin routes will be disabled');
        return (req, res, next) => {
            res.status(503).json({
                error: 'Admin interface disabled - HAMLET_ADMIN_TOKEN not configured'
            });
        };
    }

    return (req, res, next) => {
        // Extract token from various sources
        const token = extractToken(req);

        if (!token) {
            return res.status(401).json({
                error: 'Admin access denied - no token provided',
                hint: 'Provide token via Authorization header, ?admin_token= query param, or admin_token cookie'
            });
        }

        if (token !== adminToken) {
            console.warn(`🚨 Invalid admin token attempt from ${req.ip}`);
            return res.status(403).json({
                error: 'Admin access denied - invalid token'
            });
        }

        // Mark request as admin-authenticated
        req.isAdmin = true;
        req.adminToken = token;

        console.log(`👑 Admin access granted for ${req.tenant?.host || 'localhost'}`);
        next();
    };
}

/**
 * Extract admin token from request
 * Supports multiple token sources for developer convenience
 */
function extractToken(req) {
    // 1. Authorization header: Authorization: Bearer <token>
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }

    // 2. Query parameter: ?admin_token=<token>
    if (req.query.admin_token) {
        return req.query.admin_token;
    }

    // 3. Cookie: admin_token=<token>
    if (req.cookies && req.cookies.admin_token) {
        return req.cookies.admin_token;
    }

    return null;
}

/**
 * Utility function to check if request is admin-authenticated
 * Use this in other middlewares that need admin verification
 */
export function requireAdmin(req, res, next) {
    if (!req.isAdmin) {
        return res.status(401).json({
            error: 'Admin authentication required'
        });
    }
    next();
}