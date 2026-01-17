/**
 * BuildAmp Template Server
 * Uses hamlet-server framework
 */

import { HamletServer } from 'hamlet-server';

// Configure server with BuildAmp defaults
const server = new HamletServer({
    port: process.env.PORT || 3000,

    // Enable features for BuildAmp template
    features: {
        kv: false,     // Optional key-value store
        sse: false,    // Optional real-time events
        database: false // Optional database integration
    }
});

// Graceful shutdown handling
process.on('SIGTERM', () => server.stop());
process.on('SIGINT', () => server.stop());

// Start the server
server.start().catch(console.error);
