/**
 * Elm Shared Modules Generation - Simple Project Entry Point
 * Uses shared generation system with simple project configuration
 */

import { generateElmSharedModules as sharedGenerateElmSharedModules } from '../../../../../shared/generation/elm_shared_modules.js';
import { config } from '../config.js';

export async function generateElmSharedModules() {
    return sharedGenerateElmSharedModules(config);
}

// Run generation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    try {
        generateElmSharedModules();
        console.log('🎉 Elm shared modules generation completed successfully!');
    } catch (error) {
        console.error('❌ Elm shared modules generation failed:', error);
        process.exit(1);
    }
}