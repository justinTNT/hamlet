/**
 * Elm Service Middleware - Auto-generated with TEA Handler Support
 *
 * Executes compiled TEA-based Elm handler functions for business logic.
 * Elm defines both the API schema and implements the business logic using The Elm Architecture.
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { TEAHandlerPool, createApiHandlerInitializer } from './elm-handler-pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function createElmService(server) {
    console.log('🌳 Setting up Elm service with TEA Handler Support');

    const handlerPools = new Map(); // name -> TEAHandlerPool
    const require = createRequire(import.meta.url);
    let isReloading = false; // Prevent concurrent reloads

    // Cleanup any existing pools before creating new ones
    async function cleanupExistingPools() {
        for (const [name, pool] of handlerPools.entries()) {
            await pool.cleanup();
            handlerPools.delete(name);
        }
    }

    // Load compiled Elm handlers
    async function initializeHandlers() {
        const appName = server.config.application || 'horatio';
        const handlersPath = path.join(__dirname, `../../../app/${appName}/server`);

        // Auto-discover handler configurations
        const handlerConfigs = [];
        const handlersDir = path.join(handlersPath, 'src/Api/Handlers');

        if (fs.existsSync(handlersDir)) {
            const files = fs.readdirSync(handlersDir);
            const handlerFiles = files.filter(file => file.endsWith('Handler.elm'));

            for (const handlerFile of handlerFiles) {
                const baseName = path.basename(handlerFile, '.elm');
                const handlerName = baseName.replace('Handler', ''); // GetFeedHandler -> GetFeed
                handlerConfigs.push({ name: handlerName, file: baseName });
            }
        }

        // Cleanup existing pools first (for HMR)
        await cleanupExistingPools();

        for (const config of handlerConfigs) {
            try {
                const handlerPath = path.join(handlersPath, `${config.file}.cjs`);

                if (fs.existsSync(handlerPath)) {
                    // Load the compiled handler module
                    delete require.cache[require.resolve(handlerPath)];
                    const handlerModule = require(handlerPath);

                    // Access the Elm app from our context
                    if (handlerModule.Elm && handlerModule.Elm.Api && handlerModule.Elm.Api.Handlers && handlerModule.Elm.Api.Handlers[config.file]) {
                        // Create TEA handler pool for this endpoint
                        const poolSize = server.config.poolSize || 3;
                        const initHandler = createApiHandlerInitializer();
                        const handlerPool = new TEAHandlerPool(handlerModule, config, initHandler, poolSize);
                        await handlerPool.ready; // Wait for pool to initialize

                        handlerPools.set(config.name, handlerPool);

                        console.log(`✅ Loaded TEA handler pool: ${config.name} (${poolSize} instances)`);
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

        console.log(`🎯 Ready with ${handlerPools.size} TEA Elm handler pools`);
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
            const handlerPool = handlerPools.get(handlerName);

            if (!handlerPool) {
                throw new Error(`Handler ${handlerName} pool not available`);
            }

            // Get fresh handler from pool
            const handlerInstance = await handlerPool.getHandler();

            return new Promise((resolve, reject) => {
                const elmApp = handlerInstance.elmApp;
                const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                let isResolved = false;
                let timeoutId = null;

                // Store request context for database operations (request-scoped, not handler-scoped)
                const requestContext = {
                    host: context.host || 'localhost',
                    sessionId: context.session_id || null,
                    userId: context.user_id || null,
                    isExtension: context.is_extension || false,
                    requestId: requestId,
                    startTime: Date.now()
                };

                console.log(`🌳 ${handlerName} TEA request ${requestId} started (pool instance: ${handlerInstance.createdAt})`);
                console.log(`🔍 Request context:`, {
                    host: requestContext.host,
                    sessionId: requestContext.sessionId ? requestContext.sessionId.substring(0, 8) + '...' : null,
                    userId: requestContext.userId,
                    requestId: requestId
                });

                // Track all request-specific subscriptions for proper cleanup
                const requestSubscriptions = new Set();

                // Helper function to clean up all request-specific subscriptions
                const cleanup = () => {
                    if (timeoutId) clearTimeout(timeoutId);
                    cleanupRequestSubscriptions();
                    handlerPool.releaseHandler(handlerInstance);
                };

                const cleanupRequestSubscriptions = () => {
                    const subCount = requestSubscriptions.size;
                    for (const unsubFn of requestSubscriptions) {
                        try {
                            if (typeof unsubFn === 'function') {
                                unsubFn();
                            }
                            handlerInstance.subscriptions.delete(unsubFn);
                        } catch (error) {
                            console.warn(`⚠️  Error during request subscription cleanup: ${error.message}`);
                        }
                    }
                    requestSubscriptions.clear();
                    console.log(`🧹 Cleaned up ${subCount} subscriptions for request ${requestId}`);
                };

                // Set up TEA completion handler
                let unsubscribe = null;
                if (elmApp.ports && elmApp.ports.complete) {
                    unsubscribe = elmApp.ports.complete.subscribe((result) => {
                        if (isResolved) return;
                        isResolved = true;

                        try {
                            const parsed = typeof result === 'string' ? JSON.parse(result) : result;
                            const duration = Date.now() - requestContext.startTime;
                            console.log(`🌳 ${handlerName} request ${requestId} completed successfully (${duration}ms)`);

                            cleanup();
                            resolve(parsed);
                        } catch (parseError) {
                            console.error(`❌ ${handlerName} request ${requestId} response parse error:`, parseError);
                            cleanup();
                            reject(parseError);
                        }
                    });

                    // Track subscriptions for both HMR cleanup and request cleanup
                    handlerInstance.addSubscription(unsubscribe);
                    requestSubscriptions.add(unsubscribe);

                    // Request correlation for database operations (isolated per request)
                    const pendingDbRequests = new Map();

                    // Set up database port handlers (using request-scoped context)

                    // Helper function to convert PostgreSQL timestamps to epoch milliseconds
                    // PostgreSQL TIMESTAMP WITH TIME ZONE comes as JS Date objects or ISO strings
                    const convertTimestamps = (obj) => {
                        if (obj === null || obj === undefined) return obj;
                        if (obj instanceof Date) return obj.getTime();
                        if (Array.isArray(obj)) return obj.map(convertTimestamps);
                        if (typeof obj === 'object') {
                            const result = {};
                            for (const [key, value] of Object.entries(obj)) {
                                result[key] = convertTimestamps(value);
                            }
                            return result;
                        }
                        return obj;
                    };

                    // Helper function to send DB results consistently
                    const sendDbResult = (reqId, success, data = null, error = null) => {
                        if (elmApp.ports.dbResult) {
                            elmApp.ports.dbResult.send({
                                id: reqId,
                                success,
                                data: convertTimestamps(data),
                                error
                            });
                        }
                    };
                    if (elmApp.ports.dbFind) {
                        const dbFindUnsubscribe = elmApp.ports.dbFind.subscribe(async (request) => {
                            try {
                                const dbService = server.getService('database');

                                // Use the request-scoped context for host isolation
                                const host = requestContext.host;

                                // Translate Elm query builder to SQL
                                const { sql, params } = translateQueryToSQL(request.table, request.query, host);
                                console.log(`🔍 SQL Query [${requestId}] for ${request.table}:`, { sql, params, host });
                                const result = await dbService.query(sql, params);
                                console.log(`📊 DB Result [${requestId}] for ${request.table}:`, {
                                    rowCount: result.rows.length,
                                    firstRow: result.rows[0],
                                    queryId: request.id,
                                    host: host
                                });

                                sendDbResult(request.id, true, result.rows);
                            } catch (error) {
                                sendDbResult(request.id, false, null, error.message);
                            }
                        });
                        handlerInstance.addSubscription(dbFindUnsubscribe);
                        requestSubscriptions.add(dbFindUnsubscribe);
                    }

                    if (elmApp.ports.dbCreate) {
                        const dbCreateUnsubscribe = elmApp.ports.dbCreate.subscribe(async (request) => {
                            try {
                                const dbService = server.getService('database');

                                // Automatically inject framework-managed fields:
                                // - host: for tenant isolation (MultiTenant)
                                // - deleted_at: always null for new records (SoftDelete)
                                const dataWithFrameworkFields = {
                                    ...request.data,
                                    host: requestContext.host,
                                    deleted_at: null
                                };

                                const fields = Object.keys(dataWithFrameworkFields);
                                const values = Object.values(dataWithFrameworkFields);
                                const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
                                const sql = `INSERT INTO ${request.table} (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`;

                                console.log(`🔍 SQL Insert [${requestId}] for ${request.table}:`, { sql, values, host: requestContext.host });
                                const result = await dbService.query(sql, values);

                                sendDbResult(request.id, true, result.rows[0]);
                            } catch (error) {
                                sendDbResult(request.id, false, null, error.message);
                            }
                        });
                        handlerInstance.addSubscription(dbCreateUnsubscribe);
                        requestSubscriptions.add(dbCreateUnsubscribe);
                    }

                    // Set up KV Store port handlers

                    // Helper function to send KV results consistently
                    const sendKvResult = (operation, success, data = null, error = null) => {
                        if (elmApp.ports.kvResult) {
                            elmApp.ports.kvResult.send({
                                id: request.id,
                                success,
                                operation,
                                data,
                                error
                            });
                        }
                    };

                    if (elmApp.ports.kvSet) {
                        const kvSetUnsubscribe = elmApp.ports.kvSet.subscribe(async (request) => {
                            try {
                                const kvService = server.getService('kv');
                                const host = requestContext.host;

                                console.log(`📦 KV Set [${requestId}]:`, {
                                    type: request.type,
                                    key: request.key,
                                    ttl: request.ttl,
                                    host: host
                                });

                                const result = kvService.set(host, request.type, request.key, request.value, request.ttl);
                                sendKvResult('set', result.success, result);
                            } catch (error) {
                                sendKvResult('set', false, null, error.message);
                            }
                        });
                        handlerInstance.addSubscription(kvSetUnsubscribe);
                        requestSubscriptions.add(kvSetUnsubscribe);
                    }

                    if (elmApp.ports.kvGet) {
                        const kvGetUnsubscribe = elmApp.ports.kvGet.subscribe(async (request) => {
                            try {
                                const kvService = server.getService('kv');
                                const host = requestContext.host;

                                console.log(`📦 KV Get [${requestId}]:`, {
                                    type: request.type,
                                    key: request.key,
                                    host: host
                                });

                                const result = kvService.get(host, request.type, request.key);
                                sendKvResult('get', true, result);
                            } catch (error) {
                                sendKvResult('get', false, null, error.message);
                            }
                        });
                        handlerInstance.addSubscription(kvGetUnsubscribe);
                        requestSubscriptions.add(kvGetUnsubscribe);
                    }

                    if (elmApp.ports.kvDelete) {
                        const kvDeleteUnsubscribe = elmApp.ports.kvDelete.subscribe(async (request) => {
                            try {
                                const kvService = server.getService('kv');
                                const host = requestContext.host;

                                console.log(`📦 KV Delete [${requestId}]:`, {
                                    type: request.type,
                                    key: request.key,
                                    host: host
                                });

                                const result = kvService.delete(host, request.type, request.key);
                                sendKvResult('delete', result.success, result);
                            } catch (error) {
                                sendKvResult('delete', false, null, error.message);
                            }
                        });
                        handlerInstance.addSubscription(kvDeleteUnsubscribe);
                        requestSubscriptions.add(kvDeleteUnsubscribe);
                    }

                    if (elmApp.ports.kvExists) {
                        const kvExistsUnsubscribe = elmApp.ports.kvExists.subscribe(async (request) => {
                            try {
                                const kvService = server.getService('kv');
                                const host = requestContext.host;

                                console.log(`📦 KV Exists [${requestId}]:`, {
                                    type: request.type,
                                    key: request.key,
                                    host: host
                                });

                                const result = kvService.get(host, request.type, request.key);
                                const exists = result.found && !result.expired;
                                sendKvResult('exists', true, { exists });
                            } catch (error) {
                                sendKvResult('exists', false, null, error.message);
                            }
                        });
                        handlerInstance.addSubscription(kvExistsUnsubscribe);
                        requestSubscriptions.add(kvExistsUnsubscribe);
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
                                    session_id: requestContext.sessionId || null,
                                    application: server.config.application || process.env.APP_NAME || 'buildamp_app',
                                    host: requestContext.host,
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
                        requestSubscriptions.add(eventPushUnsubscribe);
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
                        requestSubscriptions.add(httpRequestUnsubscribe);
                    }

                    // Send request to Elm in TEA format
                    if (elmApp.ports && elmApp.ports.handleRequest) {
                        const requestBundle = {
                            request: requestData,
                            context: {
                                host: context.host || 'localhost',
                                userId: context.user_id || null,
                                isExtension: context.is_extension || false
                            },
                            globalConfig: {}, // TODO: Add actual global config
                            globalState: {}   // TODO: Add actual global state
                        };

                        // Context is already stored in requestContext (request-scoped)
                        // No need for handler-level context storage which could cause leaks

                        // Update global state with current activity
                        // Note: In a real implementation, this could be handled by the Elm handler itself
                        console.log(`🕒 Request ${requestId} processed at server time: ${Date.now()}`);

                        // DEBUG: Log the exact data being sent to Elm (remove this after fixing)
                        // console.log('🐛 DEBUG: Sending to Elm port:', JSON.stringify(requestBundle, null, 2));

                        elmApp.ports.handleRequest.send(requestBundle);
                    } else {
                        cleanup();
                        reject(new Error(`Handler ${handlerName} missing handleRequest port`));
                    }

                    // Timeout after 10 seconds for async operations
                    timeoutId = setTimeout(() => {
                        if (!isResolved) {
                            isResolved = true;
                            console.error(`❌ ${handlerName} request ${requestId} timed out after 10 seconds`);
                            cleanup();
                            reject(new Error(`Handler ${handlerName} request ${requestId} timed out`));
                        }
                    }, 10000);
                } else {
                    cleanup();
                    reject(new Error(`Handler ${handlerName} missing complete port`));
                }
            });
        },

        cleanup: async () => {
            console.log('🧹 Cleaning up Elm service');
            await cleanupExistingPools();
        },

        // Expose handler reloading for HMR
        async reloadHandlers() {
            if (isReloading) {
                console.log('🔄 Handler reload already in progress, skipping');
                return;
            }

            isReloading = true;
            try {
                console.log('🔄 Reloading TEA handlers for HMR');
                await initializeHandlers();
                console.log('✅ Handler reload complete');
            } finally {
                isReloading = false;
            }
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

// Module-level schema cache for runtime query translation
let loadedSchema = null;

/**
 * Load schema.json for runtime query translation
 */
async function loadSchemaForQueries() {
    if (loadedSchema) return loadedSchema;

    try {
        const possiblePaths = [
            path.join(process.cwd(), 'server', '.generated', 'schema.json'),
            path.join(process.cwd(), '.generated', 'schema.json'),
            path.join(process.cwd(), 'app', 'horatio', 'server', '.generated', 'schema.json')
        ];

        for (const schemaPath of possiblePaths) {
            if (fs.existsSync(schemaPath)) {
                loadedSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
                console.log(`📋 Loaded schema.json from ${schemaPath}`);
                return loadedSchema;
            }
        }

        console.log('⚠️ schema.json not found, using fallback query behavior');
    } catch (error) {
        console.error('❌ Error loading schema.json:', error.message);
    }

    return null;
}

// Pre-load schema on module init
loadSchemaForQueries();

/**
 * Translate Elm query builder to SQL
 * Implements schema-aware query translation with MultiTenant/SoftDelete support
 */
function translateQueryToSQL(table, queryObj, host, schema = loadedSchema) {
    const tableSchema = schema?.tables?.[table];

    // Build base query
    let sql = `SELECT * FROM ${table}`;
    let params = [];
    let paramIndex = 1;
    const conditions = [];

    // Determine field names from schema, with defaults for backward compat
    const tenantField = tableSchema?.multiTenantFieldName || 'host';
    const deletedField = tableSchema?.softDeleteFieldName || 'deleted_at';

    // MultiTenant filtering: apply if schema says so, OR fallback if no schema (backward compat)
    if (!tableSchema || tableSchema.isMultiTenant !== false) {
        conditions.push(`${tenantField} = $${paramIndex}`);
        params.push(host);
        paramIndex++;
    }

    // SoftDelete filtering: apply if schema says so, OR fallback if no schema (backward compat)
    if (!tableSchema || tableSchema.isSoftDelete !== false) {
        conditions.push(`${deletedField} IS NULL`);
    }

    // Build WHERE clause from conditions
    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Parse query object from Elm
    const query = typeof queryObj === 'string' ? JSON.parse(queryObj) : queryObj;

    // Track if we have any WHERE conditions for filter connector logic
    const hasBaseConditions = conditions.length > 0;

    // Add filters from Elm query
    if (query.filter && Array.isArray(query.filter)) {
        query.filter.forEach((filter, index) => {
            // Use AND if we have base conditions or this isn't the first filter, otherwise add WHERE
            const needsWhere = !hasBaseConditions && index === 0;
            const connector = needsWhere ? ' WHERE ' : ' AND ';

            // Handle new expression-based filters (from Framework.Query)
            const exprTypes = ['Eq', 'Neq', 'Gt', 'Gte', 'Lt', 'Lte', 'Like', 'ILike', 'IsNull', 'IsNotNull', 'In', 'And', 'Or', 'Not'];
            if (exprTypes.includes(filter.type)) {
                const result = translateFilterExpr(filter, paramIndex);
                sql += `${connector}${result.clause}`;
                params.push(...result.params);
                paramIndex += result.params.length;
                return;
            }

            // Handle legacy filter types
            switch (filter.type) {
                case 'ById':
                    sql += `${connector}id = $${paramIndex}`;
                    params.push(filter.value);
                    paramIndex++;
                    break;
                case 'ByField':
                    const fieldName = camelToSnake(filter.field);
                    // Validate field name to prevent SQL injection
                    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fieldName)) {
                        console.warn(`Invalid filter field: ${filter.field}`);
                        break;
                    }
                    sql += `${connector}${fieldName} = $${paramIndex}`;
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
        const sortClauses = query.sort.map(sortObj => {
            // Handle new object format: { field: "created_at", direction: "desc" }
            if (typeof sortObj === 'object' && sortObj.field) {
                // Validate field name to prevent SQL injection (only alphanumeric and underscore)
                if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(sortObj.field)) {
                    console.warn(`Invalid sort field: ${sortObj.field}`);
                    return 'created_at DESC';
                }
                const direction = sortObj.direction === 'asc' ? 'ASC' : 'DESC';
                return `${sortObj.field} ${direction}`;
            }
            // Legacy string format fallback (for backward compat during transition)
            if (typeof sortObj === 'string') {
                switch (sortObj) {
                    case 'created_at_asc': return 'created_at ASC';
                    case 'created_at_desc': return 'created_at DESC';
                    case 'title_asc': return 'title ASC';
                    case 'title_desc': return 'title DESC';
                    default:
                        console.warn(`Unknown sort type: ${sortObj}`);
                        return 'created_at DESC';
                }
            }
            console.warn(`Invalid sort format: ${JSON.stringify(sortObj)}`);
            return 'created_at DESC';
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
 * Translate a FilterExpr AST node to SQL clause with parameters
 * Recursively handles And/Or/Not for complex queries
 *
 * @param {Object} filter - The filter expression object from Elm
 * @param {number} paramIndex - Current parameter index for $1, $2, etc.
 * @returns {{ clause: string, params: any[] }} - SQL clause and parameters
 */
function translateFilterExpr(filter, paramIndex) {
    // Validate field name to prevent SQL injection
    const validateFieldName = (field) => {
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) {
            throw new Error(`Invalid filter field: ${field}`);
        }
        return field;
    };

    switch (filter.type) {
        case 'Eq': {
            const field = validateFieldName(filter.field);
            return {
                clause: `${field} = $${paramIndex}`,
                params: [filter.value]
            };
        }

        case 'Neq': {
            const field = validateFieldName(filter.field);
            return {
                clause: `${field} <> $${paramIndex}`,
                params: [filter.value]
            };
        }

        case 'Gt': {
            const field = validateFieldName(filter.field);
            return {
                clause: `${field} > $${paramIndex}`,
                params: [filter.value]
            };
        }

        case 'Gte': {
            const field = validateFieldName(filter.field);
            return {
                clause: `${field} >= $${paramIndex}`,
                params: [filter.value]
            };
        }

        case 'Lt': {
            const field = validateFieldName(filter.field);
            return {
                clause: `${field} < $${paramIndex}`,
                params: [filter.value]
            };
        }

        case 'Lte': {
            const field = validateFieldName(filter.field);
            return {
                clause: `${field} <= $${paramIndex}`,
                params: [filter.value]
            };
        }

        case 'Like': {
            const field = validateFieldName(filter.field);
            return {
                clause: `${field} LIKE $${paramIndex}`,
                params: [filter.value]
            };
        }

        case 'ILike': {
            const field = validateFieldName(filter.field);
            return {
                clause: `${field} ILIKE $${paramIndex}`,
                params: [filter.value]
            };
        }

        case 'IsNull': {
            const field = validateFieldName(filter.field);
            return {
                clause: `${field} IS NULL`,
                params: []
            };
        }

        case 'IsNotNull': {
            const field = validateFieldName(filter.field);
            return {
                clause: `${field} IS NOT NULL`,
                params: []
            };
        }

        case 'In': {
            const field = validateFieldName(filter.field);
            const values = filter.values || [];
            if (values.length === 0) {
                // Empty IN clause is always false
                return { clause: 'FALSE', params: [] };
            }
            const placeholders = values.map((_, i) => `$${paramIndex + i}`).join(', ');
            return {
                clause: `${field} IN (${placeholders})`,
                params: values
            };
        }

        case 'And': {
            const exprs = filter.exprs || [];
            if (exprs.length === 0) {
                return { clause: 'TRUE', params: [] };
            }
            if (exprs.length === 1) {
                return translateFilterExpr(exprs[0], paramIndex);
            }
            const results = [];
            const allParams = [];
            let currentParamIndex = paramIndex;
            for (const expr of exprs) {
                const result = translateFilterExpr(expr, currentParamIndex);
                results.push(result.clause);
                allParams.push(...result.params);
                currentParamIndex += result.params.length;
            }
            return {
                clause: `(${results.join(' AND ')})`,
                params: allParams
            };
        }

        case 'Or': {
            const exprs = filter.exprs || [];
            if (exprs.length === 0) {
                return { clause: 'FALSE', params: [] };
            }
            if (exprs.length === 1) {
                return translateFilterExpr(exprs[0], paramIndex);
            }
            const results = [];
            const allParams = [];
            let currentParamIndex = paramIndex;
            for (const expr of exprs) {
                const result = translateFilterExpr(expr, currentParamIndex);
                results.push(result.clause);
                allParams.push(...result.params);
                currentParamIndex += result.params.length;
            }
            return {
                clause: `(${results.join(' OR ')})`,
                params: allParams
            };
        }

        case 'Not': {
            const innerExpr = filter.expr;
            if (!innerExpr) {
                return { clause: 'TRUE', params: [] };
            }
            const result = translateFilterExpr(innerExpr, paramIndex);
            return {
                clause: `NOT (${result.clause})`,
                params: result.params
            };
        }

        default:
            console.warn(`Unknown filter expression type: ${filter.type}`);
            return { clause: 'TRUE', params: [] };
    }
}

/**
 * Convert camelCase to snake_case for database field names
 */
function camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}
