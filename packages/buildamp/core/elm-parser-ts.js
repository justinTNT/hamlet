/**
 * Elm Parser using Tree-Sitter
 *
 * Proper AST-based parsing of Elm files, supporting:
 * - Type aliases (record types)
 * - Union types (custom types)
 * - Nested records
 * - Type parameters
 * - Complex type expressions
 *
 * This replaces the regex-based parser in elm-parser.js
 */

import fs from 'fs';
import path from 'path';
import Parser from 'tree-sitter';
import Elm from '@elm-tooling/tree-sitter-elm';

// Initialize the parser
const parser = new Parser();
parser.setLanguage(Elm);

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Convert camelCase to snake_case
 */
export function camelToSnake(str) {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

/**
 * Convert PascalCase type name to snake_case table name
 */
export function typeNameToTableName(typeName) {
    return camelToSnake(typeName);
}

// =============================================================================
// TREE-SITTER AST HELPERS
// =============================================================================

/**
 * Get text content of a tree-sitter node
 */
function getText(node, sourceCode) {
    return sourceCode.slice(node.startIndex, node.endIndex);
}

/**
 * Find all nodes of a given type in the tree
 */
function findAllOfType(tree, nodeType) {
    const results = [];
    const cursor = tree.walk();

    function visit() {
        if (cursor.nodeType === nodeType) {
            results.push(cursor.currentNode);
        }
        if (cursor.gotoFirstChild()) {
            do {
                visit();
            } while (cursor.gotoNextSibling());
            cursor.gotoParent();
        }
    }
    visit();
    return results;
}

/**
 * Find child node by type
 */
function findChildByType(node, type) {
    for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child.type === type) {
            return child;
        }
    }
    return null;
}

/**
 * Find all children by type
 */
function findChildrenByType(node, type) {
    const results = [];
    for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child.type === type) {
            results.push(child);
        }
    }
    return results;
}

// =============================================================================
// TYPE EXPRESSION PARSING
// =============================================================================

/**
 * Parse a type expression node into a string representation
 * Handles: type_ref, type_expression, record_type, tuple_type, etc.
 */
function parseTypeExpression(node, sourceCode) {
    if (!node) return '';

    switch (node.type) {
        case 'type_ref':
        case 'upper_case_qid':
            return getText(node, sourceCode);

        case 'type_expression':
            return parseTypeExpressionNode(node, sourceCode);

        case 'record_type':
            return parseRecordType(node, sourceCode);

        case 'tuple_type':
            return parseTupleType(node, sourceCode);

        case 'type_variable':
            return getText(node, sourceCode);

        case 'unit_expr':
            return '()';

        default:
            // Fallback: just get the text
            return getText(node, sourceCode);
    }
}

/**
 * Parse a type_expression node (function types, type applications)
 */
function parseTypeExpressionNode(node, sourceCode) {
    const children = [];
    for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        // Skip arrow tokens
        if (child.type !== 'arrow') {
            children.push(parseTypeExpression(child, sourceCode));
        }
    }

    // Check if this is a function type (has -> arrows)
    const hasArrow = node.children.some(c => c.type === 'arrow');
    if (hasArrow) {
        return children.join(' -> ');
    }

    // Otherwise it's a type application
    return children.join(' ');
}

/**
 * Parse a record_type node into structured field data
 */
function parseRecordType(node, sourceCode) {
    const fields = [];
    const fieldNodes = findChildrenByType(node, 'field_type');

    for (const fieldNode of fieldNodes) {
        const nameNode = findChildByType(fieldNode, 'lower_case_identifier');
        const typeNode = fieldNode.children.find(c =>
            c.type === 'type_expression' ||
            c.type === 'type_ref' ||
            c.type === 'record_type' ||
            c.type === 'tuple_type'
        );

        if (nameNode && typeNode) {
            fields.push({
                name: getText(nameNode, sourceCode),
                type: parseTypeExpression(typeNode, sourceCode)
            });
        }
    }

    // Return as string representation for simple cases
    const fieldStrs = fields.map(f => `${f.name} : ${f.type}`);
    return `{ ${fieldStrs.join(', ')} }`;
}

/**
 * Parse a tuple_type node
 */
function parseTupleType(node, sourceCode) {
    const types = [];
    for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child.type !== '(' && child.type !== ')' && child.type !== ',') {
            types.push(parseTypeExpression(child, sourceCode));
        }
    }
    return `( ${types.join(', ')} )`;
}

/**
 * Extract structured fields from a record_type node
 */
function extractRecordFields(node, sourceCode) {
    const fields = [];
    const fieldNodes = findChildrenByType(node, 'field_type');

    for (const fieldNode of fieldNodes) {
        const nameNode = findChildByType(fieldNode, 'lower_case_identifier');
        const typeNode = fieldNode.children.find(c =>
            c.type === 'type_expression' ||
            c.type === 'type_ref' ||
            c.type === 'record_type' ||
            c.type === 'tuple_type'
        );

        if (nameNode && typeNode) {
            const elmType = parseTypeExpression(typeNode, sourceCode);
            fields.push({
                name: getText(nameNode, sourceCode),
                elmType
            });
        }
    }

    return fields;
}

// =============================================================================
// TYPE ALIAS PARSING
// =============================================================================

/**
 * Recursively find a node of a given type
 */
function findDescendantByType(node, type) {
    if (node.type === type) return node;
    for (let i = 0; i < node.childCount; i++) {
        const found = findDescendantByType(node.child(i), type);
        if (found) return found;
    }
    return null;
}

/**
 * Parse a type_alias_declaration node
 */
function parseTypeAliasDeclaration(node, sourceCode) {
    // Find the type name (upper_case_identifier)
    const nameNode = findChildByType(node, 'upper_case_identifier');
    if (!nameNode) return null;

    const typeName = getText(nameNode, sourceCode);

    // Find the type definition (could be record_type nested in type_expression)
    const recordTypeNode = findDescendantByType(node, 'record_type');
    if (recordTypeNode) {
        const fields = extractRecordFields(recordTypeNode, sourceCode);
        return {
            kind: 'type_alias',
            name: typeName,
            isRecord: true,
            fields
        };
    }

    // Non-record type alias (e.g., type alias Id = String)
    const typeExprNode = node.children.find(c =>
        c.type === 'type_expression' ||
        c.type === 'type_ref'
    );

    if (typeExprNode) {
        return {
            kind: 'type_alias',
            name: typeName,
            isRecord: false,
            aliasedType: parseTypeExpression(typeExprNode, sourceCode)
        };
    }

    return null;
}

// =============================================================================
// UNION TYPE PARSING
// =============================================================================

/**
 * Parse a type_declaration node (union/custom type)
 */
function parseTypeDeclaration(node, sourceCode) {
    // Find the type name
    const nameNode = findChildByType(node, 'upper_case_identifier');
    if (!nameNode) return null;

    const typeName = getText(nameNode, sourceCode);

    // Find type parameters
    const typeParams = [];
    const paramNodes = findChildrenByType(node, 'lower_type_name');
    for (const paramNode of paramNodes) {
        typeParams.push(getText(paramNode, sourceCode));
    }

    // Find union variants
    const variants = [];
    const variantNodes = findChildrenByType(node, 'union_variant');

    for (const variantNode of variantNodes) {
        const variantNameNode = findChildByType(variantNode, 'upper_case_identifier');
        if (!variantNameNode) continue;

        const variantName = getText(variantNameNode, sourceCode);

        // Get the argument types for this variant
        const argTypes = [];
        for (let i = 0; i < variantNode.childCount; i++) {
            const child = variantNode.child(i);
            // Skip the variant name itself and pipe characters
            if (child.type !== 'upper_case_identifier' &&
                child.type !== '|' &&
                child.type !== 'line_comment' &&
                child.type !== 'block_comment') {
                argTypes.push(parseTypeExpression(child, sourceCode));
            }
        }

        variants.push({
            name: variantName,
            args: argTypes.filter(t => t.length > 0)
        });
    }

    return {
        kind: 'union_type',
        name: typeName,
        typeParams,
        variants
    };
}

// =============================================================================
// MODULE PARSING
// =============================================================================

/**
 * Extract module name from source code
 */
function parseModuleName(tree, sourceCode) {
    const moduleNodes = findAllOfType(tree, 'module_declaration');
    if (moduleNodes.length === 0) return null;

    const moduleNode = moduleNodes[0];
    const qidNode = findChildByType(moduleNode, 'upper_case_qid');
    if (qidNode) {
        return getText(qidNode, sourceCode);
    }
    return null;
}

/**
 * Parse all type definitions from an Elm source file
 */
export function parseElmSource(sourceCode) {
    const tree = parser.parse(sourceCode);
    const moduleName = parseModuleName(tree, sourceCode);

    const typeAliases = [];
    const unionTypes = [];

    // Find all type alias declarations
    const aliasNodes = findAllOfType(tree, 'type_alias_declaration');
    for (const node of aliasNodes) {
        const parsed = parseTypeAliasDeclaration(node, sourceCode);
        if (parsed) {
            typeAliases.push(parsed);
        }
    }

    // Find all union type declarations
    const typeNodes = findAllOfType(tree, 'type_declaration');
    for (const node of typeNodes) {
        const parsed = parseTypeDeclaration(node, sourceCode);
        if (parsed) {
            unionTypes.push(parsed);
        }
    }

    return {
        moduleName,
        typeAliases,
        unionTypes
    };
}

// =============================================================================
// SQL TYPE MAPPING (kept from original parser)
// =============================================================================

/**
 * Map Elm types to SQL types with constraints
 */
export function elmTypeToSql(fieldType, fieldName) {
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

    // Host - multi-tenant host field (legacy)
    if (type === 'Host') {
        return {
            sqlType: 'TEXT',
            constraints: ['NOT NULL']
        };
    }

    // MultiTenant - explicit multi-tenant field
    if (type === 'MultiTenant') {
        return {
            sqlType: 'TEXT',
            constraints: ['NOT NULL']
        };
    }

    // SoftDelete - nullable timestamp for soft deletes
    if (type === 'SoftDelete') {
        return {
            sqlType: 'BIGINT',
            constraints: [] // nullable
        };
    }

    // CreateTimestamp - auto-populated on INSERT
    if (type === 'CreateTimestamp') {
        return {
            sqlType: 'TIMESTAMP WITH TIME ZONE',
            constraints: ['NOT NULL', 'DEFAULT NOW()']
        };
    }

    // UpdateTimestamp - auto-populated on INSERT and UPDATE
    if (type === 'UpdateTimestamp') {
        return {
            sqlType: 'TIMESTAMP WITH TIME ZONE',
            constraints: [] // nullable, set by application
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
        const parts = parseTypeApplication(type);
        const idType = parts[parts.length - 1];
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
 * Extract inner type from a type application
 */
function extractInnerType(type, wrapper) {
    if (type.startsWith(wrapper + ' ')) {
        return type.slice(wrapper.length + 1).trim();
    }
    if (type.startsWith(wrapper + '(') && type.endsWith(')')) {
        return type.slice(wrapper.length + 1, -1).trim();
    }
    return type;
}

/**
 * Parse a type application into its parts
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
 */
export function extractForeignKeyTable(type) {
    if (!type.startsWith('ForeignKey ')) {
        return null;
    }
    const parts = parseTypeApplication(type);
    if (parts.length >= 2) {
        return typeNameToTableName(parts[1]);
    }
    return null;
}

// =============================================================================
// HIGH-LEVEL PARSING FUNCTIONS
// =============================================================================

/**
 * Parse Elm schema from a file, converting to the format expected by generators
 */
export function parseElmSchemaFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return [];
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const filename = path.basename(filePath);
    const parsed = parseElmSource(content);

    // Convert type aliases to the generator format
    return parsed.typeAliases
        .filter(t => t.isRecord)
        .map(typeAlias => {
            const fields = typeAlias.fields.map(({ name, elmType }) => {
                const snakeName = camelToSnake(name);
                const sqlInfo = elmTypeToSql(elmType, snakeName);
                const isForeignKey = elmType.startsWith('ForeignKey ');

                return {
                    name: snakeName,
                    rustType: elmType,
                    sqlType: sqlInfo.sqlType,
                    constraints: sqlInfo.constraints,
                    isPrimaryKey: elmType.startsWith('DatabaseId'),
                    isTimestamp: elmType === 'Timestamp',
                    isCreateTimestamp: elmType === 'CreateTimestamp',
                    isUpdateTimestamp: elmType === 'UpdateTimestamp',
                    isOptional: elmType.startsWith('Maybe ') || elmType.startsWith('Maybe('),
                    isLink: elmType === 'Link' || elmType.includes('Maybe Link'),
                    isRichContent: elmType === 'RichContent',
                    isForeignKey,
                    referencedTable: isForeignKey ? extractForeignKeyTable(elmType) : null,
                    isMultiTenant: elmType === 'MultiTenant',
                    isSoftDelete: elmType === 'SoftDelete'
                };
            });

            const tableName = typeNameToTableName(typeAlias.name);

            // Derive model-level flags from field types
            const multiTenantField = fields.find(f => f.isMultiTenant);
            const softDeleteField = fields.find(f => f.isSoftDelete);
            const createTimestampField = fields.find(f => f.isCreateTimestamp);
            const updateTimestampField = fields.find(f => f.isUpdateTimestamp);

            return {
                name: typeAlias.name,
                tableName,
                fields,
                filename,
                isMultiTenant: !!multiTenantField,
                isSoftDelete: !!softDeleteField,
                hasCreateTimestamp: !!createTimestampField,
                hasUpdateTimestamp: !!updateTimestampField,
                multiTenantFieldName: multiTenantField?.name || null,
                softDeleteFieldName: softDeleteField?.name || null,
                createTimestampFieldName: createTimestampField?.name || null,
                updateTimestampFieldName: updateTimestampField?.name || null
            };
        });
}

/**
 * Parse all Elm schema files in a directory
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
        const types = parseElmSchemaFile(filePath);
        allTypes.push(...types);
    }

    return allTypes;
}

/**
 * Parse all Elm schema files in a directory, returning both records and union types
 * @returns {{ records: Array, unionTypes: Array }}
 */
export function parseElmSchemaDirFull(schemaDir) {
    if (!fs.existsSync(schemaDir)) {
        return { records: [], unionTypes: [] };
    }

    const allRecords = [];
    const allUnionTypes = [];
    const files = fs.readdirSync(schemaDir)
        .filter(file => file.endsWith('.elm') && file !== 'Schema.elm');

    for (const file of files) {
        const filePath = path.join(schemaDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const filename = path.basename(filePath);
        const parsed = parseElmSource(content);

        // Process record types (same as parseElmSchemaFile)
        for (const typeAlias of parsed.typeAliases.filter(t => t.isRecord)) {
            const fields = typeAlias.fields.map(({ name, elmType }) => {
                const snakeName = camelToSnake(name);
                const sqlInfo = elmTypeToSql(elmType, snakeName);
                const isForeignKey = elmType.startsWith('ForeignKey ');

                return {
                    name: snakeName,
                    rustType: elmType,
                    sqlType: sqlInfo.sqlType,
                    constraints: sqlInfo.constraints,
                    isPrimaryKey: elmType.startsWith('DatabaseId'),
                    isTimestamp: elmType === 'Timestamp',
                    isCreateTimestamp: elmType === 'CreateTimestamp',
                    isUpdateTimestamp: elmType === 'UpdateTimestamp',
                    isOptional: elmType.startsWith('Maybe ') || elmType.startsWith('Maybe('),
                    isLink: elmType === 'Link' || elmType.includes('Maybe Link'),
                    isRichContent: elmType === 'RichContent',
                    isForeignKey,
                    referencedTable: isForeignKey ? extractForeignKeyTable(elmType) : null,
                    isMultiTenant: elmType === 'MultiTenant',
                    isSoftDelete: elmType === 'SoftDelete'
                };
            });

            // Derive model-level flags from field types
            const multiTenantField = fields.find(f => f.isMultiTenant);
            const softDeleteField = fields.find(f => f.isSoftDelete);
            const createTimestampField = fields.find(f => f.isCreateTimestamp);
            const updateTimestampField = fields.find(f => f.isUpdateTimestamp);

            allRecords.push({
                name: typeAlias.name,
                tableName: typeNameToTableName(typeAlias.name),
                fields,
                filename,
                isMultiTenant: !!multiTenantField,
                isSoftDelete: !!softDeleteField,
                hasCreateTimestamp: !!createTimestampField,
                hasUpdateTimestamp: !!updateTimestampField,
                multiTenantFieldName: multiTenantField?.name || null,
                softDeleteFieldName: softDeleteField?.name || null,
                createTimestampFieldName: createTimestampField?.name || null,
                updateTimestampFieldName: updateTimestampField?.name || null
            });
        }

        // Collect union types
        for (const unionType of parsed.unionTypes) {
            allUnionTypes.push({
                ...unionType,
                filename
            });
        }
    }

    return { records: allRecords, unionTypes: allUnionTypes };
}

// =============================================================================
// API PARSING
// =============================================================================

const API_WRAPPERS = ['Inject', 'Required', 'Trim', 'MinLength', 'MaxLength'];

/**
 * Unwrap API annotation types
 */
function unwrapApiAnnotations(elmType) {
    const annotations = {};
    let current = elmType.trim();

    current = current.replace(/\s*--.*$/, '').replace(/\s*\{-.*?-\}/, '').trim();

    let maxIterations = 10;
    while (maxIterations-- > 0) {
        if (current.startsWith('(') && current.endsWith(')')) {
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
            if (current.startsWith(wrapper + ' ') || current.startsWith(wrapper + '(')) {
                annotations[wrapper.toLowerCase()] = true;
                current = extractInnerType(current, wrapper);
                foundWrapper = true;
                break;
            }
        }

        if (!foundWrapper) break;
    }

    return { baseType: current, annotations };
}

/**
 * Parse an Elm API module
 */
export function parseApiModule(content, filename) {
    const parsed = parseElmSource(content);
    if (!parsed.moduleName) return null;

    const moduleName = parsed.moduleName;
    const endpointName = moduleName.split('.').pop();

    if (!moduleName.startsWith('Api.')) return null;

    const result = {
        name: endpointName,
        moduleName,
        filename,
        request: null,
        response: null,
        serverContext: null,
        helperTypes: [],
        unionTypes: parsed.unionTypes // Include union types!
    };

    for (const typeAlias of parsed.typeAliases) {
        if (!typeAlias.isRecord) continue;

        const processedFields = typeAlias.fields.map(({ name, elmType }) => {
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
            name: typeAlias.name,
            fields: processedFields
        };

        if (typeAlias.name === 'Request') {
            result.request = typeInfo;
        } else if (typeAlias.name === 'Response') {
            result.response = typeInfo;
        } else if (typeAlias.name === 'ServerContext') {
            result.serverContext = typeInfo;
        } else {
            result.helperTypes.push(typeInfo);
        }
    }

    return result;
}

/**
 * Parse all Elm API schemas in a directory
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
 * Convert Elm types to schema format strings
 */
function elmTypeToSchemaFormat(elmType) {
    const type = elmType.trim();

    if (type.startsWith('Maybe ')) {
        const inner = type.slice(6).trim();
        return `Option<${elmTypeToSchemaFormat(inner)}>`;
    }
    if (type.startsWith('Maybe(') && type.endsWith(')')) {
        const inner = type.slice(6, -1).trim();
        return `Option<${elmTypeToSchemaFormat(inner)}>`;
    }

    if (type.startsWith('List ')) {
        const inner = type.slice(5).trim();
        return `Vec<${elmTypeToSchemaFormat(inner)}>`;
    }
    if (type.startsWith('List(') && type.endsWith(')')) {
        const inner = type.slice(5, -1).trim();
        return `Vec<${elmTypeToSchemaFormat(inner)}>`;
    }

    if (type.startsWith('Dict ')) {
        return 'HashMap<String, String>';
    }

    switch (type) {
        case 'String': return 'String';
        case 'Int': return 'i64';
        case 'Float': return 'f64';
        case 'Bool': return 'bool';
        default: return 'String';
    }
}

/**
 * Parse a generic Elm model file
 */
export function parseGenericModule(content, filename, modulePrefix) {
    const parsed = parseElmSource(content);
    if (!parsed.moduleName) return null;

    const moduleName = parsed.moduleName;
    const modelName = moduleName.split('.').pop();

    // Get all record types
    const types = parsed.typeAliases
        .filter(t => t.isRecord)
        .map(typeAlias => {
            const processedFields = typeAlias.fields.map(({ name, elmType }) => ({
                name: camelToSnake(name),
                camelName: name,
                type: elmTypeToSchemaFormat(elmType),
                elmType,
                isOptional: elmType.startsWith('Maybe ') || elmType.startsWith('Maybe('),
                isList: elmType.startsWith('List ') || elmType.startsWith('List(')
            }));

            return {
                name: typeAlias.name,
                fields: processedFields
            };
        });

    const mainType = types.find(t => t.name === modelName) || types[0];
    if (!mainType) return null;

    const storageKey = modelName
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .substring(1);

    return {
        name: modelName,
        moduleName,
        storageKey,
        eventName: storageKey,
        fields: mainType.fields,
        helperTypes: types.filter(t => t.name !== modelName),
        unionTypes: parsed.unionTypes, // Include union types!
        filename
    };
}

/**
 * Parse a generic Elm model directory
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

// Convenience functions for specific model types
export const parseElmKvDir = (kvDir) => parseElmModelDir(kvDir, 'Kv');
export const parseElmStorageDir = (storageDir) => parseElmModelDir(storageDir, 'Storage');
export const parseElmSseDir = (sseDir) => parseElmModelDir(sseDir, 'Sse');
export const parseElmEventsDir = (eventsDir) => parseElmModelDir(eventsDir, 'Events');
export const parseElmConfigDir = (configDir) => parseElmModelDir(configDir, 'Config');

// =============================================================================
// TEST EXPORTS
// =============================================================================

export const _test = {
    parseElmSource,
    parseTypeAliasDeclaration,
    parseTypeDeclaration,
    parseTypeExpression,
    extractRecordFields,
    findDescendantByType,
    elmTypeToSql,
    camelToSnake,
    typeNameToTableName,
    extractForeignKeyTable,
    unwrapApiAnnotations,
    parseApiModule,
    parseGenericModule,
    elmTypeToSchemaFormat
};

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
    parseElmSource,
    _test
};
