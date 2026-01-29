/**
 * ProjectServerProxy
 *
 * A proxy that looks like the real HamletServer to generated code.
 * Each project gets its own proxy with:
 *   - .app → Express Router (not the real app)
 *   - .getService() → project-scoped first, then shared fallback
 *   - .config → real config with application = projectName
 *   - .requireAuth → forwarded from real server
 *
 * Generated code calls server.app.post('/api/GetFeed', ...)
 * and server.getService('elm') — both work transparently.
 */

export class ProjectServerProxy {
    constructor(realServer, projectName, router) {
        this.app = router;
        this.config = { ...realServer.config, application: projectName };
        this.requireAuth = realServer.requireAuth;
        this.loader = realServer.loader;
        this._realServer = realServer;
        this._services = new Map();
    }

    getService(name) {
        return this._services.get(name) || this._realServer.getService(name);
    }

    registerService(name, instance) {
        this._services.set(name, instance);
    }

    /**
     * Get all project-scoped services (for cleanup)
     */
    getProjectServices() {
        return this._services;
    }
}
