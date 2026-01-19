/**
 * KV Store Generation
 *
 * Generates type-safe KV store APIs from Elm models.
 */

import fs from 'fs';
import path from 'path';
import { getGenerationPaths, ensureOutputDir } from './shared-paths.js';
import { parseElmKvDir } from '../../core/elm-parser-ts.js';

// Generate KV functions for a struct
function generateKvFunctions(struct) {
    const { name, fields } = struct;
    const lowerName = name.toLowerCase();

    return `
// Auto-generated KV store functions for ${name}

/**
 * Set ${name} in KV store with TTL and tenant isolation
 * @param {Object} ${lowerName} - ${name} data to store
 * @param {string} key - Cache key (will be prefixed with tenant)
 * @param {string} host - Tenant host for isolation
 * @param {Object} kvClient - KV store client (Redis/etc.)
 */
async function set${name}(${lowerName}, key, host, kvClient) {
    try {
        const tenantKey = \`\${host}:${lowerName}:\${key}\`;
        const ttl = ${lowerName}.ttl || 3600; // Default 1 hour if no TTL specified

        const serialized = JSON.stringify(${lowerName});
        await kvClient.setex(tenantKey, ttl, serialized);

        return true;
    } catch (error) {
        console.error(\`Error setting ${name}:\`, error);
        return false;
    }
}

/**
 * Get ${name} from KV store with tenant isolation
 * @param {string} key - Cache key (will be prefixed with tenant)
 * @param {string} host - Tenant host for isolation
 * @param {Object} kvClient - KV store client (Redis/etc.)
 * @returns {Object|null} ${name} data or null if not found/expired
 */
async function get${name}(key, host, kvClient) {
    try {
        const tenantKey = \`\${host}:${lowerName}:\${key}\`;
        const data = await kvClient.get(tenantKey);

        if (!data) {
            return null;
        }

        return JSON.parse(data);
    } catch (error) {
        console.error(\`Error getting ${name}:\`, error);
        return null;
    }
}

/**
 * Delete ${name} from KV store with tenant isolation
 * @param {string} key - Cache key (will be prefixed with tenant)
 * @param {string} host - Tenant host for isolation
 * @param {Object} kvClient - KV store client (Redis/etc.)
 * @returns {boolean} True if deleted, false otherwise
 */
async function delete${name}(key, host, kvClient) {
    try {
        const tenantKey = \`\${host}:${lowerName}:\${key}\`;
        const result = await kvClient.del(tenantKey);
        return result === 1;
    } catch (error) {
        console.error(\`Error deleting ${name}:\`, error);
        return false;
    }
}

/**
 * Check if ${name} exists in KV store with tenant isolation
 * @param {string} key - Cache key (will be prefixed with tenant)
 * @param {string} host - Tenant host for isolation
 * @param {Object} kvClient - KV store client (Redis/etc.)
 * @returns {boolean} True if exists, false otherwise
 */
async function exists${name}(key, host, kvClient) {
    try {
        const tenantKey = \`\${host}:${lowerName}:\${key}\`;
        const result = await kvClient.exists(tenantKey);
        return result === 1;
    } catch (error) {
        console.error(\`Error checking ${name} exists:\`, error);
        return false;
    }
}

/**
 * Update TTL for ${name} in KV store
 * @param {string} key - Cache key (will be prefixed with tenant)
 * @param {number} ttl - New TTL in seconds
 * @param {string} host - Tenant host for isolation
 * @param {Object} kvClient - KV store client (Redis/etc.)
 * @returns {boolean} True if TTL updated, false otherwise
 */
async function updateTtl${name}(key, ttl, host, kvClient) {
    try {
        const tenantKey = \`\${host}:${lowerName}:\${key}\`;
        const result = await kvClient.expire(tenantKey, ttl);
        return result === 1;
    } catch (error) {
        console.error(\`Error updating ${name} TTL:\`, error);
        return false;
    }
}
`.trim();
}

export function generateKvStore(config = {}) {
    console.log('🏗️ Generating KV store functions...');

    const paths = getGenerationPaths(config);
    const elmKvDir = paths.elmKvDir;

    if (!fs.existsSync(elmKvDir)) {
        console.log(`📁 No KV models found at ${elmKvDir}, skipping generation`);
        return { models: 0, functions: 0 };
    }

    const allStructs = parseElmKvDir(elmKvDir);

    if (allStructs.length === 0) {
        console.log('📁 No KV models found, skipping generation');
        return { models: 0, functions: 0 };
    }

    console.log(`📦 Using Elm KV models from ${elmKvDir}`);
    console.log(`🔍 Found ${allStructs.length} KV models: ${allStructs.map(s => s.name).join(', ')}`);

    const OUTPUT_FILE = path.join(paths.serverGlueDir, 'kv-store.js');
    ensureOutputDir(paths.serverGlueDir);

    // Generate functions for each struct
    const kvFunctions = allStructs.map(struct => {
        console.log(`  📦 Generating KV functions for ${struct.name}...`);
        return generateKvFunctions(struct);
    }).join('\n');

    // Build function name lists for exports
    const exportedFunctions = [];
    for (const struct of allStructs) {
        exportedFunctions.push(
            `set${struct.name}`,
            `get${struct.name}`,
            `delete${struct.name}`,
            `exists${struct.name}`,
            `updateTtl${struct.name}`
        );
    }

    const outputContent = `/**
 * Auto-Generated KV Store Functions
 * Generated from Elm models in ${elmKvDir.replace(process.cwd() + path.sep, '')}
 *
 * DO NOT EDIT - Changes will be overwritten
 */

// Factory function that takes a KV client and returns bound functions
export default function createKvFunctions(kvClient) {
${kvFunctions}

    // Return all functions bound to the KV client
    return {
        ${exportedFunctions.join(',\n        ')}
    };
}

/**
 * Helper: Clean up expired keys for a tenant
 */
export async function cleanupExpiredKeys(host, kvClient) {
    try {
        const pattern = \`\${host}:*\`;
        const keys = await kvClient.keys(pattern);

        let cleaned = 0;
        for (const key of keys) {
            const ttl = await kvClient.ttl(key);
            if (ttl === -1) {
                await kvClient.expire(key, 3600);
            } else if (ttl === -2) {
                cleaned++;
            }
        }

        return cleaned;
    } catch (error) {
        console.error('Error cleaning up expired keys:', error);
        return 0;
    }
}

/**
 * Helper: Get all cache keys for a tenant
 */
export async function getTenantKeys(host, kvClient) {
    try {
        const pattern = \`\${host}:*\`;
        return await kvClient.keys(pattern);
    } catch (error) {
        console.error('Error getting tenant keys:', error);
        return [];
    }
}
`;

    fs.writeFileSync(OUTPUT_FILE, outputContent);

    console.log(`✅ Generated ${allStructs.length} KV store models with ${exportedFunctions.length} functions`);
    console.log(`📁 Output: ${OUTPUT_FILE}`);

    return {
        models: allStructs.length,
        functions: exportedFunctions.length,
        outputFile: OUTPUT_FILE
    };
}

// Exported for testing
export const _test = {
    generateKvFunctions
};
