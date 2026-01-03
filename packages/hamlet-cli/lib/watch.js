import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { calculateContractHash, isDirty } from 'hamlet-contracts';
import { getContractsPath } from 'hamlet-core';
import { gen, genElm, genWasm } from './gen.js';

/**
 * Detect which generation phase to run based on file path
 */
function getGenerationPhaseForFile(filePath) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    if (normalizedPath.includes('/models/db/')) {
        return 'database';
    } else if (normalizedPath.includes('/models/api/')) {
        return 'api';
    } else if (normalizedPath.includes('/models/storage/')) {
        return 'browser';
    } else if (normalizedPath.includes('/models/kv/')) {
        return 'kv';
    } else if (normalizedPath.includes('/models/sse/')) {
        return 'sse';
    } else if (normalizedPath.includes('/models/events/')) {
        return 'shared';
    }
    
    return 'all';
}

/**
 * Watch for changes and regenerate
 */
export async function watch(projectPaths) {
    console.log(chalk.green('✓ Watching for changes...'));
    console.log(chalk.gray(`  Models: ${projectPaths.modelsDir}`));
    console.log(chalk.gray('  Press Ctrl+C to stop'));
    console.log();
    
    // Debounce timer
    let debounceTimer = null;
    const DEBOUNCE_MS = 500;
    
    // Watch the models directory
    fs.watch(projectPaths.modelsDir, { recursive: true }, async (eventType, filename) => {
        if (!filename || !filename.endsWith('.rs')) {
            return;
        }
        
        // Clear existing timer
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }
        
        // Set new timer
        debounceTimer = setTimeout(async () => {
            try {
                const fullPath = path.join(projectPaths.modelsDir, filename);
                const phase = getGenerationPhaseForFile(fullPath);
                
                console.log(chalk.blue(`\n⟲ Change detected: ${filename}`));
                console.log(chalk.gray(`  Phase: ${phase}`));
                
                // Check if dirty
                const contractsPath = getContractsPath(projectPaths);
                const dirty = await isDirty(projectPaths.modelsDir, contractsPath);
                
                if (!dirty) {
                    console.log(chalk.yellow('  No model changes detected (non-model file?)'));
                    return;
                }
                
                // Run generation
                // For now, always run full generation
                // TODO: Implement targeted generation based on phase
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
                
                console.log(chalk.green('✓ Regeneration complete'));
                console.log();
                
            } catch (error) {
                console.error(chalk.red('✗ Regeneration failed:'), error.message);
                console.log();
            }
        }, DEBOUNCE_MS);
    });
    
    // Keep the process alive
    process.stdin.resume();
}