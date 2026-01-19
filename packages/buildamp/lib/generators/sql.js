/**
 * SQL Migration Generation
 *
 * Generates CREATE TABLE statements from Elm schema models.
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getGenerationPaths, ensureOutputDir } from './shared-paths.js';
import { parseElmSchemaDir, parseElmSchemaDirFull } from '../../core/elm-parser-ts.js';

const execAsync = promisify(exec);

/**
 * Map types to SQL types with constraints
 */
function rustTypeToSql(fieldType, fieldName) {
    const type = fieldType.trim();

    // DatabaseId<T> - primary key with UUID generation
    if (type.includes('DatabaseId')) {
        return {
            sqlType: 'TEXT',
            constraints: ['PRIMARY KEY', "DEFAULT gen_random_uuid()"]
        };
    }

    // Timestamp - stored as BIGINT (epoch millis)
    if (type.includes('Timestamp')) {
        return {
            sqlType: 'BIGINT',
            constraints: ['NOT NULL', "DEFAULT extract(epoch from now())"]
        };
    }

    // Option<T> - nullable field
    if (type.startsWith('Option<')) {
        const innerType = type.slice(7, -1).trim();
        const inner = rustTypeToSql(innerType, fieldName);
        return {
            sqlType: inner.sqlType,
            constraints: [] // No NOT NULL for optional
        };
    }

    // Vec<T> - stored as JSON array
    if (type.startsWith('Vec<')) {
        return {
            sqlType: 'JSONB',
            constraints: ['NOT NULL', "DEFAULT '[]'::jsonb"]
        };
    }

    // DefaultValue<T> - has a default value
    if (type.startsWith('DefaultValue<')) {
        const innerType = type.slice(13, -1).trim();
        const inner = rustTypeToSql(innerType, fieldName);
        // Default value would need to be extracted from the actual code
        // For now, just mark as NOT NULL
        return {
            sqlType: inner.sqlType,
            constraints: ['NOT NULL']
        };
    }

    // Link<T> - URL field, stored as TEXT
    if (type.startsWith('Link<')) {
        const innerType = type.slice(5, -1).trim();
        const inner = rustTypeToSql(innerType, fieldName);
        return {
            sqlType: inner.sqlType,
            constraints: inner.constraints
        };
    }

    // Basic types
    if (type === 'String' || type === 'str') {
        return { sqlType: 'TEXT', constraints: ['NOT NULL'] };
    }

    if (type === 'i32' || type === 'i16') {
        return { sqlType: 'INTEGER', constraints: ['NOT NULL', 'DEFAULT 0'] };
    }

    if (type === 'i64') {
        return { sqlType: 'BIGINT', constraints: ['NOT NULL', 'DEFAULT 0'] };
    }

    if (type === 'f32' || type === 'f64') {
        return { sqlType: 'DOUBLE PRECISION', constraints: ['NOT NULL', 'DEFAULT 0'] };
    }

    if (type === 'bool') {
        return { sqlType: 'BOOLEAN', constraints: ['NOT NULL', 'DEFAULT false'] };
    }

    // RichContent and other custom types - store as JSONB
    if (type === 'RichContent' || type.includes('::')) {
        return { sqlType: 'JSONB', constraints: ['NOT NULL'] };
    }

    // Fallback to TEXT
    return { sqlType: 'TEXT', constraints: ['NOT NULL'] };
}

/**
 * Detect foreign key references from field names
 * Returns { referencedTable, referencedColumn } or null
 */
function detectForeignKey(fieldName, knownTables) {
    // Skip primary key
    if (fieldName === 'id') return null;

    // Look for *_id pattern
    if (!fieldName.endsWith('_id')) return null;

    // Derive table name: item_id → items, guest_id → guests
    // But also handle: parent_id → same table (self-reference)
    const prefix = fieldName.slice(0, -3); // Remove '_id'

    // Try direct pluralization first
    let candidateTable = prefix + 's';
    if (knownTables.includes(candidateTable)) {
        return { referencedTable: candidateTable, referencedColumn: 'id' };
    }

    // Try without 's' (might already be plural or irregular)
    if (knownTables.includes(prefix)) {
        return { referencedTable: prefix, referencedColumn: 'id' };
    }

    // Try finding a table that ends with the prefix (e.g., item_id → microblog_items)
    const matchingTable = knownTables.find(t => t.endsWith('_' + prefix + 's') || t.endsWith('_' + prefix));
    if (matchingTable) {
        return { referencedTable: matchingTable, referencedColumn: 'id' };
    }

    // No match found - this might be intentional (external reference) or an error
    return { referencedTable: null, fieldName, warning: `No table found for foreign key: ${fieldName}` };
}

/**
 * Generate CREATE TABLE statement for a struct
 * @param {Object} struct - Parsed struct info
 * @param {string[]} knownTables - All known table names for FK validation
 * @param {Object} unionTypeMap - Map of union type name -> union type info (optional)
 * @returns {{ sql: string, foreignKeys: Array, warnings: Array }}
 */
function generateCreateTable(struct, knownTables = [], unionTypeMap = {}) {
    const { tableName, fields, isMultiTenant, isSoftDelete, multiTenantFieldName } = struct;
    const foreignKeys = [];
    const warnings = [];
    const checkConstraints = [];

    const columnDefs = fields.map(field => {
        const parts = [field.name, field.sqlType];
        parts.push(...field.constraints);

        // Check if field type references an enum-like union type
        const fieldTypeName = field.rustType.replace(/^Maybe\s+/, '').trim();
        if (unionTypeMap[fieldTypeName]) {
            const ut = unionTypeMap[fieldTypeName];
            if (isEnumLike(ut)) {
                const enumValues = ut.variants.map(v => `'${v.name}'`).join(', ');
                checkConstraints.push(`    CHECK (${field.name} IN (${enumValues}))`);
            }
        }

        return '    ' + parts.join(' ');
    });

    // Check what columns already exist in model fields
    const hasHost = fields.some(f => f.name === 'host');
    const hasCreatedAt = fields.some(f => f.name === 'created_at');
    const hasUpdatedAt = fields.some(f => f.name === 'updated_at');
    const hasDeletedAt = fields.some(f => f.name === 'deleted_at');

    // Check if model has explicit MultiTenant/SoftDelete fields (with any name)
    const hasMultiTenantField = isMultiTenant || fields.some(f => f.isMultiTenant);
    const hasSoftDeleteField = isSoftDelete || fields.some(f => f.isSoftDelete);

    // Only auto-add host if model doesn't have explicit MultiTenant field and doesn't have a host column
    if (!hasMultiTenantField && !hasHost) {
        columnDefs.push('    host TEXT NOT NULL');
    }
    if (!hasCreatedAt) {
        columnDefs.push("    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()");
    }
    if (!hasUpdatedAt) {
        columnDefs.push('    updated_at TIMESTAMP WITH TIME ZONE');
    }
    // Only auto-add deleted_at if model doesn't have explicit SoftDelete field and doesn't have deleted_at column
    if (!hasSoftDeleteField && !hasDeletedAt) {
        columnDefs.push('    deleted_at TIMESTAMP WITH TIME ZONE');
    }

    // Detect foreign keys
    for (const field of fields) {
        const fk = detectForeignKey(field.name, knownTables);
        if (fk) {
            if (fk.referencedTable) {
                foreignKeys.push({
                    column: field.name,
                    referencedTable: fk.referencedTable,
                    referencedColumn: fk.referencedColumn
                });
                columnDefs.push(`    FOREIGN KEY (${field.name}) REFERENCES ${fk.referencedTable}(${fk.referencedColumn})`);
            } else if (fk.warning) {
                warnings.push(fk.warning);
            }
        }
    }

    // Combine all definitions: columns, foreign keys, and check constraints
    const allDefs = [...columnDefs, ...checkConstraints];

    // Determine the tenant field name for the index (use explicit field name or default to 'host')
    const tenantFieldName = multiTenantFieldName || 'host';

    const sql = `-- Generated from ${struct.filename}
CREATE TABLE ${tableName} (
${allDefs.join(',\n')}
);

-- Index for tenant isolation
CREATE INDEX idx_${tableName}_${tenantFieldName} ON ${tableName}(${tenantFieldName});`;

    return { sql, foreignKeys, warnings };
}

/**
 * Generate full schema.sql from all db models
 * @param {Array} structs - Parsed struct definitions
 * @param {Array} unionTypes - Parsed union type definitions (optional)
 * @returns {{ schema: string, foreignKeys: Array, warnings: Array }}
 */
function generateSchema(structs, unionTypes = []) {
    const header = `-- BuildAmp Generated Schema
-- Generated from database models
--
-- DO NOT EDIT THIS FILE MANUALLY
-- Changes will be overwritten during next generation
--
-- Use this file for fresh database initialization:
--   psql $DATABASE_URL < schema.sql

`;

    // Collect all table names for FK validation
    const knownTables = structs.map(s => s.tableName);

    // Build union type lookup for CHECK constraint generation
    const unionTypeMap = {};
    for (const ut of unionTypes) {
        unionTypeMap[ut.name] = ut;
    }

    // Generate tables with FK validation and CHECK constraints
    const allForeignKeys = [];
    const allWarnings = [];
    const tableSqls = [];

    for (const struct of structs) {
        const result = generateCreateTable(struct, knownTables, unionTypeMap);
        tableSqls.push(result.sql);
        allForeignKeys.push(...result.foreignKeys.map(fk => ({
            table: struct.tableName,
            ...fk
        })));
        allWarnings.push(...result.warnings.map(w => `${struct.tableName}: ${w}`));
    }

    const schema = header + tableSqls.join('\n\n');

    return { schema, foreignKeys: allForeignKeys, warnings: allWarnings };
}

/**
 * Get next migration number
 */
function getNextMigrationNumber(migrationsDir) {
    if (!fs.existsSync(migrationsDir)) {
        return '001';
    }

    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.match(/^\d{3}_.*\.sql$/))
        .sort();

    if (files.length === 0) {
        return '001';
    }

    const lastNum = parseInt(files[files.length - 1].substring(0, 3), 10);
    return String(lastNum + 1).padStart(3, '0');
}

/**
 * Check if migra is available
 */
async function checkMigra() {
    try {
        await execAsync('which migra');
        return true;
    } catch {
        return false;
    }
}

/**
 * Generate incremental migration using migra
 * Requires: migra installed, PostgreSQL connection
 */
async function generateMigration(schemaContent, config) {
    const { databaseUrl, migrationsDir } = config;

    if (!databaseUrl) {
        console.log('   ℹ️  No DATABASE_URL provided, skipping migration diff');
        return null;
    }

    const hasMigra = await checkMigra();
    if (!hasMigra) {
        console.log('   ℹ️  migra not installed - generating schema.sql only');
        console.log('   Install with: pip install migra');
        return null;
    }

    // Create temp file with schema
    const tempSchemaFile = '/tmp/buildamp_schema.sql';
    fs.writeFileSync(tempSchemaFile, schemaContent);

    try {
        // Create temp database with new schema
        console.log('   Creating temporary database for diff...');
        await execAsync('createdb buildamp_temp_schema');
        await execAsync(`psql buildamp_temp_schema < ${tempSchemaFile}`);

        // Run migra to generate diff
        const { stdout } = await execAsync(
            `migra ${databaseUrl} postgresql:///buildamp_temp_schema`
        );

        if (stdout.trim()) {
            // There are changes - write migration file
            const migrationNum = getNextMigrationNumber(migrationsDir);
            const migrationFile = path.join(migrationsDir, `${migrationNum}_auto.sql`);

            const migrationContent = `-- Auto-generated migration
-- Generated by BuildAmp from model changes
-- Review before applying!

${stdout}`;

            fs.writeFileSync(migrationFile, migrationContent);
            console.log(`   ✅ Generated migration: ${migrationFile}`);
            return migrationFile;
        } else {
            console.log('   ✓ Schema is up to date, no migration needed');
            return null;
        }
    } catch (error) {
        console.log(`   ⚠️  Migration diff failed: ${error.message}`);
        return null;
    } finally {
        // Cleanup temp database
        try {
            await execAsync('dropdb buildamp_temp_schema 2>/dev/null');
        } catch {
            // Ignore cleanup errors
        }
        // Cleanup temp file
        try {
            fs.unlinkSync(tempSchemaFile);
        } catch {
            // Ignore cleanup errors
        }
    }
}

/**
 * Check if a union type is enum-like (all variants have no arguments)
 */
function isEnumLike(unionType) {
    return unionType.variants.every(v => v.args.length === 0);
}

/**
 * Process union types for schema output
 */
function processUnionTypes(unionTypes) {
    return unionTypes.map(ut => ({
        name: ut.name,
        filename: ut.filename,
        isEnumLike: isEnumLike(ut),
        variants: ut.variants.map(v => ({
            name: v.name,
            args: v.args
        })),
        // For enum-like types, provide simple list of variant names
        enumValues: isEnumLike(ut) ? ut.variants.map(v => v.name) : null
    }));
}

/**
 * Parse database models from Elm schema files
 * @param {Object} config - Configuration with paths
 * @returns {Array} Array of parsed types with SQL type info
 */
function parseDbModels(config = {}) {
    const paths = getGenerationPaths(config);
    const schemaDir = paths.elmSchemaDir;

    if (!fs.existsSync(schemaDir)) {
        return [];
    }

    const types = parseElmSchemaDir(schemaDir);

    // Add SQL type info to each field
    return types.map(t => ({
        ...t,
        fields: t.fields.map(f => {
            const sqlInfo = rustTypeToSql(f.rustType, f.name);
            return {
                ...f,
                sqlType: sqlInfo.sqlType,
                constraints: sqlInfo.constraints
            };
        })
    }));
}

/**
 * Parse database models AND union types from Elm schema files
 * @param {Object} config - Configuration with paths
 * @returns {{ structs: Array, unionTypes: Array }}
 */
function parseDbModelsFull(config = {}) {
    const paths = getGenerationPaths(config);
    const schemaDir = paths.elmSchemaDir;

    if (!fs.existsSync(schemaDir)) {
        return { structs: [], unionTypes: [] };
    }

    const { records, unionTypes } = parseElmSchemaDirFull(schemaDir);

    // Add SQL type info to each field
    const structs = records.map(t => ({
        ...t,
        fields: t.fields.map(f => {
            const sqlInfo = rustTypeToSql(f.rustType, f.name);
            return {
                ...f,
                sqlType: sqlInfo.sqlType,
                constraints: sqlInfo.constraints
            };
        })
    }));

    return { structs, unionTypes };
}

/**
 * Main SQL generation function
 */
export async function generateSqlMigrations(config = {}) {
    console.log('🏗️ Generating SQL migrations...');

    const paths = getGenerationPaths(config);
    const { structs: allStructs, unionTypes: allUnionTypes } = parseDbModelsFull(config);

    if (allStructs.length === 0) {
        console.log(`📁 No schema models found at ${paths.elmSchemaDir}, skipping generation`);
        return null;
    }

    console.log(`📦 Using Elm Schema models from ${paths.elmSchemaDir}`);
    console.log(`🔍 Found ${allStructs.length} database models: ${allStructs.map(s => s.name).join(', ')}`);

    if (allUnionTypes.length > 0) {
        const enumLikeCount = allUnionTypes.filter(isEnumLike).length;
        console.log(`🔷 Found ${allUnionTypes.length} union types (${enumLikeCount} enum-like): ${allUnionTypes.map(u => u.name).join(', ')}`);
    }

    // Generate schema with FK validation and CHECK constraints for enum-like union types
    const { schema: schemaContent, foreignKeys, warnings } = generateSchema(allStructs, allUnionTypes);

    // Report FK relationships
    if (foreignKeys.length > 0) {
        console.log(`🔗 Foreign keys detected:`);
        for (const fk of foreignKeys) {
            console.log(`   ${fk.table}.${fk.column} → ${fk.referencedTable}.${fk.referencedColumn}`);
        }
    }

    // Report warnings
    if (warnings.length > 0) {
        console.log(`⚠️  FK warnings:`);
        for (const warning of warnings) {
            console.log(`   ${warning}`);
        }
    }

    // Determine output directory - put migrations in sql subdirectory of dest
    const migrationsDir = path.join(paths.outputDir, 'sql', 'migrations');

    // Ensure migrations directory exists
    if (!fs.existsSync(migrationsDir)) {
        fs.mkdirSync(migrationsDir, { recursive: true });
    }

    // Write schema.sql
    const schemaFile = path.join(migrationsDir, 'schema.sql');
    fs.writeFileSync(schemaFile, schemaContent);
    console.log(`✅ Generated schema: ${schemaFile}`);

    // Optionally generate incremental migration
    const databaseUrl = config.databaseUrl || process.env.DATABASE_URL;
    let migrationFile = null;

    if (databaseUrl) {
        migrationFile = await generateMigration(schemaContent, {
            databaseUrl,
            migrationsDir
        });
    }

    return {
        schemaFile,
        migrationFile,
        models: allStructs.map(s => s.name),
        tables: allStructs.length,
        foreignKeys,
        warnings
    };
}

/**
 * Generate schema introspection JSON
 * Outputs structured metadata for admin UI, documentation, etc.
 */
export async function generateSchemaIntrospection(config = {}) {
    console.log('🏗️ Generating schema introspection...');

    const paths = getGenerationPaths(config);
    const { structs: allStructs, unionTypes: allUnionTypes } = parseDbModelsFull(config);

    if (allStructs.length === 0) {
        console.log(`📁 No schema models found at ${paths.elmSchemaDir}, skipping generation`);
        return null;
    }

    // Build union type lookup for field type detection
    const unionTypeMap = {};
    for (const ut of allUnionTypes) {
        unionTypeMap[ut.name] = ut;
    }

    // Build table name lookup
    const knownTables = allStructs.map(s => s.tableName);

    // Build introspection data
    const tables = {};
    const relationships = [];

    for (const struct of allStructs) {
        const tableInfo = {
            structName: struct.name,
            tableName: struct.tableName,
            sourceFile: struct.filename,
            fields: {},
            primaryKey: null,
            foreignKeys: [],
            referencedBy: [],
            // MultiTenant and SoftDelete flags for runtime query filtering
            isMultiTenant: struct.isMultiTenant || false,
            isSoftDelete: struct.isSoftDelete || false,
            multiTenantFieldName: struct.multiTenantFieldName || 'host',
            softDeleteFieldName: struct.softDeleteFieldName || 'deleted_at'
        };

        for (const field of struct.fields) {
            const fieldInfo = {
                rustType: field.rustType,
                sqlType: field.sqlType,
                nullable: field.isOptional,
                isPrimaryKey: field.isPrimaryKey,
                isTimestamp: field.isTimestamp,
                isLink: field.isLink,
                isRichContent: field.isRichContent
            };

            // Check if field type references a union type
            const fieldTypeName = field.rustType.replace(/^Maybe\s+/, '').trim();
            if (unionTypeMap[fieldTypeName]) {
                const ut = unionTypeMap[fieldTypeName];
                fieldInfo.isUnionType = true;
                fieldInfo.unionTypeName = fieldTypeName;
                fieldInfo.isEnumLike = isEnumLike(ut);
                if (fieldInfo.isEnumLike) {
                    fieldInfo.enumValues = ut.variants.map(v => v.name);
                }
            }

            tableInfo.fields[field.name] = fieldInfo;

            if (field.isPrimaryKey) {
                tableInfo.primaryKey = field.name;
            }

            // Detect foreign keys - use explicit FK info from Elm parser, or heuristic fallback
            let fkTable = null;
            let fkColumn = 'id';

            if (field.isForeignKey && field.referencedTable) {
                // Explicit FK from Elm ForeignKey type
                fkTable = field.referencedTable;
            } else {
                // Heuristic FK detection (field name pattern)
                const fk = detectForeignKey(field.name, knownTables);
                if (fk && fk.referencedTable) {
                    fkTable = fk.referencedTable;
                    fkColumn = fk.referencedColumn;
                }
            }

            if (fkTable) {
                tableInfo.foreignKeys.push({
                    column: field.name,
                    references: {
                        table: fkTable,
                        column: fkColumn
                    }
                });

                relationships.push({
                    from: { table: struct.tableName, column: field.name },
                    to: { table: fkTable, column: fkColumn },
                    type: 'many-to-one'
                });
            }
        }

        tables[struct.tableName] = tableInfo;
    }

    // Add reverse references (referencedBy)
    for (const rel of relationships) {
        if (tables[rel.to.table]) {
            tables[rel.to.table].referencedBy.push({
                table: rel.from.table,
                column: rel.from.column
            });
        }
    }

    // Detect join tables: no primary key, 2+ FKs, only FK columns + standard fields
    const standardFields = ['host', 'created_at', 'updated_at', 'deleted_at'];
    for (const tableName of Object.keys(tables)) {
        const table = tables[tableName];
        const fkColumns = table.foreignKeys.map(fk => fk.column);

        table.isJoinTable = (
            table.primaryKey === null &&
            table.foreignKeys.length >= 2 &&
            Object.keys(table.fields).every(f =>
                fkColumns.includes(f) || standardFields.includes(f)
            )
        );
    }

    // Detect many-to-many relationships from join tables
    const manyToManyRelationships = [];
    for (const [tableName, table] of Object.entries(tables)) {
        if (table.isJoinTable && table.foreignKeys.length === 2) {
            const [fk1, fk2] = table.foreignKeys;
            manyToManyRelationships.push({
                table1: fk1.references.table,
                table2: fk2.references.table,
                joinTable: tableName
            });
        }
    }

    // Process union types for output
    const enumTypes = processUnionTypes(allUnionTypes);

    const introspection = {
        generatedAt: new Date().toISOString(),
        tables,
        relationships,
        manyToManyRelationships,
        enumTypes,
        summary: {
            tableCount: Object.keys(tables).length,
            relationshipCount: relationships.length,
            joinTableCount: Object.values(tables).filter(t => t.isJoinTable).length,
            manyToManyCount: manyToManyRelationships.length,
            enumTypeCount: enumTypes.length,
            enumLikeCount: enumTypes.filter(e => e.isEnumLike).length
        }
    };

    if (enumTypes.length > 0) {
        console.log(`🔷 Found ${enumTypes.length} union types: ${enumTypes.map(e => e.name).join(', ')}`);
    }

    // Write to schema.json in the server glue directory
    const outputDir = ensureOutputDir(paths.serverGlueDir);

    const schemaFile = path.join(outputDir, 'schema.json');
    fs.writeFileSync(schemaFile, JSON.stringify(introspection, null, 2));
    console.log(`✅ Generated schema introspection: ${schemaFile}`);

    return {
        schemaFile,
        introspection
    };
}

export default generateSqlMigrations;

// Test helpers - export internal functions for unit testing
export const generateCreateTableForTest = generateCreateTable;
export const generateSchemaForTest = generateSchema;
export { isEnumLike, processUnionTypes };
