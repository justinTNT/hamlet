import { jest } from '@jest/globals';
import request from 'supertest';
import { EventEmitter } from 'events';

// Mock dependencies
const mockCrypto = {
  randomUUID: jest.fn(() => 'test-uuid-123')
};
global.crypto = mockCrypto;

// Mock TenantSSEManager for testing
class TenantSSEManager {
    constructor() {
        this.tenantConnections = new Map(); // host -> Set<response>
        this.broadcastHistory = []; // For testing
    }

    addConnection(host, response) {
        if (!this.tenantConnections.has(host)) {
            this.tenantConnections.set(host, new Set());
        }
        this.tenantConnections.get(host).add(response);
        
        // Clean up on close
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
        // Store for testing verification
        this.broadcastHistory.push({ host, event });
        
        if (!this.tenantConnections.has(host)) {
            return; // No connections for this tenant
        }

        const connections = this.tenantConnections.get(host);
        const deadConnections = new Set();

        for (const response of connections) {
            try {
                response.write(`data: ${JSON.stringify(event)}\n\n`);
            } catch (error) {
                // Connection died, mark for cleanup
                deadConnections.add(response);
            }
        }

        // Clean up dead connections
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

    // Test helper methods
    clearHistory() {
        this.broadcastHistory = [];
    }

    getConnectionCount(host) {
        return this.tenantConnections.get(host)?.size || 0;
    }
}

// Mock Express app with SSE endpoints
function createMockApp() {
    const app = new EventEmitter();
    const sseManager = new TenantSSEManager();
    
    // Helper function to broadcast events
    function broadcastSSEEvent(host, eventType, data) {
        const event = {
            id: mockCrypto.randomUUID(),
            type: eventType,
            data: data,
            timestamp: Date.now(),
            host: host
        };
        
        sseManager.broadcast(host, event);
        return event.id;
    }

    // Mock route handlers
    const routes = {
        'GET /events/stream': (req, res) => {
            const host = req.headers.host || 'localhost';
            
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*'
            });

            const welcomeEvent = {
                id: mockCrypto.randomUUID(),
                type: 'connection',
                data: { message: 'Connected to live updates', host, timestamp: Date.now() },
                timestamp: Date.now()
            };
            res.write(`data: ${JSON.stringify(welcomeEvent)}\n\n`);

            sseManager.addConnection(host, res);
        },

        'POST /events/broadcast': (req, res) => {
            const host = req.headers.host || 'localhost';
            const { event_type, data } = req.body;

            if (!event_type || !data) {
                return res.status(400).json({ error: 'event_type and data are required' });
            }

            const eventId = broadcastSSEEvent(host, event_type, data);
            res.json({ 
                success: true, 
                event_id: eventId,
                connections_notified: sseManager.getStats(host).connections
            });
        },

        'GET /events/stats': (req, res) => {
            const host = req.headers.host || 'localhost';
            const { global } = req.query;
            
            const stats = global === 'true' ? sseManager.getStats() : sseManager.getStats(host);
            res.json(stats);
        }
    };

    return { app, sseManager, routes, broadcastSSEEvent };
}

describe('SSE Integration Tests', () => {
    let mockApp, sseManager, routes, broadcastSSEEvent;

    beforeEach(() => {
        ({ app: mockApp, sseManager, routes, broadcastSSEEvent } = createMockApp());
        jest.clearAllMocks();
        sseManager.clearHistory();
    });

    describe('TenantSSEManager', () => {
        test('should manage connections per tenant', () => {
            const mockResponse1 = new EventEmitter();
            mockResponse1.write = jest.fn();
            
            const mockResponse2 = new EventEmitter();
            mockResponse2.write = jest.fn();

            // Add connections for different tenants
            sseManager.addConnection('tenant1.com', mockResponse1);
            sseManager.addConnection('tenant2.com', mockResponse2);

            expect(sseManager.getConnectionCount('tenant1.com')).toBe(1);
            expect(sseManager.getConnectionCount('tenant2.com')).toBe(1);

            const globalStats = sseManager.getStats();
            expect(globalStats.total_connections).toBe(2);
            expect(globalStats.tenant_count).toBe(2);
        });

        test('should broadcast events to correct tenant only', () => {
            const mockResponse1 = new EventEmitter();
            mockResponse1.write = jest.fn();
            
            const mockResponse2 = new EventEmitter();
            mockResponse2.write = jest.fn();

            sseManager.addConnection('tenant1.com', mockResponse1);
            sseManager.addConnection('tenant2.com', mockResponse2);

            const testEvent = {
                id: 'test-123',
                type: 'new_post',
                data: { title: 'Test Post' },
                timestamp: Date.now()
            };

            sseManager.broadcast('tenant1.com', testEvent);

            // Only tenant1 should receive the event
            expect(mockResponse1.write).toHaveBeenCalledWith(`data: ${JSON.stringify(testEvent)}\n\n`);
            expect(mockResponse2.write).not.toHaveBeenCalled();
        });

        test('should clean up dead connections', () => {
            const mockResponse = new EventEmitter();
            mockResponse.write = jest.fn().mockImplementation(() => {
                throw new Error('Connection dead');
            });

            sseManager.addConnection('tenant1.com', mockResponse);
            expect(sseManager.getConnectionCount('tenant1.com')).toBe(1);

            // This should trigger cleanup of dead connection
            sseManager.broadcast('tenant1.com', { type: 'test' });

            expect(sseManager.getConnectionCount('tenant1.com')).toBe(0);
        });

        test('should handle connection close events', () => {
            const mockResponse = new EventEmitter();
            mockResponse.write = jest.fn();

            sseManager.addConnection('tenant1.com', mockResponse);
            expect(sseManager.getConnectionCount('tenant1.com')).toBe(1);

            // Simulate connection close
            mockResponse.emit('close');

            expect(sseManager.getConnectionCount('tenant1.com')).toBe(0);
        });
    });

    describe('Broadcast Helper', () => {
        test('should create properly structured events', () => {
            const eventId = broadcastSSEEvent('example.com', 'new_comment', {
                comment_id: 'comment_123',
                post_id: 'post_456',
                text: 'Great post!'
            });

            expect(eventId).toBe('test-uuid-123');
            expect(sseManager.broadcastHistory).toHaveLength(1);

            const broadcasted = sseManager.broadcastHistory[0];
            expect(broadcasted.host).toBe('example.com');
            expect(broadcasted.event.type).toBe('new_comment');
            expect(broadcasted.event.data.comment_id).toBe('comment_123');
            expect(broadcasted.event.id).toBe('test-uuid-123');
            expect(broadcasted.event.timestamp).toBeDefined();
        });
    });

    describe('Stats Endpoint Logic', () => {
        test('should return tenant-specific stats', () => {
            const mockResponse1 = new EventEmitter();
            mockResponse1.write = jest.fn();
            
            const mockResponse2 = new EventEmitter();
            mockResponse2.write = jest.fn();
            
            const mockResponse3 = new EventEmitter();
            mockResponse3.write = jest.fn();

            sseManager.addConnection('tenant1.com', mockResponse1);
            sseManager.addConnection('tenant1.com', mockResponse2);
            sseManager.addConnection('tenant2.com', mockResponse3);

            const tenant1Stats = sseManager.getStats('tenant1.com');
            expect(tenant1Stats.host).toBe('tenant1.com');
            expect(tenant1Stats.connections).toBe(2);

            const tenant2Stats = sseManager.getStats('tenant2.com');
            expect(tenant2Stats.host).toBe('tenant2.com');
            expect(tenant2Stats.connections).toBe(1);
        });

        test('should return global stats', () => {
            const mockResponse1 = new EventEmitter();
            mockResponse1.write = jest.fn();
            
            const mockResponse2 = new EventEmitter();
            mockResponse2.write = jest.fn();

            sseManager.addConnection('tenant1.com', mockResponse1);
            sseManager.addConnection('tenant2.com', mockResponse2);

            const globalStats = sseManager.getStats();
            expect(globalStats.total_connections).toBe(2);
            expect(globalStats.tenant_count).toBe(2);
            expect(globalStats.per_tenant['tenant1.com']).toBe(1);
            expect(globalStats.per_tenant['tenant2.com']).toBe(1);
        });
    });

    describe('Event Broadcasting Scenarios', () => {
        test('should handle new post events', () => {
            const mockResponse = new EventEmitter();
            mockResponse.write = jest.fn();

            sseManager.addConnection('blog.example.com', mockResponse);

            broadcastSSEEvent('blog.example.com', 'new_post', {
                post_id: 'post_789',
                title: 'New Blog Post',
                author_name: 'John Doe',
                author_id: 'user_123',
                extract: 'This is a new post',
                tags: ['tech', 'javascript'],
                timestamp: Date.now(),
                link: 'https://example.com/post/789'
            });

            expect(mockResponse.write).toHaveBeenCalled();
            const writeCall = mockResponse.write.mock.calls[0][0];
            const eventData = JSON.parse(writeCall.replace('data: ', '').replace('\n\n', ''));
            
            expect(eventData.type).toBe('new_post');
            expect(eventData.data.post_id).toBe('post_789');
            expect(eventData.data.title).toBe('New Blog Post');
            expect(eventData.data.tags).toEqual(['tech', 'javascript']);
        });

        test('should handle new comment events', () => {
            const mockResponse = new EventEmitter();
            mockResponse.write = jest.fn();

            sseManager.addConnection('blog.example.com', mockResponse);

            broadcastSSEEvent('blog.example.com', 'new_comment', {
                comment_id: 'comment_456',
                post_id: 'post_789',
                author_name: 'Jane Smith',
                author_id: 'user_456',
                text: 'Great article!',
                timestamp: Date.now()
            });

            expect(mockResponse.write).toHaveBeenCalled();
            const writeCall = mockResponse.write.mock.calls[0][0];
            const eventData = JSON.parse(writeCall.replace('data: ', '').replace('\n\n', ''));
            
            expect(eventData.type).toBe('new_comment');
            expect(eventData.data.comment_id).toBe('comment_456');
            expect(eventData.data.post_id).toBe('post_789');
            expect(eventData.data.text).toBe('Great article!');
        });

        test('should handle multiple concurrent connections', () => {
            const mockResponse1 = new EventEmitter();
            mockResponse1.write = jest.fn();
            
            const mockResponse2 = new EventEmitter();
            mockResponse2.write = jest.fn();
            
            const mockResponse3 = new EventEmitter();
            mockResponse3.write = jest.fn();

            // Same tenant, multiple connections
            sseManager.addConnection('example.com', mockResponse1);
            sseManager.addConnection('example.com', mockResponse2);
            
            // Different tenant
            sseManager.addConnection('other.com', mockResponse3);

            broadcastSSEEvent('example.com', 'test_event', { message: 'Hello' });

            // Both connections on example.com should receive the event
            expect(mockResponse1.write).toHaveBeenCalledTimes(1);
            expect(mockResponse2.write).toHaveBeenCalledTimes(1);
            
            // other.com connection should not receive the event
            expect(mockResponse3.write).not.toHaveBeenCalled();
        });

        test('should broadcast to no connections gracefully', () => {
            // No connections for this tenant
            const eventId = broadcastSSEEvent('empty.com', 'test_event', { data: 'test' });
            
            // Should complete successfully
            expect(eventId).toBe('test-uuid-123');
            expect(sseManager.broadcastHistory).toHaveLength(1);
        });
    });

    describe('Tenant Isolation', () => {
        test('should maintain strict tenant separation', () => {
            const tenant1Response = new EventEmitter();
            tenant1Response.write = jest.fn();
            
            const tenant2Response = new EventEmitter();
            tenant2Response.write = jest.fn();

            sseManager.addConnection('tenant1.com', tenant1Response);
            sseManager.addConnection('tenant2.com', tenant2Response);

            // Send events to both tenants
            broadcastSSEEvent('tenant1.com', 'event_a', { data: 'for tenant 1' });
            broadcastSSEEvent('tenant2.com', 'event_b', { data: 'for tenant 2' });

            // Verify each tenant only received their own event
            expect(tenant1Response.write).toHaveBeenCalledTimes(1);
            expect(tenant2Response.write).toHaveBeenCalledTimes(1);

            const tenant1Event = JSON.parse(
                tenant1Response.write.mock.calls[0][0].replace('data: ', '').replace('\n\n', '')
            );
            const tenant2Event = JSON.parse(
                tenant2Response.write.mock.calls[0][0].replace('data: ', '').replace('\n\n', '')
            );

            expect(tenant1Event.type).toBe('event_a');
            expect(tenant1Event.data.data).toBe('for tenant 1');
            expect(tenant2Event.type).toBe('event_b');
            expect(tenant2Event.data.data).toBe('for tenant 2');
        });

        test('should handle empty tenant store cleanup', () => {
            const mockResponse = new EventEmitter();
            mockResponse.write = jest.fn();

            sseManager.addConnection('temp.com', mockResponse);
            expect(sseManager.tenantConnections.has('temp.com')).toBe(true);

            // Close connection should clean up empty tenant store
            mockResponse.emit('close');
            expect(sseManager.tenantConnections.has('temp.com')).toBe(false);
        });
    });
});