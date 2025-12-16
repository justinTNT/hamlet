import { describe, it } from 'node:test';
import assert from 'node:assert';
import { extractTypesForEventsModule } from '../index.js';

describe('Events.elm Generation', () => {
    it('should separate event models from helper types', () => {
        const apiContent = `module Api exposing (..)

type alias SendWelcomeEmail =
    { correlationId : CorrelationId
    , userId : String
    , email : String
    }

type alias ProcessVideo =
    { correlationId : CorrelationId
    , videoId : String
    , executeAt : ExecuteAt
    }

type alias GenerateDailyReport =
    { userId : String
    , executeAt : ExecuteAt
    , reportType : String
    }`;

        const eventTypes = ['SendWelcomeEmail', 'ProcessVideo'];
        const helperTypes = ['GenerateDailyReport'];
        const config = {
            comment: '-- Test comment',
            source: '-- Test source',
            features: ['-- ✅ Test feature'],
            discovered: ['-- Test discovery']
        };

        const result = extractTypesForEventsModule(apiContent, eventTypes, helperTypes, config);

        // Check that event models come first
        const sendWelcomeEmailIndex = result.indexOf('type alias SendWelcomeEmail');
        const processVideoIndex = result.indexOf('type alias ProcessVideo');
        const generateDailyReportIndex = result.indexOf('type alias GenerateDailyReport');

        assert.ok(sendWelcomeEmailIndex > 0, 'Should include SendWelcomeEmail');
        assert.ok(processVideoIndex > 0, 'Should include ProcessVideo');
        assert.ok(generateDailyReportIndex > 0, 'Should include GenerateDailyReport');

        // Event models should come before helper types
        assert.ok(sendWelcomeEmailIndex < generateDailyReportIndex, 'Event models should come before helper types');
        assert.ok(processVideoIndex < generateDailyReportIndex, 'Event models should come before helper types');
    });

    it('should include section headers', () => {
        const apiContent = `module Api exposing (..)

type alias TestEvent =
    { correlationId : CorrelationId
    , data : String
    }

type alias TestHelper =
    { data : String
    }`;

        const eventTypes = ['TestEvent'];
        const helperTypes = ['TestHelper'];
        const config = {
            comment: '-- Test comment',
            source: '-- Test source',
            features: ['-- ✅ Test feature'],
            discovered: ['-- Test discovery']
        };

        const result = extractTypesForEventsModule(apiContent, eventTypes, helperTypes, config);

        // Check section headers
        assert.ok(result.includes('-- Event Models (actual events with CorrelationId)'), 'Should have event models header');
        assert.ok(result.includes('-- Helper Types (defined in event files but not standalone events)'), 'Should have helper types header');
    });

    it('should handle empty helper types', () => {
        const apiContent = `module Api exposing (..)

type alias TestEvent =
    { correlationId : CorrelationId
    , data : String
    }`;

        const eventTypes = ['TestEvent'];
        const helperTypes = [];
        const config = {
            comment: '-- Test comment',
            source: '-- Test source',
            features: ['-- ✅ Test feature'],
            discovered: ['-- Test discovery']
        };

        const result = extractTypesForEventsModule(apiContent, eventTypes, helperTypes, config);

        // Should include event models
        assert.ok(result.includes('type alias TestEvent'), 'Should include event type');
        
        // Should not include helper types header when no helper types
        assert.ok(!result.includes('-- Helper Types'), 'Should not have helper types header when no helpers');
    });

    it('should generate proper module structure', () => {
        const apiContent = `module Api exposing (..)

type alias TestEvent =
    { correlationId : CorrelationId
    , data : String
    }`;

        const eventTypes = ['TestEvent'];
        const helperTypes = [];
        const config = {
            comment: '-- Contains event types',
            source: '-- Generated from: src/models/events/',
            features: ['-- ✅ Correlation ID tracing'],
            discovered: ['-- Event models discovered']
        };

        const result = extractTypesForEventsModule(apiContent, eventTypes, helperTypes, config);

        // Check module declaration
        assert.ok(result.startsWith('module Events exposing (..)'), 'Should have proper module declaration');
        
        // Check imports
        assert.ok(result.includes('import Json.Decode'), 'Should import Json.Decode');
        assert.ok(result.includes('import Json.Encode'), 'Should import Json.Encode');
        
        // Check config sections
        assert.ok(result.includes('-- Contains event types'), 'Should include comment');
        assert.ok(result.includes('-- Generated from: src/models/events/'), 'Should include source');
        assert.ok(result.includes('-- ✅ Correlation ID tracing'), 'Should include features');
        assert.ok(result.includes('-- Event models discovered'), 'Should include discovered');
    });
});