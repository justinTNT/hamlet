/**
 * BuildAmp Configuration for Simple Project Structure
 * Defines paths and settings for generation scripts
 */

import path from 'path';
import fs from 'fs';

// Auto-detect project name from app directory
function getProjectName() {
    const appDir = path.join(process.cwd(), 'app');
    if (!fs.existsSync(appDir)) return null;
    
    const projects = fs.readdirSync(appDir).filter(name => {
        const fullPath = path.join(appDir, name);
        const modelsPath = path.join(fullPath, 'models');
        
        return fs.statSync(fullPath).isDirectory() && 
               fs.existsSync(modelsPath);
    });
    
    return projects[0]; // Use first valid project found
}

const PROJECT_NAME = getProjectName();

export const config = {
    projectType: 'simple',
    projectName: PROJECT_NAME,
    
    // Input paths
    inputBasePath: PROJECT_NAME ? `app/${PROJECT_NAME}/models` : 'src/models',
    
    // Output paths
    jsOutputPath: 'generated',
    elmOutputPath: 'generated', 
    backendElmPath: PROJECT_NAME ? `app/${PROJECT_NAME}/server/generated` : 'generated',
    handlersPath: PROJECT_NAME ? `app/${PROJECT_NAME}/server/src/Api/Handlers` : 'src/Api/Handlers',
    
    // Project structure
    hasPackages: false,
    hasWorkspaces: false
};