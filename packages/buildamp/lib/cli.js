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

// Target-specific shortcuts: buildamp gen:wasm [model-dir]
const targets = ['wasm', 'elm', 'db', 'api', 'storage', 'kv', 'sse', 'handlers', 'admin'];

for (const target of targets) {
    program
        .command(`gen:${target} [model-dir]`)
        .description(`Generate ${target} output from Rust models`)
        .action(async (modelDir) => {
            try {
                await generate({
                    modelDir,
                    target,
                });
            } catch (error) {
                console.error(`❌ ${target} generation failed:`, error.message);
                process.exit(1);
            }
        });
}

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
