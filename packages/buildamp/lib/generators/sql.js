/**
 * SQL Migration Generation
 * Generates CREATE TABLE statements from Rust database models
 *
 * Outputs:
 * - schema.sql: Full CREATE TABLE statements for fresh database init
 * - migrations/NNN_auto.sql: Incremental ALTERs (if migra available)
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getGenerationPaths, modelsExist, getModelsFullPath, ensureOutputDir } from './shared-paths.js';

const execAsync = promisify(exec);

/**
 * Map Rust types to SQL types with constraints
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
 * Parse a Rust struct from file content
 * Similar to db.js parseRustStruct but extracts full type info
 */
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
            const sqlInfo = rustTypeToSql(fieldType, fieldName);

            fields.push({
                name: fieldName,
                rustType: fieldType.trim(),
                sqlType: sqlInfo.sqlType,
                constraints: sqlInfo.constraints,
                isPrimaryKey: fieldType.includes('DatabaseId'),
                isTimestamp: fieldType.includes('Timestamp'),
                isOptional: fieldType.includes('Option<')
            });
        }

        // Convert CamelCase struct name to snake_case table name (pluralized)
        const tableName = structName
            .replace(/([A-Z])/g, '_$1')
            .toLowerCase()
            .substring(1) + 's';

        structs.push({
            name: structName,
            tableName,
            fields,
            filename
        });
    }

    return structs;
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
 * @returns {{ sql: string, foreignKeys: Array, warnings: Array }}
 */
function generateCreateTable(struct, knownTables = []) {
    const { tableName, fields } = struct;
    const foreignKeys = [];
    const warnings = [];

    const columnDefs = fields.map(field => {
        const parts = [field.name, field.sqlType];
        parts.push(...field.constraints);
        return '    ' + parts.join(' ');
    });

    // Add standard columns that all tables should have
    const hasHost = fields.some(f => f.name === 'host');
    const hasCreatedAt = fields.some(f => f.name === 'created_at');
    const hasUpdatedAt = fields.some(f => f.name === 'updated_at');
    const hasDeletedAt = fields.some(f => f.name === 'deleted_at');

    if (!hasHost) {
        columnDefs.push('    host TEXT NOT NULL');
    }
    if (!hasCreatedAt) {
        columnDefs.push("    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()");
    }
    if (!hasUpdatedAt) {
        columnDefs.push('    updated_at TIMESTAMP WITH TIME ZONE');
    }
    if (!hasDeletedAt) {
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

    const sql = `-- Generated from ${struct.filename}
CREATE TABLE ${tableName} (
${columnDefs.join(',\n')}
);

-- Index for tenant isolation
CREATE INDEX idx_${tableName}_host ON ${tableName}(host);`;

    return { sql, foreignKeys, warnings };
}

/**
 * Generate full schema.sql from all db models
 * @param {Array} structs - Parsed struct definitions
 * @returns {{ schema: string, foreignKeys: Array, warnings: Array }}
 */
function generateSchema(structs) {
    const header = `-- BuildAmp Generated Schema
-- Generated from Rust database models
--
-- DO NOT EDIT THIS FILE MANUALLY
-- Changes will be overwritten during next generation
--
-- Use this file for fresh database initialization:
--   psql $DATABASE_URL < schema.sql

`;

    // Collect all table names for FK validation
    const knownTables = structs.map(s => s.tableName);

    // Generate tables with FK validation
    const allForeignKeys = [];
    const allWarnings = [];
    const tableSqls = [];

    for (const struct of structs) {
        const result = generateCreateTable(struct, knownTables);
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
-- Generated by BuildAmp from Rust model changes
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
 * Main SQL generation function
 */
export async function generateSqlMigrations(config = {}) {
    const paths = getGenerationPaths(config);

    // Check if database models exist
    if (!modelsExist('db', paths)) {
        console.log('📁 No models/db directory found, skipping SQL generation');
        return null;
    }

    const dbModelsPath = getModelsFullPath('db', paths);

    // Parse all db models
    const allStructs = [];
    const files = fs.readdirSync(dbModelsPath)
        .filter(file => file.endsWith('.rs') && file !== 'mod.rs');

    for (const file of files) {
        const filePath = path.join(dbModelsPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const structs = parseRustStruct(content, file);
        allStructs.push(...structs);
    }

    console.log(`🔍 Found ${allStructs.length} database models: ${allStructs.map(s => s.name).join(', ')}`);

    // Generate schema with FK validation
    const { schema: schemaContent, foreignKeys, warnings } = generateSchema(allStructs);

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

    // Determine output directory (server/migrations or similar)
    const serverDir = path.join(process.cwd(), `app/${paths.appName}/server`);
    const migrationsDir = path.join(serverDir, 'migrations');

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
    const paths = getGenerationPaths(config);

    if (!modelsExist('db', paths)) {
        console.log('📁 No models/db directory found, skipping schema introspection');
        return null;
    }

    const dbModelsPath = getModelsFullPath('db', paths);

    // Parse all db models
    const allStructs = [];
    const files = fs.readdirSync(dbModelsPath)
        .filter(file => file.endsWith('.rs') && file !== 'mod.rs');

    for (const file of files) {
        const filePath = path.join(dbModelsPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const structs = parseRustStruct(content, file);
        allStructs.push(...structs);
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
            referencedBy: []
        };

        for (const field of struct.fields) {
            tableInfo.fields[field.name] = {
                rustType: field.rustType,
                sqlType: field.sqlType,
                nullable: field.isOptional,
                isPrimaryKey: field.isPrimaryKey,
                isTimestamp: field.isTimestamp
            };

            if (field.isPrimaryKey) {
                tableInfo.primaryKey = field.name;
            }

            // Detect foreign keys
            const fk = detectForeignKey(field.name, knownTables);
            if (fk && fk.referencedTable) {
                tableInfo.foreignKeys.push({
                    column: field.name,
                    references: {
                        table: fk.referencedTable,
                        column: fk.referencedColumn
                    }
                });

                relationships.push({
                    from: { table: struct.tableName, column: field.name },
                    to: { table: fk.referencedTable, column: fk.referencedColumn },
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

    const introspection = {
        generatedAt: new Date().toISOString(),
        appName: paths.appName,
        tables,
        relationships,
        summary: {
            tableCount: Object.keys(tables).length,
            relationshipCount: relationships.length
        }
    };

    // Write to schema.json
    const outputDir = path.join(process.cwd(), paths.jsGlueDir);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

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
export const parseRustStructForTest = parseRustStruct;
export const generateCreateTableForTest = generateCreateTable;
export const generateSchemaForTest = generateSchema;
