/**
 * Host-Specific Asset Directory Middleware
 *
 * For root-level asset requests (no folder in path), checks public/hosts/{hostname}/
 * before falling back to the default location.
 *
 * Examples:
 *   /index.html  -> first try public/hosts/example.com/index.html, then public/index.html
 *   /logo.png    -> first try public/hosts/example.com/logo.png, then public/logo.png
 *   /assets/app.js -> bypasses host lookup, goes directly to public/assets/app.js
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function sanitizeHost(host) {
    // Remove any characters that aren't alphanumeric, dots, or hyphens
    // Also prevent directory traversal
    return host.replace(/[^a-zA-Z0-9.-]/g, '').replace(/\.\./g, '');
}

function isRootLevelRequest(urlPath) {
    // Root level = no directory separators except the leading slash
    // /index.html -> true
    // /logo.png -> true
    // / -> true (will become /index.html)
    // /assets/app.js -> false
    // /src/style.css -> false
    const withoutLeadingSlash = urlPath.slice(1);
    return !withoutLeadingSlash.includes('/');
}

export default function createHostDir(server) {
    console.log('🏠 Setting up host-specific asset directory');

    const publicDir = server.config.publicDir ||
                      path.join(__dirname, '../../../app/horatio/web/public');
    // Host directories live under public/hosts/: public/hosts/{hostname}/
    const hostsDir = path.join(publicDir, 'hosts');

    // Intercept all GET requests early to check for host-specific assets
    server.app.use((req, res, next) => {
        // Only handle GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Only handle root-level requests
        if (!isRootLevelRequest(req.path)) {
            return next();
        }

        const host = sanitizeHost(req.tenant?.host || 'localhost');
        const hostDir = path.join(hostsDir, host);

        // Determine the filename (default to index.html for root)
        const filename = (req.path === '/' || req.path === '') ? 'index.html' : req.path.slice(1);
        const hostAsset = path.join(hostDir, filename);

        console.log(`🔍 host-dir: host=${host}, path=${req.path}, checking=${hostAsset}, exists=${fs.existsSync(hostAsset)}`);

        if (fs.existsSync(hostAsset)) {
            console.log(`📄 Serving host-specific: ${host}/${filename}`);
            return res.sendFile(hostAsset);
        }

        // Fall through to default handling
        next();
    });

    const hostDirService = {
        sanitizeHost,
        hostsDir,
        getHostAssetPath: (host, filename) => {
            const sanitized = sanitizeHost(host);
            return path.join(hostsDir, sanitized, filename);
        },
        hasHostAsset: (host, filename) => {
            const assetPath = path.join(hostsDir, sanitizeHost(host), filename);
            return fs.existsSync(assetPath);
        },
        listHostAssets: (host) => {
            const hostDir = path.join(hostsDir, sanitizeHost(host));
            if (!fs.existsSync(hostDir)) return [];
            return fs.readdirSync(hostDir);
        },
        cleanup: async () => console.log('🧹 Host directory middleware cleanup')
    };

    server.registerService('host-dir', hostDirService);
    return hostDirService;
}
