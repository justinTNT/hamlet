/**
 * Browser Storage Generation
 * Generates localStorage/sessionStorage APIs and Elm ports from storage models
 * ESSENTIAL for Hamlet's mission: "Enable direct Elm-to-localStorage communication"
 */

import fs from 'fs';
import path from 'path';

// Parse storage models from Rust file content
function parseStorageModels(content, filename) {
    const models = [];
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

// Generate JavaScript storage class for a model
function generateStorageClass(model) {
    const { name, storageKey } = model;
    const className = `${name}Storage`;
    
    return `
/**
 * Auto-generated browser storage for ${name}
 * Provides type-safe localStorage operations with Elm port integration
 */
export class ${className} {
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
port save${modelName} : ${modelName} -> Cmd msg
port load${modelName} : () -> Cmd msg  
port clear${modelName} : () -> Cmd msg
port ${varName}Loaded : (Maybe ${modelName} -> msg) -> Sub msg
port ${varName}Changed : (Maybe ${modelName} -> msg) -> Sub msg`.trim();
}

// Generate Elm helper module for a model
function generateElmHelper(model) {
    const { name } = model;
    const moduleName = `Storage.${name}`;
    const varName = name.toLowerCase();
    
    return `
module ${moduleName} exposing 
    ( save, load, clear, exists, update
    , onLoad, onChange
    )

{-| Auto-generated storage helpers for ${name}

# Storage Operations
@docs save, load, clear, exists, update

# Subscriptions  
@docs onLoad, onChange

-}

-- PORTS

port save${name} : ${name} -> Cmd msg
port load${name} : () -> Cmd msg
port clear${name} : () -> Cmd msg  
port ${varName}Loaded : (Maybe ${name} -> msg) -> Sub msg
port ${varName}Changed : (Maybe ${name} -> msg) -> Sub msg


-- API

{-| Save ${name} to localStorage
-}
save : ${name} -> Cmd msg
save ${varName} = save${name} ${varName}

{-| Load ${name} from localStorage  
-}
load : Cmd msg
load = load${name} ()

{-| Clear ${name} from localStorage
-}
clear : Cmd msg
clear = clear${name} ()

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
onLoad toMsg = ${varName}Loaded toMsg

{-| Subscribe to ${name} changes
-}
onChange : (Maybe ${name} -> msg) -> Sub msg
onChange toMsg = ${varName}Changed toMsg`.trim();
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
        app.ports.save${name}.subscribe(${className}.save);
    }
    
    if (app.ports.load${name}) {
        app.ports.load${name}.subscribe(() => {
            const data = ${className}.load();
            if (app.ports.${varName}Loaded) {
                app.ports.${varName}Loaded.send(data);
            }
        });
    }
    
    if (app.ports.clear${name}) {
        app.ports.clear${name}.subscribe(${className}.clear);
    }`;
    }).join('\n');
    
    return `
/**
 * Auto-generated Elm port integration for browser storage
 * Connects Elm ports to JavaScript storage classes
 * 
 * @param {Object} app - Elm app instance with ports
 */
export function connectStoragePorts(app) {
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
export function generateBrowserStorage() {
    const storageModelsPath = path.join(process.cwd(), 'src/models/storage');
    const outputPath = path.join(process.cwd(), 'generated');
    const elmOutputPath = path.join(process.cwd(), 'generated'); // Elm output directory
    
    if (!fs.existsSync(storageModelsPath)) {
        console.log('📁 No src/models/storage directory found, skipping browser storage generation');
        return;
    }
    
    // Ensure output directories exist
    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
    }
    if (!fs.existsSync(elmOutputPath)) {
        fs.mkdirSync(elmOutputPath, { recursive: true });
    }
    
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
${allModels.map(m => `    ${m.name}Storage`).join(',\n')}
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

port module Generated.StoragePorts exposing (..)

${allPorts}
`;
    
    const elmPortsFile = path.join(elmOutputPath, 'StoragePorts.elm');
    fs.writeFileSync(elmPortsFile, elmPortsContent);
    
    // Generate individual Elm helper modules
    for (const model of allModels) {
        const helperContent = generateElmHelper(model);
        const helperFile = path.join(elmOutputPath, `Storage${model.name}.elm`);
        fs.writeFileSync(helperFile, helperContent);
    }
    
    console.log(`✅ Generated browser storage APIs: ${jsOutputFile}`);
    console.log(`✅ Generated Elm ports: ${elmPortsFile}`);
    console.log(`✅ Generated ${allModels.length} Elm helper modules`);
    console.log(`📊 Generated ${allModels.length * 5} storage functions (5 per model)`);
    
    return {
        jsFile: jsOutputFile,
        elmPortsFile,
        elmHelperFiles: allModels.map(m => path.join(elmOutputPath, `Storage${m.name}.elm`))
    };
}