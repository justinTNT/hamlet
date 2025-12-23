import { defineConfig } from 'vite';
import { plugin as elm } from 'vite-plugin-elm';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: '/admin/ui/',
  plugins: [
    elm()
  ],
  server: {
    fs: {
      allow: ['../..', '../../../pkg-web', '../../../packages'],
    },
    proxy: {
      '/admin/api': 'http://localhost:3000',
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ['proto-rust']
  },
  assetsInclude: ['**/*.wasm'],
});