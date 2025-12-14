import crypto from 'node:crypto';

/**
 * Server-Sent Events Middleware  
 * Provides tenant-isolated real-time event broadcasting
 */

class TenantSSEManager {
    constructor() {
        this.tenantConnections = new Map(); // host -> Set<response>
    }

    addConnection(host, response) {
        if (!this.tenantConnections.has(host)) {
            this.tenantConnections.set(host, new Set());
        }
        this.tenantConnections.get(host).add(response);
        
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
            data: { message: 'Connected', host: host }
        };
        res.write(`data: ${JSON.stringify(welcomeEvent)}\n\n`);
        
        sseManager.addConnection(host, res);
        console.log(`📡 New SSE connection for: ${host}`);
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