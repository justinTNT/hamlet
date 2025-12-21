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
      // Core paths
      crateDir: path.resolve(__dirname, '../../../'),
      wasmOutDirWeb: 'pkg-web',
      wasmOutDirNode: 'pkg-node',
      
      // Enhanced configuration examples
      logging: {
        level: 'info' // Can be 'silent', 'error', 'warn', 'info', 'verbose'
      },
      
      hmr: {
        enabled: true,
        mode: 'full-reload', // 'full-reload' | 'module-reload' | 'custom'
        debounce: 100 // Debounce file changes
      },
      
      // Build hooks example (commented out)
      // buildHooks: {
      //   beforeBuild: async () => console.log('Starting WASM build...'),
      //   afterBuild: async () => console.log('WASM build completed!'),
      //   onBuildError: async (error) => console.error('Build failed:', error)
      // }
    })
  ],
  server: {
    fs: {
      allow: ['../..', '../../../pkg-web', '../../../packages'],
    },
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ['proto-rust']
  },
  assetsInclude: ['**/*.wasm'],
  // Alias is handled by the plugin now, but we can keep it explicit if needed.
  // The plugin adds 'proto-rust' alias.
});
