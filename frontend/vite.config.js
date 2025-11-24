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
      // Allow serving files from one level up to the project root
      allow: ['..'],
    },
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
