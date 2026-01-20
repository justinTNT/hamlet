/**
 * Update Golden Snapshots
 *
 * Copies current generated files to the golden directory for snapshot testing.
 * Run this after intentional changes to generators.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const goldenDir = path.join(__dirname, 'golden');
const projectRoot = path.join(__dirname, '../../..');
const horatioDir = path.join(projectRoot, 'app/horatio');

// Map of golden file names to their source locations
const fileMappings = {
    // SQL
    'schema.sql': path.join(horatioDir, 'sql/migrations/schema.sql'),
    'schema.json': path.join(horatioDir, 'server/.generated/schema.json'),
    // Database
    'database-queries.js': path.join(horatioDir, 'server/.generated/database-queries.js'),
    'Database.elm': path.join(horatioDir, 'server/.generated/BuildAmp/Database.elm'),
    'Backend.elm': path.join(horatioDir, 'server/src/Api/Backend.elm'),
    // API
    'api-routes.js': path.join(horatioDir, 'server/.generated/api-routes.js'),
    'ApiClient.elm': path.join(horatioDir, 'web/src/.generated/ApiClient.elm'),
    // KV Store
    'kv-store.js': path.join(horatioDir, 'server/.generated/kv-store.js'),
    // SSE
    'sse-connection.js': path.join(horatioDir, 'server/.generated/sse-connection.js'),
    'ServerSentEvents.elm': path.join(horatioDir, 'web/src/.generated/ServerSentEvents.elm'),
    // Browser Storage
    'browser-storage.js': path.join(horatioDir, 'web/src/.generated/browser-storage.js'),
    'StoragePorts.elm': path.join(horatioDir, 'web/src/.generated/StoragePorts.elm'),
};

console.log('📸 Updating golden snapshots...\n');

let updated = 0;
let skipped = 0;
let errors = 0;

for (const [goldenName, sourcePath] of Object.entries(fileMappings)) {
    const goldenPath = path.join(goldenDir, goldenName);

    if (!fs.existsSync(sourcePath)) {
        console.log(`⚠️  Skipped ${goldenName}: source not found at ${sourcePath}`);
        skipped++;
        continue;
    }

    try {
        const content = fs.readFileSync(sourcePath, 'utf-8');
        fs.writeFileSync(goldenPath, content);
        console.log(`✅ Updated ${goldenName}`);
        updated++;
    } catch (err) {
        console.log(`❌ Error updating ${goldenName}: ${err.message}`);
        errors++;
    }
}

console.log(`\n📊 Summary: ${updated} updated, ${skipped} skipped, ${errors} errors`);

if (errors > 0) {
    process.exit(1);
}
