import { HamletServer } from '../../../packages/hamlet-server/core/server.js';

// Custom configuration for Horatio
const config = {
    port: 3000,
    features: {
        database: true, // Enable PostgreSQL integration
        kv: true,       // Enable key-value store
        sse: true,      // Enable server-sent events  
        wasm: true      // Enable BuildAmp WASM integration
    },
    // PostgreSQL configuration
    database: {
        user: process.env.POSTGRES_USER || 'admin',
        password: process.env.POSTGRES_PASSWORD || 'password', 
        host: process.env.POSTGRES_HOST || '127.0.0.1',
        database: process.env.POSTGRES_DB || 'horatio',
        port: 5432,
        migrations: './migrations'
    }
};

// Create and start server
const server = new HamletServer(config);
await server.start();

console.log(`Horatio Backend running at http://localhost:${config.port}`);
console.log(`Key-Value Store endpoints available at http://localhost:${config.port}/kv/*`);
console.log(`Server-Sent Events available at http://localhost:${config.port}/events/*`);
console.log(`Session API available at http://localhost:${config.port}/api/session/*`);