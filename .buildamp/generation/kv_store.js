#!/usr/bin/env node

/**
 * KV Store Generation Script
 * 
 * Generates type-safe KV store APIs from Rust models in src/models/kv/
 * Provides Redis/KV cache operations with TTL support and tenant isolation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODELS_DIR = path.join(__dirname, '../../src/models/kv');
const OUTPUT_FILE = path.join(__dirname, '../../packages/hamlet-server/generated/kv-store.js');

/**
 * Parse Rust struct from file content
 */
function parseRustStruct(content, filename) {
    const structs = [];
    const structRegex = /(?:\/\/.*\n)*\s*#\[derive\([^\]]+\)\]\s*pub struct\s+(\w+)\s*\{([^}]+)\}/g;
    
    let match;
    while ((match = structRegex.exec(content)) !== null) {
        const structName = match[1];
        const fieldsContent = match[2];
        
        // Parse fields
        const fields = [];
        const fieldLines = fieldsContent.split('\n');
        
        for (const line of fieldLines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('//')) {
                const fieldMatch = trimmed.match(/pub\s+(\w+):\s*([^,]+),?/);
                if (fieldMatch) {
                    fields.push({
                        name: fieldMatch[1],
                        type: fieldMatch[2].trim()
                    });
                }
            }
        }
        
        structs.push({
            name: structName,
            fields,
            filename: path.basename(filename, '.rs')
        });
    }
    
    return structs;
}

/**
 * Generate KV store functions for a struct
 */
function generateKvFunctions(struct) {
    const lowerName = struct.name.toLowerCase();
    const key_prefix = lowerName;
    
    return `
// Auto-generated KV store functions for ${struct.name}

/**
 * Set ${struct.name} in KV store with TTL and tenant isolation
 * @param {Object} ${lowerName} - ${struct.name} data to store
 * @param {string} key - Cache key (will be prefixed with tenant)
 * @param {string} host - Tenant host for isolation
 * @param {Object} kvClient - KV store client (Redis/etc.)
 */
async function set${struct.name}(${lowerName}, key, host, kvClient) {
    try {
        const tenantKey = \`\${host}:${key_prefix}:\${key}\`;
        const ttl = ${lowerName}.ttl || 3600; // Default 1 hour if no TTL specified
        
        const serialized = JSON.stringify(${lowerName});
        await kvClient.setex(tenantKey, ttl, serialized);
        
        return true;
    } catch (error) {
        console.error(\`Error setting ${struct.name}:\`, error);
        return false;
    }
}

/**
 * Get ${struct.name} from KV store with tenant isolation
 * @param {string} key - Cache key (will be prefixed with tenant)
 * @param {string} host - Tenant host for isolation
 * @param {Object} kvClient - KV store client (Redis/etc.)
 * @returns {Object|null} ${struct.name} data or null if not found/expired
 */
async function get${struct.name}(key, host, kvClient) {
    try {
        const tenantKey = \`\${host}:${key_prefix}:\${key}\`;
        const data = await kvClient.get(tenantKey);
        
        if (!data) {
            return null;
        }
        
        return JSON.parse(data);
    } catch (error) {
        console.error(\`Error getting ${struct.name}:\`, error);
        return null;
    }
}

/**
 * Delete ${struct.name} from KV store with tenant isolation
 * @param {string} key - Cache key (will be prefixed with tenant)
 * @param {string} host - Tenant host for isolation  
 * @param {Object} kvClient - KV store client (Redis/etc.)
 * @returns {boolean} True if deleted, false otherwise
 */
async function delete${struct.name}(key, host, kvClient) {
    try {
        const tenantKey = \`\${host}:${key_prefix}:\${key}\`;
        const result = await kvClient.del(tenantKey);
        return result === 1;
    } catch (error) {
        console.error(\`Error deleting ${struct.name}:\`, error);
        return false;
    }
}

/**
 * Check if ${struct.name} exists in KV store with tenant isolation
 * @param {string} key - Cache key (will be prefixed with tenant)
 * @param {string} host - Tenant host for isolation
 * @param {Object} kvClient - KV store client (Redis/etc.)
 * @returns {boolean} True if exists, false otherwise
 */
async function exists${struct.name}(key, host, kvClient) {
    try {
        const tenantKey = \`\${host}:${key_prefix}:\${key}\`;
        const result = await kvClient.exists(tenantKey);
        return result === 1;
    } catch (error) {
        console.error(\`Error checking ${struct.name} exists:\`, error);
        return false;
    }
}

/**
 * Update TTL for ${struct.name} in KV store
 * @param {string} key - Cache key (will be prefixed with tenant)
 * @param {number} ttl - New TTL in seconds
 * @param {string} host - Tenant host for isolation
 * @param {Object} kvClient - KV store client (Redis/etc.)
 * @returns {boolean} True if TTL updated, false otherwise
 */
async function updateTtl${struct.name}(key, ttl, host, kvClient) {
    try {
        const tenantKey = \`\${host}:${key_prefix}:\${key}\`;
        const result = await kvClient.expire(tenantKey, ttl);
        return result === 1;
    } catch (error) {
        console.error(\`Error updating ${struct.name} TTL:\`, error);
        return false;
    }
}
`;
}

/**
 * Generate complete KV store file
 */
function generateKvStore() {
    console.log('🏗️ Generating KV store functions...');
    
    // Find all .rs files in the KV models directory
    const files = fs.readdirSync(MODELS_DIR).filter(f => 
        f.endsWith('.rs') && f !== 'mod.rs'
    );
    
    let allStructs = [];
    let allFunctions = [];
    let exportedFunctions = [];
    
    // Parse each file
    for (const file of files) {
        const filePath = path.join(MODELS_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const structs = parseRustStruct(content, file);
        
        allStructs.push(...structs);
        
        for (const struct of structs) {
            console.log(`  📦 Generating KV functions for ${struct.name}...`);
            allFunctions.push(generateKvFunctions(struct));
            
            // Add to exports
            const lowerName = struct.name.toLowerCase();
            exportedFunctions.push(
                `        set${struct.name}`,
                `        get${struct.name}`,
                `        delete${struct.name}`,
                `        exists${struct.name}`,
                `        updateTtl${struct.name}`
            );
        }
    }
    
    // Generate complete file
    const fileContent = `/**
 * Auto-Generated KV Store Functions
 * Generated from models in src/models/kv/
 * 
 * ⚠️  DO NOT EDIT THIS FILE MANUALLY
 * ⚠️  Changes will be overwritten during next generation
 * 
 * This file provides type-safe KV store operations (Redis/etc.)
 * with automatic tenant isolation and TTL management.
 */

// Factory function that takes a KV client and returns bound functions
export default function createKvFunctions(kvClient) {
${allFunctions.join('')}

    // Return all functions bound to the KV client
    return {
${exportedFunctions.join(',\n')}
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

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write the generated file
    fs.writeFileSync(OUTPUT_FILE, fileContent);
    
    console.log(`✅ Generated ${allStructs.length} KV store models with ${exportedFunctions.length} functions`);
    console.log(`📁 Output: ${OUTPUT_FILE}`);
    
    return {
        structs: allStructs.length,
        functions: exportedFunctions.length,
        outputFile: OUTPUT_FILE
    };
}

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

export { generateKvStore };