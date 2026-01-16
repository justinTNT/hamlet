/**
 * Browser Storage Generation
 * Generates localStorage/sessionStorage APIs and Elm ports from storage models
 * ESSENTIAL for Hamlet's mission: "Enable direct Elm-to-localStorage communication"
 */

import fs from 'fs';
import path from 'path';
import { getGenerationPaths, modelsExist, getModelsFullPath, ensureOutputDir } from './shared-paths.js';

// Parse storage models from Rust file content
function parseStorageModels(content, filename) {
    const models = [];
    const structRegex = /pub struct\s+(\w+)\s*{([^}]+)}/g;
    let match;
    
    while ((match = structRegex.exec(content)) !== null) {
        const [, structName, fieldsContent] = match;
        
        // Skip helper/partial structs that are used within other structs
        // Only generate storage APIs for top-level storage models
        if (isHelperStruct(structName, filename)) {
            continue;
        }
        
        // Parse fields
        const fields = [];
        const fieldRegex = /pub\s+(\w+):\s*([^,\n]+)/g;
        let fieldMatch;
        
        while ((fieldMatch = fieldRegex.exec(fieldsContent)) !== null) {
            const [, fieldName, fieldType] = fieldMatch;
            fields.push({
                name: fieldName,
                type: fieldType.trim().replace(',', ''),
                isOptional: fieldType.includes('Option<')
            });
        }
        
        // Convert CamelCase to kebab-case for localStorage keys
        const storageKey = structName
            .replace(/([A-Z])/g, '_$1')
            .toLowerCase()
            .substring(1);
        
        models.push({
            name: structName,
            storageKey,
            fields,
            filename
        });
    }
    
    return models;
}

// Check if a struct is a helper/partial struct based on file naming convention
function isHelperStruct(structName, filename) {
    // Convert snake_case filename to PascalCase expected struct name (same logic as elm_shared_modules.js)
    const fileBase = filename.replace('.rs', '');
    const expectedMainStruct = fileBase.includes('_') 
        ? fileBase.split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('')
        : fileBase.charAt(0).toUpperCase() + fileBase.slice(1);
    return structName !== expectedMainStruct;
}

// Generate JavaScript storage class for a model
function generateStorageClass(model) {
    const { name, storageKey } = model;
    const className = `${name}Storage`;
    
    return `
/**
 * Auto-generated browser storage for ${name}
 * Provides type-safe localStorage operations with Elm port integration
 */
class ${className} {
    static storageKey = '${storageKey}';
    
    /**
     * Save ${name} to localStorage and notify Elm
     * @param {Object} ${name.toLowerCase()} - ${name} data to save
     */
    static save(${name.toLowerCase()}) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(${name.toLowerCase()}));
            
            // Notify Elm of the change (if ports are available)
            if (typeof app !== 'undefined' && app.ports && app.ports.${name.toLowerCase()}Changed) {
                app.ports.${name.toLowerCase()}Changed.send(${name.toLowerCase()});
            }
            
            return true;
        } catch (error) {
            console.error('Error saving ${name}:', error);
            return false;
        }
    }
    
    /**
     * Load ${name} from localStorage
     * @returns {Object|null} ${name} data or null if not found
     */
    static load() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error loading ${name}:', error);
            return null;
        }
    }
    
    /**
     * Clear ${name} from localStorage and notify Elm
     */
    static clear() {
        try {
            localStorage.removeItem(this.storageKey);
            
            // Notify Elm of the change (if ports are available)
            if (typeof app !== 'undefined' && app.ports && app.ports.${name.toLowerCase()}Changed) {
                app.ports.${name.toLowerCase()}Changed.send(null);
            }
            
            return true;
        } catch (error) {
            console.error('Error clearing ${name}:', error);
            return false;
        }
    }
    
    /**
     * Check if ${name} exists in localStorage
     * @returns {boolean} True if data exists
     */
    static exists() {
        return localStorage.getItem(this.storageKey) !== null;
    }
    
    /**
     * Update specific fields in stored ${name}
     * @param {Object} updates - Fields to update
     */
    static update(updates) {
        const current = this.load();
        if (current) {
            const updated = { ...current, ...updates };
            return this.save(updated);
        }
        return false;
    }
}`.trim();
}

// Generate Elm ports for a model
function generateElmPorts(model) {
    const { name } = model;
    const modelName = name;
    const varName = name.toLowerCase();
    
    return `
-- Auto-generated Elm ports for ${name}
port save${modelName} : Json.Encode.Value -> Cmd msg
port load${modelName} : () -> Cmd msg  
port clear${modelName} : () -> Cmd msg
port ${varName}Loaded : (Json.Decode.Value -> msg) -> Sub msg
port ${varName}Changed : (Json.Decode.Value -> msg) -> Sub msg`.trim();
}

// Generate clean Storage.elm wrapper that re-exports storage functions
function generateStorageWrapper(models) {
    const imports = models.map(model => 
        `import Generated.Storage.${model.name} exposing (${model.name})`
    ).join('\n');
    
    const importedFunctions = models.map(model => 
        `import Generated.Storage.${model.name} as ${model.name}Storage`
    ).join('\n');
    
    const functions = models.map(model => {
        const lowerName = model.name.toLowerCase();
        return `-- ${model.name.toUpperCase()} STORAGE

{-| Load ${model.name} from localStorage
-}
load${model.name} : Cmd msg
load${model.name} =
    ${model.name}Storage.load

{-| Save ${model.name} to localStorage  
-}
save${model.name} : ${model.name} -> Cmd msg
save${model.name} ${lowerName} =
    ${model.name}Storage.save ${lowerName}

{-| Subscribe to ${model.name} load results
-}
on${model.name}Loaded : (Maybe ${model.name} -> msg) -> Sub msg
on${model.name}Loaded toMsg =
    ${model.name}Storage.onLoad toMsg`;
    }).join('\n\n');
    
    const exposedFunctions = models.map(model => 
        `load${model.name}, save${model.name}, on${model.name}Loaded`
    ).join('\n    , ');
    
    const exposedTypes = models.map(model => model.name).join(', ');
    
    return `module Storage exposing
    ( ${exposedTypes}
    , ${exposedFunctions}
    )

{-| Clean Storage API for Elm developers

Generated from storage models in app/*/models/storage/
This provides a clean interface hiding Generated.* implementation details.

${models.map(model => `# ${model.name}\n@docs ${model.name}, load${model.name}, save${model.name}, on${model.name}Loaded`).join('\n\n')}

-}

${imports}
${importedFunctions}


-- STORAGE FUNCTIONS

${functions}
`;
}

// Generate Elm helper module for a model
function generateElmHelper(model) {
    const { name } = model;
    const moduleName = `Generated.Storage.${name}`;
    const varName = name.toLowerCase();
    
    const fields = model.fields.map(field => {
        const elmType = field.type.replace('String', 'String')
                                .replace('u64', 'Int')
                                .replace('bool', 'Bool');
        return `${field.name} : ${elmType}`;
    }).join('\n    , ');

    // Generate JSON encoder
    const encoderFields = model.fields.map(field => {
        const elmType = field.type;
        if (elmType === 'String') {
            return `        ("${field.name}", Json.Encode.string ${varName}.${field.name})`;
        } else if (elmType === 'u64' || elmType === 'Int') {
            return `        ("${field.name}", Json.Encode.int ${varName}.${field.name})`;
        } else if (elmType === 'bool' || elmType === 'Bool') {
            return `        ("${field.name}", Json.Encode.bool ${varName}.${field.name})`;
        }
        return `        ("${field.name}", Json.Encode.string ${varName}.${field.name})`;
    }).join('\n        , ');

    // Generate JSON decoder
    const decoderFields = model.fields.map(field => {
        const elmType = field.type;
        let decoder = 'Json.Decode.string';
        if (elmType === 'u64' || elmType === 'Int') {
            decoder = 'Json.Decode.int';
        } else if (elmType === 'bool' || elmType === 'Bool') {
            decoder = 'Json.Decode.bool';
        }
        return `(Json.Decode.field "${field.name}" ${decoder})`;
    }).join('\n        ');

    return `
module ${moduleName} exposing 
    ( ${name}, save, load, clear, exists, update
    , onLoad, onChange
    , encode${name}, decode${name}
    )

{-| Auto-generated storage helpers for ${name}

# Types
@docs ${name}

# Storage Operations
@docs save, load, clear, exists, update

# Subscriptions  
@docs onLoad, onChange

# JSON Helpers
@docs encode${name}, decode${name}

-}

import Json.Decode
import Json.Encode
import StoragePorts


-- TYPES

{-| ${name} type for storage operations
-}
type alias ${name} =
    { ${fields}
    }


-- JSON ENCODING/DECODING

{-| Encode ${name} to JSON
-}
encode${name} : ${name} -> Json.Encode.Value
encode${name} ${varName} =
    Json.Encode.object
        [ ${encoderFields}
        ]

{-| Decode ${name} from JSON
-}
decode${name} : Json.Decode.Decoder ${name}
decode${name} =
    Json.Decode.map${model.fields.length} ${name}
        ${decoderFields}


-- API

{-| Save ${name} to localStorage
-}
save : ${name} -> Cmd msg
save ${varName} = 
    StoragePorts.save${name} (encode${name} ${varName})

{-| Load ${name} from localStorage  
-}
load : Cmd msg
load = 
    StoragePorts.load${name} ()

{-| Clear ${name} from localStorage
-}
clear : Cmd msg
clear = 
    StoragePorts.clear${name} ()

{-| Check if ${name} exists (you'll need to implement this via load + subscription)
-}
exists : Cmd msg
exists = load

{-| Update specific fields in stored ${name}
Note: You'll need to load, modify, then save
-}
update : (${name} -> ${name}) -> Cmd msg  
update updateFn =
    -- This would need to be implemented with a subscription pattern
    -- For now, caller should load, update, and save manually
    load

{-| Subscribe to ${name} load results
-}
onLoad : (Maybe ${name} -> msg) -> Sub msg
onLoad toMsg = 
    StoragePorts.${varName}Loaded (\\value ->
        case Json.Decode.decodeValue (Json.Decode.nullable decode${name}) value of
            Ok maybeData -> toMsg maybeData
            Err _ -> toMsg Nothing
    )

{-| Subscribe to ${name} changes
-}
onChange : (Maybe ${name} -> msg) -> Sub msg
onChange toMsg = 
    StoragePorts.${varName}Changed (\\value ->
        case Json.Decode.decodeValue (Json.Decode.nullable decode${name}) value of
            Ok maybeData -> toMsg maybeData
            Err _ -> toMsg Nothing
    )`.trim();
}

// Generate port integration JavaScript
function generatePortIntegration(allModels) {
    const portBindings = allModels.map(model => {
        const { name } = model;
        const className = `${name}Storage`;
        const varName = name.toLowerCase();
        
        return `
    // ${name} port bindings
    if (app.ports.save${name}) {
        app.ports.save${name}.subscribe((jsonData) => {
            // jsonData is already a JavaScript object from Elm's Json.Encode.Value
            ${className}.save(jsonData);
        });
    }
    
    if (app.ports.load${name}) {
        app.ports.load${name}.subscribe(() => {
            const data = ${className}.load();
            if (app.ports.${varName}Loaded) {
                // Send the raw JavaScript object/null - Elm will decode it
                app.ports.${varName}Loaded.send(data);
            }
        });
    }
    
    if (app.ports.clear${name}) {
        app.ports.clear${name}.subscribe(() => {
            ${className}.clear();
        });
    }`;
    }).join('\n');
    
    return `
/**
 * Auto-generated Elm port integration for browser storage
 * Connects Elm ports to JavaScript storage classes
 * 
 * @param {Object} app - Elm app instance with ports
 */
function connectStoragePorts(app) {
    if (!app || !app.ports) {
        console.warn('Elm app or ports not available for storage integration');
        return;
    }
    
    console.log('🔌 Connecting auto-generated storage ports...');
    
    ${portBindings}
    
    console.log('✅ Storage ports connected successfully');
}`.trim();
}

// Generate all browser storage APIs
export function generateBrowserStorage(config = {}) {
    // Use shared path discovery
    const paths = getGenerationPaths(config);
    
    // Check if storage models exist
    if (!modelsExist('storage', paths)) {
        console.log(`📁 No storage models directory found at ${paths.storageModelsDir}, skipping browser storage generation`);
        return;
    }
    
    const storageModelsPath = getModelsFullPath('storage', paths);
    // Browser storage JS should go with client code, not server
    const outputPath = ensureOutputDir(paths.elmOutputPath);
    const elmOutputPath = ensureOutputDir(paths.elmOutputPath);
    
    const allModels = [];
    
    // Read all .rs files in src/models/storage
    const files = fs.readdirSync(storageModelsPath).filter(file => file.endsWith('.rs') && file !== 'mod.rs');
    
    for (const file of files) {
        const filePath = path.join(storageModelsPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const models = parseStorageModels(content, file);
        allModels.push(...models);
    }
    
    console.log(`🔍 Found ${allModels.length} storage models: ${allModels.map(m => m.name).join(', ')}`);
    
    // Generate JavaScript storage classes
    const allClasses = allModels.map(generateStorageClass).join('\n\n');
    const portIntegration = generatePortIntegration(allModels);
    
    const jsContent = `/**
 * Auto-Generated Browser Storage APIs
 * Generated from models in src/models/storage/
 * 
 * ⚠️  DO NOT EDIT THIS FILE MANUALLY
 * ⚠️  Changes will be overwritten during next generation
 * 
 * ESSENTIAL: This enables direct Elm-to-localStorage communication
 * Core to Hamlet's mission of eliminating manual JavaScript interfaces
 */

${allClasses}

${portIntegration}

// Export all storage classes
export {
${allModels.map(m => `    ${m.name}Storage`).join(',\n')},
    connectStoragePorts
};
`;
    
    // Write JavaScript file
    const jsOutputFile = path.join(outputPath, 'browser-storage.js');
    fs.writeFileSync(jsOutputFile, jsContent);
    
    // Generate Elm ports file
    const allPorts = allModels.map(generateElmPorts).join('\n\n');
    const elmPortsContent = `-- Auto-Generated Elm Ports for Browser Storage
-- Generated from models in src/models/storage/
-- 
-- ⚠️  DO NOT EDIT THIS FILE MANUALLY
-- ⚠️  Changes will be overwritten during next generation

port module StoragePorts exposing (..)

import Json.Encode
import Json.Decode

${allPorts}
`;
    
    const elmPortsFile = path.join(elmOutputPath, 'StoragePorts.elm');
    fs.writeFileSync(elmPortsFile, elmPortsContent);
    
    // Generate individual Elm helper modules with proper directory structure
    for (const model of allModels) {
        const helperContent = generateElmHelper(model);
        const helperDir = path.join(elmOutputPath, 'Generated', 'Storage');
        const helperFile = path.join(helperDir, `${model.name}.elm`);
        
        // Ensure directory exists
        if (!fs.existsSync(helperDir)) {
            fs.mkdirSync(helperDir, { recursive: true });
        }
        
        fs.writeFileSync(helperFile, helperContent);
    }
    
    // Generate clean Storage.elm wrapper
    if (config.elmApiPath) {
        const storageWrapperContent = generateStorageWrapper(allModels);
        const storageWrapperFile = path.join(config.elmApiPath, 'Storage.elm');
        
        // Ensure directory exists
        if (!fs.existsSync(config.elmApiPath)) {
            fs.mkdirSync(config.elmApiPath, { recursive: true });
        }
        
        fs.writeFileSync(storageWrapperFile, storageWrapperContent);
        console.log(`✅ Generated clean Storage.elm wrapper: ${storageWrapperFile}`);
    }
    
    console.log(`✅ Generated browser storage APIs: ${jsOutputFile}`);
    console.log(`✅ Generated Elm ports: ${elmPortsFile}`);
    console.log(`✅ Generated ${allModels.length} Elm helper modules`);
    console.log(`📊 Generated ${allModels.length * 5} storage functions (5 per model)`);
    
    return {
        models: allModels.length,
        classes: allModels.length,
        elmModules: allModels.length,
        jsOutputFile,
        elmPortsFile,
        elmOutputFiles: allModels.map(m => path.join(elmOutputPath, `Storage${m.name}.elm`))
    };
}