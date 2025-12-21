import init, { encode_request, decode_response } from 'proto-rust';
import { Elm } from './Main.elm';

async function run() {
    await init();

    const app = Elm.Main.init({
        node: document.getElementById('app'),
    });

    // Simple RPC wrapper if not using ports (the template Main.elm uses standard Http.post for simplicity)
    // But to use the WASM encoding, we should intercept or use ports.
    // For the "Hello World" template, let's stick to standard Http.post with manual JSON body construction in Elm
    // OR show the WASM way.
    // The Main.elm above constructs a JSON body manually: { endpoint: "Increment", body: ... }
    // But our server expects the WASM-encoded body if we want to use the full stack features?
    // Actually, the server expects raw JSON for the endpoint dispatcher usually, unless we enforce WASM encoding.
    // Let's keep it simple: Elm sends JSON, Server reads JSON.
    // WASM is used for shared logic/validation if needed.
}

run();
