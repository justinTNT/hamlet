/**
 * Database Queries Generation - Simple Project Entry Point
 * Uses shared generation system with simple project configuration
 */

import { generateDatabaseQueries as sharedGenerateDatabaseQueries } from '../../../../../shared/generation/database_queries.js';
import { config } from '../config.js';

export function generateDatabaseQueries() {
    return sharedGenerateDatabaseQueries(config);
}

// Run generation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    try {
        const result = generateDatabaseQueries();
        console.log('🎉 Database queries generation completed successfully!');
    } catch (error) {
        console.error('❌ Database queries generation failed:', error);
        process.exit(1);
    }
}