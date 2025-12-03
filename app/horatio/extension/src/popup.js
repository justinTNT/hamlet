// import { Elm } from './Popup.elm';
const Elm = window.Elm;

console.log("Popup script loaded. Window.Elm:", window.Elm);

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    console.log("Tabs query result:", tabs);
    const activeTab = tabs[0];

    if (!activeTab) {
        console.log("No active tab found.");
        initElm({
            title: "",
            url: "",
            selection: "",
            images: []
        });
        return;
    }

    chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: () => {
            const selection = window.getSelection().toString();
            const images = Array.from(document.images)
                .map(img => img.src)
                .filter(src => src.startsWith('http')); // Basic filter
            return { selection, images };
        }
    }, (results) => {
        console.log("Script execution results:", results);
        let pageData = {
            title: activeTab.title || "",
            url: activeTab.url || "",
            selection: "",
            images: []
        };

        if (results && results[0] && results[0].result) {
            pageData.selection = results[0].result.selection || "";
            pageData.images = results[0].result.images || [];
        }

        initElm(pageData);
    });
});

function initElm(flags) {
    console.log("Initializing Elm with flags:", flags);
    try {
        const app = Elm.Popup.init({
            node: document.getElementById('app'),
            flags: flags
        });
        console.log("Elm initialized successfully.");
        setupPorts(app);
    } catch (e) {
        console.error("Failed to initialize Elm:", e);
    }
}

function setupPorts(app) {


    app.ports.outbound.subscribe(function (msg) {
        console.log("Popup sending message:", msg);
        chrome.runtime.sendMessage(msg, function (response) {
            console.log("Popup received response:", response);
            if (chrome.runtime.lastError) {
                console.error("Runtime error:", chrome.runtime.lastError);
                app.ports.inbound.send({
                    correlationId: msg.correlationId,
                    body: null,
                    error: chrome.runtime.lastError.message
                });
            } else {
                app.ports.inbound.send(response);
            }
        });
    });
}
