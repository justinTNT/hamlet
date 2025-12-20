/**
 * API Routes Generation - Simple Project Entry Point
 * Uses shared generation system with simple project configuration
 */

import { generateApiRoutes as sharedGenerateApiRoutes } from '../../../../../shared/generation/api_routes.js';
import { config } from '../config.js';

export function generateApiRoutes() {
    return sharedGenerateApiRoutes(config);
}

// Run generation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    try {
        const result = generateApiRoutes();
        if (result) {
            console.log('🎉 API routes generation completed successfully!');
            console.log(`📊 Generated ${result.routes} routes and ${result.endpoints} endpoints`);
        }
    } catch (error) {
        console.error('❌ API routes generation failed:', error);
        process.exit(1);
    }
}