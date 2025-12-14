/**
 * Database Middleware
 * Provides PostgreSQL connection pooling, migrations, and tenant-scoped queries
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

export default function createDatabase(server) {
    console.log('🗄️  Setting up database middleware');
    
    // Database configuration
    const config = {
        connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/hamlet',
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
            // Create migrations table if it doesn't exist
            await pool.query(`
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    filename TEXT PRIMARY KEY,
                    applied_at TIMESTAMP DEFAULT NOW()
                )
            `);
            
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
        
        // Tenant-scoped query (automatically adds host filter)
        async queryForTenant(host, text, params = []) {
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
        
        // Insert with automatic host field
        async insertForTenant(host, table, data) {
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
        
        // Update with automatic host filter
        async updateForTenant(host, table, id, data) {
            const columns = Object.keys(data);
            const values = Object.values(data);
            
            const setClause = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');
            const query = `UPDATE ${table} SET ${setClause} WHERE host = $1 AND id = $${values.length + 2} RETURNING *`;
            
            const result = await pool.query(query, [host, ...values, id]);
            return result.rows[0];
        },
        
        // Delete with automatic host filter
        async deleteForTenant(host, table, id) {
            const query = `DELETE FROM ${table} WHERE host = $1 AND id = $2 RETURNING *`;
            const result = await pool.query(query, [host, id]);
            return result.rows[0];
        },
        
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