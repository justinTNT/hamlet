import { defineConfig } from 'vite';
import buildampPlugin from 'vite-plugin-buildamp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    buildampPlugin({
      crateDir: path.resolve(__dirname, '../../'),
      wasmOutDirWeb: 'pkg-web',
      wasmOutDirNode: 'pkg-node'
    })
  ],
  server: {
    fs: {
      allow: ['../..'],
    },
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  // Alias is handled by the plugin now, but we can keep it explicit if needed.
  // The plugin adds 'proto-rust' alias.
});
