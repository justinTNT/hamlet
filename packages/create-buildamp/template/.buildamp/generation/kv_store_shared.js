/**
 * KV Store Generation - Simple Project Entry Point
 * Uses shared generation system with simple project configuration
 */

import { generateKvStore as sharedGenerateKvStore } from '../../../../../shared/generation/kv_store.js';
import { config } from '../config.js';

export function generateKvStore() {
    return sharedGenerateKvStore(config);
}

export { cleanupExpiredKeys, getTenantKeys } from '../../../../../shared/generation/kv_store.js';

// Run generation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    try {
        generateKvStore();
        console.log('🎉 KV store generation completed successfully!');
    } catch (error) {
        console.error('❌ KV store generation failed:', error);
        process.exit(1);
    }
}