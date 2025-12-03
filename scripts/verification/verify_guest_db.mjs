import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    user: process.env.POSTGRES_USER || 'admin',
    password: process.env.POSTGRES_PASSWORD || 'password',
    host: process.env.POSTGRES_HOST || '127.0.0.1',
    database: process.env.POSTGRES_DB || 'horatio',
    port: 5432,
});

const sessionId = process.argv[2];

async function verify() {
    try {
        const res = await pool.query('SELECT * FROM guests WHERE id = $1', [sessionId]);
        console.log(`Found ${res.rows.length} guest(s) with ID ${sessionId}`);
        if (res.rows.length > 0) {
            console.log('Guest:', res.rows[0]);
        }

        const comments = await pool.query('SELECT * FROM item_comments WHERE guest_id = $1', [sessionId]);
        console.log(`Found ${comments.rows.length} comment(s) for this guest.`);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

verify();
