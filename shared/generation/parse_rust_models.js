/**
 * Rust Model Parsing Utilities
 * Shared parsing functions for all generation scripts
 */

import fs from 'fs';
import path from 'path';

/**
 * Parse database models from Rust files
 */
export function parseRustDbModels(dbModelsPath) {
    const allStructs = [];
    
    if (!fs.existsSync(dbModelsPath)) {
        return allStructs;
    }
    
    const files = fs.readdirSync(dbModelsPath).filter(file => file.endsWith('.rs') && file !== 'mod.rs');
    
    for (const file of files) {
        const filePath = path.join(dbModelsPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const structs = parseRustStruct(content, file);
        allStructs.push(...structs);
    }
    
    return allStructs;
}

/**
 * Parse API models from Rust files
 */
export function parseRustApiModels(apiModelsPath) {
    const routes = [];
    
    if (!fs.existsSync(apiModelsPath)) {
        return routes;
    }
    
    const files = fs.readdirSync(apiModelsPath).filter(file => file.endsWith('.rs') && file !== 'mod.rs');
    
    for (const file of files) {
        const filePath = path.join(apiModelsPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const fileRoutes = parseApiRoutes(content, file);
        routes.push(...fileRoutes);
    }
    
    return routes;
}

/**
 * Parse KV models from Rust files
 */
export function parseRustKvModels(kvModelsPath) {
    const allStructs = [];
    
    if (!fs.existsSync(kvModelsPath)) {
        return allStructs;
    }
    
    const files = fs.readdirSync(kvModelsPath).filter(file => file.endsWith('.rs') && file !== 'mod.rs');
    
    for (const file of files) {
        const filePath = path.join(kvModelsPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const structs = parseKvStruct(content, file);
        allStructs.push(...structs);
    }
    
    return allStructs;
}

/**
 * Parse a Rust struct from file content
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
            fields.push({
                name: fieldName,
                type: fieldType.trim(),
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

/**
 * Parse API routes from content
 */
function parseApiRoutes(content, filename) {
    const routes = [];
    const routeRegex = /#\[derive\([^)]*ApiRoute[^)]*\)\]\s*pub struct\s+(\w+)\s*{([^}]+)}/g;
    const enumRegex = /#\[derive\([^)]*ApiRoute[^)]*\)\]\s*pub enum\s+(\w+)\s*{([^}]+)}/g;
    
    let match;
    
    // Parse struct routes
    while ((match = routeRegex.exec(content)) !== null) {
        const [fullMatch, routeName, fieldsContent] = match;
        const route = parseRouteFromMatch(fullMatch, routeName, fieldsContent, 'struct');
        if (route) routes.push(route);
    }
    
    // Parse enum routes
    while ((match = enumRegex.exec(content)) !== null) {
        const [fullMatch, routeName, variantsContent] = match;
        const route = parseRouteFromMatch(fullMatch, routeName, variantsContent, 'enum');
        if (route) routes.push(route);
    }
    
    return routes;
}

/**
 * Parse route details from regex match
 */
function parseRouteFromMatch(fullMatch, routeName, content, type) {
    // Extract route metadata from attributes
    const pathMatch = /#\[route\(path\s*=\s*"([^"]+)"\)\]/.exec(fullMatch);
    const methodMatch = /#\[route\(method\s*=\s*"(\w+)"\)\]/.exec(fullMatch);
    
    const path = pathMatch ? pathMatch[1] : `/${routeName.toLowerCase()}`;
    const method = methodMatch ? methodMatch[1].toUpperCase() : 'GET';
    
    return {
        name: routeName,
        path,
        method,
        type,
        content
    };
}

/**
 * Parse KV struct from file content
 */
function parseKvStruct(content, filename) {
    const structs = [];
    const structRegex = /#\[derive\([^)]*KvStore[^)]*\)\]\s*pub struct\s+(\w+)\s*{([^}]+)}/g;
    let match;
    
    while ((match = structRegex.exec(content)) !== null) {
        const [fullMatch, structName, fieldsContent] = match;
        
        // Parse fields
        const fields = [];
        const fieldRegex = /pub\s+(\w+):\s*([^,\n]+)/g;
        let fieldMatch;
        
        while ((fieldMatch = fieldRegex.exec(fieldsContent)) !== null) {
            const [, fieldName, fieldType] = fieldMatch;
            fields.push({
                name: fieldName,
                type: fieldType.trim()
            });
        }
        
        // Extract TTL if specified
        const ttlMatch = /#\[kv\(ttl\s*=\s*(\d+)\)\]/.exec(fullMatch);
        const ttl = ttlMatch ? parseInt(ttlMatch[1]) : null;
        
        structs.push({
            name: structName,
            fields,
            ttl,
            filename
        });
    }
    
    return structs;
}

/**
 * Convert Rust type to JavaScript type
 */
export function rustTypeToJs(rustType) {
    const typeMap = {
        'String': 'string',
        '&str': 'string',
        'i32': 'number',
        'i64': 'number',
        'u32': 'number',
        'u64': 'number',
        'f32': 'number',
        'f64': 'number',
        'bool': 'boolean',
        'Vec<': 'Array<',
        'Option<': '?',
        'DatabaseId': 'number',
        'Timestamp': 'Date'
    };
    
    let jsType = rustType;
    
    for (const [rust, js] of Object.entries(typeMap)) {
        if (rustType.includes(rust)) {
            jsType = jsType.replace(rust, js);
        }
    }
    
    return jsType;
}

/**
 * Convert Rust type to Elm type
 */
export function rustTypeToElm(rustType) {
    const typeMap = {
        'String': 'String',
        '&str': 'String',
        'i32': 'Int',
        'i64': 'Int',
        'u32': 'Int',
        'u64': 'Int',
        'f32': 'Float',
        'f64': 'Float',
        'bool': 'Bool',
        'Vec<': 'List ',
        'Option<': 'Maybe ',
        'DatabaseId': 'Int',
        'Timestamp': 'Time.Posix'
    };
    
    let elmType = rustType;
    
    for (const [rust, elm] of Object.entries(typeMap)) {
        if (rustType.includes(rust)) {
            elmType = elmType.replace(rust, elm);
        }
    }
    
    // Clean up angle brackets for Elm
    elmType = elmType.replace(/</g, ' ').replace(/>/g, '');
    
    return elmType;
}