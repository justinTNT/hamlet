#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import prompts from 'prompts';
import { red, green, bold, cyan, yellow } from 'kolorist';

const cwd = process.cwd();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        codegenOnly: false,
        fromModels: null,
        dryRun: false,
        output: null,
        help: false,
        projectName: null
    };
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg === '--codegen-only') {
            options.codegenOnly = true;
        } else if (arg === '--from-models') {
            options.fromModels = args[++i];
        } else if (arg === '--dry-run') {
            options.dryRun = true;
        } else if (arg === '--output' || arg === '-o') {
            options.output = args[++i];
        } else if (arg === '--help' || arg === '-h') {
            options.help = true;
        } else if (!arg.startsWith('--') && !options.projectName) {
            options.projectName = arg;
        }
    }
    
    return options;
}

function showHelp() {
    console.log(`
${bold('create-buildamp')} - BuildAmp project generator

${bold('USAGE:')}
  create-buildamp [PROJECT_NAME]                    Create new app from template
  create-buildamp --codegen-only [OPTIONS]         Generate WASM and types only
  create-buildamp --from-models <DIR> <PROJECT>    Create app from existing models

${bold('OPTIONS:')}
  --codegen-only              Generate WASM, JS, and TypeScript definitions
  --from-models <dir>         Use existing models directory as source
  --output, -o <dir>          Output directory (default: dist/ for codegen)
  --dry-run                   Show what would be generated without creating files
  --help, -h                  Show this help message

${bold('EXAMPLES:')}
  ${cyan('create-buildamp my-app')}                      Create new app
  ${cyan('create-buildamp --codegen-only --output dist')} Generate artifacts only
  ${cyan('create-buildamp --from-models src/models test-app')} App from models
  ${cyan('create-buildamp --dry-run --from-models src/models')}   Preview generation
`);
}

async function init() {
    const options = parseArgs();
    
    if (options.help) {
        showHelp();
        return;
    }
    
    if (options.codegenOnly) {
        await handleCodegenOnly(options);
        return;
    }
    
    if (options.fromModels) {
        await handleFromModels(options);
        return;
    }
    
    // Traditional template scaffolding
    await handleTraditionalScaffolding(options);
}

async function handleCodegenOnly(options) {
    const outputDir = options.output || 'dist';
    
    if (options.dryRun) {
        console.log(`${yellow('DRY RUN:')} Would generate WASM artifacts to ${bold(outputDir)}/`);
        console.log(`  - buildamp.wasm`);
        console.log(`  - buildamp.js`);
        console.log(`  - buildamp.d.ts`);
        console.log(`  - infrastructure.sql`);
        console.log(`  - manifest.json`);
        console.log(`  - elm/`);
        console.log(`    - Api.elm`);
        console.log(`    - Database.elm`);
        console.log(`    - Events.elm`);
        console.log(`    - Storage.elm`);
        console.log(`    - KeyValue.elm`);
        console.log(`    - ServerSentEvents.elm`);
        console.log(`    - handlers/`);
        console.log(`      - GetFeedHandler.elm`);
        console.log(`      - SubmitItemHandler.elm`);
        console.log(`      - SubmitCommentHandler.elm`);
        console.log(`    - webhooks/`);
        console.log(`      - SendWelcomeEmailWebhook.elm`);
        console.log(`      - ProcessVideoWebhook.elm`);
        return;
    }
    
    console.log(`${cyan('Generating WASM artifacts...')}`);
    
    // Create output directory
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    try {
        // Build WASM package
        console.log('Building WASM package...');
        execSync('cargo build --release', { stdio: 'inherit' });
        execSync('wasm-pack build --target web --out-dir pkg-web', { stdio: 'inherit' });
        
        // Copy WASM artifacts
        const wasmFiles = ['pkg-web/proto_rust.js', 'pkg-web/proto_rust_bg.wasm', 'pkg-web/proto_rust.d.ts'];
        for (const file of wasmFiles) {
            if (fs.existsSync(file)) {
                const destName = file.replace('pkg-web/proto_rust', 'buildamp').replace('_bg', '');
                fs.copyFileSync(file, path.join(outputDir, path.basename(destName)));
            }
        }
        
        // Generate infrastructure files using Node.js to call WASM
        console.log('Generating infrastructure files...');
        try {
            await generateInfrastructureFiles(outputDir);
        } catch (error) {
            console.warn(`${yellow('Warning:')} Infrastructure generation skipped: ${error.message}`);
        }
        
        // Generate all types using main project's generation scripts
        console.log('Generating Elm types...');
        try {
            await generateUsingMainScripts(outputDir);
        } catch (error) {
            console.warn(`${yellow('Warning:')} Generation skipped: ${error.message}`);
        }
        
        console.log(`${green('✓')} WASM artifacts generated in ${bold(outputDir)}/`);
        console.log(`\n${bold('Generated files:')}`);
        fs.readdirSync(outputDir).forEach(file => {
            console.log(`  - ${file}`);
        });
        
    } catch (error) {
        console.error(`${red('Error:')} Failed to generate WASM artifacts`);
        console.error(error.message);
        process.exit(1);
    }
}

async function handleFromModels(options) {
    const modelsDir = options.fromModels;
    const projectName = options.projectName || 'my-buildamp-app';
    
    if (!fs.existsSync(modelsDir)) {
        console.error(`${red('Error:')} Models directory not found: ${modelsDir}`);
        process.exit(1);
    }
    
    if (options.dryRun) {
        console.log(`${yellow('DRY RUN:')} Would create app ${bold(projectName)} from models in ${bold(modelsDir)}`);
        
        // Show discovered models
        const models = await discoverModels(modelsDir);
        if (models.length > 0) {
            console.log(`\n${bold('Discovered models:')}`);
            models.forEach(model => console.log(`  - ${model}`));
        }
        return;
    }
    
    console.log(`${cyan('Creating app')} ${bold(projectName)} ${cyan('from models in')} ${bold(modelsDir)}`);
    
    // Create traditional scaffold first
    const tempOptions = { projectName };
    await handleTraditionalScaffolding(tempOptions);
    
    // Copy models over
    const targetModelsDir = path.join(cwd, projectName, 'src', 'models');
    console.log(`Copying models from ${modelsDir} to ${targetModelsDir}...`);
    copyDir(modelsDir, targetModelsDir);
    
    console.log(`${green('✓')} App created with your models!`);
}

async function handleTraditionalScaffolding(options) {
    let targetDir = options.projectName;

    const defaultProjectName = 'my-buildamp-app';

    let result = {};

    try {
        result = await prompts(
            [
                {
                    type: targetDir ? null : 'text',
                    name: 'projectName',
                    message: 'Project name:',
                    initial: defaultProjectName,
                    onState: (state) => {
                        targetDir = state.value.trim() || defaultProjectName;
                    },
                },
                {
                    type: () =>
                        !fs.existsSync(targetDir) || isEmpty(targetDir) ? null : 'confirm',
                    name: 'overwrite',
                    message: () =>
                        (targetDir === '.'
                            ? 'Current directory'
                            : `Target directory "${targetDir}"`) +
                        ' is not empty. Remove existing files and continue?',
                },
                {
                    type: (_, { overwrite } = {}) => {
                        if (overwrite === false) {
                            throw new Error(red('✖') + ' Operation cancelled');
                        }
                        return null;
                    },
                    name: 'overwriteChecker',
                },
            ],
            {
                onCancel: () => {
                    throw new Error(red('✖') + ' Operation cancelled');
                },
            }
        );
    } catch (cancelled) {
        console.log(cancelled.message);
        return;
    }

    const { projectName } = result;
    const root = path.join(cwd, targetDir);

    if (fs.existsSync(root) && !isEmpty(root)) {
        emptyDir(root);
    } else if (!fs.existsSync(root)) {
        fs.mkdirSync(root, { recursive: true });
    }

    console.log(`\nScaffolding project in ${root}...`);

    const templateDir = path.resolve(__dirname, 'template');
    
    // Debug template directory
    console.log(`Looking for template in: ${templateDir}`);
    if (!fs.existsSync(templateDir)) {
        console.error(`Error: Template directory not found at ${templateDir}`);
        process.exit(1);
    }

    const write = (file, content) => {
        const targetPath = path.join(root, file);
        if (content) {
            fs.writeFileSync(targetPath, content);
        } else {
            copy(path.join(templateDir, file), targetPath);
        }
    };

    const files = fs.readdirSync(templateDir);
    console.log(`Found ${files.length} template files: ${files.join(', ')}`);
    for (const file of files) {
        if (file === 'package.json') {
            const pkg = JSON.parse(fs.readFileSync(path.join(templateDir, file), 'utf-8'));
            pkg.name = path.basename(root);
            write(file, JSON.stringify(pkg, null, 2));
        } else if (file === '_gitignore') {
            write('.gitignore', fs.readFileSync(path.join(templateDir, file), 'utf-8'));
        } else {
            write(file);
        }
    }

    console.log(`\n${green('Done.')} Now run:\n`);
    if (root !== cwd) {
        console.log(`  cd ${path.relative(cwd, root)}`);
    }
    console.log(`  npm install`);
    console.log(`  npm run dev`);
    console.log();
}

function copy(src, dest) {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
        copyDir(src, dest);
    } else {
        fs.copyFileSync(src, dest);
    }
}

function copyDir(srcDir, destDir) {
    fs.mkdirSync(destDir, { recursive: true });
    for (const file of fs.readdirSync(srcDir)) {
        const srcFile = path.resolve(srcDir, file);
        const destFile = path.resolve(destDir, file);
        copy(srcFile, destFile);
    }
}

function isEmpty(path) {
    const files = fs.readdirSync(path);
    return files.length === 0 || (files.length === 1 && files[0] === '.git');
}

function emptyDir(dir) {
    if (!fs.existsSync(dir)) {
        return;
    }
    for (const file of fs.readdirSync(dir)) {
        if (file === '.git') {
            continue;
        }
        fs.rmSync(path.resolve(dir, file), { recursive: true, force: true });
    }
}

// Dynamic imports for generation scripts from shared directory
async function loadGenerationScripts() {
    // Look for shared generation directory relative to Hamlet root
    const sharedGenerationDir = path.join(process.cwd(), 'shared', 'generation');
    
    if (!fs.existsSync(sharedGenerationDir)) {
        throw new Error(`Shared generation scripts not found: ${sharedGenerationDir}`);
    }
    
    try {
        const { generateApiRoutes } = await import(path.join(sharedGenerationDir, 'api_routes.js'));
        const { generateDatabaseQueries } = await import(path.join(sharedGenerationDir, 'database_queries.js'));
        const { generateBrowserStorage } = await import(path.join(sharedGenerationDir, 'browser_storage.js'));
        const { generateKvStore } = await import(path.join(sharedGenerationDir, 'kv_store.js'));
        const { generateSSEEvents } = await import(path.join(sharedGenerationDir, 'sse_events.js'));
        const { generateElmSharedModules } = await import(path.join(sharedGenerationDir, 'elm_shared_modules.js'));
        const { generateElmHandlers } = await import(path.join(sharedGenerationDir, 'elm_handlers.js'));
        
        return {
            generateApiRoutes,
            generateDatabaseQueries,
            generateBrowserStorage,
            generateKvStore,
            generateSSEEvents,
            generateElmSharedModules,
            generateElmHandlers
        };
    } catch (error) {
        throw new Error(`Failed to load shared generation scripts: ${error.message}`);
    }
}

// Use main project's generation scripts instead of separate system
async function generateUsingMainScripts(outputDir) {
    console.log('Using main project generation scripts...');
    
    // Load generation scripts dynamically
    const scripts = await loadGenerationScripts();
    
    // Create proper directory structure matching main project
    const jsOutputDir = path.join(outputDir, 'packages', 'hamlet-server', 'generated');
    const elmOutputDir = path.join(outputDir, 'app', 'generated');
    const sharedElmOutputDir = path.join(outputDir, 'app', 'horatio', 'server', 'generated');
    const handlersOutputDir = path.join(outputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers');
    
    // Ensure directories exist
    fs.mkdirSync(jsOutputDir, { recursive: true });
    fs.mkdirSync(elmOutputDir, { recursive: true });
    fs.mkdirSync(sharedElmOutputDir, { recursive: true });
    fs.mkdirSync(handlersOutputDir, { recursive: true });
    
    const results = {};
    
    try {
        // Run all generation phases using the main scripts
        console.log('📊 Generating database queries...');
        results.database = await scripts.generateDatabaseQueries();
        
        console.log('🛣️ Generating API routes...');
        results.api = await scripts.generateApiRoutes();
        
        console.log('💾 Generating browser storage...');
        results.browser = await scripts.generateBrowserStorage();
        
        console.log('🗄️ Generating KV store...');
        results.kv = await scripts.generateKvStore();
        
        console.log('📡 Generating SSE events...');
        results.sse = await scripts.generateSSEEvents();
        
        console.log('📦 Generating shared modules...');
        results.shared = await scripts.generateElmSharedModules();
        
        console.log('🔧 Generating Elm handlers...');
        results.handlers = await scripts.generateElmHandlers();
        
        console.log('✅ All generation phases completed successfully');
        
        // Copy generated files to output directory structure
        await copyGeneratedFiles(outputDir);
        
        return results;
        
    } catch (error) {
        throw new Error(`Main generation scripts failed: ${error.message}`);
    }
}

// Copy generated files from standard locations to output directory
async function copyGeneratedFiles(outputDir) {
    try {
        // Copy JavaScript files
        const jsSourceDir = 'packages/hamlet-server/generated';
        const jsTargetDir = path.join(outputDir, 'packages', 'hamlet-server', 'generated');
        if (fs.existsSync(jsSourceDir)) {
            copyDir(jsSourceDir, jsTargetDir);
        }
        
        // Copy Elm files
        const elmSourceDir = 'app/generated';
        const elmTargetDir = path.join(outputDir, 'app', 'generated');
        if (fs.existsSync(elmSourceDir)) {
            copyDir(elmSourceDir, elmTargetDir);
        }
        
        // Copy shared Elm modules
        const sharedSourceDir = 'app/horatio/server/generated';
        const sharedTargetDir = path.join(outputDir, 'app', 'horatio', 'server', 'generated');
        if (fs.existsSync(sharedSourceDir)) {
            copyDir(sharedSourceDir, sharedTargetDir);
        }
        
        // Copy handlers
        const handlersSourceDir = 'app/horatio/server/src/Api/Handlers';
        const handlersTargetDir = path.join(outputDir, 'app', 'horatio', 'server', 'src', 'Api', 'Handlers');
        if (fs.existsSync(handlersSourceDir)) {
            copyDir(handlersSourceDir, handlersTargetDir);
        }
        
        console.log('📁 Copied generated files to output directory');
        
    } catch (error) {
        console.warn(`Warning: Could not copy all generated files: ${error.message}`);
    }
}

// Legacy function - now redirects to main generation scripts
async function generateElmFiles(outputDir) {
    console.warn('Legacy generateElmFiles called - using main generation scripts instead');
    return await generateUsingMainScripts(outputDir);
}

// Utility functions
async function discoverModels(modelsDir) {
    const models = [];
    
    function scanDir(dir, relativePath = '') {
        const items = fs.readdirSync(dir);
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                scanDir(fullPath, path.join(relativePath, item));
            } else if (item.endsWith('.rs')) {
                const modelPath = path.join(relativePath, item.replace('.rs', ''));
                models.push(modelPath);
            }
        }
    }
    
    scanDir(modelsDir);
    return models;
}

// Run init - this is a CLI tool
init().catch((e) => {
    console.error(e);
});
