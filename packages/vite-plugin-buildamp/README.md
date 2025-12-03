# vite-plugin-buildamp

Vite plugin for BuildAmp framework integration. Enables seamless Rust + Elm development with hot module reloading and comprehensive build configuration.

## Installation

```bash
npm install vite-plugin-buildamp
```

## Basic Usage

```js
// vite.config.js
import { defineConfig } from 'vite';
import buildampPlugin from 'vite-plugin-buildamp';

export default defineConfig({
  plugins: [
    buildampPlugin({
      crateDir: path.resolve(__dirname, '../../')
    })
  ]
});
```

## Configuration

### Core Options

```js
buildampPlugin({
  // Required: Path to Rust crate directory
  crateDir: './my-rust-crate',
  
  // Optional: WASM output directories (defaults shown)
  wasmOutDirWeb: 'pkg-web',
  wasmOutDirNode: 'pkg-node',
  
  // Optional: File pattern to watch for changes
  watchPattern: 'src/**/*.rs',
  
  // Optional: Import alias for generated WASM
  alias: 'proto-rust'
})
```

### Build Configuration

```js
buildampPlugin({
  // Which WASM targets to build
  buildTargets: ['nodejs', 'web'], // or ['web'] for web-only
  
  // Use BuildAmp CLI or fallback to wasm-pack
  preferCli: true, // false to always use wasm-pack
  
  // Cargo features for CLI build
  cliFeatures: ['cli'], // additional features: ['cli', 'serde']
})
```

### Hot Module Reloading (HMR)

```js
buildampPlugin({
  hmr: {
    // Enable/disable HMR
    enabled: true,
    
    // HMR reload strategy
    mode: 'full-reload', // 'full-reload' | 'module-reload' | 'custom'
    
    // Debounce file changes (milliseconds)
    debounce: 100
  }
})
```

**HMR Modes:**
- **`full-reload`**: Complete page reload (most reliable)
- **`module-reload`**: Attempt to reload just WASM module (experimental)
- **`custom`**: No automatic reload, handle via build hooks

### File Watching

```js
buildampPlugin({
  watch: {
    // Files/directories to ignore
    ignored: ['**/target/**', '**/pkg-web/**', '**/pkg-node/**', '**/.git/**'],
    
    // Enable polling for network drives/containers
    polling: false,
    usePolling: false,
    interval: 1000
  }
})
```

### Logging Configuration

```js
buildampPlugin({
  logging: {
    // Enable/disable all logging
    enabled: true,
    
    // Log level: 'silent' | 'error' | 'warn' | 'info' | 'verbose'
    level: 'info',
    
    // Log message prefix
    prefix: '[BuildAmp]'
  }
})
```

### Build Hooks

```js
buildampPlugin({
  buildHooks: {
    // Called before WASM build starts
    beforeBuild: async () => {
      console.log('Starting WASM compilation...');
    },
    
    // Called after successful build
    afterBuild: async () => {
      console.log('WASM build completed successfully!');
      // Example: copy additional files, run validation, etc.
    },
    
    // Called when build fails
    onBuildError: async (error) => {
      console.error('WASM build failed:', error);
      // Example: send notifications, cleanup, etc.
    }
  }
})
```

### Plugin Integration

```js
buildampPlugin({
  // Pass-through configuration for vite-plugin-elm
  elm: {
    debug: false,
    optimize: true
  },
  
  // Pass-through configuration for vite-plugin-wasm
  wasm: {
    // Any vite-plugin-wasm options
  }
})
```

## Complete Configuration Example

```js
// vite.config.js
import { defineConfig } from 'vite';
import buildampPlugin from 'vite-plugin-buildamp';
import path from 'path';

export default defineConfig({
  plugins: [
    buildampPlugin({
      // Core paths
      crateDir: path.resolve(__dirname, '../rust-crate'),
      wasmOutDirWeb: 'dist/wasm',
      wasmOutDirNode: 'dist/wasm-node',
      
      // Build configuration
      buildTargets: ['web'], // Web-only build
      preferCli: true,
      
      // Development experience
      hmr: {
        enabled: true,
        mode: 'full-reload',
        debounce: 200
      },
      
      // File watching
      watch: {
        polling: true, // For Docker/network drives
        interval: 2000
      },
      
      // Logging
      logging: {
        level: 'verbose', // Detailed logging
        prefix: '[MyApp]'
      },
      
      // Build automation
      buildHooks: {
        beforeBuild: async () => {
          console.log('🦀 Building Rust...');
        },
        afterBuild: async () => {
          console.log('✅ Rust build complete!');
          // Run tests, copy files, etc.
        }
      },
      
      // Plugin integration
      elm: {
        debug: false,
        optimize: true
      }
    })
  ],
  
  server: {
    fs: {
      allow: ['..'] // Allow access to parent directory for monorepos
    }
  }
});
```

## Environment-Specific Configuration

### Development vs Production

```js
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  plugins: [
    buildampPlugin({
      crateDir: './rust-crate',
      
      // Different logging for dev vs prod
      logging: {
        level: mode === 'development' ? 'verbose' : 'warn'
      },
      
      // Disable HMR in production
      hmr: {
        enabled: mode === 'development'
      },
      
      // Production-specific build hooks
      buildHooks: mode === 'production' ? {
        afterBuild: async () => {
          // Run additional optimizations
          console.log('Running production optimizations...');
        }
      } : {}
    })
  ]
}));
```

### Monorepo Setup

```js
buildampPlugin({
  crateDir: path.resolve(__dirname, '../../'), // Go to monorepo root
  wasmOutDirWeb: 'packages/frontend/dist/wasm',
  watchPattern: 'crates/**/*.rs', // Watch multiple crates
  
  logging: {
    prefix: '[BuildAmp:Frontend]' // Distinguish from other apps
  }
})
```

## Troubleshooting

### Common Issues

**Build fails with "wasm-pack not found":**
```bash
cargo install wasm-pack
```

**HMR not working:**
- Try `mode: 'full-reload'` for reliability
- Check file watching patterns
- Enable `polling: true` for network drives

**Slow builds:**
- Increase `hmr.debounce` to reduce rebuild frequency
- Use `buildTargets: ['web']` if you don't need Node.js target
- Set `preferCli: false` to use wasm-pack directly

**Silent failures:**
- Set `logging.level: 'verbose'` for detailed output
- Use build hooks to catch and handle errors

### Performance Tips

1. **Reduce build targets**: Only build what you need
2. **Optimize file watching**: Exclude unnecessary directories
3. **Use debouncing**: Prevent excessive rebuilds during rapid file changes
4. **Enable polling judiciously**: Only when necessary for network drives

## Plugin Architecture

This plugin follows the shared core pattern:
- **Core logic**: Rust crate with CLI binary
- **Integration layer**: Vite plugin (this package)
- **Fallback support**: Direct wasm-pack when CLI unavailable

This enables future support for other build tools (Bun, webpack) while maintaining consistent behavior.