import { defineConfig } from 'vite';
import elmPlugin from 'vite-plugin-elm';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

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
});
