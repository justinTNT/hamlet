/**
 * Elm Service Middleware - Auto-generated
 * 
 * Executes compiled Elm handler functions for business logic.
 * This is where the "Rust once, JSON never" magic happens - 
 * Rust defines the API, Elm implements the business logic.
 */

import path from 'path';
import fs from 'fs';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function createElmService(server) {
    console.log('🌳 Setting up Elm service with individual handlers');
    
    const handlers = new Map();
    const require = createRequire(import.meta.url);
    
    // Load compiled Elm handlers
    try {
        const handlersPath = path.join(__dirname, '../../../app/horatio/server');
        
        // Auto-generated handler configurations
        const handlerConfigs = [
            { name: 'SubmitComment', file: 'SubmitCommentHandler', function: 'handleSubmitComment' },
            { name: 'GetFeed', file: 'GetFeedHandler', function: 'handleGetFeed' },
            { name: 'SubmitItem', file: 'SubmitItemHandler', function: 'handleSubmitItem' },
            { name: 'GetTags', file: 'GetTagsHandler', function: 'handleGetTags' }
        ];
        
        for (const config of handlerConfigs) {
            try {
                const handlerPath = path.join(handlersPath, `${config.file}.js`);
                
                // Load the compiled handler module
                delete require.cache[require.resolve(handlerPath)];
                
                // Create a VM context with the scope we want
                const elmScope = { console, setTimeout, clearTimeout };
                const context = vm.createContext(elmScope);
                
                // Read and execute the Elm code in our context
                const elmCode = fs.readFileSync(handlerPath, 'utf8');
                vm.runInContext(elmCode, context);
                
                // Access the Elm app from our context
                if (elmScope.Elm && elmScope.Elm.Api && elmScope.Elm.Api.Handlers && elmScope.Elm.Api.Handlers[config.file]) {
                    const elmApp = elmScope.Elm.Api.Handlers[config.file].init();
                    
                    // Store the handler app
                    handlers.set(config.name, {
                        ...config,
                        app: elmApp
                    });
                } else {
                    throw new Error(`Could not access Elm.Api.Handlers.${config.file} from global scope`);
                }
                
                console.log(`✅ Loaded handler: ${config.name}`);
            } catch (error) {
                console.log(`⚠️  Handler ${config.name} not found: ${error.message}`);
                // Handler will use fallback
            }
        }
        
        console.log(`🎯 Ready with ${handlers.size} Elm handlers`);
        
    } catch (error) {
        console.error('❌ Failed to load Elm handlers:', error.message);
        return createFallbackService(server);
    }

    const elmService = {
        /**
         * Call an individual Elm handler
         */
        async callHandler(handlerName, requestData, context = {}) {
            const handlerConfig = handlers.get(handlerName);
            
            if (!handlerConfig || !handlerConfig.app) {
                throw new Error(`Handler ${handlerName} not available`);
            }
            
            // For GetFeed, query database directly for now (temporary until async Tasks)
            if (handlerName === 'GetFeed') {
                return await this.getGetFeedData(requestData, context);
            }
            
            return new Promise((resolve, reject) => {
                const elmApp = handlerConfig.app;
                
                // Set up response handler
                if (elmApp.ports && elmApp.ports.result) {
                    let cleanup = null;
                    
                    cleanup = elmApp.ports.result.subscribe((result) => {
                        if (cleanup) cleanup();
                        
                        try {
                            const parsed = typeof result === 'string' ? JSON.parse(result) : result;
                            console.log(`🌳 ${handlerName} handler completed successfully`);
                            resolve(parsed);
                        } catch (parseError) {
                            console.error(`❌ ${handlerName} handler response parse error:`, parseError);
                            reject(parseError);
                        }
                    });
                    
                    // Send request to Elm as proper bundle format with database service
                    if (elmApp.ports && elmApp.ports.process) {
                        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        
                        // Create FUCK database service implementation
                        const dbService = server.getService('database');
                        const databaseService = {
                            find: async (sql, params) => {
                                try {
                                    const result = await dbService.query(sql, params);
                                    return result.rows;
                                } catch (error) {
                                    throw error.message;
                                }
                            },
                            create: async (table, data) => {
                                try {
                                    const fields = Object.keys(data);
                                    const values = Object.values(data);
                                    const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
                                    const sql = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`;
                                    const result = await dbService.query(sql, values);
                                    return result.rows[0];
                                } catch (error) {
                                    throw error.message;
                                }
                            },
                            update: async (table, data, whereClause, whereParams) => {
                                try {
                                    const fields = Object.keys(data);
                                    const values = Object.values(data);
                                    const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
                                    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING *`;
                                    const result = await dbService.query(sql, [...values, ...whereParams]);
                                    return result.rows[0];
                                } catch (error) {
                                    throw error.message;
                                }
                            },
                            kill: async (table, whereClause, whereParams) => {
                                try {
                                    const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
                                    const result = await dbService.query(sql, whereParams);
                                    return result.rowCount;
                                } catch (error) {
                                    throw error.message;
                                }
                            }
                        };
                        
                        const bundle = {
                            context: {
                                request_id: requestId,
                                host: context.host || 'localhost',
                                user_id: context.user_id || null,
                                session_id: context.session_id || null
                            },
                            input: requestData,
                            database: databaseService
                        };
                        
                        elmApp.ports.process.send(bundle);
                    } else {
                        if (cleanup) cleanup();
                        reject(new Error(`Handler ${handlerName} missing process port`));
                    }
                    
                    // Timeout after 5 seconds
                    setTimeout(() => {
                        if (cleanup) cleanup();
                        reject(new Error(`Handler ${handlerName} timed out`));
                    }, 5000);
                } else {
                    reject(new Error(`Handler ${handlerName} missing result port`));
                }
            });
        },
        
        cleanup: async () => {
            console.log('🧹 Cleaning up Elm service');
            handlers.clear();
        }
    };
    
    server.registerService('elm', elmService);
    return elmService;
}

/**
 * Fallback service when Elm handlers are not available
 */
function createFallbackService(server) {
    console.log('🔄 Creating fallback Elm service');
    
    const fallbackService = {
        async callHandler(handlerName, requestData) {
            throw new Error(`Elm service not available. Cannot call handler: ${handlerName}`);
        },
        
        cleanup: async () => console.log('🧹 Cleaning up fallback Elm service')
    };
    
    server.registerService('elm', fallbackService);
    return fallbackService;
}
