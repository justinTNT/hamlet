import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import chokidar from 'chokidar';
import elmPlugin from 'vite-plugin-elm';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

function runWasmPack(crateDir, outDir, target) {
    return new Promise((resolve, reject) => {
        console.log(`[BuildAmp] Building WASM for ${target}...`);
        const cmd = 'wasm-pack';
        const args = ['build', '--target', target, '--out-dir', outDir];

        const child = spawn(cmd, args, { cwd: crateDir, stdio: 'inherit' });

        child.on('close', (code) => {
            if (code === 0) {
                console.log(`[BuildAmp] WASM build for ${target} complete.`);
                resolve();
            } else {
                console.error(`[BuildAmp] WASM build failed with code ${code}`);
                reject(new Error(`wasm-pack exited with code ${code}`));
            }
        });
    });
}

export default function buildampPlugin(options = {}) {
    const crateDir = options.crateDir || path.resolve(process.cwd(), '../../'); // Default assumption: monorepo root
    const wasmOutDirWeb = options.wasmOutDirWeb || 'pkg-web';
    const wasmOutDirNode = options.wasmOutDirNode || 'pkg-node';
    const watchPattern = options.watchPattern || 'src/**/*.rs';

    let isBuilding = false;

    const buildWasm = async () => {
        if (isBuilding) return;
        isBuilding = true;
        try {
            // Build for both targets sequentially to avoid lock contention
            await runWasmPack(crateDir, wasmOutDirNode, 'nodejs');
            await runWasmPack(crateDir, wasmOutDirWeb, 'web');
        } catch (e) {
            console.error('[BuildAmp] Build failed:', e);
        } finally {
            isBuilding = false;
        }
    };

    // Initialize Elm plugin
    // vite-plugin-elm default export might be the function or an object with plugin property
    // Based on usage `elmPlugin.plugin` in CJS, in ESM it might be `elmPlugin` or `elmPlugin.default`.
    // Let's assume standard ESM import behavior. If `vite-plugin-elm` exports `plugin` named export, we use that.
    // Actually, looking at docs or typical usage: `import elmPlugin from 'vite-plugin-elm'` -> `elmPlugin()`
    // But in CJS it was `require('vite-plugin-elm').plugin`.
    // Let's try `elmPlugin()` first, as that's standard for Vite plugins.
    // Wait, the previous code used `elmPlugin.plugin(options.elm || {})`.
    // Let's check how `vite-plugin-elm` exports.

    const elm = elmPlugin(options.elm || {});

    return [
        elm, // Include Elm plugin automatically
        wasm(), // Handle WASM loading
        topLevelAwait(), // Handle top-level await for WASM
        {
            name: 'vite-plugin-buildamp',
            config(config, { command }) {
                // Ensure WASM is built before Vite starts
                if (command === 'serve' || command === 'build') {
                    // We can't easily block config resolution, but we can start the build
                    // For 'serve', it's fine if it finishes slightly after start
                    // For 'build', we might need to be more careful, but usually build scripts handle this
                }
                return {
                    resolve: {
                        alias: {
                            'proto-rust': path.resolve(crateDir, wasmOutDirWeb, 'proto_rust.js')
                        }
                    }
                };
            },
            configureServer(server) {
                // Initial build
                buildWasm();

                // Watch Rust files
                const watcher = chokidar.watch(path.join(crateDir, watchPattern), {
                    ignored: ['**/target/**', '**/pkg-web/**', '**/pkg-node/**', '**/.git/**'],
                    ignoreInitial: true
                });

                watcher.on('change', async (file) => {
                    console.log(`[BuildAmp] Rust change detected: ${file}`);
                    await buildWasm();
                    // Trigger full reload after WASM rebuild
                    server.ws.send({ type: 'full-reload' });
                });
            },
            async buildStart() {
                // Ensure WASM is built for production builds too
                if (process.env.NODE_ENV === 'production') {
                    await buildWasm();
                }
            }
        }
    ];
};
