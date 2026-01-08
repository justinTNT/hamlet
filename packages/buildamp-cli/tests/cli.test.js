import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// Helper to run CLI commands
function runCLI(args) {
    return new Promise((resolve) => {
        const cliPath = path.join(__dirname, '..', 'bin', 'hamlet.js');
        const child = spawn('node', [cliPath, ...args], {
            env: { ...process.env, NO_COLOR: '1' } // Disable colors for testing
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        child.on('close', (code) => {
            resolve({ code, stdout, stderr });
        });
    });
}

describe('hamlet CLI', () => {
    describe('basic commands', () => {
        test('shows help', async () => {
            const { code, stdout } = await runCLI(['--help']);
            expect(code).toBe(0);
            expect(stdout).toContain('hamlet');
            expect(stdout).toContain('gen');
            expect(stdout).toContain('watch');
            expect(stdout).toContain('serve');
        });
        
        test('shows version', async () => {
            const { code, stdout } = await runCLI(['--version']);
            expect(code).toBe(0);
            expect(stdout).toContain('0.1.0');
        });
    });
    
    describe('gen command', () => {
        test('shows gen help', async () => {
            const { code, stdout } = await runCLI(['gen', '--help']);
            expect(code).toBe(0);
            expect(stdout).toContain('Generate all code');
            expect(stdout).toContain('--force');
        });
        
        test('shows gen:elm help', async () => {
            const { code, stdout } = await runCLI(['gen:elm', '--help']);
            expect(code).toBe(0);
            expect(stdout).toContain('Generate only Elm code');
        });
        
        test('shows gen:wasm help', async () => {
            const { code, stdout } = await runCLI(['gen:wasm', '--help']);
            expect(code).toBe(0);
            expect(stdout).toContain('Generate only WASM code');
        });
    });
    
    describe('watch command', () => {
        test('shows watch help', async () => {
            const { code, stdout } = await runCLI(['watch', '--help']);
            expect(code).toBe(0);
            expect(stdout).toContain('Watch for changes');
        });
    });
    
    describe('serve command', () => {
        test('shows serve help', async () => {
            const { code, stdout } = await runCLI(['serve', '--help']);
            expect(code).toBe(0);
            expect(stdout).toContain('Start development server');
            expect(stdout).toContain('--port');
        });
    });
});