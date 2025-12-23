/**
 * Database Middleware
 * Provides PostgreSQL connection pooling, migrations, and tenant-scoped queries
 * Now includes auto-generated type-safe database functions
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
// Import auto-generated type-safe database queries
import createDbQueries from '../generated/database-queries.js';

const { Pool } = pg;

export default function createDatabase(server) {
    console.log('🗄️  Setting up database middleware');
    
    // Database configuration - use server config if available, fallback to environment
    const dbConfig = server.config?.database;
    const config = {
        user: dbConfig?.user || process.env.POSTGRES_USER || 'postgres',
        password: dbConfig?.password || process.env.POSTGRES_PASSWORD || '',
        host: dbConfig?.host || process.env.POSTGRES_HOST || 'localhost',
        database: dbConfig?.database || process.env.POSTGRES_DB || 'hamlet',
        port: dbConfig?.port || parseInt(process.env.POSTGRES_PORT || '5432', 10),
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    };
    
    // Create connection pool
    const pool = new Pool(config);
    
    // Test connection
    pool.connect()
        .then(client => {
            console.log('✅ Database connected successfully');
            client.release();
        })
        .catch(err => {
            console.error('❌ Database connection failed:', err.message);
        });
    
    // Run migrations if they exist
    async function runMigrations() {
        const migrationsDir = path.join(process.cwd(), 'migrations');
        
        if (!fs.existsSync(migrationsDir)) {
            console.log('📁 No migrations directory found, skipping migrations');
            return;
        }
        
        try {
            // Check if migrations table exists and has correct structure
            const tableExists = await pool.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_name = 'schema_migrations'
            `);
            
            if (tableExists.rows.length === 0) {
                // Create new table
                await pool.query(`
                    CREATE TABLE schema_migrations (
                        filename TEXT PRIMARY KEY,
                        applied_at TIMESTAMP DEFAULT NOW()
                    )
                `);
                console.log('📝 Created schema_migrations table');
            } else {
                // Check if filename column exists
                const columnsResult = await pool.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'schema_migrations' 
                    AND column_name = 'filename'
                `);
                
                if (columnsResult.rows.length === 0) {
                    console.log('📝 Recreating schema_migrations table with correct structure');
                    await pool.query('DROP TABLE schema_migrations CASCADE');
                    await pool.query(`
                        CREATE TABLE schema_migrations (
                            filename TEXT PRIMARY KEY,
                            applied_at TIMESTAMP DEFAULT NOW()
                        )
                    `);
                }
            }
            
            // Get applied migrations
            const appliedResult = await pool.query(
                'SELECT filename FROM schema_migrations ORDER BY filename'
            );
            const appliedMigrations = new Set(appliedResult.rows.map(row => row.filename));
            
            // Get migration files
            const migrationFiles = fs.readdirSync(migrationsDir)
                .filter(file => file.endsWith('.sql'))
                .sort();
            
            // Run pending migrations
            for (const filename of migrationFiles) {
                if (!appliedMigrations.has(filename)) {
                    console.log(`🔄 Running migration: ${filename}`);
                    
                    const sql = fs.readFileSync(path.join(migrationsDir, filename), 'utf8');
                    
                    const client = await pool.connect();
                    try {
                        await client.query('BEGIN');
                        await client.query(sql);
                        await client.query(
                            'INSERT INTO schema_migrations (filename) VALUES ($1)',
                            [filename]
                        );
                        await client.query('COMMIT');
                        console.log(`✅ Migration completed: ${filename}`);
                    } catch (error) {
                        await client.query('ROLLBACK');
                        throw error;
                    } finally {
                        client.release();
                    }
                }
            }
            
            console.log('✅ All migrations completed');
            
        } catch (error) {
            console.error('❌ Migration error:', error.message);
            throw error;
        }
    }
    
    // Tenant-scoped query helpers
    const dbService = {
        pool,
        
        // Raw query method
        async query(text, params) {
            return await pool.query(text, params);
        },
        
        // ⚠️  DEPRECATED: Dangerous SQL string manipulation - use generated queries instead
        // @deprecated Use auto-generated type-safe queries from dbQueries instead
        async queryForTenant(host, text, params = []) {
            console.warn('⚠️  DEPRECATED: queryForTenant uses dangerous SQL string manipulation. Use generated queries instead.');
            // Add host parameter to queries that don't already have WHERE clause
            if (text.includes('WHERE')) {
                text = text.replace('WHERE', 'WHERE host = $1 AND');
                params = [host, ...params];
            } else if (text.includes('FROM')) {
                text = text.replace(/FROM\s+(\w+)/, 'FROM $1 WHERE host = $1');
                params = [host, ...params];
            }
            
            return await pool.query(text, params);
        },
        
        // ⚠️  DEPRECATED: Generic table operations - use generated queries instead
        // @deprecated Use specific insert functions like insertMicroblogItem(item, host)
        async insertForTenant(host, table, data) {
            console.warn(`⚠️  DEPRECATED: insertForTenant for table '${table}'. Use generated insert${table} function instead.`);
            const columns = Object.keys(data);
            const values = Object.values(data);
            
            // Add host to the data
            columns.push('host');
            values.push(host);
            
            const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
            const columnsStr = columns.join(', ');
            
            const query = `INSERT INTO ${table} (${columnsStr}) VALUES (${placeholders}) RETURNING *`;
            
            const result = await pool.query(query, values);
            return result.rows[0];
        },
        
        // ⚠️  DEPRECATED: Generic table operations - use generated queries instead
        // @deprecated Use specific update functions like updateMicroblogItem(id, updates, host)
        async updateForTenant(host, table, id, data) {
            console.warn(`⚠️  DEPRECATED: updateForTenant for table '${table}'. Use generated update${table} function instead.`);
            const columns = Object.keys(data);
            const values = Object.values(data);
            
            const setClause = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');
            const query = `UPDATE ${table} SET ${setClause} WHERE host = $1 AND id = $${values.length + 2} RETURNING *`;
            
            const result = await pool.query(query, [host, ...values, id]);
            return result.rows[0];
        },
        
        // ⚠️  DEPRECATED: Generic table operations - use generated queries instead
        // @deprecated Use specific delete functions like deleteMicroblogItem(id, host)
        async deleteForTenant(host, table, id) {
            console.warn(`⚠️  DEPRECATED: deleteForTenant for table '${table}'. Use generated delete${table} function instead.`);
            const query = `DELETE FROM ${table} WHERE host = $1 AND id = $2 RETURNING *`;
            const result = await pool.query(query, [host, id]);
            return result.rows[0];
        },
        
        // ✅ NEW: Auto-generated type-safe database queries
        // These replace the dangerous string manipulation methods above
        ...createDbQueries(pool),
        
        // CFUK (Create, Find, Update, Kill) aliases for admin interface
        // Create
        createGuest: function(...args) { return this.insertGuest(...args); },
        createItemComment: function(...args) { return this.insertItemComment(...args); },
        createItemTag: function(...args) { return this.insertItemTag(...args); },
        createMicroblogItem: function(...args) { return this.insertMicroblogItem(...args); },
        createTag: async function(tagDataWithHost) {
            // Work around generated query bug - create UUID and insert manually
            console.log('🔍 CreateTag method - received:', tagDataWithHost);
            const { host, ...tagData } = tagDataWithHost;
            console.log('🔍 CreateTag method - host:', host, 'tagData:', tagData);
            
            const { randomUUID } = await import('crypto');
            const id = randomUUID();
            
            const result = await pool.query(
                'INSERT INTO tag (id, host, name) VALUES ($1, $2, $3) RETURNING *',
                [id, host, tagData.name]
            );
            return result.rows[0];
        },
        
        // Find methods with soft delete support
        findGuestsByHost: async function(host) {
            const result = await pool.query(
                'SELECT * FROM guest WHERE host = $1 AND deleted_at IS NULL ORDER BY created_at DESC',
                [host]
            );
            return result.rows;
        },
        findTagsByHost: async function(host) {
            const result = await pool.query(
                'SELECT * FROM tag WHERE host = $1 AND deleted_at IS NULL ORDER BY created_at DESC',
                [host]
            );
            return result.rows;
        },
        findMicroblogItemsByHost: async function(host) {
            const result = await pool.query(
                'SELECT * FROM microblog_item WHERE host = $1 AND deleted_at IS NULL ORDER BY created_at DESC',
                [host]
            );
            return result.rows;
        },
        findItemCommentsByHost: async function(host) {
            const result = await pool.query(
                'SELECT * FROM item_comment WHERE host = $1 AND deleted_at IS NULL ORDER BY created_at DESC',
                [host]
            );
            return result.rows;
        },
        findItemTagsByHost: async function(host) {
            const result = await pool.query(
                'SELECT * FROM item_tag WHERE host = $1 AND deleted_at IS NULL ORDER BY created_at DESC',
                [host]
            );
            return result.rows;
        },
        
        // Find by ID with soft delete support
        findGuestById: async function(id, host) {
            const result = await pool.query(
                'SELECT * FROM guest WHERE id = $1 AND host = $2 AND deleted_at IS NULL',
                [id, host]
            );
            return result.rows[0] || null;
        },
        findTagById: async function(id, host) {
            // Try with soft delete filter first, fallback without it
            try {
                const result = await pool.query(
                    'SELECT * FROM tag WHERE id = $1 AND host = $2 AND deleted_at IS NULL',
                    [id, host]
                );
                return result.rows[0] || null;
            } catch (error) {
                if (error.message.includes('column "deleted_at"')) {
                    // Fallback without soft delete filter
                    const result = await pool.query(
                        'SELECT * FROM tag WHERE id = $1 AND host = $2',
                        [id, host]
                    );
                    return result.rows[0] || null;
                } else {
                    throw error;
                }
            }
        },
        
        // Update methods with graceful degradation for missing audit columns
        updateTag: async function(id, updatesWithHost) {
            // Extract host from the combined object
            const { host, ...updates } = updatesWithHost;
            const updateFields = Object.keys(updates).filter(key => key !== 'id');
            const setClause = updateFields.map((field, i) => field + ' = $' + (i + 3)).join(', ');
            const values = updateFields.map(field => updates[field]);
            
            console.log('🔍 UpdateTag method - host:', host, 'updates:', updates);
            
            if (setClause === '') {
                // Try soft delete-aware get first, fallback to regular get
                try {
                    return await this.findTagById(id, host);
                } catch (e) {
                    return await this.getTagById(id, host);
                }
            }
            
            // Try with updated_at first, fallback without it
            try {
                const sql = 'UPDATE tag SET ' + setClause + ', updated_at = NOW() WHERE id = $1 AND host = $2 RETURNING *';
                console.log('🔍 UpdateTag Debug - SQL:', sql);
                console.log('🔍 UpdateTag Debug - Values:', [id, host, ...values]);
                const result = await pool.query(sql, [id, host, ...values]);
                console.log('🔍 UpdateTag Debug - Result rows:', result.rows.length);
                return result.rows[0] || null;
            } catch (error) {
                if (error.message.includes('column "updated_at"')) {
                    // Retry without updated_at
                    const sql = 'UPDATE tag SET ' + setClause + ' WHERE id = $1 AND host = $2 RETURNING *';
                    console.log('🔍 UpdateTag Debug (no updated_at) - SQL:', sql);
                    console.log('🔍 UpdateTag Debug (no updated_at) - Values:', [id, host, ...values]);
                    const result = await pool.query(sql, [id, host, ...values]);
                    console.log('🔍 UpdateTag Debug (no updated_at) - Result rows:', result.rows.length);
                    return result.rows[0] || null;
                } else {
                    throw error;
                }
            }
        },
        
        // Other update methods with graceful degradation
        updateGuest: async function(id, updates, host) {
            const updateFields = Object.keys(updates).filter(key => key !== 'id' && key !== 'host');
            const setClause = updateFields.map((field, i) => field + ' = $' + (i + 3)).join(', ');
            const values = updateFields.map(field => updates[field]);
            
            if (setClause === '') {
                try {
                    return await this.findGuestById(id, host);
                } catch (e) {
                    return await this.getGuestById(id, host);
                }
            }
            
            try {
                const sql = 'UPDATE guest SET ' + setClause + ', updated_at = NOW() WHERE id = $1 AND host = $2 RETURNING *';
                const result = await pool.query(sql, [id, host, ...values]);
                return result.rows[0] || null;
            } catch (error) {
                if (error.message.includes('column "updated_at"')) {
                    const sql = 'UPDATE guest SET ' + setClause + ' WHERE id = $1 AND host = $2 RETURNING *';
                    const result = await pool.query(sql, [id, host, ...values]);
                    return result.rows[0] || null;
                } else {
                    throw error;
                }
            }
        },
        
        // Kill (soft delete)
        killGuest: async function(id, host) {
            const result = await pool.query(
                'UPDATE guest SET deleted_at = NOW() WHERE id = $1 AND host = $2 AND deleted_at IS NULL RETURNING *',
                [id, host]
            );
            return result.rows[0] || null;
        },
        killItemComment: async function(id, host) {
            const result = await pool.query(
                'UPDATE item_comment SET deleted_at = NOW() WHERE id = $1 AND host = $2 AND deleted_at IS NULL RETURNING *',
                [id, host]
            );
            return result.rows[0] || null;
        },
        killItemTag: async function(id, host) {
            const result = await pool.query(
                'UPDATE item_tag SET deleted_at = NOW() WHERE id = $1 AND host = $2 AND deleted_at IS NULL RETURNING *',
                [id, host]
            );
            return result.rows[0] || null;
        },
        killMicroblogItem: async function(id, host) {
            const result = await pool.query(
                'UPDATE microblog_item SET deleted_at = NOW() WHERE id = $1 AND host = $2 AND deleted_at IS NULL RETURNING *',
                [id, host]
            );
            return result.rows[0] || null;
        },
        killTag: async function(id, host) {
            const result = await pool.query(
                'UPDATE tag SET deleted_at = NOW() WHERE id = $1 AND host = $2 AND deleted_at IS NULL RETURNING *',
                [id, host]
            );
            return result.rows[0] || null;
        },
        
        // Hard delete methods (for admin use when needed)
        hardDeleteGuest: function(...args) { return this.deleteGuest(...args); },
        hardDeleteItemComment: function(...args) { return this.deleteItemComment(...args); },
        hardDeleteItemTag: function(...args) { return this.deleteItemTag(...args); },
        hardDeleteMicroblogItem: function(...args) { return this.deleteMicroblogItem(...args); },
        hardDeleteTag: function(...args) { return this.deleteTag(...args); },
        
        // Transaction support
        async transaction(callback) {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                const result = await callback(client);
                await client.query('COMMIT');
                return result;
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        },
        
        cleanup: async () => {
            console.log('🧹 Cleaning up database connections');
            await pool.end();
        }
    };
    
    // Add database health check endpoint
    server.app.get('/api/db/health', async (req, res) => {
        try {
            const result = await pool.query('SELECT NOW() as timestamp');
            res.json({
                status: 'healthy',
                timestamp: result.rows[0].timestamp,
                connections: {
                    total: pool.totalCount,
                    idle: pool.idleCount,
                    waiting: pool.waitingCount
                }
            });
        } catch (error) {
            res.status(500).json({
                status: 'unhealthy',
                error: error.message
            });
        }
    });
    
    // Add basic database stats endpoint  
    server.app.get('/api/db/stats', async (req, res) => {
        const host = req.tenant?.host || 'localhost';
        
        try {
            // Get table sizes for this tenant
            const tableStatsQuery = `
                SELECT 
                    schemaname,
                    tablename,
                    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
                    pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
                FROM pg_tables 
                WHERE schemaname = 'public'
                ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
            `;
            
            const tableStats = await pool.query(tableStatsQuery);
            
            res.json({
                tenant: host,
                tables: tableStats.rows,
                pool_stats: {
                    total: pool.totalCount,
                    idle: pool.idleCount,
                    waiting: pool.waitingCount
                }
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    // Run migrations on startup
    runMigrations().catch(err => {
        console.error('Failed to run migrations:', err);
    });
    
    server.registerService('database', dbService);
    return dbService;
}