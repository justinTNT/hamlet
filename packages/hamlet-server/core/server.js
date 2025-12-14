import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { MiddlewareLoader } from './middleware-loader.js';

/**
 * Core Hamlet Server
 * Minimal Express server with dynamic middleware loading
 */
export class HamletServer {
    constructor(config = {}) {
        this.app = express();
        this.config = {
            port: process.env.PORT || 3000,
            host: process.env.HOST || 'localhost',
            ...config
        };
        this.loader = new MiddlewareLoader(this);
        this.services = new Map();
        
        this.setupBasicMiddleware();
        this.setupHealthCheck();
    }
    
    setupBasicMiddleware() {
        this.app.use(cors());
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
    }
    
    setupHealthCheck() {
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'ok',
                features: this.loader.getLoadedFeatures(),
                timestamp: new Date().toISOString()
            });
        });
    }
    
    registerService(name, instance) {
        this.services.set(name, instance);
    }
    
    getService(name) {
        return this.services.get(name);
    }
    
    async start() {
        console.log('🚀 Starting Hamlet Server...');
        
        await this.loader.loadRequiredMiddleware();
        
        const server = this.app.listen(this.config.port, () => {
            console.log(`✅ Server running on http://${this.config.host}:${this.config.port}`);
            console.log(`📦 Features: ${this.loader.getLoadedFeatures().join(', ')}`);
        });
        
        return server;
    }
    
    async stop() {
        console.log('🛑 Stopping Hamlet Server...');
        await this.loader.cleanup();
        console.log('✅ Server stopped');
    }
}