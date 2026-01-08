import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

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
        const relativePath = path.relative(modelsDir, file).split(path.sep).join('/'); // Normalize separators
        fileHashes[relativePath] = fileHash;

        // Update master hash
        masterHash.update(relativePath);
        masterHash.update('\0');
        masterHash.update(fileHash); // Hash of hash ensures content + path integrity
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
