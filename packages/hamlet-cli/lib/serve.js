import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import { watch } from './watch.js';

/**
 * Start development server with hot reload
 */
export async function serve(projectPaths, options) {
    const port = parseInt(options.port) || 3737;
    
    console.log(chalk.green(`✓ Starting development server on port ${port}...`));
    console.log(chalk.gray('  Press Ctrl+C to stop'));
    console.log();
    
    // Check if dev-server.js exists
    const devServerPath = path.join(process.cwd(), 'dev-server.js');
    
    if (fs.existsSync(devServerPath)) {
        // Use existing dev-server.js
        console.log(chalk.gray('Using existing dev-server.js...'));
        
        const serverProcess = spawn('node', [devServerPath], {
            stdio: 'inherit',
            env: {
                ...process.env,
                PORT: port.toString()
            }
        });
        
        serverProcess.on('error', (error) => {
            console.error(chalk.red('✗ Server failed to start:'), error.message);
            process.exit(1);
        });
        
        serverProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(chalk.red(`✗ Server exited with code ${code}`));
                process.exit(code);
            }
        });
        
        // Handle shutdown
        process.on('SIGINT', () => {
            console.log('\n' + chalk.yellow('Shutting down...'));
            serverProcess.kill();
            process.exit(0);
        });
        
    } else {
        // Fallback: Start watch mode with a simple server
        console.log(chalk.yellow('⚠  No dev-server.js found, starting in watch mode only'));
        console.log(chalk.gray('  To enable hot reload, create a dev-server.js in your project'));
        
        // Start watch mode
        await watch(projectPaths);
    }
}