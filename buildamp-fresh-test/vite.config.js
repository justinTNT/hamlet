import { defineConfig } from 'vite';
import buildampPlugin from 'vite-plugin-buildamp';
import path from 'path';

export default defineConfig({
  plugins: [
    // Test with fresh project setup - current directory has the crate
    buildampPlugin({
      crateDir: '.',  // This project root contains the Rust crate
      wasmOutDirWeb: 'pkg-web',
      wasmOutDirNode: 'pkg-node',
      preferCli: false,  // Use wasm-pack directly for this test
      logging: {
        level: 'verbose'  // See detailed output
      }
    })
  ]
});