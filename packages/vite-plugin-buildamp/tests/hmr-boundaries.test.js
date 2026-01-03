import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('HMR Boundaries', () => {
  let mockServer;
  let mockWs;
  let fileWatchCallbacks = [];
  
  beforeEach(() => {
    // Mock Vite server
    mockWs = {
      send: vi.fn()
    };
    mockServer = {
      ws: mockWs,
      watcher: {
        add: vi.fn((path, options) => {
          // Store callbacks for triggering
          return {
            on: (event, callback) => {
              if (event === 'change') {
                fileWatchCallbacks.push({ path, callback });
              }
            }
          };
        })
      }
    };
    
    // Mock fs.watchFile
    vi.spyOn(fs, 'watchFile').mockImplementation((path, options, callback) => {
      // Store callback for triggering
      fileWatchCallbacks.push({ path, callback });
    });
    
    // Mock fs.unwatchFile
    vi.spyOn(fs, 'unwatchFile').mockImplementation(() => {});
  });

  afterEach(() => {
    fileWatchCallbacks = [];
    vi.restoreAllMocks();
  });

  test('reacts to .hamlet-gen/contracts.json changes', async () => {
    const plugin = await import('../index.js');
    const instance = plugin.default({ projectRoot: '/test/project' });
    const buildampPlugin = instance.find(p => p.name === 'vite-plugin-buildamp-reactive');
    
    // Configure server
    await buildampPlugin.configureServer(mockServer);
    
    // Find the contracts.json watcher
    const contractsWatcher = fileWatchCallbacks.find(w => 
      w.path.includes('.hamlet-gen/contracts.json')
    );
    
    expect(contractsWatcher).toBeDefined();
    
    // Trigger change with fs.watchFile callback signature (curr, prev)
    const curr = { mtime: new Date() };
    const prev = { mtime: new Date(Date.now() - 1000) };
    contractsWatcher.callback(curr, prev);
    
    // Should trigger HMR
    expect(mockWs.send).toHaveBeenCalledWith({ type: 'full-reload' });
  });

  test('does NOT react to owned Elm code changes', async () => {
    const plugin = await import('../index.js');
    const instance = plugin.default({ projectRoot: '/test/project' });
    const buildampPlugin = instance.find(p => p.name === 'vite-plugin-buildamp-reactive');
    
    await buildampPlugin.configureServer(mockServer);
    
    // Should not have watchers for Elm source files
    const elmWatcher = fileWatchCallbacks.find(w => 
      w.path.includes('src/') && !w.path.includes('.hamlet-gen')
    );
    
    expect(elmWatcher).toBeUndefined();
  });

  test('does NOT react to Rust model changes', async () => {
    const plugin = await import('../index.js');
    const instance = plugin.default({ projectRoot: '/test/project' });
    const buildampPlugin = instance.find(p => p.name === 'vite-plugin-buildamp-reactive');
    
    await buildampPlugin.configureServer(mockServer);
    
    // Should not have watchers for Rust files
    const rustWatcher = fileWatchCallbacks.find(w => 
      w.path.includes('.rs') || w.path.includes('models/')
    );
    
    expect(rustWatcher).toBeUndefined();
  });

  test('triggers full-reload on contract changes', async () => {
    const plugin = await import('../index.js');
    const instance = plugin.default({ projectRoot: '/test/project' });
    const buildampPlugin = instance.find(p => p.name === 'vite-plugin-buildamp-reactive');
    
    await buildampPlugin.configureServer(mockServer);
    
    // Find and trigger contracts change
    const contractsWatcher = fileWatchCallbacks.find(w => 
      w.path.includes('contracts.json')
    );
    
    const curr = { mtime: new Date() };
    const prev = { mtime: new Date(Date.now() - 1000) };
    contractsWatcher.callback(curr, prev);
    
    // Verify full reload, not module reload
    expect(mockWs.send).toHaveBeenCalledWith({ type: 'full-reload' });
    expect(mockWs.send).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'update' })
    );
  });
});