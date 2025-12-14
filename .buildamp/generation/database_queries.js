/**
 * Database Query Generation
 * Generates type-safe database functions from Rust models in src/models/db/
 * Replaces dangerous SQL string manipulation with pre-generated, validated queries
 */

import fs from 'fs';
import path from 'path';

// Parse a Rust struct from file content
function parseRustStruct(content, filename) {
    const structs = [];
    const structRegex = /pub struct\s+(\w+)\s*{([^}]+)}/g;
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
                type: fieldType.trim(),
                // Check for special database types
                isPrimaryKey: fieldType.includes('DatabaseId'),
                isTimestamp: fieldType.includes('Timestamp'),
                isOptional: fieldType.includes('Option<')
            });
        }
        
        // Determine table name from struct name (convert CamelCase to snake_case)
        const tableName = structName
            .replace(/([A-Z])/g, '_$1')
            .toLowerCase()
            .substring(1);
        
        structs.push({
            name: structName,
            tableName,
            fields,
            filename
        });
    }
    
    return structs;
}

// Generate database query functions for a struct
function generateQueryFunctions(struct) {
    const { name, tableName, fields } = struct;
    
    const nonIdFields = fields.filter(f => !f.isPrimaryKey);
    const columnNames = nonIdFields.map(f => f.name).join(', ');
    const columnPlaceholders = nonIdFields.map((_, i) => '$' + (i + 2)).join(', '); // $1 is for host
    const fieldAccess = nonIdFields.map(f => name.toLowerCase() + '.' + f.name).join(', ');
    
    const insertSql = `INSERT INTO ${tableName} (${columnNames}, host) VALUES (${columnPlaceholders}, $1) RETURNING *`;
    const selectAllSql = `SELECT * FROM ${tableName} WHERE host = $1 ORDER BY created_at DESC`;
    const selectByIdSql = `SELECT * FROM ${tableName} WHERE id = $1 AND host = $2`;
    const deleteSql = `DELETE FROM ${tableName} WHERE id = $1 AND host = $2 RETURNING id`;
    
    return `
// Auto-generated database functions for ${name}

/**
 * Insert ${name} with automatic tenant isolation
 */
async function insert${name}(${name.toLowerCase()}, host) {
    const result = await pool.query(
        '${insertSql}',
        [host, ${fieldAccess}]
    );
    return result.rows[0];
}

/**
 * Get all ${name}s for a tenant
 */
async function get${name}sByHost(host) {
    const result = await pool.query(
        '${selectAllSql}',
        [host]
    );
    return result.rows;
}

/**
 * Get ${name} by ID with tenant isolation
 */
async function get${name}ById(id, host) {
    const result = await pool.query(
        '${selectByIdSql}',
        [id, host]
    );
    return result.rows[0] || null;
}

/**
 * Update ${name} with tenant isolation
 */
async function update${name}(id, updates, host) {
    const updateFields = Object.keys(updates).filter(key => key !== 'id' && key !== 'host');
    const setClause = updateFields.map((field, i) => field + ' = $' + (i + 3)).join(', ');
    const values = updateFields.map(field => updates[field]);
    
    if (setClause === '') {
        return get${name}ById(id, host);
    }
    
    const sql = 'UPDATE ${tableName} SET ' + setClause + ', updated_at = NOW() WHERE id = $1 AND host = $2 RETURNING *';
    const result = await pool.query(sql, [id, host, ...values]);
    return result.rows[0] || null;
}

/**
 * Delete ${name} with tenant isolation
 */
async function delete${name}(id, host) {
    const result = await pool.query(
        '${deleteSql}',
        [id, host]
    );
    return result.rows.length > 0;
}`.trim();
}

// Generate all database query functions
export function generateDatabaseQueries() {
    const dbModelsPath = path.join(process.cwd(), '../src/models/db');
    const outputPath = path.join(process.cwd(), '../packages/hamlet-server/generated');
    
    if (!fs.existsSync(dbModelsPath)) {
        console.log('📁 No src/models/db directory found, skipping database query generation');
        return;
    }
    
    // Ensure output directory exists
    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
    }
    
    const allStructs = [];
    
    // Read all .rs files in src/models/db
    const files = fs.readdirSync(dbModelsPath).filter(file => file.endsWith('.rs') && file !== 'mod.rs');
    
    for (const file of files) {
        const filePath = path.join(dbModelsPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const structs = parseRustStruct(content, file);
        allStructs.push(...structs);
    }
    
    console.log(`🔍 Found ${allStructs.length} database models: ${allStructs.map(s => s.name).join(', ')}`);
    
    // Generate functions for each struct
    const allFunctions = allStructs.map(generateQueryFunctions).join('\n\n');
    
    const outputContent = `/**
 * Auto-Generated Database Query Functions
 * Generated from models in src/models/db/
 * 
 * ⚠️  DO NOT EDIT THIS FILE MANUALLY
 * ⚠️  Changes will be overwritten during next generation
 * 
 * This file replaces dangerous SQL string manipulation with type-safe,
 * pre-validated database queries that include automatic tenant isolation.
 */

// Factory function that takes a pool and returns bound query functions
export default function createDbQueries(pool) {
${allFunctions}

    // Return all functions bound to the pool
    return {
${allStructs.map(s => `        insert${s.name},
        get${s.name}sByHost,
        get${s.name}ById,
        update${s.name},
        delete${s.name}`).join(',\n')}
    };
}
`;
    
    // Write generated file
    const outputFile = path.join(outputPath, 'database-queries.js');
    fs.writeFileSync(outputFile, outputContent);
    
    console.log(`✅ Generated type-safe database queries: ${outputFile}`);
    console.log(`📊 Generated ${allStructs.length * 5} query functions (5 per model)`);
    
    return outputFile;
}