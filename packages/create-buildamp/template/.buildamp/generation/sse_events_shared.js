/**
 * SSE Events Generation - Simple Project Entry Point
 * Uses shared generation system with simple project configuration
 */

import { generateSSEEvents as sharedGenerateSSEEvents } from '../../../../../shared/generation/sse_events.js';
import { config } from '../config.js';

export function generateSSEEvents() {
    return sharedGenerateSSEEvents(config);
}

// Run generation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    try {
        const result = generateSSEEvents();
        if (result && result.generated) {
            console.log('🎉 SSE events generation completed successfully!');
            console.log(`📊 Generated ${result.models} SSE models`);
        } else {
            console.log('ℹ️  No SSE models found - generation skipped');
        }
    } catch (error) {
        console.error('❌ SSE events generation failed:', error);
        process.exit(1);
    }
}