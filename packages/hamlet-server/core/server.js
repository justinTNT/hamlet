import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { MiddlewareLoader } from './middleware-loader.js';
import { verifyContractIntegrity } from 'buildamp/core';
import path from 'path';
import fs from 'fs';

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
            // Find project root by looking for package.json with workspaces
            let projectRoot = process.cwd();
            let found = false;
            for (let i = 0; i < 5; i++) {
                const packagePath = path.join(projectRoot, 'package.json');
                if (fs.existsSync(packagePath)) {
                    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
                    if (pkg.workspaces) {
                        found = true;
                        break;
                    }
                }
                projectRoot = path.dirname(projectRoot);
            }
            
            if (!found) {
                console.warn('⚠️  Could not find project root, skipping contract check');
            } else {
                const appName = this.config.application || 'horatio';
                await verifyContractIntegrity(
                    path.join(projectRoot, 'app', appName, 'models'),
                    path.join(projectRoot, 'app', appName, 'web/src/.hamlet-gen/contracts.json'),
                    { enabled: !process.env.SKIP_CONTRACT_CHECK }
                );
            }
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