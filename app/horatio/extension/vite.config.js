import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync('./manifest.json'));

export default defineConfig({
    plugins: [
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
