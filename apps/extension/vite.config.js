import { defineConfig } from 'vite';

import { crx } from '@crxjs/vite-plugin';
import elmPlugin from 'vite-plugin-elm';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { readFileSync } from 'fs';

const manifest = JSON.parse(readFileSync('./manifest.json'));

export default defineConfig({
    plugins: [
        elmPlugin(),
        crx({ manifest }),
        wasm(),
        topLevelAwait(),
    ],
    server: {
        port: 5174,
        strictPort: true,
        hmr: {
            port: 5174,
        },
        fs: {
            allow: ['../../'],
        },
    },
});
