import { defineConfig } from 'vite';
import elmPlugin from 'vite-plugin-elm';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    elmPlugin(),
    wasm(),
    topLevelAwait()
  ],
  server: {
    fs: {
      allow: ['../..'],
    },
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  resolve: {
    alias: {
      'proto-rust': path.resolve(__dirname, '../../pkg-web/proto_rust.js')
    }
  }
});
