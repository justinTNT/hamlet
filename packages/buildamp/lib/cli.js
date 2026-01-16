/**
 * BuildAmp CLI
 * Command-line interface for code generation
 */

import { Command } from 'commander';
import { generate, status } from './orchestrator.js';

const program = new Command();

program
    .name('buildamp')
    .description('WASM and code generation from Rust models')
    .version('0.1.0');

// Main gen command: buildamp gen [model-dir]
program
    .command('gen [model-dir]')
    .description('Generate code from Rust models')
    .option('-t, --target <target>', 'specific target (wasm, elm, db, api, etc.)')
    .action(async (modelDir, options) => {
        try {
            await generate({
                modelDir,
                target: options.target,
            });
        } catch (error) {
            console.error('❌ Generation failed:', error.message);
            process.exit(1);
        }
    });

// WASM-specific command with additional options
program
    .command('gen:wasm [model-dir]')
    .description('Generate wasm output from Rust models')
    .option('--target <target>', 'WASM target: web, node, or bundler (default: web)')
    .option('--force', 'Force rebuild even if up to date')
    .action(async (modelDir, options) => {
        try {
            await generate({
                modelDir,
                target: 'wasm',
                config: {
                    wasmTarget: options.target || 'web',
                    force: options.force || false
                }
            });
        } catch (error) {
            console.error('❌ wasm generation failed:', error.message);
            process.exit(1);
        }
    });

// JavaScript-specific command: buildamp gen:js [interface]
program
    .command('gen:js [interface]')
    .description('Generate JavaScript glue code (queries, routes, storage, etc.)')
    .action(async (modelDir) => {
        try {
            await generate({
                modelDir,
                target: 'js',
            });
        } catch (error) {
            console.error('❌ JavaScript generation failed:', error.message);
            process.exit(1);
        }
    });

// Elm-specific command: buildamp gen:elm [interface]
program
    .command('gen:elm [interface]')
    .description('Generate Elm types and modules')
    .action(async (modelDir) => {
        try {
            await generate({
                modelDir,
                target: 'elm',
            });
        } catch (error) {
            console.error('❌ Elm generation failed:', error.message);
            process.exit(1);
        }
    });

// Status command
program
    .command('status')
    .description('Show status of generated code vs source models')
    .action(async () => {
        try {
            await status();
        } catch (error) {
            console.error('❌ Status check failed:', error.message);
            process.exit(1);
        }
    });

/**
 * Run the CLI
 */
export function cli(argv) {
    program.parse(argv);
}

export { program };
