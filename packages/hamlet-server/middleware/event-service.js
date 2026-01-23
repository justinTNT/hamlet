/**
 * Event Service Middleware - TEA-based Event Handler Support
 *
 * Executes compiled TEA-based Elm event handlers for background event processing.
 * Parallel to elm-service.js but for Events instead of API requests.
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { TEAHandlerPool, createEventHandlerInitializer } from './elm-handler-pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function createEventService(server) {
    console.log('📅 Setting up Event service with TEA Handler Support');

    const handlerPools = new Map(); // eventType -> TEAHandlerPool
    const require = createRequire(import.meta.url);
    let isReloading = false;

    // Cleanup any existing pools before creating new ones
    async function cleanupExistingPools() {
        for (const [name, pool] of handlerPools.entries()) {
            await pool.cleanup();
            handlerPools.delete(name);
        }
    }

    // Load compiled Elm event handlers
    async function initializeHandlers() {
        const appName = server.config.application || 'horatio';
        const handlersPath = path.join(__dirname, `../../../app/${appName}/server`);

        // Auto-discover event handler configurations
        const handlerConfigs = [];
        const handlersDir = path.join(handlersPath, 'src/Events/Handlers');

        if (fs.existsSync(handlersDir)) {
            const files = fs.readdirSync(handlersDir);
            const handlerFiles = files.filter(file => file.endsWith('Handler.elm'));

            for (const handlerFile of handlerFiles) {
                const baseName = path.basename(handlerFile, '.elm');
                const eventName = baseName.replace('Handler', ''); // HardDeletesHandler -> HardDeletes
                handlerConfigs.push({ name: eventName, file: baseName });
            }
        }

        // Cleanup existing pools first (for HMR)
        await cleanupExistingPools();

        for (const config of handlerConfigs) {
            try {
                // Look for compiled handler in src/Events/Handlers/
                const handlerPath = path.join(handlersDir, `${config.file}.cjs`);

                if (fs.existsSync(handlerPath)) {
                    // Load the compiled handler module
                    delete require.cache[require.resolve(handlerPath)];
                    const handlerModule = require(handlerPath);

                    // Access the Elm app - Events.Handlers.{HandlerName}
                    if (handlerModule.Elm && handlerModule.Elm.Events && handlerModule.Elm.Events.Handlers && handlerModule.Elm.Events.Handlers[config.file]) {
                        // Create TEA handler pool for this event type
                        const poolSize = server.config.eventPoolSize || 2;
                        const initHandler = createEventHandlerInitializer();
                        const handlerPool = new TEAHandlerPool(handlerModule, config, initHandler, poolSize);
                        await handlerPool.ready;

                        handlerPools.set(config.name, handlerPool);

                        console.log(`✅ Loaded TEA event handler pool: ${config.name} (${poolSize} instances)`);
                    } else {
                        console.log(`⚠️  TEA event handler ${config.name} structure not found`);
                    }
                } else {
                    console.log(`⚠️  TEA event handler file not found: ${handlerPath}`);
                }
            } catch (error) {
                console.log(`⚠️  TEA event handler ${config.name} failed to load: ${error.message}`);
            }
        }

        console.log(`📅 Ready with ${handlerPools.size} TEA Elm event handler pools`);
    }

    // Initialize handlers
    try {
        await initializeHandlers();
    } catch (error) {
        console.error('❌ Failed to load Elm event handlers:', error.message);
        return createFallbackService(server);
    }

    const eventService = {
        /**
         * Check if an Elm handler exists for an event type
         */
        hasHandler(eventType) {
            return handlerPools.has(eventType);
        },

        /**
         * Call a TEA-based Elm event handler
         */
        async callHandler(eventType, payload, context = {}) {
            const handlerPool = handlerPools.get(eventType);

            if (!handlerPool) {
                throw new Error(`Event handler ${eventType} pool not available`);
            }

            // Get fresh handler from pool
            const handlerInstance = await handlerPool.getHandler();

            return new Promise((resolve, reject) => {
                const elmApp = handlerInstance.elmApp;
                const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                let isResolved = false;
                let timeoutId = null;

                // Store event context
                const eventContext = {
                    host: context.host || 'localhost',
                    sessionId: context.session_id || null,
                    correlationId: context.correlation_id || null,
                    attempt: context.attempt || 1,
                    scheduledAt: context.scheduled_at || Date.now(),
                    executedAt: Date.now(),
                    eventId: eventId
                };

                console.log(`📅 ${eventType} TEA event ${eventId} started (pool instance: ${handlerInstance.createdAt})`);
                console.log(`🔍 Event context:`, {
                    host: eventContext.host,
                    correlationId: eventContext.correlationId,
                    attempt: eventContext.attempt,
                    eventId: eventId
                });

                // Track request-specific subscriptions
                const eventSubscriptions = new Set();

                const cleanup = () => {
                    if (timeoutId) clearTimeout(timeoutId);
                    cleanupEventSubscriptions();
                    handlerPool.releaseHandler(handlerInstance);
                };

                const cleanupEventSubscriptions = () => {
                    const subCount = eventSubscriptions.size;
                    for (const unsubFn of eventSubscriptions) {
                        try {
                            if (typeof unsubFn === 'function') {
                                unsubFn();
                            }
                            handlerInstance.subscriptions.delete(unsubFn);
                        } catch (error) {
                            console.warn(`⚠️  Error during event subscription cleanup: ${error.message}`);
                        }
                    }
                    eventSubscriptions.clear();
                    console.log(`🧹 Cleaned up ${subCount} subscriptions for event ${eventId}`);
                };

                // Set up TEA completion handler
                let unsubscribe = null;
                if (elmApp.ports && elmApp.ports.complete) {
                    unsubscribe = elmApp.ports.complete.subscribe((result) => {
                        if (isResolved) return;
                        isResolved = true;

                        try {
                            const parsed = typeof result === 'string' ? JSON.parse(result) : result;
                            const duration = Date.now() - eventContext.executedAt;
                            console.log(`📅 ${eventType} event ${eventId} completed successfully (${duration}ms)`);

                            cleanup();
                            resolve(parsed);
                        } catch (parseError) {
                            console.error(`❌ ${eventType} event ${eventId} response parse error:`, parseError);
                            cleanup();
                            reject(parseError);
                        }
                    });

                    handlerInstance.addSubscription(unsubscribe);
                    eventSubscriptions.add(unsubscribe);

                    // Set up database port handlers
                    setupDatabasePorts(elmApp, handlerInstance, eventSubscriptions, eventContext, server);

                    // Send event to Elm in TEA format
                    if (elmApp.ports && elmApp.ports.handleEvent) {
                        const eventBundle = {
                            payload: payload,
                            context: {
                                host: eventContext.host,
                                sessionId: eventContext.sessionId,
                                correlationId: eventContext.correlationId,
                                attempt: eventContext.attempt,
                                scheduledAt: eventContext.scheduledAt,
                                executedAt: eventContext.executedAt
                            },
                            globalConfig: {
                                serverNow: Date.now(),
                                hostIsolation: true,
                                environment: process.env.NODE_ENV || 'development'
                            },
                            globalState: {
                                eventCount: 0,
                                lastActivity: Date.now()
                            }
                        };

                        console.log(`🕒 Event ${eventId} processed at server time: ${Date.now()}`);

                        elmApp.ports.handleEvent.send(eventBundle);
                    } else {
                        cleanup();
                        reject(new Error(`Event handler ${eventType} missing handleEvent port`));
                    }

                    // Timeout after 60 seconds for event operations (longer than API)
                    timeoutId = setTimeout(() => {
                        if (!isResolved) {
                            isResolved = true;
                            console.error(`❌ ${eventType} event ${eventId} timed out after 60 seconds`);
                            cleanup();
                            reject(new Error(`Event handler ${eventType} event ${eventId} timed out`));
                        }
                    }, 60000);
                } else {
                    cleanup();
                    reject(new Error(`Event handler ${eventType} missing complete port`));
                }
            });
        },

        cleanup: async () => {
            console.log('🧹 Cleaning up Event service');
            await cleanupExistingPools();
        },

        // Expose handler reloading for HMR
        async reloadHandlers() {
            if (isReloading) {
                console.log('🔄 Event handler reload already in progress, skipping');
                return;
            }

            isReloading = true;
            try {
                console.log('🔄 Reloading TEA event handlers for HMR');
                await initializeHandlers();
                console.log('✅ Event handler reload complete');
            } finally {
                isReloading = false;
            }
        }
    };

    server.registerService('events', eventService);
    return eventService;
}

/**
 * Set up database port handlers for event processing
 */
function setupDatabasePorts(elmApp, handlerInstance, eventSubscriptions, eventContext, server) {
    // Helper to convert timestamps
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

    // Helper to send DB results
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
                const host = eventContext.host;
                const isSystemEvent = host === 'system';

                // Build SQL from query - skip host filtering for system/cron events
                const { sql, params } = translateQueryToSQL(request.table, request.query, host, isSystemEvent);
                console.log(`🔍 SQL Query [${eventContext.eventId}] for ${request.table}:`, { sql, params, host: isSystemEvent ? 'ALL' : host });
                const result = await dbService.query(sql, params);
                console.log(`📊 DB Result [${eventContext.eventId}] for ${request.table}: ${result.rows.length} rows`);

                sendDbResult(request.id, true, result.rows);
            } catch (error) {
                sendDbResult(request.id, false, null, error.message);
            }
        });
        handlerInstance.addSubscription(dbFindUnsubscribe);
        eventSubscriptions.add(dbFindUnsubscribe);
    }

    if (elmApp.ports.dbKill) {
        const dbKillUnsubscribe = elmApp.ports.dbKill.subscribe(async (request) => {
            try {
                const dbService = server.getService('database');
                const host = eventContext.host;

                // Build DELETE SQL - skip host isolation for system/cron events
                const isSystemEvent = host === 'system';
                let sql;
                let params;

                if (isSystemEvent) {
                    // Cron jobs operate across all hosts
                    sql = `DELETE FROM ${request.table}`;
                    params = [];

                    if (request.whereClause) {
                        sql += ` WHERE ${request.whereClause}`;
                        params = request.params || [];
                    }
                } else {
                    // Tenant-scoped events filter by host
                    sql = `DELETE FROM ${request.table} WHERE host = $1`;
                    params = [host];

                    if (request.whereClause) {
                        const adjustedWhere = request.whereClause.replace(/\$(\d+)/g, (match, num) => {
                            return `$${parseInt(num) + 1}`;
                        });
                        sql += ` AND ${adjustedWhere}`;
                        params = params.concat(request.params || []);
                    }
                }

                console.log(`🗑️ SQL Delete [${eventContext.eventId}] for ${request.table}:`, { sql, params, host: isSystemEvent ? 'ALL' : host });
                const result = await dbService.query(sql, params);
                console.log(`📊 DB Delete Result [${eventContext.eventId}] for ${request.table}: ${result.rowCount} rows deleted`);

                sendDbResult(request.id, true, { rowCount: result.rowCount });
            } catch (error) {
                sendDbResult(request.id, false, null, error.message);
            }
        });
        handlerInstance.addSubscription(dbKillUnsubscribe);
        eventSubscriptions.add(dbKillUnsubscribe);
    }
}

/**
 * Translate Elm query builder to SQL (simplified version for events)
 */
function translateQueryToSQL(table, queryObj, host, isSystemEvent = false) {
    let sql = `SELECT * FROM ${table}`;
    let params = [];
    let paramIndex = 1;
    const conditions = [];

    // Multi-tenant filtering (skip for system/cron events)
    if (!isSystemEvent) {
        conditions.push(`host = $${paramIndex}`);
        params.push(host);
        paramIndex++;
    }

    // Soft-delete filtering
    conditions.push(`deleted_at IS NULL`);

    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Parse query object from Elm
    const query = typeof queryObj === 'string' ? JSON.parse(queryObj) : queryObj;

    // Add filters
    if (query && query.filter && Array.isArray(query.filter)) {
        for (const filter of query.filter) {
            if (filter.type === 'Lt' && filter.field) {
                sql += ` AND ${filter.field} < $${paramIndex}`;
                params.push(filter.value);
                paramIndex++;
            } else if (filter.type === 'Lte' && filter.field) {
                sql += ` AND ${filter.field} <= $${paramIndex}`;
                params.push(filter.value);
                paramIndex++;
            }
        }
    }

    return { sql, params };
}

/**
 * Fallback service when Elm event handlers are not available
 */
function createFallbackService(server) {
    console.log('🔄 Creating fallback Event service');

    const fallbackService = {
        hasHandler(eventType) {
            return false;
        },

        async callHandler(eventType, payload) {
            throw new Error(`Elm event service not available. Cannot call handler: ${eventType}`);
        },

        cleanup: async () => console.log('🧹 Cleaning up fallback Event service')
    };

    server.registerService('events', fallbackService);
    return fallbackService;
}
