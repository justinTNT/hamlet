import fs from 'fs';
import path from 'path';
import { calculateContractHash } from './hash.js';

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

    // Load existing contracts.json if it exists (wrapper for partial updates if needed later)
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
        files: files, // Store the granular map
        generatedAt: new Date().toISOString()
    };

    // Ensure .hamlet-gen directory exists
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
