-- BuildAmp Events Infrastructure - Authoritative Definition
-- Auto-generated when src/models/events/ directory contains files
-- Framework claims ownership of buildamp_events and buildamp_dlq tables
-- This migration is IDEMPOTENT and can be run multiple times safely

-- WARNING: This will DROP and recreate BuildAmp infrastructure tables
-- Only affects: buildamp_events, buildamp_dlq (user tables are safe)

-- Drop existing BuildAmp infrastructure tables (data will be lost)
DROP TABLE IF EXISTS buildamp_events CASCADE;
DROP TABLE IF EXISTS buildamp_dlq CASCADE;

-- Create authoritative events infrastructure with session_id support
CREATE TABLE buildamp_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT,                   -- First-class session targeting for SSE/WebSocket
    application TEXT NOT NULL DEFAULT 'buildamp_app',
    host TEXT NOT NULL,
    stream_id TEXT,                    -- Optional grouping within tenant
    event_type TEXT NOT NULL,          -- "SendWelcomeEmail", "ProcessVideo", etc
    correlation_id UUID,               -- Trace back to original request
    payload JSONB NOT NULL,            -- Event data
    execute_at TIMESTAMP DEFAULT NOW(),
    context JSONB,                     -- Preserved context snapshot
    status TEXT DEFAULT 'pending',     -- pending, processing, completed, failed
    created_at TIMESTAMP DEFAULT NOW(),
    attempts INTEGER DEFAULT 0,        -- Retry tracking
    max_attempts INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP,
    error_message TEXT,                -- Failure information
    priority TEXT DEFAULT 'normal'     -- high, normal, low
);

-- Dead letter queue for permanently failed events
CREATE TABLE buildamp_dlq (
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
    manual_retry_requested BOOLEAN DEFAULT FALSE
);

-- Performance indexes for events table
CREATE INDEX idx_buildamp_events_session ON buildamp_events(session_id, status);
CREATE INDEX idx_buildamp_events_queue ON buildamp_events(status, execute_at, priority);
CREATE INDEX idx_buildamp_events_correlation ON buildamp_events(correlation_id);
CREATE INDEX idx_buildamp_events_app_host ON buildamp_events(application, host);
CREATE INDEX idx_buildamp_events_type_host ON buildamp_events(event_type, host);
CREATE INDEX idx_buildamp_events_priority ON buildamp_events(priority, execute_at) WHERE status = 'pending';

-- Performance indexes for dead letter queue
CREATE INDEX idx_buildamp_dlq_app_host ON buildamp_dlq(application, host);
CREATE INDEX idx_buildamp_dlq_event_type ON buildamp_dlq(event_type);
CREATE INDEX idx_buildamp_dlq_failed_at ON buildamp_dlq(failed_at);
CREATE INDEX idx_buildamp_dlq_manual_retry ON buildamp_dlq(manual_retry_requested) WHERE manual_retry_requested = TRUE;

-- Framework schema version tracking
CREATE TABLE IF NOT EXISTS buildamp_schema_info (
    component TEXT PRIMARY KEY,
    version INTEGER NOT NULL,
    installed_at TIMESTAMP DEFAULT NOW()
);

-- Record events infrastructure version
INSERT INTO buildamp_schema_info (component, version) 
VALUES ('events', 2) 
ON CONFLICT (component) DO UPDATE SET 
    version = EXCLUDED.version,
    installed_at = NOW();