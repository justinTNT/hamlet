import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    user: 'admin',
    host: '127.0.0.1',
    database: 'horatio',
    password: 'password',
    port: 5432,
});

async function verify() {
    try {
        const resItems = await pool.query("SELECT id, title FROM microblog_items WHERE title = 'Generic Effect Test 5'");
        console.log('Items:', resItems.rows);

        const resTags = await pool.query("SELECT id, name FROM tags WHERE name IN ('generic', 'effects')");
        console.log('Tags:', resTags.rows);

        const resLinks = await pool.query("SELECT * FROM item_tags");
        console.log('Links Count:', resLinks.rowCount);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

verify();
