import { defineConfig } from 'vite';
import buildampPlugin from 'vite-plugin-buildamp';
import { plugin as elm } from 'vite-plugin-elm';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    elm(),
    buildampPlugin({
      crateDir: path.resolve(__dirname, '../../../'),
      logging: {
        level: 'info'
      },
      hmr: {
        enabled: true,
        mode: 'full-reload',
        debounce: 100
      }
    })
  ],
  server: {
    fs: {
      allow: ['../..', '../../../packages'],
    },
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  define: {
    global: 'globalThis',
  }
});
