/**
 * BuildAmp CLI
 * Code generation from Rust models
 *
 * Usage:
 *   buildamp gen --src ./models --dest ./generated
 */

import { Command } from 'commander';
import { generate } from './orchestrator.js';

const program = new Command();

program
    .name('buildamp')
    .description('Code generation from Rust models')
    .version('0.1.0');

program
    .command('gen')
    .description('Generate Elm/JS/SQL from Rust models')
    .requiredOption('--src <path>', 'Path to Rust models directory')
    .requiredOption('--dest <path>', 'Path to output directory')
    .action(async (options) => {
        try {
            await generate({
                src: options.src,
                dest: options.dest
            });
        } catch (error) {
            console.error('Generation failed:', error.message);
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
