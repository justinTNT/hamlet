import fs from 'fs';
import { calculateContractHash } from './hash.js';

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
        exitProcess = false // Default to false (Warn Only)
    } = options;

    // Skip check if disabled (e.g., for development)
    if (!enabled) {
        return true;
    }

    const logWarn = (msg) => {
        logger('\n🚨 Contract Integrity Warning\n');
        logger(`   ${msg}\n`);
        logger('   Run "hamlet gen" to synchronize.\n');
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
    // calculateHash returns { signature, files }
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
