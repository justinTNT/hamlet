import crypto from 'node:crypto';

/**
 * Server-Sent Events Middleware  
 * Provides tenant-isolated real-time event broadcasting
 */

class TenantSSEManager {
    constructor() {
        this.tenantConnections = new Map(); // host -> Set<response>
        this.sessionConnections = new Map(); // sessionId -> response
        this.connectionSessions = new Map(); // response -> sessionId
    }

    addConnection(host, response, sessionId = null) {
        if (!this.tenantConnections.has(host)) {
            this.tenantConnections.set(host, new Set());
        }
        this.tenantConnections.get(host).add(response);
        
        // Track session mapping if provided
        if (sessionId) {
            this.sessionConnections.set(sessionId, response);
            this.connectionSessions.set(response, sessionId);
        }
        
        response.on('close', () => {
            this.removeConnection(host, response);
        });
    }

    removeConnection(host, response) {
        if (this.tenantConnections.has(host)) {
            this.tenantConnections.get(host).delete(response);
            if (this.tenantConnections.get(host).size === 0) {
                this.tenantConnections.delete(host);
            }
        }
        
        // Clean up session mappings
        const sessionId = this.connectionSessions.get(response);
        if (sessionId) {
            this.sessionConnections.delete(sessionId);
            this.connectionSessions.delete(response);
        }
    }

    broadcast(host, event) {
        if (!this.tenantConnections.has(host)) {
            return;
        }

        const connections = this.tenantConnections.get(host);
        const deadConnections = new Set();

        for (const response of connections) {
            try {
                response.write(`data: ${JSON.stringify(event)}\n\n`);
            } catch (error) {
                deadConnections.add(response);
            }
        }

        for (const response of deadConnections) {
            this.removeConnection(host, response);
        }
    }

    broadcastToSession(sessionId, event) {
        const response = this.sessionConnections.get(sessionId);
        if (!response) {
            return false;
        }

        try {
            response.write(`data: ${JSON.stringify(event)}\n\n`);
            return true;
        } catch (error) {
            // Clean up dead connection
            const sessionData = this.connectionSessions.get(response);
            if (sessionData) {
                // Find host for this session to clean up tenant connections
                for (const [host, connections] of this.tenantConnections.entries()) {
                    if (connections.has(response)) {
                        this.removeConnection(host, response);
                        break;
                    }
                }
            }
            return false;
        }
    }

    broadcastToSessions(sessionIds, event) {
        const results = {};
        for (const sessionId of sessionIds) {
            results[sessionId] = this.broadcastToSession(sessionId, event);
        }
        return results;
    }

    getStats(host = null) {
        if (host) {
            return {
                host: host,
                connections: this.tenantConnections.get(host)?.size || 0
            };
        } else {
            const stats = {};
            let totalConnections = 0;
            for (const [tenantHost, connections] of this.tenantConnections.entries()) {
                const count = connections.size;
                stats[tenantHost] = count;
                totalConnections += count;
            }
            return {
                total_connections: totalConnections,
                tenant_count: this.tenantConnections.size,
                session_connections: this.sessionConnections.size,
                per_tenant: stats
            };
        }
    }
}

export default function createServerSentEvents(server) {
    console.log('📡 Setting up server-sent events');
    
    const sseManager = new TenantSSEManager();
    
    server.app.get('/events', (req, res) => {
        const host = req.tenant?.host || 'localhost';
        const sessionId = req.session?.id;
        
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });
        
        const welcomeEvent = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            type: 'connection',
            data: { 
                message: 'Connected', 
                host: host,
                session_id: sessionId?.substring(0, 8) + '...' || 'unknown'
            }
        };
        res.write(`data: ${JSON.stringify(welcomeEvent)}\n\n`);
        
        sseManager.addConnection(host, res, sessionId);
        console.log(`📡 New SSE connection for: ${host} (session: ${sessionId?.substring(0, 8)}...)`);
    });
    
    const sseService = {
        manager: sseManager,
        broadcast: (host, eventType, data) => {
            const event = {
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                type: eventType,
                data: data
            };
            sseManager.broadcast(host, event);
            return event;
        },
        broadcastToSession: (sessionId, eventType, data) => {
            const event = {
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                type: eventType,
                data: data
            };
            const success = sseManager.broadcastToSession(sessionId, event);
            return { event, success };
        },
        broadcastToSessions: (sessionIds, eventType, data) => {
            const event = {
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                type: eventType,
                data: data
            };
            const results = sseManager.broadcastToSessions(sessionIds, event);
            return { event, results };
        },
        getStats: (host) => sseManager.getStats(host),
        
        cleanup: async () => {
            console.log('🧹 Cleaning up server-sent events');
            for (const [host, connections] of sseManager.tenantConnections) {
                for (const response of connections) {
                    try {
                        response.end();
                    } catch (error) {
                        // Ignore errors when closing connections
                    }
                }
            }
            sseManager.tenantConnections.clear();
        }
    };
    
    server.registerService('sse', sseService);
    return sseService;
}