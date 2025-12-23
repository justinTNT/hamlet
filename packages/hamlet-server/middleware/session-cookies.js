/**
 * Session Cookie Middleware
 * Replaces fingerprinting with standard HTTP session cookies
 */

import crypto from 'node:crypto';

export default function createSessionCookies(server) {
    console.log('🍪 Setting up session cookie middleware');
    
    // Session configuration
    const config = {
        cookieName: 'hamlet_session_id',
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year persistent
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax'
    };
    
    // In-memory session store (for production, use Redis or database)
    const sessionStore = new Map();
    
    // Generate secure session ID
    function generateSessionId() {
        return crypto.randomBytes(32).toString('base64url');
    }
    
    // In-memory pending session creation tracker to handle concurrent requests
    const pendingSessions = new Map(); // host -> Promise<sessionId>
    
    // Session management middleware
    server.app.use(async (req, res, next) => {
        const host = req.tenant?.host || 'localhost';
        
        // Check for existing session cookie
        let sessionId = req.cookies?.[config.cookieName];
        
        if (sessionId && sessionStore.has(sessionId)) {
            // Valid existing session - update last seen and continue
            const session = sessionStore.get(sessionId);
            session.last_seen = new Date();
            sessionStore.set(sessionId, session);
        } else {
            // Need to create a session - handle concurrent requests for same host
            if (pendingSessions.has(host)) {
                // Another request is already creating a session for this host - wait for it
                console.log(`🍪 Waiting for pending session creation for ${host}`);
                sessionId = await pendingSessions.get(host);
            } else {
                // We need to create the session
                const sessionCreationPromise = new Promise((resolve) => {
                    if (sessionId && !sessionStore.has(sessionId)) {
                        // Clear invalid cookie
                        res.clearCookie(config.cookieName);
                        console.log(`🍪 Clearing invalid session cookie: ${sessionId.substring(0, 8)}... for ${host}`);
                    }
                    
                    // Generate new session
                    const newSessionId = generateSessionId();
                    
                    // Store session with tenant context
                    sessionStore.set(newSessionId, {
                        id: newSessionId,
                        host: host,
                        created_at: new Date(),
                        last_seen: new Date()
                    });
                    
                    // Set persistent cookie
                    res.cookie(config.cookieName, newSessionId, {
                        maxAge: config.maxAge,
                        secure: config.secure,
                        httpOnly: config.httpOnly,
                        sameSite: config.sameSite
                    });
                    
                    console.log(`🍪 Created new session: ${newSessionId.substring(0, 8)}... for ${host}`);
                    
                    // Resolve immediately since we've created the session
                    resolve(newSessionId);
                });
                
                pendingSessions.set(host, sessionCreationPromise);
                sessionId = await sessionCreationPromise;
                
                // Clean up the pending promise after a short delay
                setTimeout(() => {
                    pendingSessions.delete(host);
                }, 1000);
            }
        }
        
        // Add session to request context
        req.session = {
            id: sessionId,
            data: sessionStore.get(sessionId)
        };
        
        // Add session ID to response headers for debugging
        res.set('X-Session-ID', sessionId.substring(0, 8) + '...');
        
        next();
    });
    
    // Session stats endpoint
    server.app.get('/api/session/stats', (req, res) => {
        const host = req.tenant?.host || 'localhost';
        
        // Count sessions for this tenant
        let tenantSessions = 0;
        let totalSessions = sessionStore.size;
        
        for (const [sessionId, session] of sessionStore.entries()) {
            if (session.host === host) {
                tenantSessions++;
            }
        }
        
        res.json({
            tenant: host,
            tenant_sessions: tenantSessions,
            total_sessions: totalSessions,
            current_session: req.session.id.substring(0, 8) + '...',
            session_created: req.session.data.created_at,
            session_last_seen: req.session.data.last_seen
        });
    });
    
    // Session cleanup endpoint (for development)
    server.app.post('/api/session/cleanup', (req, res) => {
        const beforeCount = sessionStore.size;
        const cutoff = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)); // 30 days
        
        for (const [sessionId, session] of sessionStore.entries()) {
            if (session.last_seen < cutoff) {
                sessionStore.delete(sessionId);
            }
        }
        
        const afterCount = sessionStore.size;
        
        res.json({
            message: 'Session cleanup completed',
            sessions_before: beforeCount,
            sessions_after: afterCount,
            sessions_removed: beforeCount - afterCount
        });
    });
    
    // Periodic cleanup of old sessions
    const cleanupInterval = setInterval(() => {
        const cutoff = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)); // 30 days
        let cleaned = 0;
        
        for (const [sessionId, session] of sessionStore.entries()) {
            if (session.last_seen < cutoff) {
                sessionStore.delete(sessionId);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            console.log(`🧹 Cleaned up ${cleaned} expired sessions`);
        }
    }, 60 * 60 * 1000); // Every hour
    
    // Register session service
    const sessionService = {
        // Get session for request
        getSession: (req) => req.session,
        
        // Create new session manually
        createSession: (host) => {
            const sessionId = generateSessionId();
            const session = {
                id: sessionId,
                host: host,
                created_at: new Date(),
                last_seen: new Date()
            };
            sessionStore.set(sessionId, session);
            return session;
        },
        
        // Get session by ID
        getSessionById: (sessionId) => sessionStore.get(sessionId),
        
        // Delete session
        deleteSession: (sessionId) => {
            const existed = sessionStore.has(sessionId);
            sessionStore.delete(sessionId);
            return existed;
        },
        
        // Get session stats
        getStats: (host = null) => {
            if (host) {
                let count = 0;
                for (const session of sessionStore.values()) {
                    if (session.host === host) count++;
                }
                return { host, sessions: count };
            } else {
                return { total_sessions: sessionStore.size };
            }
        },
        
        cleanup: async () => {
            console.log('🧹 Cleaning up session cookie middleware');
            clearInterval(cleanupInterval);
            sessionStore.clear();
        }
    };
    
    server.registerService('session', sessionService);
    return sessionService;
}