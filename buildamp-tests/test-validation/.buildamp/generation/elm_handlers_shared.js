/**
 * Elm Handlers Generation - Simple Project Entry Point
 * Uses shared generation system with simple project configuration
 */

import { generateElmHandlers as sharedGenerateElmHandlers } from '../../../../../shared/generation/elm_handlers.js';
import { config } from '../config.js';

export async function generateElmHandlers() {
    return sharedGenerateElmHandlers(config);
}

// Run generation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    try {
        const result = await generateElmHandlers();
        console.log('🎉 Elm handlers generation completed successfully!');
        console.log(`📊 Generated ${result.generated} handlers, skipped ${result.skipped} existing`);
    } catch (error) {
        console.error('❌ Elm handlers generation failed:', error);
        process.exit(1);
    }
}