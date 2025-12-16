-- Legacy events migration - SUPERSEDED by 005_buildamp_events_infrastructure.sql
-- This migration is now a no-op to avoid conflicts with the new idempotent approach
-- The authoritative events infrastructure is in migration 005

-- BuildAmp now uses namespaced tables (buildamp_events, buildamp_dlq)
-- This avoids conflicts with existing user tables named 'events'

-- No-op migration - everything is handled by 005_buildamp_events_infrastructure.sql