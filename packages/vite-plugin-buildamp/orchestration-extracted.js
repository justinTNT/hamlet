// This file contains the orchestration logic extracted from the Vite plugin
// It will be moved to the buildamp CLI in Sprint 2

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

function runBuildAmpBuild(crateDir, target, config) {
    return new Promise((resolve, reject) => {
        const log = (level, message) => {
            if (!config.logging.enabled) return;
            const levels = { error: 1, warn: 2, info: 3, verbose: 4 };
            const currentLevel = levels[config.logging.level] || 3;
            if (levels[level] <= currentLevel) {
                console[level === 'verbose' ? 'log' : level](`${config.logging.prefix} ${message}`);
            }
        };

        log('info', `Building WASM for ${target}...`);
        
        // Build CLI command with configurable features
        const cmd = 'cargo';
        const features = config.cliFeatures.join(',');
        const args = ['run', '--bin', 'buildamp', '--features', features, '--', 'build', '--target', target, '--crate-dir', '.'];

        const child = spawn(cmd, args, { cwd: crateDir, stdio: 'inherit' });

        child.on('close', (code) => {
            if (code === 0) {
                log('verbose', `CLI WASM build for ${target} complete.`);
                resolve();
            } else {
                log('warn', `CLI failed, falling back to direct wasm-pack...`);
                // Fallback to direct wasm-pack call
                fallbackWasmPack(crateDir, target, config).then(resolve).catch(reject);
            }
        });
    });
}

function fallbackWasmPack(crateDir, target, config = {}) {
    return new Promise((resolve, reject) => {
        const log = (level, message) => {
            if (!config.logging?.enabled) return;
            const levels = { error: 1, warn: 2, info: 3, verbose: 4 };
            const currentLevel = levels[config.logging?.level || 'info'] || 3;
            if (levels[level] <= currentLevel) {
                const prefix = config.logging?.prefix || '[BuildAmp]';
                console[level === 'verbose' ? 'log' : level](`${prefix} ${message}`);
            }
        };

        const outDir = target === 'web' ? (config.wasmOutDirWeb || 'pkg-web') : (config.wasmOutDirNode || 'pkg-node');
        const cmd = 'wasm-pack';
        const args = ['build', '--target', target, '--out-dir', outDir];

        const child = spawn(cmd, args, { cwd: crateDir, stdio: 'inherit' });

        child.on('close', (code) => {
            if (code === 0) {
                log('verbose', `Fallback WASM build for ${target} complete.`);
                resolve();
            } else {
                log('error', `WASM build failed with code ${code}`);
                reject(new Error(`wasm-pack exited with code ${code}`));
            }
        });
    });
}

// Clean up any auto-generated mod.rs files in models directory
export function cleanupModFiles(crateDir) {
    const modelsDir = path.join(crateDir, 'src/models');
    const findModFiles = (dir) => {
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    findModFiles(fullPath);
                } else if (entry.name === 'mod.rs') {
                    try {
                        fs.unlinkSync(fullPath);
                    } catch (e) {
                        // Ignore errors - file might not exist
                    }
                }
            }
        } catch (e) {
            // Ignore errors - directory might not exist
        }
    };
    findModFiles(modelsDir);
}

export async function buildWasm(config) {
    try {
        // Call beforeBuild hook
        if (config.buildHooks?.beforeBuild) {
            await config.buildHooks.beforeBuild();
        }

        // Build specified targets sequentially to avoid lock contention
        for (const target of config.buildTargets) {
            if (config.preferCli) {
                await runBuildAmpBuild(config.crateDir, target, config);
            } else {
                await fallbackWasmPack(config.crateDir, target);
            }
        }

        // Call afterBuild hook
        if (config.buildHooks?.afterBuild) {
            await config.buildHooks.afterBuild();
        }

        console.log('[BuildAmp] WASM build complete for all targets');
    } catch (e) {
        console.error('[BuildAmp] Build failed:', e);
        
        // Call error hook
        if (config.buildHooks?.onBuildError) {
            await config.buildHooks.onBuildError(e);
        }
        throw e;
    }
}

// File watching logic that will be moved to buildamp CLI
export function watchRustFiles(config, onChangeCallback) {
    const chokidar = require('chokidar');
    
    const watchOptions = {
        ignored: config.watch.ignored || ['**/target/**', '**/pkg-web/**', '**/pkg-node/**', '**/.git/**'],
        ignoreInitial: true,
        usePolling: config.watch.usePolling || false,
        interval: config.watch.interval || 1000
    };

    const watcher = chokidar.watch(
        path.join(config.crateDir, config.watchPattern || 'src/**/*.rs'), 
        watchOptions
    );

    watcher.on('change', async (file) => {
        // Ignore mod.rs files - they're auto-generated and not part of our build
        if (file.endsWith('mod.rs')) {
            return;
        }
        
        console.log(`[BuildAmp] Rust change detected: ${file}`);
        await onChangeCallback(file);
        
        // Clean up any mod.rs files that cargo might have created
        cleanupModFiles(config.crateDir);
    });

    watcher.on('error', (error) => {
        console.error('[BuildAmp] File watcher error:', error);
    });

    return watcher;
}
