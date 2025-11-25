// Elm is loaded globally via script tag
const app = Elm.Popup.init({
    node: document.getElementById('app')
});

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
