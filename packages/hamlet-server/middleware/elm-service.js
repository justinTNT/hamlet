/**
 * Elm Service Middleware - Auto-generated with TEA Handler Support
 * 
 * Executes compiled TEA-based Elm handler functions for business logic.
 * This is where the "Rust once, JSON never" magic happens - 
 * Rust defines the API, Elm implements the business logic using The Elm Architecture.
 */

import path from 'path';
import fs from 'fs';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Request context storage for correlating async operations
 */
const requestContexts = new Map();

function storeRequestContext(requestId, context) {
    requestContexts.set(requestId, context);
    // Cleanup after 30 seconds to prevent memory leaks
    setTimeout(() => requestContexts.delete(requestId), 30000);
}

function getCurrentRequestContext(requestId) {
    return requestContexts.get(requestId);
}

/**
 * Handler instance tracking for proper HMR lifecycle management
 */
class HandlerInstance {
    constructor(config, elmApp) {
        this.config = config;
        this.elmApp = elmApp;
        this.isActive = true;
        this.subscriptions = new Set();
        this.createdAt = Date.now();
        this.requestCount = 0;
    }
    
    addSubscription(unsubscribeFn) {
        this.subscriptions.add(unsubscribeFn);
    }
    
    async deactivate() {
        if (!this.isActive) return;
        
        console.log(`🔄 Deactivating handler instance: ${this.config.name} (created: ${new Date(this.createdAt).toISOString()})`);
        this.isActive = false;
        
        // Cleanup all port subscriptions
        for (const unsubscribe of this.subscriptions) {
            try {
                if (typeof unsubscribe === 'function') {
                    unsubscribe();
                }
            } catch (error) {
                console.warn(`⚠️  Error during subscription cleanup: ${error.message}`);
            }
        }
        this.subscriptions.clear();
        
        // Mark Elm app as inactive to prevent further port operations
        if (this.elmApp && this.elmApp.ports) {
            this.elmApp._hamlet_inactive = true;
        }
        
        console.log(`✅ Handler instance deactivated: ${this.config.name}`);
    }
    
    isStale() {
        // Consider instances older than 5 seconds stale during development
        return Date.now() - this.createdAt > 5000;
    }
}

export default async function createElmService(server) {
    console.log('🌳 Setting up Elm service with TEA Handler Support');
    
    const handlers = new Map(); // name -> HandlerInstance
    const require = createRequire(import.meta.url);
    
    // Cleanup any existing handlers before creating new ones
    async function cleanupExistingHandlers() {
        for (const [name, handlerInstance] of handlers.entries()) {
            await handlerInstance.deactivate();
            handlers.delete(name);
        }
    }
    
    // Load compiled Elm handlers
    async function initializeHandlers() {
        const handlersPath = path.join(__dirname, '../../../app/horatio/server');
        
        // Auto-discover TEA handler configurations
        const handlerConfigs = [];
        const handlersDir = path.join(handlersPath, 'src/Api/Handlers');
        
        if (fs.existsSync(handlersDir)) {
            const files = fs.readdirSync(handlersDir);
            const teaFiles = files.filter(file => file.endsWith('TEA.elm'));
            
            for (const teaFile of teaFiles) {
                const baseName = path.basename(teaFile, '.elm');
                const handlerName = baseName.replace('HandlerTEA', ''); // GetFeedHandlerTEA -> GetFeed
                handlerConfigs.push({ name: handlerName, file: baseName });
            }
        }
        
        // Cleanup existing handlers first (for HMR)
        await cleanupExistingHandlers();
        
        for (const config of handlerConfigs) {
            try {
                const handlerPath = path.join(handlersPath, `${config.file}.cjs`);
                
                if (fs.existsSync(handlerPath)) {
                    // Load the compiled handler module
                    delete require.cache[require.resolve(handlerPath)];
                    const handlerModule = require(handlerPath);
                    
                    // Access the Elm app from our context
                    if (handlerModule.Elm && handlerModule.Elm.Api && handlerModule.Elm.Api.Handlers && handlerModule.Elm.Api.Handlers[config.file]) {
                        // Initialize TEA handler with server-issued configuration
                        const serverNow = Date.now(); // Server-issued timestamp
                        const elmApp = handlerModule.Elm.Api.Handlers[config.file].init({
                            node: null, // No DOM node for server-side handlers
                            flags: {
                                globalConfig: {
                                    serverNow: serverNow,
                                    hostIsolation: true,
                                    environment: process.env.NODE_ENV || 'development'
                                },
                                globalState: {
                                    requestCount: 0,
                                    lastActivity: serverNow
                                }
                            }
                        });
                        
                        // Create handler instance with proper lifecycle management
                        const handlerInstance = new HandlerInstance(config, elmApp);
                        handlers.set(config.name, handlerInstance);
                        
                        console.log(`✅ Loaded TEA handler: ${config.name} (instance: ${handlerInstance.createdAt})`);
                    } else {
                        console.log(`⚠️  TEA handler ${config.name} structure not found`);
                    }
                } else {
                    console.log(`⚠️  TEA handler file not found: ${handlerPath}`);
                }
            } catch (error) {
                console.log(`⚠️  TEA handler ${config.name} failed to load: ${error.message}`);
            }
        }
        
        console.log(`🎯 Ready with ${handlers.size} TEA Elm handlers`);
    }
    
    // Initialize handlers
    try {
        await initializeHandlers();
    } catch (error) {
        console.error('❌ Failed to load Elm handlers:', error.message);
        return createFallbackService(server);
    }

    const elmService = {
        /**
         * Call a TEA-based Elm handler
         */
        async callHandler(handlerName, requestData, context = {}) {
            const handlerInstance = handlers.get(handlerName);
            
            if (!handlerInstance || !handlerInstance.elmApp) {
                throw new Error(`Handler ${handlerName} not available`);
            }
            
            if (!handlerInstance.isActive) {
                throw new Error(`Handler ${handlerName} instance is inactive`);
            }
            
            // Check if Elm app is marked as inactive (for HMR safety)
            if (handlerInstance.elmApp._hamlet_inactive) {
                throw new Error(`Handler ${handlerName} Elm app instance is inactive`);
            }
            
            // Increment request counter for this instance
            handlerInstance.requestCount++;
            
            return new Promise((resolve, reject) => {
                const elmApp = handlerInstance.elmApp;
                const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                let isResolved = false;
                
                // Set up TEA completion handler
                let unsubscribe = null;
                if (elmApp.ports && elmApp.ports.complete) {
                    unsubscribe = elmApp.ports.complete.subscribe((result) => {
                        if (isResolved) return;
                        isResolved = true;
                        if (unsubscribe) {
                            unsubscribe();
                            handlerInstance.subscriptions.delete(unsubscribe);
                        }
                        
                        try {
                            const parsed = typeof result === 'string' ? JSON.parse(result) : result;
                            console.log(`🌳 ${handlerName} TEA handler completed successfully`);
                            resolve(parsed);
                        } catch (parseError) {
                            console.error(`❌ ${handlerName} handler response parse error:`, parseError);
                            reject(parseError);
                        }
                    });
                    
                    // Track subscription for cleanup during HMR
                    handlerInstance.addSubscription(unsubscribe);
                    
                    // Store context for this handler instance
                    let currentHandlerContext = null;
                    
                    // Request correlation for database operations
                    const pendingDbRequests = new Map();
                    
                    // Set up database port handlers
                    if (elmApp.ports.dbFind) {
                        const dbFindUnsubscribe = elmApp.ports.dbFind.subscribe(async (request) => {
                            try {
                                const dbService = server.getService('database');
                                
                                // Use the current handler's context for host isolation
                                const host = currentHandlerContext?.host || 'localhost';
                                
                                // Translate Elm query builder to SQL
                                const { sql, params } = translateQueryToSQL(request.table, request.query, host);
                                console.log(`🔍 SQL Query for ${request.table}:`, { sql, params });
                                const result = await dbService.query(sql, params);
                                console.log(`📊 DB Result for ${request.table}:`, { rowCount: result.rows.length, firstRow: result.rows[0] });
                                
                                if (elmApp.ports.dbResult) {
                                    elmApp.ports.dbResult.send({
                                        id: request.id,
                                        success: true,
                                        data: result.rows,
                                        error: null
                                    });
                                }
                            } catch (error) {
                                if (elmApp.ports.dbResult) {
                                    elmApp.ports.dbResult.send({
                                        id: request.id,
                                        success: false,
                                        data: null,
                                        error: error.message
                                    });
                                }
                            }
                        });
                        handlerInstance.addSubscription(dbFindUnsubscribe);
                    }
                    
                    if (elmApp.ports.dbCreate) {
                        const dbCreateUnsubscribe = elmApp.ports.dbCreate.subscribe(async (request) => {
                            try {
                                const dbService = server.getService('database');
                                const fields = Object.keys(request.data);
                                const values = Object.values(request.data);
                                const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
                                const sql = `INSERT INTO ${request.table} (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`;
                                const result = await dbService.query(sql, values);
                                
                                if (elmApp.ports.dbResult) {
                                    elmApp.ports.dbResult.send({
                                        id: request.id,
                                        success: true,
                                        data: result.rows[0],
                                        error: null
                                    });
                                }
                            } catch (error) {
                                if (elmApp.ports.dbResult) {
                                    elmApp.ports.dbResult.send({
                                        id: request.id,
                                        success: false,
                                        data: null,
                                        error: error.message
                                    });
                                }
                            }
                        });
                        handlerInstance.addSubscription(dbCreateUnsubscribe);
                    }
                    
                    // Set up Event Sourcing port handlers
                    if (elmApp.ports.eventPush) {
                        const eventPushUnsubscribe = elmApp.ports.eventPush.subscribe(async (eventRequest) => {
                            try {
                                console.log(`📧 Event scheduled:`, eventRequest);
                                
                                const dbService = server.getService('database');
                                
                                // Calculate execution time
                                let executeAt = new Date();
                                
                                if (eventRequest.timeStamp) {
                                    // Explicit timestamp from Elm
                                    executeAt = new Date(eventRequest.timeStamp);
                                    console.log(`🕐 Scheduled for: ${executeAt.toISOString()}`);
                                } else if (eventRequest.schedule) {
                                    // TODO: Parse cron schedule - need cron parser library
                                    console.log(`⏰ Recurring event: ${eventRequest.schedule}`);
                                    console.warn('⚠️ Cron scheduling not yet implemented, executing immediately');
                                } else if (eventRequest.delay && eventRequest.delay > 0) {
                                    executeAt = new Date(Date.now() + eventRequest.delay * 1000);
                                    console.log(`⏱️  Delayed event: ${eventRequest.delay}s`);
                                } else {
                                    console.log(`⚡ Immediate event`);
                                }
                                
                                // Insert event into buildamp_events table with session context
                                const eventData = {
                                    session_id: currentHandlerContext?.sessionId || null,
                                    application: server.config.application || process.env.APP_NAME || 'buildamp_app',
                                    host: currentHandlerContext?.host || 'localhost',
                                    event_type: eventRequest.eventType,
                                    correlation_id: eventRequest.correlationId || null,
                                    payload: JSON.stringify(eventRequest.payload || {}),
                                    execute_at: executeAt.toISOString(),
                                    context: null,
                                    priority: eventRequest.priority || 'normal'
                                };
                                
                                const sql = `
                                    INSERT INTO buildamp_events (
                                        session_id, application, host, event_type, correlation_id, 
                                        payload, execute_at, context, priority
                                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
                                    RETURNING id
                                `;
                                
                                const params = [
                                    eventData.session_id,
                                    eventData.application,
                                    eventData.host,
                                    eventData.event_type,
                                    eventData.correlation_id,
                                    eventData.payload,
                                    eventData.execute_at,
                                    eventData.context,
                                    eventData.priority
                                ];
                                
                                const result = await dbService.query(sql, params);
                                const eventId = result.rows[0].id;
                                
                                console.log(`✅ Event ${eventId} scheduled for ${executeAt.toISOString()} (session: ${eventData.session_id?.substring(0, 8)}...)`);
                                
                                // Send success response back to Elm if there's a response port
                                if (elmApp.ports.eventResult) {
                                    elmApp.ports.eventResult.send({
                                        id: eventRequest.id,
                                        success: true,
                                        eventId: eventId
                                    });
                                }
                            } catch (error) {
                                console.error('❌ Event push failed:', error.message);
                                
                                // Send error response back to Elm
                                if (elmApp.ports.eventResult) {
                                    elmApp.ports.eventResult.send({
                                        id: eventRequest.id,
                                        success: false,
                                        error: error.message
                                    });
                                }
                            }
                        });
                        handlerInstance.addSubscription(eventPushUnsubscribe);
                    }
                    
                    // Set up external Services port handlers
                    if (elmApp.ports.httpRequest) {
                        const httpRequestUnsubscribe = elmApp.ports.httpRequest.subscribe(async (request) => {
                            try {
                                // TODO: Implement HTTP client with proper security/rate limiting
                                console.log(`🌐 HTTP Request: ${request.method} ${request.url}`);
                                
                                // For now, simulate successful response
                                if (elmApp.ports.httpResponse) {
                                    elmApp.ports.httpResponse.send({
                                        id: request.id,
                                        success: true,
                                        status: 200,
                                        headers: {},
                                        body: '{"message": "Simulated response"}',
                                        error: null
                                    });
                                }
                            } catch (error) {
                                if (elmApp.ports.httpResponse) {
                                    elmApp.ports.httpResponse.send({
                                        id: request.id,
                                        success: false,
                                        status: null,
                                        headers: null,
                                        body: null,
                                        error: error.message
                                    });
                                }
                            }
                        });
                        handlerInstance.addSubscription(httpRequestUnsubscribe);
                    }
                    
                    // Send request to Elm in TEA format
                    if (elmApp.ports && elmApp.ports.handleRequest) {
                        const requestBundle = {
                            id: requestId,
                            context: {
                                host: context.host || 'localhost',
                                sessionId: context.session_id || null
                            },
                            request: requestData
                        };
                        
                        // Store context for this handler instance
                        currentHandlerContext = requestBundle.context;
                        
                        // Update global state with current activity
                        // Note: In a real implementation, this could be handled by the Elm handler itself
                        console.log(`🕒 Request processed at server time: ${Date.now()}`);
                        
                        elmApp.ports.handleRequest.send(requestBundle);
                    } else {
                        if (unsubscribe) unsubscribe();
                        reject(new Error(`Handler ${handlerName} missing handleRequest port`));
                    }
                    
                    // Timeout after 10 seconds for async operations
                    setTimeout(() => {
                        if (!isResolved) {
                            isResolved = true;
                            if (unsubscribe) {
                                unsubscribe();
                                handlerInstance.subscriptions.delete(unsubscribe);
                            }
                            reject(new Error(`Handler ${handlerName} timed out`));
                        }
                    }, 10000);
                } else {
                    reject(new Error(`Handler ${handlerName} missing complete port`));
                }
            });
        },
        
        cleanup: async () => {
            console.log('🧹 Cleaning up Elm service');
            await cleanupExistingHandlers();
        },
        
        // Expose handler reloading for HMR
        async reloadHandlers() {
            console.log('🔄 Reloading TEA handlers for HMR');
            await initializeHandlers();
            console.log('✅ Handler reload complete');
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

/**
 * Translate Elm query builder to SQL
 * Implements the query translation logic described in TEA Handler Implementation
 */
function translateQueryToSQL(table, queryObj, host) {
    let sql = `SELECT * FROM ${table} WHERE host = $1`;
    let params = [host];
    let paramIndex = 2;
    
    // Parse query object from Elm
    const query = typeof queryObj === 'string' ? JSON.parse(queryObj) : queryObj;
    
    // Add filters
    if (query.filter && Array.isArray(query.filter)) {
        query.filter.forEach(filter => {
            switch (filter.type) {
                case 'ById':
                    sql += ` AND id = $${paramIndex}`;
                    params.push(filter.value);
                    paramIndex++;
                    break;
                case 'BySlug':
                    sql += ` AND slug = $${paramIndex}`;
                    params.push(filter.value);
                    paramIndex++;
                    break;
                case 'ByUserId':
                    sql += ` AND user_id = $${paramIndex}`;
                    params.push(filter.value);
                    paramIndex++;
                    break;
                case 'ByField':
                    const fieldName = camelToSnake(filter.field);
                    sql += ` AND ${fieldName} = $${paramIndex}`;
                    params.push(filter.value);
                    paramIndex++;
                    break;
                default:
                    console.warn(`Unknown filter type: ${filter.type}`);
            }
        });
    }
    
    // Add sorting
    if (query.sort && Array.isArray(query.sort) && query.sort.length > 0) {
        sql += ' ORDER BY ';
        const sortClauses = query.sort.map(sortStr => {
            switch (sortStr) {
                case 'created_at_asc':
                    return 'created_at ASC';
                case 'created_at_desc':
                    return 'created_at DESC';
                case 'title_asc':
                    return 'title ASC';
                case 'title_desc':
                    return 'title DESC';
                default:
                    console.warn(`Unknown sort type: ${sortStr}`);
                    return 'created_at DESC'; // fallback
            }
        });
        sql += sortClauses.join(', ');
    }
    
    // Add pagination
    if (query.paginate && query.paginate.limit) {
        sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(query.paginate.limit, query.paginate.offset || 0);
    }
    
    return { sql, params };
}

/**
 * Convert camelCase to snake_case for database field names
 */
function camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}