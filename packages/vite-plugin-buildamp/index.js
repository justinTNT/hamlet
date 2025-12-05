import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import chokidar from 'chokidar';
import elmPlugin from 'vite-plugin-elm';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

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

export default function buildampPlugin(options = {}) {
    // Core configuration - paths and compilation
    const config = {
        crateDir: options.crateDir || path.resolve(process.cwd(), '../../'),
        wasmOutDirWeb: options.wasmOutDirWeb || 'pkg-web',
        wasmOutDirNode: options.wasmOutDirNode || 'pkg-node',
        watchPattern: options.watchPattern || 'src/**/*.rs',
        
        // Build configuration
        buildTargets: options.buildTargets || ['nodejs', 'web'], // Which WASM targets to build
        preferCli: options.preferCli !== false, // Use CLI by default, disable with false
        cliFeatures: options.cliFeatures || ['cli'], // Cargo features for CLI build
        
        // Development experience
        hmr: {
            enabled: options.hmr?.enabled !== false, // HMR enabled by default
            mode: options.hmr?.mode || 'full-reload', // 'full-reload' | 'module-reload' | 'custom'
            debounce: options.hmr?.debounce || 100, // Debounce file changes (ms)
            ...options.hmr
        },
        
        // File watching
        watch: {
            ignored: options.watch?.ignored || ['**/target/**', '**/pkg-web/**', '**/pkg-node/**', '**/.git/**'],
            polling: options.watch?.polling || false, // Enable polling for network drives
            usePolling: options.watch?.usePolling || false,
            interval: options.watch?.interval || 1000,
            ...options.watch
        },
        
        // Logging and feedback
        logging: {
            enabled: options.logging?.enabled !== false,
            level: options.logging?.level || 'info', // 'silent' | 'error' | 'warn' | 'info' | 'verbose'
            prefix: options.logging?.prefix || '[BuildAmp]',
            ...options.logging
        },
        
        // Integration with other plugins
        elm: options.elm || {}, // Pass-through to vite-plugin-elm
        wasm: options.wasm || {}, // Pass-through to vite-plugin-wasm
        
        // Advanced options
        alias: options.alias || 'proto-rust', // Import alias for generated WASM
        buildHooks: {
            beforeBuild: options.buildHooks?.beforeBuild || null,
            afterBuild: options.buildHooks?.afterBuild || null,
            onBuildError: options.buildHooks?.onBuildError || null,
            ...options.buildHooks
        }
    };

    let isBuilding = false;
    let debounceTimer = null;

    // Logging helper
    const log = (level, message, ...args) => {
        if (!config.logging.enabled) return;
        
        const levels = { silent: 0, error: 1, warn: 2, info: 3, verbose: 4 };
        const currentLevel = levels[config.logging.level] || 3;
        const messageLevel = levels[level] || 3;
        
        if (messageLevel <= currentLevel) {
            const prefix = config.logging.prefix;
            console[level === 'verbose' ? 'log' : level](`${prefix} ${message}`, ...args);
        }
    };

    const buildWasm = async () => {
        if (isBuilding) return;
        isBuilding = true;
        
        try {
            // Call beforeBuild hook
            if (config.buildHooks.beforeBuild) {
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
            if (config.buildHooks.afterBuild) {
                await config.buildHooks.afterBuild();
            }

            log('info', 'WASM build complete for all targets');
        } catch (e) {
            log('error', 'Build failed:', e);
            
            // Call error hook
            if (config.buildHooks.onBuildError) {
                await config.buildHooks.onBuildError(e);
            }
            throw e;
        } finally {
            isBuilding = false;
        }
    };

    const debouncedBuildWasm = () => {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(buildWasm, config.hmr.debounce);
    };

    // Initialize Elm plugin with configuration
    const elm = elmPlugin(config.elm);

    return [
        elm, // Include Elm plugin automatically
        wasm(config.wasm), // Handle WASM loading with config
        topLevelAwait(), // Handle top-level await for WASM
        {
            name: 'vite-plugin-buildamp',
            config(viteConfig, { command }) {
                return {
                    resolve: {
                        alias: {
                            [config.alias]: path.resolve(config.crateDir, config.wasmOutDirWeb, 'proto_rust.js')
                        }
                    }
                };
            },
            async configureServer(server) {
                if (!config.hmr.enabled) {
                    log('info', 'HMR disabled, skipping file watching setup');
                    return;
                }

                // Initial build - MUST complete before serving
                log('info', 'Building initial WASM before starting dev server...');
                await buildWasm();
                log('info', 'WASM ready, dev server can now serve requests');

                // Setup file watching with configuration
                const watchOptions = {
                    ignored: config.watch.ignored,
                    ignoreInitial: true,
                    usePolling: config.watch.usePolling,
                    interval: config.watch.interval
                };

                if (config.watch.polling) {
                    watchOptions.usePolling = true;
                }

                log('verbose', `Watching pattern: ${config.watchPattern}`);
                log('verbose', `Watch options:`, watchOptions);

                const watcher = chokidar.watch(path.join(config.crateDir, config.watchPattern), watchOptions);

                // Clean up any auto-generated mod.rs files in models directory
                const cleanupModFiles = () => {
                    const modelsDir = path.join(config.crateDir, 'src/models');
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
                };

                watcher.on('change', async (file) => {
                    // Ignore mod.rs files - they're auto-generated and not part of our build
                    if (file.endsWith('mod.rs')) {
                        return;
                    }
                    
                    log('info', `Rust change detected: ${file}`);
                    
                    // Use debounced build for better performance
                    if (config.hmr.debounce > 0) {
                        debouncedBuildWasm();
                    } else {
                        await buildWasm();
                    }
                    
                    // Clean up any mod.rs files that cargo might have created
                    cleanupModFiles();
                    
                    // Handle different HMR modes
                    if (config.hmr.mode === 'full-reload') {
                        server.ws.send({ type: 'full-reload' });
                    } else if (config.hmr.mode === 'module-reload') {
                        // Attempt to reload just the WASM module
                        server.ws.send({
                            type: 'update',
                            updates: [{
                                type: 'js-update',
                                path: `/${config.alias}`,
                                acceptedPath: `/${config.alias}`,
                                timestamp: Date.now()
                            }]
                        });
                    }
                    // 'custom' mode - let user handle via hooks
                });

                watcher.on('error', (error) => {
                    log('error', 'File watcher error:', error);
                });
            },
            async buildStart() {
                // Ensure WASM is built for production builds
                log('info', 'Building WASM for production...');
                await buildWasm();
            }
        }
    ];
};
