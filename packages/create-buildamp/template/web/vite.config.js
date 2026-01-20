import { defineConfig } from 'vite';
import buildampPlugin from 'vite-plugin-buildamp';

export default defineConfig({
    plugins: [
        buildampPlugin()
    ],
    server: {
        proxy: {
            '/api': 'http://localhost:3000',
        },
    },
});
