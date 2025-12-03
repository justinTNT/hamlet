import { defineConfig } from 'vite';

import { crx } from '@crxjs/vite-plugin';
import buildampPlugin from 'vite-plugin-buildamp';
import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync('./manifest.json'));

if (typeof global.File === 'undefined') {
    const { File } = await import('node:buffer');
    if (File) {
        global.File = File;
    } else {
        // Fallback or ignore if node:buffer doesn't have File (Node < 18.13?)
        // Node 18.14 should have it.
        // But 'node:buffer' File was added in v20? No, v18.13 experimental?
        // Let's try a dummy class if import fails.
        global.File = class File extends Blob {
            constructor(fileBits, fileName, options) {
                super(fileBits, options);
                this.name = fileName;
                this.lastModified = options?.lastModified || Date.now();
            }
        };
    }
}

export default defineConfig({
    plugins: [
        buildampPlugin({
            crateDir: path.resolve(__dirname, '../../'),
            wasmOutDirWeb: 'pkg-web',
            wasmOutDirNode: 'pkg-node'
        }),
        crx({ manifest }),
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
