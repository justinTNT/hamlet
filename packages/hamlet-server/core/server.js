import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { MiddlewareLoader } from './middleware-loader.js';
import { verifyContractIntegrity } from 'hamlet-contracts';
import path from 'path';

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

        // Verify Contract Integrity on startup (warn only by default)
        try {
            const projectRoot = process.cwd();
            await verifyContractIntegrity(
                path.join(projectRoot, 'app/horatio/models'), // TODO: Make configurable
                path.join(projectRoot, 'app/horatio/web/src/.hamlet-gen/contracts.json'), // TODO: Make configurable
                { enabled: !process.env.SKIP_CONTRACT_CHECK }
            );
        } catch (error) {
            console.error('Contract check failed:', error);
            // Don't crash, let verifyContractIntegrity handle logging/exit based on its config
        }

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