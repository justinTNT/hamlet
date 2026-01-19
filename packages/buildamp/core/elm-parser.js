/**
 * Elm Schema Parser
 *
 * Parses Elm type aliases (from Schema/*.elm files) into an
 * intermediate representation used by code generators.
 *
 * Recognizes Framework.Schema magic types:
 * - DatabaseId a → primary key
 * - Timestamp → timestamp field
 * - Host → multi-tenant host field
 * - ForeignKey table a → foreign key reference
 * - RichContent → rich text field
 * - Maybe a → optional/nullable field
 * - List a → array field (stored as JSONB)
 */

import fs from 'fs';
import path from 'path';

/**
 * Convert camelCase to snake_case
 */
function camelToSnake(str) {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

/**
 * Convert PascalCase type name to snake_case table name
 */
function typeNameToTableName(typeName) {
    return camelToSnake(typeName);
}

/**
 * Map Elm types to SQL types with constraints
 */
function elmTypeToSql(fieldType, fieldName) {
    const type = fieldType.trim();

    // DatabaseId a - primary key with UUID generation
    if (type.startsWith('DatabaseId')) {
        return {
            sqlType: 'TEXT',
            constraints: ['PRIMARY KEY', "DEFAULT gen_random_uuid()"]
        };
    }

    // Timestamp - stored as BIGINT (epoch millis)
    if (type === 'Timestamp') {
        return {
            sqlType: 'BIGINT',
            constraints: ['NOT NULL', "DEFAULT extract(epoch from now())"]
        };
    }

    // Host - multi-tenant host field
    if (type === 'Host') {
        return {
            sqlType: 'TEXT',
            constraints: ['NOT NULL']
        };
    }

    // Maybe a - nullable field
    if (type.startsWith('Maybe ') || type.startsWith('Maybe(')) {
        const innerType = extractInnerType(type, 'Maybe');
        const inner = elmTypeToSql(innerType, fieldName);
        return {
            sqlType: inner.sqlType,
            constraints: [] // No NOT NULL for optional
        };
    }

    // List a - stored as JSON array
    if (type.startsWith('List ') || type.startsWith('List(')) {
        return {
            sqlType: 'JSONB',
            constraints: ['NOT NULL', "DEFAULT '[]'::jsonb"]
        };
    }

    // ForeignKey table a - foreign key reference
    if (type.startsWith('ForeignKey ')) {
        // ForeignKey Post String -> extract the ID type (String)
        const parts = parseTypeApplication(type);
        const idType = parts[parts.length - 1]; // Last type arg is the ID type
        const inner = elmTypeToSql(idType, fieldName);
        return {
            sqlType: inner.sqlType,
            constraints: ['NOT NULL']
        };
    }

    // RichContent - rich text field
    if (type === 'RichContent') {
        return {
            sqlType: 'JSONB',
            constraints: ['NOT NULL']
        };
    }

    // Basic types
    if (type === 'String') {
        return { sqlType: 'TEXT', constraints: ['NOT NULL'] };
    }

    if (type === 'Int') {
        return { sqlType: 'INTEGER', constraints: ['NOT NULL', 'DEFAULT 0'] };
    }

    if (type === 'Float') {
        return { sqlType: 'DOUBLE PRECISION', constraints: ['NOT NULL', 'DEFAULT 0'] };
    }

    if (type === 'Bool') {
        return { sqlType: 'BOOLEAN', constraints: ['NOT NULL', 'DEFAULT false'] };
    }

    // Fallback to TEXT
    return { sqlType: 'TEXT', constraints: ['NOT NULL'] };
}

/**
 * Extract inner type from a type application like "Maybe String" or "List Int"
 */
function extractInnerType(type, wrapper) {
    // Handle "Maybe String" syntax
    if (type.startsWith(wrapper + ' ')) {
        return type.slice(wrapper.length + 1).trim();
    }
    // Handle "Maybe(String)" syntax (less common but valid)
    if (type.startsWith(wrapper + '(') && type.endsWith(')')) {
        return type.slice(wrapper.length + 1, -1).trim();
    }
    return type;
}

/**
 * Parse a type application into its parts
 * "ForeignKey Post String" -> ["ForeignKey", "Post", "String"]
 */
function parseTypeApplication(type) {
    const parts = [];
    let current = '';
    let depth = 0;

    for (const char of type) {
        if (char === '(' || char === '{') {
            depth++;
            current += char;
        } else if (char === ')' || char === '}') {
            depth--;
            current += char;
        } else if (char === ' ' && depth === 0) {
            if (current.trim()) {
                parts.push(current.trim());
            }
            current = '';
        } else {
            current += char;
        }
    }

    if (current.trim()) {
        parts.push(current.trim());
    }

    return parts;
}

/**
 * Extract referenced table from ForeignKey type
 * "ForeignKey Post String" -> "post"
 */
function extractForeignKeyTable(type) {
    if (!type.startsWith('ForeignKey ')) {
        return null;
    }
    const parts = parseTypeApplication(type);
    if (parts.length >= 2) {
        // parts[0] is "ForeignKey", parts[1] is the table type
        return typeNameToTableName(parts[1]);
    }
    return null;
}

/**
 * Parse Elm record fields from content between { }
 * Returns array of { name, elmType }
 */
function parseRecordFields(fieldsContent) {
    const fields = [];

    // Remove leading/trailing whitespace and braces if present
    let content = fieldsContent.trim();
    if (content.startsWith('{')) content = content.slice(1);
    if (content.endsWith('}')) content = content.slice(0, -1);

    // Split by commas, handling nested types
    const fieldStrings = [];
    let current = '';
    let depth = 0;

    for (const char of content) {
        if (char === '{' || char === '(' || char === '[') {
            depth++;
            current += char;
        } else if (char === '}' || char === ')' || char === ']') {
            depth--;
            current += char;
        } else if (char === ',' && depth === 0) {
            if (current.trim()) {
                fieldStrings.push(current.trim());
            }
            current = '';
        } else {
            current += char;
        }
    }
    if (current.trim()) {
        fieldStrings.push(current.trim());
    }

    // Parse each field: "fieldName : Type"
    for (const fieldStr of fieldStrings) {
        const colonIndex = fieldStr.indexOf(':');
        if (colonIndex === -1) continue;

        const name = fieldStr.slice(0, colonIndex).trim();
        const elmType = fieldStr.slice(colonIndex + 1).trim();

        if (name && elmType) {
            fields.push({ name, elmType });
        }
    }

    return fields;
}

/**
 * Parse an Elm type alias definition
 * Returns null if not a record type alias
 */
function parseTypeAlias(content, filename) {
    const typeAliases = [];

    // Match: type alias Name = { ... }
    // Handle multiline and various whitespace patterns
    const typeAliasRegex = /type\s+alias\s+(\w+)\s*=\s*(\{[^}]+\})/gs;
    let match;

    while ((match = typeAliasRegex.exec(content)) !== null) {
        const [, typeName, recordContent] = match;

        // Parse record fields
        const rawFields = parseRecordFields(recordContent);

        // Convert to intermediate representation for generators
        const fields = rawFields.map(({ name, elmType }) => {
            const snakeName = camelToSnake(name);
            const sqlInfo = elmTypeToSql(elmType, snakeName);

            const isForeignKey = elmType.startsWith('ForeignKey ');
            const referencedTable = isForeignKey ? extractForeignKeyTable(elmType) : null;

            return {
                name: snakeName,
                rustType: elmType, // Store Elm type in rustType field for compatibility
                sqlType: sqlInfo.sqlType,
                constraints: sqlInfo.constraints,
                isPrimaryKey: elmType.startsWith('DatabaseId'),
                isTimestamp: elmType === 'Timestamp',
                isOptional: elmType.startsWith('Maybe ') || elmType.startsWith('Maybe('),
                isLink: false, // Elm doesn't have Link type yet
                isRichContent: elmType === 'RichContent',
                isForeignKey,
                referencedTable
            };
        });

        const tableName = typeNameToTableName(typeName);

        typeAliases.push({
            name: typeName,
            tableName,
            fields,
            filename
        });
    }

    return typeAliases;
}

/**
 * Parse all Elm schema files in a directory
 * @param {string} schemaDir - Path to Schema/*.elm files
 * @returns {Array} Array of parsed type definitions
 */
export function parseElmSchemaDir(schemaDir) {
    if (!fs.existsSync(schemaDir)) {
        return [];
    }

    const allTypes = [];
    const files = fs.readdirSync(schemaDir)
        .filter(file => file.endsWith('.elm') && file !== 'Schema.elm');

    for (const file of files) {
        const filePath = path.join(schemaDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const types = parseTypeAlias(content, file);
        allTypes.push(...types);
    }

    return allTypes;
}

/**
 * Parse Elm schema from a specific file
 * @param {string} filePath - Path to Elm file
 * @returns {Array} Array of parsed type definitions
 */
export function parseElmSchemaFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return [];
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const filename = path.basename(filePath);
    return parseTypeAlias(content, filename);
}

// =============================================================================
// API SCHEMA PARSING
// =============================================================================

/**
 * API annotation wrappers that we recognize
 */
const API_WRAPPERS = ['Inject', 'Required', 'Trim', 'MinLength', 'MaxLength'];

/**
 * Unwrap API annotation types and extract annotations
 * "Required (Trim String)" -> { baseType: "String", annotations: { required: true, trim: true } }
 * "Inject String" -> { baseType: "String", annotations: { inject: true } }
 */
function unwrapApiAnnotations(elmType) {
    const annotations = {};
    let current = elmType.trim();

    // Strip trailing comments (-- ... or {- ... -})
    current = current.replace(/\s*--.*$/, '').replace(/\s*\{-.*?-\}/, '').trim();

    // Keep unwrapping until we hit a non-wrapper type
    let maxIterations = 10; // Safety limit
    while (maxIterations-- > 0) {
        // Strip outer parentheses if they wrap the whole expression
        if (current.startsWith('(') && current.endsWith(')')) {
            // Check if these parens wrap the whole thing
            let depth = 0;
            let wrapsWhole = true;
            for (let i = 0; i < current.length - 1; i++) {
                if (current[i] === '(') depth++;
                else if (current[i] === ')') depth--;
                if (depth === 0 && i > 0) {
                    wrapsWhole = false;
                    break;
                }
            }
            if (wrapsWhole) {
                current = current.slice(1, -1).trim();
            }
        }

        let foundWrapper = false;

        for (const wrapper of API_WRAPPERS) {
            // Check for "Wrapper innerType" or "Wrapper (innerType)"
            if (current.startsWith(wrapper + ' ') || current.startsWith(wrapper + '(')) {
                annotations[wrapper.toLowerCase()] = true;
                current = extractInnerType(current, wrapper);
                foundWrapper = true;
                break;
            }
        }

        if (!foundWrapper) break;
    }

    return {
        baseType: current,
        annotations
    };
}

/**
 * Parse an Elm API module
 * Extracts endpoint info from module structure:
 * - Module name: Api.SubmitComment -> endpoint name "SubmitComment"
 * - type alias Request = ... -> request type
 * - type alias Response = ... -> response type
 * - type alias ServerContext = ... -> server context (optional)
 */
function parseApiModule(content, filename) {
    // Extract module name
    const moduleMatch = content.match(/^module\s+([\w.]+)\s+exposing/m);
    if (!moduleMatch) return null;

    const moduleName = moduleMatch[1];
    // Api.SubmitComment -> SubmitComment
    const endpointName = moduleName.split('.').pop();

    // Check if this is an API module
    if (!moduleName.startsWith('Api.')) return null;

    const result = {
        name: endpointName,
        moduleName,
        filename,
        request: null,
        response: null,
        serverContext: null,
        helperTypes: []
    };

    // Parse all type aliases
    const typeAliasRegex = /type\s+alias\s+(\w+)\s*=\s*(\{[^}]+\})/gs;
    let match;

    while ((match = typeAliasRegex.exec(content)) !== null) {
        const [, typeName, recordContent] = match;
        const fields = parseRecordFields(recordContent);

        // Process fields - unwrap API annotations
        const processedFields = fields.map(({ name, elmType }) => {
            const { baseType, annotations } = unwrapApiAnnotations(elmType);
            return {
                name: camelToSnake(name),
                camelName: name,
                elmType: baseType,
                originalType: elmType,
                annotations
            };
        });

        const typeInfo = {
            name: typeName,
            fields: processedFields
        };

        // Categorize by name
        if (typeName === 'Request') {
            result.request = typeInfo;
        } else if (typeName === 'Response') {
            result.response = typeInfo;
        } else if (typeName === 'ServerContext') {
            result.serverContext = typeInfo;
        } else {
            result.helperTypes.push(typeInfo);
        }
    }

    return result;
}

/**
 * Parse all Elm API schemas in a directory
 * @param {string} apiDir - Path to Api/*.elm files
 * @returns {Array} Array of parsed API definitions
 */
export function parseElmApiDir(apiDir) {
    if (!fs.existsSync(apiDir)) {
        return [];
    }

    const apis = [];
    const files = fs.readdirSync(apiDir)
        .filter(file => file.endsWith('.elm'));

    for (const file of files) {
        const filePath = path.join(apiDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const api = parseApiModule(content, file);
        if (api && api.request) {
            apis.push(api);
        }
    }

    return apis;
}

// =============================================================================
// GENERIC MODEL PARSING (KV, Storage, SSE, Events, Config)
// =============================================================================

/**
 * Parse a generic Elm model directory
 * @param {string} modelDir - Path to model files (e.g., shared/Kv/)
 * @param {string} modulePrefix - Module prefix (e.g., 'Kv', 'Storage', 'Sse')
 * @returns {Array} Array of parsed model definitions
 */
export function parseElmModelDir(modelDir, modulePrefix) {
    if (!fs.existsSync(modelDir)) {
        return [];
    }

    const models = [];
    const files = fs.readdirSync(modelDir)
        .filter(file => file.endsWith('.elm') && !file.startsWith('Framework'));

    for (const file of files) {
        const filePath = path.join(modelDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed = parseGenericModule(content, file, modulePrefix);
        if (parsed) {
            models.push(parsed);
        }
    }

    return models;
}

/**
 * Parse a generic Elm module for model definitions
 */
function parseGenericModule(content, filename, modulePrefix) {
    // Extract module name
    const moduleMatch = content.match(/^module\s+([\w.]+)\s+exposing/m);
    if (!moduleMatch) return null;

    const moduleName = moduleMatch[1];
    const modelName = moduleName.split('.').pop();

    // Parse all type aliases
    const typeAliasRegex = /type\s+alias\s+(\w+)\s*=\s*(\{[^}]+\})/gs;
    const types = [];
    let match;

    while ((match = typeAliasRegex.exec(content)) !== null) {
        const [, typeName, recordContent] = match;
        const fields = parseRecordFields(recordContent);

        // Convert fields to generator-compatible format
        const processedFields = fields.map(({ name, elmType }) => {
            return {
                name: camelToSnake(name),
                camelName: name,
                type: elmTypeToSchemaFormat(elmType),
                elmType,
                isOptional: elmType.startsWith('Maybe ') || elmType.startsWith('Maybe('),
                isList: elmType.startsWith('List ') || elmType.startsWith('List(')
            };
        });

        types.push({
            name: typeName,
            fields: processedFields
        });
    }

    // Find the main type (matching the filename)
    const mainType = types.find(t => t.name === modelName) || types[0];
    if (!mainType) return null;

    // Convert CamelCase to kebab-case for keys
    const storageKey = modelName
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .substring(1);

    return {
        name: modelName,
        moduleName,
        storageKey,
        eventName: storageKey,  // SSE uses this
        fields: mainType.fields,
        helperTypes: types.filter(t => t.name !== modelName),
        filename
    };
}

/**
 * Convert Elm types to schema type strings
 * Used for generator compatibility (Option<T>, Vec<T> format)
 */
function elmTypeToSchemaFormat(elmType) {
    const type = elmType.trim();

    // Handle Maybe types
    if (type.startsWith('Maybe ')) {
        const inner = type.slice(6).trim();
        return `Option<${elmTypeToSchemaFormat(inner)}>`;
    }
    if (type.startsWith('Maybe(') && type.endsWith(')')) {
        const inner = type.slice(6, -1).trim();
        return `Option<${elmTypeToSchemaFormat(inner)}>`;
    }

    // Handle List types
    if (type.startsWith('List ')) {
        const inner = type.slice(5).trim();
        return `Vec<${elmTypeToSchemaFormat(inner)}>`;
    }
    if (type.startsWith('List(') && type.endsWith(')')) {
        const inner = type.slice(5, -1).trim();
        return `Vec<${elmTypeToSchemaFormat(inner)}>`;
    }

    // Handle Dict types
    if (type.startsWith('Dict ')) {
        return 'HashMap<String, String>';
    }

    // Basic type mappings
    switch (type) {
        case 'String': return 'String';
        case 'Int': return 'i64';
        case 'Float': return 'f64';
        case 'Bool': return 'bool';
        default: return 'String';
    }
}

/**
 * Parse KV models from shared/Kv/*.elm
 */
export function parseElmKvDir(kvDir) {
    return parseElmModelDir(kvDir, 'Kv');
}

/**
 * Parse Storage models from shared/Storage/*.elm
 */
export function parseElmStorageDir(storageDir) {
    return parseElmModelDir(storageDir, 'Storage');
}

/**
 * Parse SSE models from shared/Sse/*.elm
 */
export function parseElmSseDir(sseDir) {
    return parseElmModelDir(sseDir, 'Sse');
}

/**
 * Parse Events models from shared/Events/*.elm
 */
export function parseElmEventsDir(eventsDir) {
    return parseElmModelDir(eventsDir, 'Events');
}

/**
 * Parse Config models from shared/Config/*.elm
 */
export function parseElmConfigDir(configDir) {
    return parseElmModelDir(configDir, 'Config');
}

// Test helpers - export internal functions for unit testing
export const parseElmTypeForTest = parseTypeAlias;
export const elmTypeToSqlForTest = elmTypeToSql;
export const camelToSnakeForTest = camelToSnake;
export const parseRecordFieldsForTest = parseRecordFields;
export const extractForeignKeyTableForTest = extractForeignKeyTable;
export const unwrapApiAnnotationsForTest = unwrapApiAnnotations;
export const parseApiModuleForTest = parseApiModule;
export const parseGenericModuleForTest = parseGenericModule;
export const elmTypeToSchemaFormatForTest = elmTypeToSchemaFormat;

export default {
    parseElmSchemaDir,
    parseElmSchemaFile,
    parseElmApiDir,
    parseElmKvDir,
    parseElmStorageDir,
    parseElmSseDir,
    parseElmEventsDir,
    parseElmConfigDir,
    parseElmModelDir,
    parseElmTypeForTest,
    elmTypeToSqlForTest
};
