/**
 * Database Query Generation
 *
 * Generates type-safe database functions from Elm schema models.
 */

import fs from 'fs';
import path from 'path';
import { getGenerationPaths, ensureOutputDir } from './shared-paths.js';
import { parseElmSchemaDir } from '../../core/elm-parser-ts.js';

// Generate database query functions for a struct
function generateQueryFunctions(struct) {
    const { name, tableName, fields, isMultiTenant, isSoftDelete, multiTenantFieldName, softDeleteFieldName } = struct;

    // Use actual field names or defaults for backward compat
    const tenantField = multiTenantFieldName || 'host';
    const deletedField = softDeleteFieldName || 'deleted_at';

    // Filter out tenant and deleted fields from insert fields
    const nonIdFields = fields.filter(f => !f.isPrimaryKey && f.name !== tenantField);
    const columnNames = nonIdFields.map(f => f.name).join(', ');
    const columnPlaceholders = nonIdFields.map((_, i) => '$' + (i + 2)).join(', '); // $1 is for tenant
    const fieldAccess = nonIdFields.map(f => name.toLowerCase() + '.' + f.name).join(', ');

    // Build SQL based on model flags
    const insertSql = `INSERT INTO ${tableName} (${columnNames}, ${tenantField}) VALUES (${columnPlaceholders}, $1) RETURNING *`;
    const selectAllSql = `SELECT * FROM ${tableName} WHERE ${tenantField} = $1 ORDER BY created_at DESC`;

    // Only include soft-delete filter if model has SoftDelete field
    const selectAllLiveSql = isSoftDelete
        ? `SELECT * FROM ${tableName} WHERE ${tenantField} = $1 AND ${deletedField} IS NULL ORDER BY created_at DESC`
        : `SELECT * FROM ${tableName} WHERE ${tenantField} = $1 ORDER BY created_at DESC`;

    const selectByIdSql = `SELECT * FROM ${tableName} WHERE id = $1 AND ${tenantField} = $2`;

    const selectByIdLiveSql = isSoftDelete
        ? `SELECT * FROM ${tableName} WHERE id = $1 AND ${tenantField} = $2 AND ${deletedField} IS NULL`
        : `SELECT * FROM ${tableName} WHERE id = $1 AND ${tenantField} = $2`;

    // Soft delete uses actual field name and timestamp
    const softDeleteSql = isSoftDelete
        ? `UPDATE ${tableName} SET ${deletedField} = extract(epoch from now()) * 1000 WHERE id = $1 AND ${tenantField} = $2 RETURNING *`
        : `DELETE FROM ${tableName} WHERE id = $1 AND ${tenantField} = $2 RETURNING *`; // Hard delete if no SoftDelete

    const deleteSql = `DELETE FROM ${tableName} WHERE id = $1 AND ${tenantField} = $2 RETURNING id`;

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
 * Create ${name} (alias for insert)
 */
async function create${name}(data) {
    const { host, ...rest } = data;
    return insert${name}(rest, host);
}

/**
 * Get all ${name}s for a tenant (includes soft-deleted)
 */
async function get${name}sByHost(host) {
    const result = await pool.query(
        '${selectAllSql}',
        [host]
    );
    return result.rows;
}

/**
 * Find all live ${name}s for a tenant (excludes soft-deleted)
 */
async function find${name}sByHost(host) {
    const result = await pool.query(
        '${selectAllLiveSql}',
        [host]
    );
    return result.rows;
}

/**
 * Get ${name} by ID with tenant isolation (includes soft-deleted)
 */
async function get${name}ById(id, host) {
    const result = await pool.query(
        '${selectByIdSql}',
        [id, host]
    );
    return result.rows[0] || null;
}

/**
 * Find ${name} by ID with tenant isolation (excludes soft-deleted)
 */
async function find${name}ById(id, host) {
    const result = await pool.query(
        '${selectByIdLiveSql}',
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
 * Soft delete ${name} (sets deleted_at timestamp)
 */
async function kill${name}(id, host) {
    const result = await pool.query(
        '${softDeleteSql}',
        [id, host]
    );
    return result.rows[0] || null;
}

/**
 * Hard delete ${name} with tenant isolation
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
export function generateDatabaseQueries(config = {}) {
    console.log('🏗️ Generating database queries...');

    const paths = getGenerationPaths(config);
    const elmSchemaDir = paths.elmSchemaDir;

    if (!fs.existsSync(elmSchemaDir)) {
        console.log(`📁 No schema models found at ${elmSchemaDir}, skipping generation`);
        return { models: [], structs: 0, functions: 0 };
    }

    const elmTypes = parseElmSchemaDir(elmSchemaDir);

    if (elmTypes.length === 0) {
        console.log('📁 No schema models found, skipping generation');
        return { models: [], structs: 0, functions: 0 };
    }

    console.log(`📦 Using Elm Schema models from ${elmSchemaDir}`);

    const allStructs = elmTypes.map(t => ({
        name: t.name,
        tableName: t.tableName,
        fields: t.fields.map(f => ({
            name: f.name,
            type: f.rustType,
            isPrimaryKey: f.isPrimaryKey,
            isTimestamp: f.isTimestamp,
            isOptional: f.isOptional,
            isMultiTenant: f.isMultiTenant,
            isSoftDelete: f.isSoftDelete
        })),
        filename: t.filename,
        // Pass through MultiTenant/SoftDelete flags
        isMultiTenant: t.isMultiTenant || false,
        isSoftDelete: t.isSoftDelete || false,
        multiTenantFieldName: t.multiTenantFieldName || null,
        softDeleteFieldName: t.softDeleteFieldName || null
    }));

    console.log(`🔍 Found ${allStructs.length} database models: ${allStructs.map(s => s.name).join(', ')}`);

    const outputPath = ensureOutputDir(paths.serverGlueDir);

    // Generate functions for each struct
    const allFunctions = allStructs.map(generateQueryFunctions).join('\n\n');

    const outputContent = `/**
 * Auto-Generated Database Query Functions
 * Generated from database models
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
        create${s.name},
        get${s.name}sByHost,
        find${s.name}sByHost,
        get${s.name}ById,
        find${s.name}ById,
        update${s.name},
        kill${s.name},
        delete${s.name}`).join(',\n')}
    };
}
`;

    // Write generated file
    const outputFile = path.join(outputPath, 'database-queries.js');
    fs.writeFileSync(outputFile, outputContent);

    console.log(`✅ Generated type-safe database queries: ${outputFile}`);
    console.log(`📊 Generated ${allStructs.length * 9} query functions (9 per model)`);

    return {
        outputFile,
        models: allStructs,
        structs: allStructs.length,
        functions: allStructs.length * 9
    };
}