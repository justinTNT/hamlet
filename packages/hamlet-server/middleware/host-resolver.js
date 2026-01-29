/**
 * Host Resolver Middleware
 *
 * Maps hostnames to project names using the hamlet_hosts table.
 * Sets req.project on every request. Uses an in-memory cache
 * refreshed on a 30s interval via cron, with immediate invalidation
 * available through the admin API.
 */

export default async function createHostResolver(server) {
    console.log('🌐 Setting up Host Resolver');

    const db = server.getService('database');
    const config = server.config;
    const defaultProject = config.defaultProject || config.application || 'horatio';

    // In-memory hostname -> project cache
    let hostMap = new Map();

    /**
     * Load all hostname->project mappings from DB into memory
     */
    async function refresh() {
        try {
            const result = await db.query(
                'SELECT hostname, project FROM hamlet_hosts'
            );
            const newMap = new Map();
            for (const row of result.rows) {
                newMap.set(row.hostname, row.project);
            }
            hostMap = newMap;
            console.log(`🌐 Host resolver refreshed: ${hostMap.size} mappings`);
        } catch (error) {
            console.warn('⚠️ Host resolver refresh failed:', error.message);
        }
    }

    /**
     * Invalidate cache entry (or full cache if no hostname given)
     */
    async function invalidate(hostname) {
        if (hostname) {
            // Single entry invalidation: remove and re-fetch just that one
            try {
                const result = await db.query(
                    'SELECT project FROM hamlet_hosts WHERE hostname = $1',
                    [hostname]
                );
                if (result.rows.length > 0) {
                    hostMap.set(hostname, result.rows[0].project);
                } else {
                    hostMap.delete(hostname);
                }
            } catch (error) {
                console.warn('⚠️ Host resolver invalidation failed:', error.message);
            }
        } else {
            // Full flush + reload
            await refresh();
        }
    }

    /**
     * Resolve hostname to project name
     */
    function resolve(hostname) {
        return hostMap.get(hostname) || null;
    }

    // Initial load
    await refresh();

    // Set up 30s refresh interval
    const refreshInterval = setInterval(() => {
        refresh();
    }, 30000);

    // Middleware: set req.project on every request
    server.app.use((req, res, next) => {
        const hostname = req.tenant?.host || 'localhost';
        const project = resolve(hostname);

        if (project) {
            req.project = project;
        } else if (defaultProject) {
            req.project = defaultProject;
        } else {
            return res.status(404).json({ error: 'Unknown host' });
        }

        next();
    });

    const hostResolverService = {
        refresh,
        invalidate,
        resolve,
        getHostMap: () => new Map(hostMap),
        cleanup: async () => {
            clearInterval(refreshInterval);
            console.log('🧹 Host resolver cleanup');
        }
    };

    server.registerService('host-resolver', hostResolverService);
    return hostResolverService;
}
