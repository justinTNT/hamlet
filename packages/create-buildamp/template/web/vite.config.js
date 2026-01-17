import { defineConfig } from 'vite';
import buildampPlugin from 'vite-plugin-buildamp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [
        buildampPlugin({
            crateDir: path.resolve(__dirname, '../')
        })
    ],
    server: {
        proxy: {
            '/api': 'http://localhost:3000',
        },
    },
});
