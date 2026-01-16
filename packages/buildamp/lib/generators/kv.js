/**
 * Shared KV Store Generation
 * 
 * Generates type-safe KV store APIs from Rust models with configurable paths
 * This eliminates duplication between monorepo and simple project structures.
 */

import fs from 'fs';
import path from 'path';
import { getGenerationPaths, modelsExist, getModelsFullPath, ensureOutputDir, parseCrossModelReferences, loadDbModelMetadata } from './shared-paths.js';

// Parse Rust struct definitions for KV models
function parseRustStructs(content, filename) {
    const structs = [];
    const structRegex = /pub struct\s+(\w+)\s*\{([^}]+)\}/g;
    let match;
    
    while ((match = structRegex.exec(content)) !== null) {
        const [, structName, fieldsContent] = match;
        
        // Parse fields
        const fields = [];
        const fieldRegex = /pub\s+(\w+):\s*([^,\n]+)/g;
        let fieldMatch;
        
        while ((fieldMatch = fieldRegex.exec(fieldsContent)) !== null) {
            const [, fieldName, fieldType] = fieldMatch;
            fields.push({
                name: fieldName,
                type: fieldType.trim().replace(',', '')
            });
        }
        
        structs.push({
            name: structName,
            fields,
            filename
        });
    }
    
    return structs;
}

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

// Generate server-side cache functions for a DB model reference
// When a KV model file has `use crate::models::db::MicroblogItem`,
// we generate cache functions: setMicroblogItemCache, getMicroblogItemCache, etc.
function generateDbCacheFunctions(dbModelName) {
    const lowerName = dbModelName.charAt(0).toLowerCase() + dbModelName.slice(1);

    return `
// Auto-generated cache functions for ${dbModelName}
// Generated because a KV model references db::${dbModelName}

/**
 * Cache a ${dbModelName} by its ID (keys by item.id automatically)
 * @param {Object} item - ${dbModelName} to cache
 * @param {string} host - Tenant host for isolation
 * @param {Object} kvClient - KV store client (Redis/etc.)
 * @param {number} ttl - TTL in seconds (default 3600)
 */
async function set${dbModelName}Cache(item, host, kvClient, ttl = 3600) {
    try {
        const tenantKey = \`\${host}:${lowerName}_cache:\${item.id}\`;
        const serialized = JSON.stringify(item);
        await kvClient.setex(tenantKey, ttl, serialized);
        return true;
    } catch (error) {
        console.error(\`Error caching ${dbModelName}:\`, error);
        return false;
    }
}

/**
 * Load a ${dbModelName} from cache by its DatabaseId
 * @param {string} id - DatabaseId of the ${dbModelName}
 * @param {string} host - Tenant host for isolation
 * @param {Object} kvClient - KV store client (Redis/etc.)
 * @returns {Object|null} ${dbModelName} or null if not found/expired
 */
async function get${dbModelName}Cache(id, host, kvClient) {
    try {
        const tenantKey = \`\${host}:${lowerName}_cache:\${id}\`;
        const data = await kvClient.get(tenantKey);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error(\`Error getting cached ${dbModelName}:\`, error);
        return null;
    }
}

/**
 * Remove a ${dbModelName} from cache by its DatabaseId
 * @param {string} id - DatabaseId of the ${dbModelName}
 * @param {string} host - Tenant host for isolation
 * @param {Object} kvClient - KV store client (Redis/etc.)
 */
async function remove${dbModelName}Cache(id, host, kvClient) {
    try {
        const tenantKey = \`\${host}:${lowerName}_cache:\${id}\`;
        await kvClient.del(tenantKey);
        return true;
    } catch (error) {
        console.error(\`Error removing cached ${dbModelName}:\`, error);
        return false;
    }
}

/**
 * Clear all cached ${dbModelName} items for a tenant
 * @param {string} host - Tenant host for isolation
 * @param {Object} kvClient - KV store client (Redis/etc.)
 */
async function clear${dbModelName}Cache(host, kvClient) {
    try {
        const pattern = \`\${host}:${lowerName}_cache:*\`;
        const keys = await kvClient.keys(pattern);
        if (keys.length > 0) {
            await kvClient.del(...keys);
        }
        return keys.length;
    } catch (error) {
        console.error(\`Error clearing ${dbModelName} cache:\`, error);
        return 0;
    }
}
`.trim();
}

/**
 * Helper: Clean up expired keys for a tenant
 * @param {string} host - Tenant host
 * @param {Object} kvClient - KV store client
 * @returns {number} Number of keys cleaned up
 */
export async function cleanupExpiredKeys(host, kvClient) {
    try {
        const pattern = `${host}:*`;
        const keys = await kvClient.keys(pattern);
        
        let cleaned = 0;
        for (const key of keys) {
            const ttl = await kvClient.ttl(key);
            if (ttl === -1) { // Key exists but no TTL
                await kvClient.expire(key, 3600); // Set default 1 hour TTL
            } else if (ttl === -2) { // Key expired
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
 * @param {string} host - Tenant host
 * @param {Object} kvClient - KV store client
 * @returns {Array} Array of cache keys for the tenant
 */
export async function getTenantKeys(host, kvClient) {
    try {
        const pattern = `${host}:*`;
        return await kvClient.keys(pattern);
    } catch (error) {
        console.error('Error getting tenant keys:', error);
        return [];
    }
}

export function generateKvStore(config = {}) {
    console.log('🏗️ Generating KV store functions...');

    // Get paths using shared utilities
    const paths = getGenerationPaths(config);

    // Check if KV models exist
    if (!modelsExist('kv', paths)) {
        console.log('📁 No KV models directory found, skipping KV store generation');
        return { models: 0, functions: 0 };
    }

    // Get the models directory and output file paths
    const MODELS_DIR = getModelsFullPath('kv', paths);
    const OUTPUT_FILE = path.join(process.cwd(), paths.jsOutputPath, 'kv-store.js');

    // Ensure output directory exists
    ensureOutputDir(paths.jsOutputPath);

    const allStructs = [];
    const allDbReferences = new Set(); // Track all DB model references for cache primitives

    // Find all .rs files in the KV models directory
    const files = fs.readdirSync(MODELS_DIR).filter(file => file.endsWith('.rs') && file !== 'mod.rs');

    for (const file of files) {
        const filePath = path.join(MODELS_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const structs = parseRustStructs(content, file);
        allStructs.push(...structs);

        // Detect cross-model references (e.g., use crate::models::db::MicroblogItem)
        const refs = parseCrossModelReferences(content);
        refs.db.forEach(dbModel => allDbReferences.add(dbModel));
    }

    if (allStructs.length === 0 && allDbReferences.size === 0) {
        console.log('📁 No KV models found, skipping generation');
        return { models: 0, functions: 0 };
    }

    console.log(`🔍 Found ${allStructs.length} KV models: ${allStructs.map(s => s.name).join(', ')}`);

    // Report cross-model references
    const dbReferencesArray = Array.from(allDbReferences);
    if (dbReferencesArray.length > 0) {
        console.log(`🔗 Found cross-model DB references: ${dbReferencesArray.join(', ')}`);
    }
    
    // Generate functions for each struct
    const kvFunctions = allStructs.map(struct => {
        console.log(`  📦 Generating KV functions for ${struct.name}...`);
        return generateKvFunctions(struct);
    }).join('\n');

    // Generate cache functions for DB model references
    const dbCacheFunctions = dbReferencesArray.map(dbModelName => {
        console.log(`  🔗 Generating cache functions for ${dbModelName}...`);
        return generateDbCacheFunctions(dbModelName);
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

    // Add cache function exports for DB model references
    for (const dbModelName of dbReferencesArray) {
        exportedFunctions.push(
            `set${dbModelName}Cache`,
            `get${dbModelName}Cache`,
            `remove${dbModelName}Cache`,
            `clear${dbModelName}Cache`
        );
    }
    
    const outputContent = `/**
 * Auto-Generated KV Store Functions
 * Generated from models in ${MODELS_DIR.replace(process.cwd() + path.sep, '')}
 *
 * ⚠️  DO NOT EDIT THIS FILE MANUALLY
 * ⚠️  Changes will be overwritten during next generation
 *
 * This file provides type-safe KV store operations (Redis/etc.)
 * with automatic tenant isolation and TTL management.
 */

// Factory function that takes a KV client and returns bound functions
export default function createKvFunctions(kvClient) {
${kvFunctions}
${dbCacheFunctions}

    // Return all functions bound to the KV client
    return {
        ${exportedFunctions.join(',\n        ')}
    };
}

/**
 * Helper: Clean up expired keys for a tenant
 * @param {string} host - Tenant host
 * @param {Object} kvClient - KV store client
 * @returns {number} Number of keys cleaned up
 */
export async function cleanupExpiredKeys(host, kvClient) {
    try {
        const pattern = \`\${host}:*\`;
        const keys = await kvClient.keys(pattern);
        
        let cleaned = 0;
        for (const key of keys) {
            const ttl = await kvClient.ttl(key);
            if (ttl === -1) { // Key exists but no TTL
                await kvClient.expire(key, 3600); // Set default 1 hour TTL
            } else if (ttl === -2) { // Key expired
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
 * @param {string} host - Tenant host
 * @param {Object} kvClient - KV store client
 * @returns {Array} Array of cache keys for the tenant
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
    
    // Write the generated file
    fs.writeFileSync(OUTPUT_FILE, outputContent);

    console.log(`✅ Generated ${allStructs.length} KV store models with ${exportedFunctions.length} functions`);
    if (dbReferencesArray.length > 0) {
        console.log(`🔗 Generated ${dbReferencesArray.length * 4} cache functions for DB models`);
    }
    console.log(`📁 Output: ${OUTPUT_FILE}`);

    return {
        models: allStructs.length,
        functions: exportedFunctions.length,
        cacheModels: dbReferencesArray.length,
        dbReferences: dbReferencesArray,
        outputFile: OUTPUT_FILE
    };
}