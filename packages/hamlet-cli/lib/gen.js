import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';

/**
 * Run a command and return a promise
 */
function runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: options.silent ? 'pipe' : 'inherit',
            ...options
        });
        
        let output = '';
        if (options.silent) {
            child.stdout?.on('data', (data) => {
                output += data.toString();
            });
            child.stderr?.on('data', (data) => {
                output += data.toString();
            });
        }
        
        child.on('close', (code) => {
            if (code === 0) {
                resolve(output);
            } else {
                reject(new Error(`Command failed with code ${code}: ${command} ${args.join(' ')}`));
            }
        });
        
        child.on('error', (error) => {
            reject(error);
        });
    });
}

/**
 * Generate all code (Elm + WASM)
 */
export async function gen(projectPaths) {
    console.log(chalk.gray('Running full generation pipeline...'));
    
    // Run all generation phases
    await genElm(projectPaths);
    await genWasm(projectPaths);
}

/**
 * Generate Elm code only
 */
export async function genElm(projectPaths) {
    console.log(chalk.gray('Generating Elm code...'));
    
    // Import and run the generation orchestrator
    const { runGeneration } = await import('./generation-orchestrator.js');
    const success = await runGeneration();
    
    if (!success) {
        throw new Error('Elm code generation failed');
    }
    
    console.log(chalk.green('  ✓ Elm code generated'));
}

/**
 * Generate WASM code only
 */
export async function genWasm(projectPaths) {
    console.log(chalk.gray('Generating WASM code...'));
    
    // Check if wasm-pack is available
    try {
        await runCommand('wasm-pack', ['--version'], { silent: true });
    } catch (error) {
        throw new Error('wasm-pack not found. Please install it: https://rustwasm.github.io/wasm-pack/installer/');
    }
    
    // Build WASM
    await runCommand('wasm-pack', [
        'build',
        '--target', 'web',
        '--out-dir', 'pkg-web'
    ], {
        cwd: process.cwd()
    });
    
    console.log(chalk.green('  ✓ WASM code generated'));
}