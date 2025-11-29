let i, g = 0, u = null;
function f() {
  return (u === null || u.byteLength === 0) && (u = new Uint8Array(i.memory.buffer)), u;
}
const l = new TextEncoder();
"encodeInto" in l || (l.encodeInto = function(e, o) {
  const c = l.encode(e);
  return o.set(c), { read: e.length, written: c.length };
});
function m(e, o, c) {
  if (c === void 0) {
    const r = l.encode(e), s = o(r.length, 1) >>> 0;
    return f().subarray(s, s + r.length).set(r), g = r.length, s;
  }
  let n = e.length, d = o(n, 1) >>> 0;
  const a = f();
  let t = 0;
  for (; t < n; t++) {
    const r = e.charCodeAt(t);
    if (r > 127) break;
    a[d + t] = r;
  }
  if (t !== n) {
    t !== 0 && (e = e.slice(t)), d = c(d, n, n = t + e.length * 3, 1) >>> 0;
    const r = f().subarray(d + t, d + n), s = l.encodeInto(e, r);
    t += s.written, d = c(d, n, t, 1) >>> 0;
  }
  return g = t, d;
}
let h = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true });
h.decode();
const b = 2146435072;
let y = 0;
function p(e, o) {
  return y += o, y >= b && (h = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true }), h.decode(), y = o), h.decode(f().subarray(e, e + o));
}
function w(e, o) {
  return e = e >>> 0, p(e, o);
}
function S(e, o) {
  let c, n;
  try {
    const d = m(e, i.__wbindgen_malloc, i.__wbindgen_realloc), a = g, t = m(o, i.__wbindgen_malloc, i.__wbindgen_realloc), r = g, s = i.decode_request(d, a, t, r);
    return c = s[0], n = s[1], w(s[0], s[1]);
  } finally {
    i.__wbindgen_free(c, n, 1);
  }
}
console.log("Horatio Extension Background Service Worker Starting...");
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.disable(), chrome.declarativeContent.onPageChanged.removeRules(void 0, () => {
    chrome.declarativeContent.onPageChanged.addRules([{ conditions: [new chrome.declarativeContent.PageStateMatcher({ pageUrl: { schemes: ["http", "https"] } })], actions: [new chrome.declarativeContent.ShowAction()] }]);
  });
});
chrome.runtime.onMessage.addListener((e, o, c) => (console.log("Background received:", e), T(e).then((n) => {
  console.log("Background sending response:", n), c(n);
}).catch((n) => {
  console.error("Background error:", n), c({ correlationId: e.correlationId, body: null, error: n.toString() });
}), true));
async function T(e) {
  const { endpoint: o, body: c, correlationId: n } = e, d = JSON.stringify(c), a = S(o, d), t = JSON.parse(a);
  if (t.type && (t.type === "ValidationError" || t.type === "NotFound")) return { correlationId: n, body: null, error: JSON.stringify(t) };
  try {
    const s = await (await fetch("http://localhost:3000/api", { method: "POST", headers: { "Content-Type": "application/json", "X-RPC-Endpoint": o }, body: d })).text(), _ = JSON.parse(s);
    return { correlationId: n, body: _, error: null };
  } catch (r) {
    return console.error("Network error:", r), { correlationId: n, body: null, error: "Network Error: " + r.message };
  }
}
