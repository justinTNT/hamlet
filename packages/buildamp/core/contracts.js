/**
 * BuildAmp Contract System
 * Tracks model hashes to detect drift and enable incremental builds
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// ============================================================================
// Hash Calculation
// ============================================================================

/**
 * Calculate SHA-256 hash of all Rust model files in the given directory
 * Returns a granular map of file paths to hashes, plus a master signature
 * @param {string} modelsDir - Path to models directory
 * @returns {Promise<{ signature: string, files: Record<string, string> }>}
 */
export async function calculateContractHash(modelsDir) {
    const modelDirs = ['db', 'api', 'storage', 'kv', 'sse', 'events'];
    const rustFiles = [];
    const fileHashes = {};

    // Collect all .rs files from model subdirectories
    for (const subdir of modelDirs) {
        const subdirPath = path.join(modelsDir, subdir);

        if (!fs.existsSync(subdirPath)) {
            continue;
        }

        const files = await collectRustFiles(subdirPath);
        rustFiles.push(...files);
    }

    // Sort files for deterministic ordering in master hash
    rustFiles.sort();

    const masterHash = crypto.createHash('sha256');

    // Hash each file's content
    for (const file of rustFiles) {
        let content = fs.readFileSync(file, 'utf8');

        // Normalize line endings to LF
        content = content.replace(/\r\n/g, '\n');

        // Normalize trailing whitespace
        content = content.trimEnd();

        // Calculate individual file hash
        const fileHash = crypto.createHash('sha256').update(content).digest('hex');

        // Relative path for the map
        const relativePath = path.relative(modelsDir, file).split(path.sep).join('/');
        fileHashes[relativePath] = fileHash;

        // Update master hash
        masterHash.update(relativePath);
        masterHash.update('\0');
        masterHash.update(fileHash);
        masterHash.update('\0');
    }

    return {
        signature: masterHash.digest('hex'),
        files: fileHashes
    };
}

/**
 * Recursively collect all .rs files from a directory
 * @param {string} dir - Directory to search
 * @returns {Promise<string[]>} - Array of absolute file paths
 */
async function collectRustFiles(dir) {
    const files = [];
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                const subFiles = await collectRustFiles(fullPath);
                files.push(...subFiles);
            } else if (entry.isFile() && entry.name.endsWith('.rs')) {
                files.push(fullPath);
            }
        }
    } catch (error) {
        // Ignore errors for non-existent directories during recursion
    }

    return files;
}

/**
 * Get list of Rust files included in the hash calculation
 * @param {string} modelsDir - Path to models directory
 * @returns {Promise<string[]>} - Array of relative file paths
 */
export async function getRustFiles(modelsDir) {
    const result = await calculateContractHash(modelsDir);
    return Object.keys(result.files).sort();
}

// ============================================================================
// Dirty Checking
// ============================================================================

/**
 * Check if the contract is dirty (model files changed since last generation)
 * @param {string} modelsDir - Path to models directory
 * @param {string} contractsPath - Path to contracts.json file
 * @returns {Promise<boolean>} - true if dirty, false if clean
 */
export async function isContractDirty(modelsDir, contractsPath) {
    const status = await getContractStatus(modelsDir, contractsPath);
    return status.isDirty;
}

/**
 * Update the contract hash in contracts.json
 * @param {string} modelsDir - Path to models directory
 * @param {string} contractsPath - Path to contracts.json file
 * @returns {Promise<Object>} - Updated contracts object
 */
export async function updateContractHash(modelsDir, contractsPath) {
    const { signature, files } = await calculateContractHash(modelsDir);

    // Load existing contracts.json if it exists
    let contracts = {};
    if (fs.existsSync(contractsPath)) {
        try {
            contracts = JSON.parse(fs.readFileSync(contractsPath, 'utf8'));
        } catch (error) {
            console.warn('Could not parse existing contracts.json, creating new one');
        }
    }

    // Update with new signature and timestamp
    contracts = {
        ...contracts,
        modelHash: signature,
        files: files,
        generatedAt: new Date().toISOString()
    };

    // Ensure directory exists
    const dir = path.dirname(contractsPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Write updated contracts
    fs.writeFileSync(contractsPath, JSON.stringify(contracts, null, 2));

    return contracts;
}

/**
 * Get detailed information about what changed
 * @param {string} modelsDir - Path to models directory
 * @param {string} contractsPath - Path to contracts.json file
 * @returns {Promise<Object>} - Object with dirty status and changed files
 */
export async function getContractStatus(modelsDir, contractsPath) {
    // If contracts.json doesn't exist, it's dirty
    if (!fs.existsSync(contractsPath)) {
        return {
            isDirty: true,
            message: 'Contract is dirty: contracts.json not found',
            reason: 'missing_contract'
        };
    }

    try {
        const contracts = JSON.parse(fs.readFileSync(contractsPath, 'utf8'));
        const { signature: currentSignature, files: currentFiles } = await calculateContractHash(modelsDir);

        // Fast path: signatures match
        if (contracts.modelHash === currentSignature) {
            return {
                isDirty: false,
                message: 'Contract is up to date',
                reason: 'clean'
            };
        }

        // Granular diff
        const oldFiles = contracts.files || {};
        const changes = [];
        const added = [];
        const removed = [];

        // Check for modifications and deletions
        for (const [file, hash] of Object.entries(oldFiles)) {
            if (!currentFiles[file]) {
                removed.push(file);
            } else if (currentFiles[file] !== hash) {
                changes.push(file);
            }
        }

        // Check for additions
        for (const file of Object.keys(currentFiles)) {
            if (!oldFiles[file]) {
                added.push(file);
            }
        }

        return {
            isDirty: true,
            message: `Contract is dirty: ${changes.length} changed, ${added.length} added, ${removed.length} removed`,
            reason: 'hash_mismatch',
            details: {
                changed: changes,
                added: added,
                removed: removed
            }
        };

    } catch (error) {
        return {
            isDirty: true,
            message: `Error reading contracts.json: ${error.message}`,
            reason: 'error'
        };
    }
}

// ============================================================================
// Integrity Verification
// ============================================================================

/**
 * Verify contract integrity at server startup
 * @param {string} modelsDir - Path to models directory
 * @param {string} contractsPath - Path to contracts.json file
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether to enforce integrity check
 * @param {Function} options.calculateHash - Optional custom hash function for testing
 * @param {Function} options.logger - Optional logging function
 * @param {boolean} options.exitProcess - Whether to call process.exit (default false for warning mode)
 * @returns {Promise<boolean>} - true if valid, throws if strict mode, logs if warn mode
 */
export async function verifyContractIntegrity(modelsDir, contractsPath, options = {}) {
    const {
        enabled = true,
        calculateHash = calculateContractHash,
        logger = console.error,
        exitProcess = false
    } = options;

    // Skip check if disabled (e.g., for development)
    if (!enabled) {
        return true;
    }

    const logWarn = (msg) => {
        logger('\n🚨 Contract Integrity Warning\n');
        logger(`   ${msg}\n`);
        logger('   Run "buildamp gen" to synchronize.\n');
    };

    // Check if contracts.json exists
    if (!fs.existsSync(contractsPath)) {
        logWarn(`contracts.json not found at: ${contractsPath}`);
        if (exitProcess && process.exit) process.exit(1);
        return false;
    }

    // Parse contracts.json
    let contracts;
    try {
        contracts = JSON.parse(fs.readFileSync(contractsPath, 'utf8'));
    } catch (error) {
        logWarn(`Corrupted contracts.json: ${error.message}`);
        if (exitProcess && process.exit) process.exit(1);
        return false;
    }

    // Validate required fields
    if (!contracts.modelHash) {
        logWarn('contracts.json missing required field: modelHash');
        if (exitProcess && process.exit) process.exit(1);
        return false;
    }

    // Calculate current hash
    const { signature: currentHash } = await calculateHash(modelsDir);

    // Compare hashes
    if (contracts.modelHash !== currentHash) {
        logger('\n⚠️  Contract Version Mismatch Detected\n');
        logger('   The runtime code may not match your Rust models.\n');
        logger(`   • Expected: ${contracts.modelHash.substring(0, 8)}`);
        logger(`   • Actual:   ${currentHash.substring(0, 8)}\n`);

        if (exitProcess && process.exit) {
            process.exit(1);
        }
        return false;
    }

    return true;
}

/**
 * Create middleware for Express to check contract integrity
 * @param {Object} config - Configuration
 * @returns {Function} Express middleware
 */
export function contractIntegrityMiddleware(config) {
    let integrityVerified = false;

    return async (req, res, next) => {
        // Only check once per server start
        if (!integrityVerified) {
            await verifyContractIntegrity(
                config.modelsDir,
                config.contractsPath,
                { enabled: config.enabled }
            );
            integrityVerified = true;
        }
        next();
    };
}

/**
 * Get contract information for debugging
 * @param {string} contractsPath - Path to contracts.json
 * @returns {Object} Contract information
 */
export function getContractInfo(contractsPath) {
    if (!fs.existsSync(contractsPath)) {
        return {
            exists: false,
            error: 'contracts.json not found'
        };
    }

    try {
        const contracts = JSON.parse(fs.readFileSync(contractsPath, 'utf8'));
        return {
            exists: true,
            modelHash: contracts.modelHash,
            generatedAt: contracts.generatedAt,
            fileCount: Object.keys(contracts.files || {}).length
        };
    } catch (error) {
        return {
            exists: true,
            error: `Failed to parse: ${error.message}`
        };
    }
}
