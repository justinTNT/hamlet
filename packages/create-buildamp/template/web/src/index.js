import { Elm } from './Main.elm';

async function run() {
    const app = Elm.Main.init({
        node: document.getElementById('app'),
    });
}

run();
