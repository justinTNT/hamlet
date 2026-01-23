#!/usr/bin/env node

/**
 * BuildAmp Background Event Processor
 * 
 * Polls the events table and processes background events.
 * Part of BuildAmp's Background Event Queue feature.
 */

import pg from 'pg';
const { Pool } = pg;
import fs from 'fs';

// Database connection
const pool = new Pool({
    user: process.env.POSTGRES_USER || 'admin',
    password: process.env.POSTGRES_PASSWORD || 'password',
    host: process.env.POSTGRES_HOST || '127.0.0.1',
    database: process.env.POSTGRES_DB || 'horatio',
    port: 5432,
});

// Global SSE service reference - will be injected when running in server context
let sseService = null;

/**
 * Process SSE effects from event handlers
 */
async function processSSEEffects(effects, event, context) {
    if (!sseService) {
        console.warn(`[EventProcessor] SSE service not available, skipping ${effects.length} SSE effects`);
        return;
    }

    for (const effect of effects) {
        try {
            switch (effect.type || effect.constructor?.name) {
                case 'SendToSession':
                    if (effect.session_id) {
                        const result = sseService.broadcastToSession(effect.session_id, effect.event_type, effect.data);
                        console.log(`[EventProcessor] SSE sent to session ${effect.session_id?.substring(0, 8)}...: ${effect.event_type} (success: ${result.success})`);
                    }
                    break;

                case 'SendToSessions':
                    if (effect.session_ids && effect.session_ids.length > 0) {
                        const result = sseService.broadcastToSessions(effect.session_ids, effect.event_type, effect.data);
                        const successCount = Object.values(result.results).filter(success => success).length;
                        console.log(`[EventProcessor] SSE sent to ${effect.session_ids.length} sessions: ${effect.event_type} (${successCount} successful)`);
                    }
                    break;

                case 'BroadcastToTenant':
                    if (event.host) {
                        const result = sseService.broadcast(event.host, effect.event_type, effect.data);
                        console.log(`[EventProcessor] SSE broadcast to tenant ${event.host}: ${effect.event_type} (id: ${result.id})`);
                    }
                    break;

                default:
                    console.warn(`[EventProcessor] Unknown SSE effect type: ${effect.type}`);
            }
        } catch (sseError) {
            console.error(`[EventProcessor] SSE effect failed:`, sseError.message);
        }
    }
}

/**
 * Set the SSE service for session-aware broadcasting
 */
function setSSEService(service) {
    sseService = service;
    console.log('[EventProcessor] SSE service connected for session-aware events');
}

// Global Elm event service reference - will be injected when running in server context
let elmEventService = null;

/**
 * Set the Elm event service for TEA-based event handlers
 */
function setElmEventService(service) {
    elmEventService = service;
    console.log('[EventProcessor] Elm event service connected for TEA handlers');
}

// JavaScript event handlers (fallback when no Elm handler exists)
const eventHandlers = {
    SendWelcomeEmail: async (payload, context) => {
        console.log(`[SendWelcomeEmail] Sending welcome email to ${payload.email} (${payload.name})`);
        // TODO: Integrate with actual email service
        return { success: true };
    },

    NotifyCommentAdded: async (payload, context) => {
        console.log(`[NotifyCommentAdded] New comment by ${payload.author_name} on item ${payload.item_id}`);

        if (payload.item_owner_email) {
            console.log(`[NotifyCommentAdded] Would email ${payload.item_owner_email} about new comment`);
            // TODO: Send actual email notification
        }

        // TODO: Could also trigger push notifications, webhooks, etc.
        return { success: true };
    },

    ProcessUploadedVideo: async (payload, context) => {
        console.log(`[ProcessUploadedVideo] Processing video ${payload.video_id} at ${payload.video_path}`);
        // TODO: Integrate with video processing service
        return { success: true };
    },

    CleanupTempFiles: async (payload, context) => {
        console.log(`[CleanupTempFiles] Cleaning up files older than ${payload.age_hours} hours`);
        // TODO: Implement actual file cleanup
        return { success: true };
    },

    // Default handler for unknown event types
    default: async (eventType, payload, context) => {
        console.warn(`[EventProcessor] No handler found for event type: ${eventType}`);
        return { success: false, error: `No handler for event type: ${eventType}` };
    }
};

/**
 * Process a single event
 */
async function processEvent(event) {
    const { id, event_type, payload, context, attempts } = event;

    console.log(`[EventProcessor] Processing event ${id} (${event_type}), attempt ${attempts + 1}`);

    try {
        // Mark as processing
        await pool.query(
            'UPDATE buildamp_events SET status = $1, attempts = attempts + 1 WHERE id = $2',
            ['processing', id]
        );

        // Payload/context are JSONB columns - pg auto-parses them
        const eventPayload = typeof payload === 'string' ? JSON.parse(payload) : (payload || {});
        const eventContext = typeof context === 'string' ? JSON.parse(context) : (context || {});

        // Add event metadata to context
        const enrichedContext = {
            ...eventContext,
            host: event.host || 'localhost',
            session_id: event.session_id,
            correlation_id: event.correlation_id,
            attempt: attempts + 1,
            scheduled_at: event.execute_at ? new Date(event.execute_at).getTime() : Date.now()
        };

        let result;

        // Try Elm handler first if event service is available
        if (elmEventService && elmEventService.hasHandler(event_type)) {
            console.log(`[EventProcessor] Dispatching ${event_type} to Elm TEA handler`);
            try {
                result = await elmEventService.callHandler(event_type, eventPayload, enrichedContext);
            } catch (elmError) {
                console.error(`[EventProcessor] Elm handler failed: ${elmError.message}`);
                throw elmError;
            }
        } else {
            // Fall back to JavaScript handler
            const handler = eventHandlers[event_type] || eventHandlers.default;
            result = await handler(eventPayload, enrichedContext);
        }
        
        if (result.success) {
            // Mark as completed
            await pool.query(
                'UPDATE buildamp_events SET status = $1 WHERE id = $2',
                ['completed', id]
            );
            console.log(`[EventProcessor] Event ${id} completed successfully`);
            
            // Process SSE effects if present
            if (result.sse_effects && result.sse_effects.length > 0) {
                await processSSEEffects(result.sse_effects, event, eventContext);
            }
        } else {
            throw new Error(result.error || 'Handler returned failure');
        }
        
    } catch (error) {
        console.error(`[EventProcessor] Event ${id} failed:`, error.message);
        
        // Check if we should retry or move to DLQ
        const maxAttempts = event.max_attempts || 3;
        const newAttempts = attempts + 1;
        
        if (newAttempts >= maxAttempts) {
            // Move to Dead Letter Queue
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                
                // Insert into DLQ
                await client.query(`
                    INSERT INTO buildamp_dlq (
                        original_event_id, application, host, event_type, 
                        correlation_id, payload, context, final_error, total_attempts
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                `, [
                    event.id,
                    event.application,
                    event.host,
                    event.event_type,
                    event.correlation_id,
                    event.payload,
                    event.context,
                    error.message,
                    newAttempts
                ]);
                
                // Remove from events table
                await client.query('DELETE FROM buildamp_events WHERE id = $1', [id]);
                
                await client.query('COMMIT');
                console.log(`[EventProcessor] Event ${id} moved to Dead Letter Queue after ${newAttempts} attempts`);
                
            } catch (dlqError) {
                await client.query('ROLLBACK');
                console.error(`[EventProcessor] Failed to move event ${id} to DLQ:`, dlqError.message);
            } finally {
                client.release();
            }
        } else {
            // Schedule retry with exponential backoff
            const retryDelayMinutes = Math.pow(2, newAttempts - 1); // 1, 2, 4 minutes
            const nextRetry = new Date(Date.now() + retryDelayMinutes * 60 * 1000);
            
            await pool.query(
                'UPDATE buildamp_events SET status = $1, next_retry_at = $2, error_message = $3 WHERE id = $4',
                ['pending', nextRetry, error.message, id]
            );
            
            console.log(`[EventProcessor] Event ${id} scheduled for retry at ${nextRetry.toISOString()}`);
        }
    }
}

/**
 * Main polling loop
 */
async function pollEvents() {
    try {
        // Get ready events (pending and due for retry)
        const result = await pool.query(`
            SELECT * FROM buildamp_events 
            WHERE status = 'pending' 
              AND execute_at <= NOW() 
              AND (next_retry_at IS NULL OR next_retry_at <= NOW())
            ORDER BY priority DESC, execute_at ASC 
            LIMIT 10
        `);
        
        if (result.rows.length > 0) {
            console.log(`[EventProcessor] Processing ${result.rows.length} pending events`);
            
            // Process events concurrently (but limit concurrency)
            const promises = result.rows.map(event => processEvent(event));
            await Promise.allSettled(promises);
        }
        
    } catch (error) {
        console.error('[EventProcessor] Polling error:', error.message);
    }
}

/**
 * Start the event processor
 */
async function start() {
    console.log('[EventProcessor] Starting BuildAmp Background Event Processor...');
    
    // Test database connection
    try {
        await pool.query('SELECT 1');
        console.log('[EventProcessor] Database connection established');
    } catch (error) {
        console.error('[EventProcessor] Database connection failed:', error.message);
        process.exit(1);
    }
    
    // Start polling
    const pollIntervalMs = parseInt(process.env.POLL_INTERVAL_MS) || 5000; // 5 seconds
    console.log(`[EventProcessor] Polling every ${pollIntervalMs}ms`);
    
    setInterval(pollEvents, pollIntervalMs);
    
    // Initial poll
    await pollEvents();
}

/**
 * Graceful shutdown
 */
process.on('SIGINT', async () => {
    console.log('[EventProcessor] Shutting down gracefully...');
    await pool.end();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('[EventProcessor] Shutting down gracefully...');
    await pool.end();
    process.exit(0);
});

/**
 * Start polling (called by server or when run standalone)
 */
async function startPolling() {
    const pollIntervalMs = parseInt(process.env.POLL_INTERVAL_MS) || 5000;
    console.log(`[EventProcessor] Starting polling every ${pollIntervalMs}ms`);

    setInterval(pollEvents, pollIntervalMs);
    await pollEvents(); // Initial poll
}

// Start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    start().catch(error => {
        console.error('[EventProcessor] Startup failed:', error.message);
        process.exit(1);
    });
}

export { processEvent, eventHandlers, setSSEService, setElmEventService, startPolling };