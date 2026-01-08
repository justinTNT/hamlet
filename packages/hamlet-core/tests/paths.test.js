import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { 
    discoverProjectPaths, 
    getContractsPath, 
    ensureGlueDirs, 
    isBuildAmpProject,
    getActiveApp,
    HAMLET_GEN_DIR,
    CONTRACTS_FILE
} from '../index.js';

describe('hamlet-core path utilities', () => {
    const testDir = path.join(process.cwd(), 'test-project');
    
    beforeEach(() => {
        fs.mkdirSync(testDir, { recursive: true });
    });
    
    afterEach(() => {
        fs.rmSync(testDir, { recursive: true, force: true });
    });
    
    describe('discoverProjectPaths', () => {
        test('detects BuildAmp framework project structure', () => {
            // Create BuildAmp structure
            fs.mkdirSync(path.join(testDir, 'app/horatio/models'), { recursive: true });
            
            const paths = discoverProjectPaths(testDir);
            
            expect(paths.modelsDir).toBe('app/horatio/models');
            expect(paths.elmGlueDir).toBe('app/horatio/web/src/.hamlet-gen');
            expect(paths.jsGlueDir).toBe('app/horatio/server/.hamlet-gen');
            expect(paths.serverHandlersDir).toBe('app/horatio/server/src/Api/Handlers');
        });
        
        test('falls back to simple project structure', () => {
            // No BuildAmp structure
            const paths = discoverProjectPaths(testDir);
            
            expect(paths.modelsDir).toBe('src/models');
            expect(paths.elmGlueDir).toBe('src/.hamlet-gen');
            expect(paths.jsGlueDir).toBe('.hamlet-gen');
            expect(paths.elmApiDir).toBe('src/Api');
        });
        
        test('uses custom app from environment variable', () => {
            // Set env var
            const originalEnv = process.env.HAMLET_APP;
            process.env.HAMLET_APP = 'playground';
            
            // Create custom app structure
            fs.mkdirSync(path.join(testDir, 'app/playground/models'), { recursive: true });
            
            const paths = discoverProjectPaths(testDir);
            
            expect(paths.appName).toBe('playground');
            expect(paths.modelsDir).toBe('app/playground/models');
            expect(paths.elmGlueDir).toBe('app/playground/web/src/.hamlet-gen');
            expect(paths.jsGlueDir).toBe('app/playground/server/.hamlet-gen');
            
            // Restore env
            if (originalEnv) {
                process.env.HAMLET_APP = originalEnv;
            } else {
                delete process.env.HAMLET_APP;
            }
        });
        
        test('uses custom app from package.json config', () => {
            // Create package.json with hamlet config
            const packageJson = {
                "hamlet": {
                    "defaultApp": "my-example"
                }
            };
            fs.writeFileSync(
                path.join(testDir, 'package.json'),
                JSON.stringify(packageJson, null, 2)
            );
            
            // Create custom app structure
            fs.mkdirSync(path.join(testDir, 'app/my-example/models'), { recursive: true });
            
            const paths = discoverProjectPaths(testDir);
            
            expect(paths.appName).toBe('my-example');
            expect(paths.modelsDir).toBe('app/my-example/models');
        });
        
        test('includes legacy paths for migration', () => {
            const paths = discoverProjectPaths(testDir);
            
            expect(paths.legacyElmOutputDir).toBe('app/generated');
            expect(paths.legacyJsOutputDir).toBe('packages/hamlet-server/generated');
        });
    });
    
    describe('getContractsPath', () => {
        test('returns correct path for contracts.json', () => {
            const paths = { elmGlueDir: 'app/horatio/web/src/.hamlet-gen' };
            const contractsPath = getContractsPath(paths);
            
            expect(contractsPath).toBe('app/horatio/web/src/.hamlet-gen/contracts.json');
        });
    });
    
    describe('ensureGlueDirs', () => {
        test('creates .hamlet-gen directories if missing', () => {
            const paths = {
                elmGlueDir: path.join(testDir, 'elm/.hamlet-gen'),
                jsGlueDir: path.join(testDir, 'js/.hamlet-gen')
            };
            
            ensureGlueDirs(paths);
            
            expect(fs.existsSync(paths.elmGlueDir)).toBe(true);
            expect(fs.existsSync(paths.jsGlueDir)).toBe(true);
        });
        
        test('does not error if directories already exist', () => {
            const paths = {
                elmGlueDir: path.join(testDir, 'elm/.hamlet-gen'),
                jsGlueDir: path.join(testDir, 'js/.hamlet-gen')
            };
            
            // Create directories first
            fs.mkdirSync(paths.elmGlueDir, { recursive: true });
            fs.mkdirSync(paths.jsGlueDir, { recursive: true });
            
            // Should not throw
            expect(() => ensureGlueDirs(paths)).not.toThrow();
        });
    });
    
    describe('isBuildAmpProject', () => {
        test('returns true for BuildAmp project', () => {
            fs.mkdirSync(path.join(testDir, 'app/horatio/models'), { recursive: true });
            
            expect(isBuildAmpProject(testDir)).toBe(true);
        });
        
        test('returns false for simple project', () => {
            expect(isBuildAmpProject(testDir)).toBe(false);
        });
    });
    
    describe('constants', () => {
        test('exports expected constants', () => {
            expect(HAMLET_GEN_DIR).toBe('.hamlet-gen');
            expect(CONTRACTS_FILE).toBe('contracts.json');
        });
    });
});