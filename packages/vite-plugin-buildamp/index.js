import path from 'path';
import elmPlugin from 'vite-plugin-elm';

export default function buildampPlugin(options = {}) {
    const config = {
        projectRoot: options.projectRoot || process.cwd(),
        elm: options.elm || {}
    };

    // Initialize bundled plugins
    const elm = elmPlugin(config.elm);

    return [
        elm,
        {
            name: 'vite-plugin-buildamp-reactive',
            
            config(viteConfig, { command }) {
                // Set up aliases for importing from .generated (BuildAmp-generated code)
                const generatedPath = path.resolve(config.projectRoot, '.generated');

                return {
                    resolve: {
                        alias: {
                            '@generated': generatedPath,
                            '@buildamp': generatedPath
                        }
                    }
                };
            }
        }
    ];
};