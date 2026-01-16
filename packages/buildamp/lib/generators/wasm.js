/**
 * BuildAmp WASM Generator
 * Compiles Rust models to WASM using wasm-pack
 */

import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(execCallback);

/**
 * Valid wasm-pack targets
 */
const VALID_TARGETS = ['web', 'node', 'bundler'];

/**
 * Map our target names to wasm-pack target names
 * wasm-pack uses 'nodejs' not 'node'
 */
const TARGET_MAP = {
    web: 'web',
    node: 'nodejs',
    bundler: 'bundler'
};

/**
 * Check if a WASM target is valid
 * @param {string} target - Target to validate
 * @returns {boolean}
 */
export function isValidWasmTarget(target) {
    return VALID_TARGETS.includes(target);
}

/**
 * Get the output directory for a WASM target
 * @param {string} target - WASM target (web, node, bundler)
 * @param {string} projectRoot - Project root directory
 * @returns {string} Output directory path
 */
export function getWasmOutputDir(target, projectRoot) {
    const dirName = target === 'node' ? 'pkg-node' : `pkg-${target}`;
    return path.join(projectRoot, dirName);
}

/**
 * Get the newest mtime from all .rs files in a directory (recursive)
 * @param {string} dir - Directory to search
 * @returns {Date|null} Newest mtime or null if no files found
 */
export function getNewestModelMtime(dir) {
    if (!fs.existsSync(dir)) {
        return null;
    }

    let newest = null;

    function walk(currentDir) {
        try {
            const entries = fs.readdirSync(currentDir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                if (entry.isDirectory()) {
                    walk(fullPath);
                } else if (entry.isFile() && entry.name.endsWith('.rs')) {
                    const stat = fs.statSync(fullPath);
                    if (!newest || stat.mtime > newest) {
                        newest = stat.mtime;
                    }
                }
            }
        } catch (e) {
            // Ignore errors
        }
    }

    walk(dir);
    return newest;
}

/**
 * Get the mtime of the WASM output file
 * @param {string} outDir - Output directory (pkg-web, pkg-node, etc.)
 * @returns {Date|null} mtime or null if not found
 */
export function getWasmMtime(outDir) {
    // Look for the .wasm file
    const wasmFile = path.join(outDir, 'proto_rust_bg.wasm');
    if (fs.existsSync(wasmFile)) {
        return fs.statSync(wasmFile).mtime;
    }
    return null;
}

/**
 * Check if WASM needs rebuilding based on file mtimes
 * @param {string} modelsDir - Models directory
 * @param {string} outDir - WASM output directory
 * @returns {Object} Status object with needsRebuild, reason, modelMtime, wasmMtime
 */
export function checkWasmStatus(modelsDir, outDir) {
    const modelMtime = getNewestModelMtime(modelsDir);
    const wasmMtime = getWasmMtime(outDir);

    // No WASM output exists
    if (!wasmMtime) {
        return {
            needsRebuild: true,
            reason: 'never_built',
            modelMtime,
            wasmMtime: null
        };
    }

    // No models exist (edge case)
    if (!modelMtime) {
        return {
            needsRebuild: false,
            reason: 'no_models',
            modelMtime: null,
            wasmMtime
        };
    }

    // Compare mtimes
    if (modelMtime > wasmMtime) {
        return {
            needsRebuild: true,
            reason: 'stale',
            modelMtime,
            wasmMtime
        };
    }

    return {
        needsRebuild: false,
        reason: 'current',
        modelMtime,
        wasmMtime
    };
}

/**
 * Detect if wasm-pack is installed
 * @param {Object} options - Options
 * @param {Function} options.exec - Exec function (for testing)
 * @returns {Promise<boolean>}
 */
export async function detectWasmPack(options = {}) {
    const exec = options.exec || execAsync;

    try {
        await exec('wasm-pack --version');
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Build the wasm-pack command string
 * @param {Object} options - Build options
 * @param {string} options.target - WASM target (web, node, bundler)
 * @param {string} options.outDir - Output directory
 * @param {string} options.projectRoot - Project root (where Cargo.toml is)
 * @param {boolean} options.release - Build in release mode (default true)
 * @returns {string} Command string
 */
export function buildWasmPackCommand(options) {
    const {
        target = 'web',
        outDir,
        projectRoot,
        release = true
    } = options;

    const wasmPackTarget = TARGET_MAP[target] || target;
    const parts = ['wasm-pack build'];

    if (release) {
        parts.push('--release');
    } else {
        parts.push('--dev');
    }

    parts.push(`--target ${wasmPackTarget}`);
    parts.push(`--out-dir ${outDir}`);

    return parts.join(' ');
}

/**
 * Find project root by looking for Cargo.toml
 * @param {string} startDir - Directory to start searching from
 * @returns {string|null} Project root or null if not found
 */
export function findProjectRoot(startDir = process.cwd()) {
    let currentDir = startDir;

    while (currentDir !== path.dirname(currentDir)) {
        const cargoPath = path.join(currentDir, 'Cargo.toml');
        if (fs.existsSync(cargoPath)) {
            return currentDir;
        }
        currentDir = path.dirname(currentDir);
    }

    return null;
}

/**
 * Generate WASM from Rust models
 * @param {Object} config - Configuration options
 * @param {string} config.target - WASM target (web, node, bundler) - deprecated, use wasmTarget
 * @param {string} config.wasmTarget - WASM target (web, node, bundler)
 * @param {string} config.projectRoot - Project root (optional, auto-detected)
 * @param {string} config.modelsDir - Models directory (optional, defaults to projectRoot/models)
 * @param {boolean} config.release - Build in release mode
 * @param {boolean} config.skipDetection - Skip wasm-pack detection (for testing)
 * @param {boolean} config.force - Force rebuild even if up to date
 * @param {Function} config.exec - Custom exec function (for testing)
 * @param {Function} config.checkStatus - Custom status check function (for testing)
 * @returns {Promise<Object>} Generation result
 */
export async function generateWasm(config = {}) {
    const {
        target: legacyTarget,
        wasmTarget,
        projectRoot: providedRoot,
        modelsDir: providedModelsDir,
        release = true,
        skipDetection = false,
        force = false,
        exec = execAsync,
        checkStatus = checkWasmStatus
    } = config;

    // Support both 'target' and 'wasmTarget' for backwards compatibility
    const target = wasmTarget || legacyTarget || 'web';

    // Find project root
    const projectRoot = providedRoot || findProjectRoot();
    if (!projectRoot) {
        return {
            success: false,
            error: 'Could not find Cargo.toml. Are you in a Rust project?'
        };
    }

    // Build output directory
    const outDir = getWasmOutputDir(target, projectRoot);

    // Models directory
    const modelsDir = providedModelsDir || path.join(projectRoot, 'app', 'horatio', 'models');

    // Check if we can skip the build (mtime-based incremental builds)
    if (!force) {
        const status = checkStatus(modelsDir, outDir);
        if (!status.needsRebuild) {
            console.log(`✅ WASM (${target}) is up to date, skipping build`);
            return {
                success: true,
                skipped: true,
                target,
                outDir,
                projectRoot
            };
        }
    }

    // Check if wasm-pack is installed (unless skipped for testing)
    if (!skipDetection) {
        const hasWasmPack = await detectWasmPack({ exec });
        if (!hasWasmPack) {
            throw new Error(
                'wasm-pack is not installed. Install it with: cargo install wasm-pack'
            );
        }
    }

    // Validate target
    if (!isValidWasmTarget(target)) {
        return {
            success: false,
            error: `Invalid target: ${target}. Valid targets: ${VALID_TARGETS.join(', ')}`
        };
    }

    // Build command
    const command = buildWasmPackCommand({
        target,
        outDir,
        projectRoot,
        release
    });

    console.log(`🦀 Building WASM (${target})...`);
    console.log(`   Command: ${command}`);
    console.log(`   Output: ${outDir}`);

    try {
        const { stdout, stderr } = await exec(command, { cwd: projectRoot });

        if (stdout) {
            console.log(stdout);
        }

        console.log(`✅ WASM build complete`);

        return {
            success: true,
            target,
            outDir,
            projectRoot
        };
    } catch (error) {
        console.error(`❌ WASM build failed: ${error.message}`);

        return {
            success: false,
            target,
            outDir,
            error: error.message
        };
    }
}

export default generateWasm;
