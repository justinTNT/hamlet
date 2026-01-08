import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a test-specific generated directory
const testGeneratedDir = path.join(__dirname, '../../generated');

// Ensure directory exists
if (!fs.existsSync(testGeneratedDir)) {
    fs.mkdirSync(testGeneratedDir, { recursive: true });
}

// Copy or symlink files from the actual generated locations
const filesToCopy = [
    {
        source: '/Users/jtnt/Play/hamlet/app/horatio/server/.hamlet-gen/api-routes.js',
        target: path.join(testGeneratedDir, 'api-routes.js')
    },
    {
        source: '/Users/jtnt/Play/hamlet/app/horatio/web/src/.hamlet-gen/browser-storage.js', 
        target: path.join(testGeneratedDir, 'browser-storage.js')
    },
    {
        source: '/Users/jtnt/Play/hamlet/app/horatio/server/.hamlet-gen/database-queries.js',
        target: path.join(testGeneratedDir, 'database-queries.js')
    },
    {
        source: '/Users/jtnt/Play/hamlet/app/horatio/server/.hamlet-gen/kv-store.js',
        target: path.join(testGeneratedDir, 'kv-store.js')
    }
];

// Copy files
filesToCopy.forEach(({ source, target }) => {
    if (fs.existsSync(source)) {
        try {
            // Create symlink instead of copying to stay in sync
            if (fs.existsSync(target)) {
                fs.unlinkSync(target);
            }
            fs.symlinkSync(source, target);
            console.log(`✅ Linked: ${path.basename(target)}`);
        } catch (error) {
            // Fallback to copying if symlink fails
            const content = fs.readFileSync(source, 'utf-8');
            fs.writeFileSync(target, content);
            console.log(`✅ Copied: ${path.basename(target)}`);
        }
    } else {
        console.log(`❌ Source not found: ${source}`);
    }
});

console.log('Test file setup complete!');