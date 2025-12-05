-- Background Event Queue with Dead Letter Queue support
-- Part of BuildAmp Background Event Queue feature

-- Main events table for background processing
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application TEXT NOT NULL DEFAULT 'horatio',
    host TEXT NOT NULL,
    stream_id TEXT,                    -- optional grouping within tenant
    event_type TEXT NOT NULL,          -- "SendWelcomeEmail", "ProcessVideo", etc
    correlation_id UUID,               -- trace back to original request
    payload JSONB NOT NULL,            -- event data
    execute_at TIMESTAMP DEFAULT NOW(),
    context JSONB,                     -- preserved context snapshot
    status TEXT DEFAULT 'pending',     -- pending, processing, completed, failed
    created_at TIMESTAMP DEFAULT NOW(),
    attempts INTEGER DEFAULT 0,        -- retry tracking
    max_attempts INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP,
    error_message TEXT,                -- failure information
    priority TEXT DEFAULT 'normal'     -- high, normal, low
);

-- Dead letter queue for permanently failed events
CREATE TABLE IF NOT EXISTS dead_letter_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_event_id UUID NOT NULL,
    application TEXT NOT NULL,
    host TEXT NOT NULL,
    event_type TEXT NOT NULL,
    correlation_id UUID,
    payload JSONB NOT NULL,
    context JSONB,
    final_error TEXT NOT NULL,
    total_attempts INTEGER NOT NULL,
    failed_at TIMESTAMP DEFAULT NOW(),
    -- Optional: manual retry capability
    manual_retry_requested BOOLEAN DEFAULT FALSE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_pending ON events(execute_at, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_events_processing ON events(status, created_at) WHERE status = 'processing';
CREATE INDEX IF NOT EXISTS idx_events_app_host ON events(application, host);
CREATE INDEX IF NOT EXISTS idx_events_correlation ON events(correlation_id);
CREATE INDEX IF NOT EXISTS idx_events_type_host ON events(event_type, host);
CREATE INDEX IF NOT EXISTS idx_events_priority ON events(priority, execute_at) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_dlq_app_host ON dead_letter_queue(application, host);
CREATE INDEX IF NOT EXISTS idx_dlq_event_type ON dead_letter_queue(event_type);
CREATE INDEX IF NOT EXISTS idx_dlq_failed_at ON dead_letter_queue(failed_at);
CREATE INDEX IF NOT EXISTS idx_dlq_manual_retry ON dead_letter_queue(manual_retry_requested) WHERE manual_retry_requested = TRUE;