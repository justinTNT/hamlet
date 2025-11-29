export default function hamletPlugin() {
    return {
        name: 'vite-plugin-hamlet',
        config(config) {
            // Future: Inject elm and wasm plugins here
            return config;
        }
    };
}
