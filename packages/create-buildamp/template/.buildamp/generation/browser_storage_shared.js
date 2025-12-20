/**
 * Browser Storage Generation - Simple Project Entry Point
 * Uses shared generation system with simple project configuration
 */

import { generateBrowserStorage as sharedGenerateBrowserStorage } from '../../../../../shared/generation/browser_storage.js';
import { config } from '../config.js';

export function generateBrowserStorage() {
    return sharedGenerateBrowserStorage(config);
}

// Run generation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    try {
        const result = generateBrowserStorage();
        console.log('🎉 Browser storage generation completed successfully!');
    } catch (error) {
        console.error('❌ Browser storage generation failed:', error);
        process.exit(1);
    }
}