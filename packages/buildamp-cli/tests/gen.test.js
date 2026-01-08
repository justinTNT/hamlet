import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { gen, genElm, genWasm } from '../lib/gen.js';
import { spawn } from 'child_process';

// Mock child_process
jest.mock('child_process', () => ({
    spawn: jest.fn()
}));

// Mock fs
jest.mock('fs', () => ({
    existsSync: jest.fn()
}));

import fs from 'fs';

describe('gen module', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    
    describe('gen()', () => {
        test('calls genElm and genWasm', async () => {
            const projectPaths = {
                modelsDir: 'app/horatio/models',
                elmGlueDir: 'app/horatio/web/src/.hamlet-gen'
            };
            
            // Mock spawn for genElm
            const mockElmChild = {
                on: jest.fn((event, callback) => {
                    if (event === 'close') callback(0);
                }),
                stdout: null,
                stderr: null
            };
            
            // Mock spawn for genWasm
            const mockWasmChild = {
                on: jest.fn((event, callback) => {
                    if (event === 'close') callback(0);
                }),
                stdout: null,
                stderr: null
            };
            
            spawn.mockReturnValueOnce(mockElmChild).mockReturnValueOnce(mockWasmChild);
            fs.existsSync.mockReturnValue(true);
            
            await gen(projectPaths);
            
            expect(spawn).toHaveBeenCalledTimes(2);
        });
    });
    
    describe('genElm()', () => {
        test('throws if generation script not found', async () => {
            const projectPaths = {
                modelsDir: 'app/horatio/models'
            };
            
            fs.existsSync.mockReturnValue(false);
            
            await expect(genElm(projectPaths)).rejects.toThrow('Generation scripts not found');
        });
        
        test('runs generation script when found', async () => {
            const projectPaths = {
                modelsDir: 'app/horatio/models'
            };
            
            fs.existsSync.mockReturnValue(true);
            
            const mockChild = {
                on: jest.fn((event, callback) => {
                    if (event === 'close') callback(0);
                }),
                stdout: null,
                stderr: null
            };
            
            spawn.mockReturnValue(mockChild);
            
            await genElm(projectPaths);
            
            expect(spawn).toHaveBeenCalledWith('node', expect.arrayContaining(['generate-all.js']), expect.any(Object));
        });
    });
    
    describe('genWasm()', () => {
        test('checks for wasm-pack availability', async () => {
            const projectPaths = {
                modelsDir: 'app/horatio/models'
            };
            
            // Mock wasm-pack check failure
            const mockCheckChild = {
                on: jest.fn((event, callback) => {
                    if (event === 'close') callback(1);
                }),
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() }
            };
            
            spawn.mockReturnValue(mockCheckChild);
            
            await expect(genWasm(projectPaths)).rejects.toThrow('wasm-pack not found');
        });
        
        test('runs wasm-pack build when available', async () => {
            const projectPaths = {
                modelsDir: 'app/horatio/models'
            };
            
            // Mock successful wasm-pack check and build
            const mockChild = {
                on: jest.fn((event, callback) => {
                    if (event === 'close') callback(0);
                }),
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() }
            };
            
            spawn.mockReturnValue(mockChild);
            
            await genWasm(projectPaths);
            
            expect(spawn).toHaveBeenCalledWith('wasm-pack', ['--version'], expect.any(Object));
            expect(spawn).toHaveBeenCalledWith('wasm-pack', [
                'build',
                '--target', 'web',
                '--out-dir', 'pkg-web'
            ], expect.any(Object));
        });
    });
});