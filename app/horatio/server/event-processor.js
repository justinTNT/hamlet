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

// Event handlers
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
            'UPDATE events SET status = $1, attempts = attempts + 1 WHERE id = $2',
            ['processing', id]
        );
        
        // Parse payload
        const eventPayload = JSON.parse(payload);
        const eventContext = context ? JSON.parse(context) : {};
        
        // Find and execute handler
        const handler = eventHandlers[event_type] || eventHandlers.default;
        const result = await handler(eventPayload, eventContext);
        
        if (result.success) {
            // Mark as completed
            await pool.query(
                'UPDATE events SET status = $1 WHERE id = $2',
                ['completed', id]
            );
            console.log(`[EventProcessor] Event ${id} completed successfully`);
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
                    INSERT INTO dead_letter_queue (
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
                await client.query('DELETE FROM events WHERE id = $1', [id]);
                
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
                'UPDATE events SET status = $1, next_retry_at = $2, error_message = $3 WHERE id = $4',
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
            SELECT * FROM events 
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

// Start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    start().catch(error => {
        console.error('[EventProcessor] Startup failed:', error.message);
        process.exit(1);
    });
}

export { processEvent, eventHandlers };