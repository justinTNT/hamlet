#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prompts from 'prompts';
import { red, green, bold } from 'kolorist';

const cwd = process.cwd();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function init() {
    let targetDir = process.argv[2];

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

    const write = (file, content) => {
        const targetPath = path.join(root, file);
        if (content) {
            fs.writeFileSync(targetPath, content);
        } else {
            copy(path.join(templateDir, file), targetPath);
        }
    };

    const files = fs.readdirSync(templateDir);
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

init().catch((e) => {
    console.error(e);
});
