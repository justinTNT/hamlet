import { defineConfig } from 'vite';
if (!globalThis.File) {
    globalThis.File = class File extends Blob {
        constructor(fileBits, fileName, options) {
            super(fileBits, options);
            this.name = fileName;
            this.lastModified = options?.lastModified ?? Date.now();
        }
    };
}

import { crx } from '@crxjs/vite-plugin';
import elmPlugin from 'vite-plugin-elm';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { readFileSync } from 'fs';

const manifest = JSON.parse(readFileSync('./manifest.json'));

export default defineConfig({
    plugins: [
        elmPlugin(),
        wasm(),
        topLevelAwait(),
        crx({ manifest }),
    ],
    server: {
        port: 5174,
        strictPort: true,
        hmr: {
            port: 5174,
        },
    },
});
