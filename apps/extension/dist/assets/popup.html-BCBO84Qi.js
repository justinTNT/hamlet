(function() {
  const t = document.createElement("link").relList;
  if (t && t.supports && t.supports("modulepreload")) return;
  for (const e of document.querySelectorAll('link[rel="modulepreload"]')) n(e);
  new MutationObserver((e) => {
    for (const r of e) if (r.type === "childList") for (const s of r.addedNodes) s.tagName === "LINK" && s.rel === "modulepreload" && n(s);
  }).observe(document, { childList: true, subtree: true });
  function o(e) {
    const r = {};
    return e.integrity && (r.integrity = e.integrity), e.referrerPolicy && (r.referrerPolicy = e.referrerPolicy), e.crossOrigin === "use-credentials" ? r.credentials = "include" : e.crossOrigin === "anonymous" ? r.credentials = "omit" : r.credentials = "same-origin", r;
  }
  function n(e) {
    if (e.ep) return;
    e.ep = true;
    const r = o(e);
    fetch(e.href, r);
  }
})();
const l = window.Elm;
console.log("Popup script loaded. Window.Elm:", window.Elm);
chrome.tabs.query({ active: true, currentWindow: true }, (i) => {
  console.log("Tabs query result:", i);
  const t = i[0];
  if (!t) {
    console.log("No active tab found."), c({ title: "", url: "", selection: "", images: [] });
    return;
  }
  chrome.scripting.executeScript({ target: { tabId: t.id }, func: () => {
    const o = window.getSelection().toString(), n = Array.from(document.images).map((e) => e.src).filter((e) => e.startsWith("http"));
    return { selection: o, images: n };
  } }, (o) => {
    console.log("Script execution results:", o);
    let n = { title: t.title || "", url: t.url || "", selection: "", images: [] };
    o && o[0] && o[0].result && (n.selection = o[0].result.selection || "", n.images = o[0].result.images || []), c(n);
  });
});
function c(i) {
  console.log("Initializing Elm with flags:", i);
  try {
    const t = l.Popup.init({ node: document.getElementById("app"), flags: i });
    console.log("Elm initialized successfully."), u(t);
  } catch (t) {
    console.error("Failed to initialize Elm:", t);
  }
}
function u(i) {
  i.ports.outbound.subscribe(function(t) {
    console.log("Popup sending message:", t), chrome.runtime.sendMessage(t, function(o) {
      console.log("Popup received response:", o), chrome.runtime.lastError ? (console.error("Runtime error:", chrome.runtime.lastError), i.ports.inbound.send({ correlationId: t.correlationId, body: null, error: chrome.runtime.lastError.message })) : i.ports.inbound.send(o);
    });
  });
}
