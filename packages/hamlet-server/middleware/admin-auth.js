/**
 * Admin Authentication Middleware
 * Protects admin routes by checking the auth tier set by auth-resolver.
 *
 * Security model:
 * - Requires `projectAdmin` auth level (set by auth-resolver via X-Hamlet-Project-Key header)
 * - Still respects tenant isolation - admin sees only their tenant's data
 */

export default function createAdminAuthMiddleware(projectKeys = {}) {
    const hasKeys = Object.keys(projectKeys).length > 0;
    const legacyKey = !hasKeys ? process.env.HAMLET_PROJECT_KEY : null;

    if (!hasKeys && !legacyKey) {
        console.warn('⚠️  No project keys configured - admin routes will be disabled');
        return (req, res, next) => {
            res.status(503).json({
                error: 'Admin interface disabled - no project keys configured'
            });
        };
    }

    return (req, res, next) => {
        if (req.authLevel !== 'projectAdmin') {
            return res.status(401).json({
                error: 'Admin access denied',
                hint: 'Provide project key via X-Hamlet-Project-Key header'
            });
        }

        // Mark request as admin-authenticated
        req.isAdmin = true;

        console.log(`👑 Admin access granted for ${req.tenant?.host || 'localhost'}`);
        next();
    };
}

/**
 * Utility function to check if request is admin-authenticated
 * Use this in other middlewares that need admin verification
 */
export function requireAdmin(req, res, next) {
    if (req.authLevel !== 'projectAdmin') {
        return res.status(401).json({
            error: 'Admin authentication required'
        });
    }
    next();
}
