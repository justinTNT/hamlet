import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

describe('Vite Plugin Reactive Mode', () => {
  test('plugin exports required Vite hooks', async () => {
    // Once refactored, the plugin should export these minimal hooks
    const plugin = await import('../index.js');
    const instance = plugin.default({});

    // Should return array with minimal plugin
    expect(Array.isArray(instance)).toBe(true);

    const buildampPlugin = instance.find(p => p.name === 'vite-plugin-buildamp-reactive');
    expect(buildampPlugin).toBeDefined();
    expect(buildampPlugin.name).toBe('vite-plugin-buildamp-reactive');
    expect(buildampPlugin.config).toBeDefined();
    // No configureServer - plugin is purely for aliases now
  });

  test('configures aliases to .generated directory', async () => {
    const plugin = await import('../index.js');
    const instance = plugin.default({ projectRoot: '/test/project' });
    const buildampPlugin = instance.find(p => p.name === 'vite-plugin-buildamp-reactive');

    const config = buildampPlugin.config({}, { command: 'serve' });

    // Should set up aliases for importing from .generated
    expect(config.resolve.alias).toBeDefined();
    expect(config.resolve.alias['@generated']).toContain('.generated');
    expect(config.resolve.alias['@buildamp']).toContain('.generated');
  });

  test('does NOT contain file watching logic', async () => {
    // Read the refactored plugin source
    const pluginSource = readFileSync(path.join(__dirname, '..', 'index.js'), 'utf-8');
    
    // Should not contain chokidar or file watching
    expect(pluginSource).not.toContain('chokidar');
    expect(pluginSource).not.toContain('watch(');
    expect(pluginSource).not.toContain('watcher.on');
    expect(pluginSource).not.toContain("watchPattern");
  });

  test('does NOT contain build orchestration', async () => {
    const pluginSource = readFileSync(path.join(__dirname, '..', 'index.js'), 'utf-8');
    
    // Should not contain build logic
    expect(pluginSource).not.toContain('runBuildAmpBuild');
    expect(pluginSource).not.toContain('fallbackWasmPack');
    expect(pluginSource).not.toContain('cargo run');
    expect(pluginSource).not.toContain('wasm-pack');
    expect(pluginSource).not.toContain('spawn(');
  });

  test('plugin is under 100 LOC', async () => {
    const pluginSource = readFileSync(path.join(__dirname, '..', 'index.js'), 'utf-8');
    const lines = pluginSource.split('\n');
    
    // Count non-empty, non-comment lines
    const codeLinesCount = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !trimmed.startsWith('//') && !trimmed.startsWith('/*');
    }).length;
    
    expect(codeLinesCount).toBeLessThanOrEqual(100);
  });
});