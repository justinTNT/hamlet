// Elm is loaded globally via script tag

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];

    if (!activeTab) {
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
    const app = Elm.Popup.init({
        node: document.getElementById('app'),
        flags: flags
    });

    setupPorts(app);
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
