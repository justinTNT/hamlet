/**
 * Auth Resolver Middleware
 *
 * Resolves auth tier from request headers and sets req.authLevel.
 * Does NOT enforce policy — just resolves the tier.
 *
 * Tiers:
 *   noAdmin      — no key present
 *   hostAdmin    — valid X-Hamlet-Host-Key for this tenant
 *   projectAdmin — valid X-Hamlet-Project-Key (future)
 */

export default function createAuthResolver(server) {
    console.log('🔑 Setting up auth resolver middleware');

    const db = server.getService('database');
    if (!db) {
        console.warn('⚠️ Auth resolver skipped: Database service not available');
        return;
    }

    // Project-level key from environment (future: per-project table)
    const projectKey = process.env.HAMLET_PROJECT_KEY || null;

    server.app.use(async (req, res, next) => {
        // Default: no admin
        req.authLevel = 'noAdmin';

        try {
            // 1. Check project key
            const projectKeyHeader = req.get('X-Hamlet-Project-Key');
            if (projectKey && projectKeyHeader && projectKeyHeader === projectKey) {
                req.authLevel = 'projectAdmin';
                return next();
            }

            // 2. Check host key
            const hostKeyHeader = req.get('X-Hamlet-Host-Key');
            if (hostKeyHeader) {
                const host = req.tenant?.host || 'localhost';
                const result = await db.query(
                    `SELECT id FROM hamlet_host_keys
                     WHERE target_host = $1
                       AND key = $2
                       AND revoked_at IS NULL
                     LIMIT 1`,
                    [host, hostKeyHeader]
                );
                if (result.rows.length > 0) {
                    req.authLevel = 'hostAdmin';
                }
            }
        } catch (err) {
            // If the table doesn't exist yet (migrations pending), silently continue
            if (err.code !== '42P01') {
                console.error('Auth resolver error:', err.message);
            }
        }

        next();
    });

    // Register requireAuth on the server so generated routes can use it
    server.requireAuth = requireAuth;

    console.log('✅ Auth resolver middleware mounted');
}

/**
 * Enforcement middleware factory.
 * Used by generated routes to gate access by auth level.
 */
export function requireAuth(level) {
    const levels = { noAdmin: 0, hostAdmin: 1, projectAdmin: 2 };
    return (req, res, next) => {
        if ((levels[req.authLevel] || 0) >= (levels[level] || 0)) {
            return next();
        }
        res.status(401).json({ error: `Requires ${level} access` });
    };
}
