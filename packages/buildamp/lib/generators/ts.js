/**
 * TypeScript Definition Generator
 * Generates .d.ts files from Elm type definitions for type-safe Node.js servers
 */

import fs from 'fs';
import path from 'path';
import { getGenerationPaths, ensureOutputDir } from './shared-paths.js';
import {
    parseElmSchemaDir,
    parseElmApiDir,
    parseElmModelDir,
    parseElmSchemaDirFull
} from '../../core/elm-parser-ts.js';

// =============================================================================
// ELM TO TYPESCRIPT TYPE MAPPING
// =============================================================================

/**
 * Convert an Elm type to a TypeScript type
 */
function elmTypeToTs(elmType) {
    const type = elmType.trim();

    // Maybe a -> a | null
    if (type.startsWith('Maybe ')) {
        const inner = type.slice(6).trim();
        return `${elmTypeToTs(inner)} | null`;
    }
    if (type.startsWith('Maybe(') && type.endsWith(')')) {
        const inner = type.slice(6, -1).trim();
        return `${elmTypeToTs(inner)} | null`;
    }

    // List a -> Array<a>
    if (type.startsWith('List ')) {
        const inner = type.slice(5).trim();
        return `Array<${elmTypeToTs(inner)}>`;
    }
    if (type.startsWith('List(') && type.endsWith(')')) {
        const inner = type.slice(5, -1).trim();
        return `Array<${elmTypeToTs(inner)}>`;
    }

    // Dict k v -> Record<k, v>
    if (type.startsWith('Dict ')) {
        const parts = type.slice(5).trim().split(/\s+/);
        if (parts.length >= 2) {
            return `Record<${elmTypeToTs(parts[0])}, ${elmTypeToTs(parts.slice(1).join(' '))}>`;
        }
        return 'Record<string, unknown>';
    }

    // Basic types
    switch (type) {
        case 'String':
            return 'string';
        case 'Int':
        case 'Float':
            return 'number';
        case 'Bool':
            return 'boolean';
        case 'Json.Encode.Value':
        case 'Json.Decode.Value':
        case 'Value':
            return 'unknown';
        case '()':
            return 'void';
    }

    // Framework types (Schema)
    if (type.startsWith('DatabaseId')) {
        return 'string';
    }
    if (type === 'MultiTenant' || type === 'Host') {
        return 'string';
    }
    if (type === 'Timestamp' || type === 'CreateTimestamp' || type === 'UpdateTimestamp') {
        return 'number';
    }
    if (type === 'SoftDelete') {
        return 'number | null';
    }
    if (type === 'Link') {
        return 'string';
    }
    if (type === 'RichContent') {
        return 'object';
    }

    // ForeignKey Table Id -> string
    if (type.startsWith('ForeignKey ')) {
        return 'string';
    }

    // API annotation wrappers - unwrap to inner type
    if (type.startsWith('Inject ')) {
        return elmTypeToTs(type.slice(7).trim());
    }
    if (type.startsWith('Required ')) {
        return elmTypeToTs(type.slice(9).trim());
    }
    if (type.startsWith('Trim ')) {
        return elmTypeToTs(type.slice(5).trim());
    }


    // Handle parenthesized types
    if (type.startsWith('(') && type.endsWith(')')) {
        return elmTypeToTs(type.slice(1, -1).trim());
    }

    // Custom type reference - keep as-is (will be defined elsewhere)
    return type;
}

// =============================================================================
// INTERFACE GENERATION
// =============================================================================

/**
 * Generate TypeScript interface from a record type
 */
function generateInterface(record) {
    const fields = record.fields.map(field => {
        const camelName = field.camelName || snakeToCamel(field.name);
        const elmType = field.elmType || field.rustType || 'String';
        const tsType = elmTypeToTs(elmType);
        const isOptional = elmType.startsWith('Maybe ') || elmType.startsWith('Maybe(');

        return `    ${camelName}${isOptional ? '?' : ''}: ${tsType.replace(' | null', '')};`;
    }).join('\n');

    return `export interface ${record.name} {\n${fields}\n}`;
}

/**
 * Generate TypeScript union type from Elm union type
 */
function generateUnionType(unionType) {
    if (unionType.variants.length === 0) {
        return `export type ${unionType.name} = never;`;
    }

    // Check if this is a simple enum (all variants have no arguments)
    const isSimpleEnum = unionType.variants.every(v => v.args.length === 0);

    if (isSimpleEnum) {
        // Generate string literal union
        const variants = unionType.variants.map(v => `'${v.name}'`).join(' | ');
        return `export type ${unionType.name} = ${variants};`;
    }

    // Generate discriminated union
    const variants = unionType.variants.map(variant => {
        if (variant.args.length === 0) {
            return `    | { type: '${variant.name}' }`;
        } else if (variant.args.length === 1) {
            const argType = elmTypeToTs(variant.args[0]);
            return `    | { type: '${variant.name}'; value: ${argType} }`;
        } else {
            const argTypes = variant.args.map((arg, i) => `value${i}: ${elmTypeToTs(arg)}`).join('; ');
            return `    | { type: '${variant.name}'; ${argTypes} }`;
        }
    }).join('\n');

    return `export type ${unionType.name} =\n${variants};`;
}

/**
 * Convert snake_case to camelCase
 */
function snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// =============================================================================
// FILE GENERATION
// =============================================================================

/**
 * Generate TypeScript definitions for schema models
 */
function generateSchemaTypes(schemaDir) {
    const { records, unionTypes } = parseElmSchemaDirFull(schemaDir);

    const interfaces = records.map(generateInterface);
    const unions = unionTypes.map(generateUnionType);

    return {
        interfaces,
        unions,
        count: records.length + unionTypes.length
    };
}

/**
 * Generate TypeScript definitions for API models
 */
function generateApiTypes(apiDir) {
    const apis = parseElmApiDir(apiDir);
    const interfaces = [];
    const unions = [];

    for (const api of apis) {
        // Request type
        if (api.request) {
            const reqInterface = generateInterface({
                name: `${api.name}Request`,
                fields: api.request.fields
            });
            interfaces.push(reqInterface);
        }

        // Response type
        if (api.response) {
            const resInterface = generateInterface({
                name: `${api.name}Response`,
                fields: api.response.fields
            });
            interfaces.push(resInterface);
        }

        // ServerContext type
        if (api.serverContext) {
            const ctxInterface = generateInterface({
                name: `${api.name}ServerContext`,
                fields: api.serverContext.fields
            });
            interfaces.push(ctxInterface);
        }

        // Helper types
        for (const helper of api.helperTypes) {
            const helperInterface = generateInterface(helper);
            interfaces.push(helperInterface);
        }

        // Union types
        if (api.unionTypes) {
            for (const unionType of api.unionTypes) {
                unions.push(generateUnionType(unionType));
            }
        }
    }

    return {
        interfaces,
        unions,
        count: interfaces.length + unions.length
    };
}

/**
 * Generate TypeScript definitions for generic model directories (Kv, Storage, Sse, Events)
 */
function generateModelTypes(modelDir, prefix) {
    const models = parseElmModelDir(modelDir, prefix);
    const interfaces = [];
    const unions = [];

    for (const model of models) {
        const mainInterface = generateInterface({
            name: model.name,
            fields: model.fields
        });
        interfaces.push(mainInterface);

        // Helper types
        for (const helper of model.helperTypes || []) {
            const helperInterface = generateInterface(helper);
            interfaces.push(helperInterface);
        }

        // Union types
        if (model.unionTypes) {
            for (const unionType of model.unionTypes) {
                unions.push(generateUnionType(unionType));
            }
        }
    }

    return {
        interfaces,
        unions,
        count: interfaces.length + unions.length
    };
}

// =============================================================================
// MAIN GENERATOR
// =============================================================================

/**
 * Generate TypeScript definitions from all Elm models
 */
export function generateTypeScriptDefinitions(config = {}) {
    console.log('🔷 Generating TypeScript definitions...');

    const paths = getGenerationPaths(config);
    const allInterfaces = [];
    const allUnions = [];
    let totalCount = 0;

    // Schema types
    if (fs.existsSync(paths.elmSchemaDir)) {
        const schema = generateSchemaTypes(paths.elmSchemaDir);
        allInterfaces.push(...schema.interfaces);
        allUnions.push(...schema.unions);
        totalCount += schema.count;
        console.log(`  📦 Schema: ${schema.count} types`);
    }

    // API types
    if (fs.existsSync(paths.elmApiDir)) {
        const api = generateApiTypes(paths.elmApiDir);
        allInterfaces.push(...api.interfaces);
        allUnions.push(...api.unions);
        totalCount += api.count;
        console.log(`  📦 API: ${api.count} types`);
    }

    // KV types
    if (fs.existsSync(paths.elmKvDir)) {
        const kv = generateModelTypes(paths.elmKvDir, 'Kv');
        allInterfaces.push(...kv.interfaces);
        allUnions.push(...kv.unions);
        totalCount += kv.count;
        console.log(`  📦 KV: ${kv.count} types`);
    }

    // Storage types
    if (fs.existsSync(paths.elmStorageDir)) {
        const storage = generateModelTypes(paths.elmStorageDir, 'Storage');
        allInterfaces.push(...storage.interfaces);
        allUnions.push(...storage.unions);
        totalCount += storage.count;
        console.log(`  📦 Storage: ${storage.count} types`);
    }

    // SSE types
    if (fs.existsSync(paths.elmSseDir)) {
        const sse = generateModelTypes(paths.elmSseDir, 'Sse');
        allInterfaces.push(...sse.interfaces);
        allUnions.push(...sse.unions);
        totalCount += sse.count;
        console.log(`  📦 SSE: ${sse.count} types`);
    }

    // Events types
    if (fs.existsSync(paths.elmEventsDir)) {
        const events = generateModelTypes(paths.elmEventsDir, 'Events');
        allInterfaces.push(...events.interfaces);
        allUnions.push(...events.unions);
        totalCount += events.count;
        console.log(`  📦 Events: ${events.count} types`);
    }

    if (totalCount === 0) {
        console.log('  ⚠️  No Elm models found, skipping TypeScript generation');
        return { count: 0 };
    }

    // Combine all types
    const content = `/**
 * Auto-Generated TypeScript Definitions
 * Generated from Elm models by BuildAmp
 *
 * DO NOT EDIT - Changes will be overwritten
 */

// =============================================================================
// UNION TYPES
// =============================================================================

${allUnions.join('\n\n')}

// =============================================================================
// INTERFACES
// =============================================================================

${allInterfaces.join('\n\n')}
`;

    // Write to server's generated directory
    const outputDir = ensureOutputDir(paths.serverGlueDir);
    const outputFile = path.join(outputDir, 'elm-types.d.ts');

    fs.writeFileSync(outputFile, content);

    console.log(`✅ Generated ${totalCount} TypeScript types`);
    console.log(`📁 Output: ${outputFile}`);

    return {
        count: totalCount,
        outputFile,
        interfaces: allInterfaces.length,
        unions: allUnions.length
    };
}

// =============================================================================
// TEST EXPORTS
// =============================================================================

export const _test = {
    elmTypeToTs,
    generateInterface,
    generateUnionType,
    snakeToCamel
};

export default { generateTypeScriptDefinitions, _test };
