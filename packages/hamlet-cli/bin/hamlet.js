#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { discoverProjectPaths, ensureGlueDirs, getContractsPath, HAMLET_GEN_DIR } from 'hamlet-core';
import { calculateContractHash, isDirty, verifyIntegrity } from 'hamlet-contracts';
import { gen, genElm, genWasm } from '../lib/gen.js';
import { watch } from '../lib/watch.js';
import { serve } from '../lib/serve.js';
import fs from 'fs';
import path from 'path';

const program = new Command();

program
    .name('hamlet')
    .description('Hamlet build system for BuildAmp framework')
    .version('0.1.0');

program
    .command('gen')
    .description('Generate all code (Elm + WASM)')
    .option('-f, --force', 'Force regeneration even if contracts are clean')
    .action(async (options) => {
        try {
            console.log(chalk.blue('🔨 Hamlet Generation'));
            
            const projectPaths = discoverProjectPaths();
            const contractsPath = getContractsPath(projectPaths);
            
            // Check if generation is needed
            if (!options.force && fs.existsSync(contractsPath)) {
                const dirty = await isDirty(projectPaths.modelsDir, contractsPath);
                if (!dirty) {
                    console.log(chalk.green('✓ Contracts are clean, nothing to generate'));
                    console.log(chalk.gray('  (use --force to regenerate anyway)'));
                    return;
                }
            }
            
            // Ensure .hamlet-gen directories exist
            ensureGlueDirs(projectPaths);
            
            // Run generation
            await gen(projectPaths);
            
            // Update contracts
            const hash = await calculateContractHash(projectPaths.modelsDir);
            const contracts = {
                version: '1.0',
                hash,
                timestamp: new Date().toISOString(),
                modelsDir: projectPaths.modelsDir
            };
            
            fs.writeFileSync(contractsPath, JSON.stringify(contracts, null, 2));
            console.log(chalk.green('✓ Generation complete'));
            
        } catch (error) {
            console.error(chalk.red('✗ Generation failed:'), error.message);
            process.exit(1);
        }
    });

program
    .command('gen:elm')
    .description('Generate only Elm code')
    .option('-f, --force', 'Force regeneration even if contracts are clean')
    .action(async (options) => {
        try {
            console.log(chalk.blue('🔨 Hamlet Elm Generation'));
            
            const projectPaths = discoverProjectPaths();
            
            // Ensure .hamlet-gen directories exist
            ensureGlueDirs(projectPaths);
            
            // Run Elm generation only
            await genElm(projectPaths);
            
            console.log(chalk.green('✓ Elm generation complete'));
            
        } catch (error) {
            console.error(chalk.red('✗ Elm generation failed:'), error.message);
            process.exit(1);
        }
    });

program
    .command('gen:wasm')
    .description('Generate only WASM code')
    .action(async (options) => {
        try {
            console.log(chalk.blue('🔨 Hamlet WASM Generation'));
            
            const projectPaths = discoverProjectPaths();
            
            // Run WASM generation only
            await genWasm(projectPaths);
            
            console.log(chalk.green('✓ WASM generation complete'));
            
        } catch (error) {
            console.error(chalk.red('✗ WASM generation failed:'), error.message);
            process.exit(1);
        }
    });

program
    .command('watch')
    .description('Watch for changes and regenerate automatically')
    .action(async () => {
        try {
            console.log(chalk.blue('👁  Hamlet Watch Mode'));
            
            const projectPaths = discoverProjectPaths();
            
            // Ensure .hamlet-gen directories exist
            ensureGlueDirs(projectPaths);
            
            // Initial generation
            const contractsPath = getContractsPath(projectPaths);
            const dirty = await isDirty(projectPaths.modelsDir, contractsPath);
            if (dirty) {
                console.log(chalk.yellow('⚠  Contracts are dirty, running initial generation...'));
                await gen(projectPaths);
                
                // Update contracts
                const hash = await calculateContractHash(projectPaths.modelsDir);
                const contracts = {
                    version: '1.0',
                    hash,
                    timestamp: new Date().toISOString(),
                    modelsDir: projectPaths.modelsDir
                };
                
                fs.writeFileSync(contractsPath, JSON.stringify(contracts, null, 2));
            }
            
            // Start watching
            await watch(projectPaths);
            
        } catch (error) {
            console.error(chalk.red('✗ Watch failed:'), error.message);
            process.exit(1);
        }
    });

program
    .command('serve')
    .description('Start development server with hot reload')
    .option('-p, --port <number>', 'Server port', '3737')
    .action(async (options) => {
        try {
            console.log(chalk.blue('🚀 Hamlet Development Server'));
            
            const projectPaths = discoverProjectPaths();
            
            // Verify integrity before starting
            try {
                await verifyIntegrity(projectPaths);
            } catch (error) {
                console.error(chalk.red('✗ Integrity check failed:'), error.message);
                console.error(chalk.yellow('  Run "hamlet gen" to fix'));
                process.exit(1);
            }
            
            // Start server
            await serve(projectPaths, options);
            
        } catch (error) {
            console.error(chalk.red('✗ Server failed:'), error.message);
            process.exit(1);
        }
    });

program.parse();