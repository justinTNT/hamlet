import path from 'path';
import fs from 'fs';
import elmPlugin from 'vite-plugin-elm';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default function buildampPlugin(options = {}) {
    const config = {
        projectRoot: options.projectRoot || process.cwd(),
        elm: options.elm || {},
        wasm: options.wasm || {}
    };

    // Initialize bundled plugins
    const elm = elmPlugin(config.elm);

    return [
        elm,
        wasm(config.wasm),
        topLevelAwait(),
        {
            name: 'vite-plugin-buildamp-reactive',
            
            config(viteConfig, { command }) {
                // Set up aliases for importing from .hamlet-gen (BuildAmp-generated code)
                const hamletGenPath = path.resolve(config.projectRoot, '.hamlet-gen');
                
                return {
                    resolve: {
                        alias: {
                            '@hamlet-gen': hamletGenPath,
                            '@generated': hamletGenPath,
                            '@buildamp-gen': hamletGenPath
                        }
                    }
                };
            },

            configureServer(server) {
                const contractsPath = path.join(config.projectRoot, '.hamlet-gen', 'contracts.json');
                
                // Watch only the contracts file for changes
                fs.watchFile(contractsPath, { interval: 250 }, (curr, prev) => {
                    if (curr.mtime !== prev.mtime) {
                        console.log('[BuildAmp] Contract change detected, triggering reload...');
                        // Trigger full reload when contracts change
                        server.ws.send({ type: 'full-reload' });
                    }
                });

                // Cleanup on server close
                server.httpServer?.on('close', () => {
                    fs.unwatchFile(contractsPath);
                });
            }
        }
    ];
};