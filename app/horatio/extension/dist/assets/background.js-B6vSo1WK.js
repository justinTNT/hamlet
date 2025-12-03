let c, b = 0, l = null;
function u() {
  return (l === null || l.byteLength === 0) && (l = new Uint8Array(c.memory.buffer)), l;
}
const f = new TextEncoder();
"encodeInto" in f || (f.encodeInto = function(e, n) {
  const t = f.encode(e);
  return n.set(t), { read: e.length, written: t.length };
});
function w(e, n, t) {
  if (t === void 0) {
    const s = f.encode(e), a = n(s.length, 1) >>> 0;
    return u().subarray(a, a + s.length).set(s), b = s.length, a;
  }
  let o = e.length, i = n(o, 1) >>> 0;
  const d = u();
  let r = 0;
  for (; r < o; r++) {
    const s = e.charCodeAt(r);
    if (s > 127) break;
    d[i + r] = s;
  }
  if (r !== o) {
    r !== 0 && (e = e.slice(r)), i = t(i, o, o = r + e.length * 3, 1) >>> 0;
    const s = u().subarray(i + r, i + o), a = f.encodeInto(e, s);
    r += a.written, i = t(i, o, r, 1) >>> 0;
  }
  return b = r, i;
}
let g = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true });
g.decode();
const _ = 2146435072;
let y = 0;
function m(e, n) {
  return y += n, y >= _ && (g = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true }), g.decode(), y = n), g.decode(u().subarray(e, e + n));
}
function S(e, n) {
  return e = e >>> 0, m(e, n);
}
function A(e, n) {
  let t, o;
  try {
    const i = w(e, c.__wbindgen_malloc, c.__wbindgen_realloc), d = b, r = w(n, c.__wbindgen_malloc, c.__wbindgen_realloc), s = b, a = c.decode_request(i, d, r, s);
    return t = a[0], o = a[1], S(a[0], a[1]);
  } finally {
    c.__wbindgen_free(t, o, 1);
  }
}
const E = /* @__PURE__ */ new Set(["basic", "cors", "default"]);
async function R(e, n) {
  if (typeof Response == "function" && e instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming == "function") try {
      return await WebAssembly.instantiateStreaming(e, n);
    } catch (o) {
      if (e.ok && E.has(e.type) && e.headers.get("Content-Type") !== "application/wasm") console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", o);
      else throw o;
    }
    const t = await e.arrayBuffer();
    return await WebAssembly.instantiate(t, n);
  } else {
    const t = await WebAssembly.instantiate(e, n);
    return t instanceof WebAssembly.Instance ? { instance: t, module: e } : t;
  }
}
function T() {
  const e = {};
  return e.wbg = {}, e.wbg.__wbindgen_init_externref_table = function() {
    const n = c.__wbindgen_externrefs, t = n.grow(4);
    n.set(0, void 0), n.set(t + 0, void 0), n.set(t + 1, null), n.set(t + 2, true), n.set(t + 3, false);
  }, e;
}
function x(e, n) {
  return c = e.exports, p.__wbindgen_wasm_module = n, l = null, c.__wbindgen_start(), c;
}
async function p(e) {
  if (c !== void 0) return c;
  typeof e < "u" && (Object.getPrototypeOf(e) === Object.prototype ? { module_or_path: e } = e : console.warn("using deprecated parameters for the initialization function; pass a single object instead")), typeof e > "u" && (e = new URL("/assets/proto_rust_bg-BaopduL-.wasm", import.meta.url));
  const n = T();
  (typeof e == "string" || typeof Request == "function" && e instanceof Request || typeof URL == "function" && e instanceof URL) && (e = fetch(e));
  const { instance: t, module: o } = await R(await e, n);
  return x(t, o);
}
console.log("Horatio Extension Background Service Worker Starting...");
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.disable(), chrome.declarativeContent.onPageChanged.removeRules(void 0, () => {
    chrome.declarativeContent.onPageChanged.addRules([{ conditions: [new chrome.declarativeContent.PageStateMatcher({ pageUrl: { schemes: ["http", "https"] } })], actions: [new chrome.declarativeContent.ShowAction()] }]);
  });
});
chrome.runtime.onMessage.addListener((e, n, t) => (console.log("Background received:", e), W(e).then((o) => {
  console.log("Background sending response:", o), t(o);
}).catch((o) => {
  console.error("Background error:", o), t({ correlationId: e.correlationId, body: null, error: o.toString() });
}), true));
const O = p().then(() => console.log("WASM initialized successfully")).catch((e) => console.error("WASM init failed:", e));
async function W(e) {
  await O;
  const { endpoint: n, body: t, correlationId: o } = e, i = JSON.stringify(t), d = A(n, i), r = JSON.parse(d);
  if (r.type && (r.type === "ValidationError" || r.type === "NotFound")) return { correlationId: o, body: null, error: JSON.stringify(r) };
  try {
    const a = await (await fetch("http://localhost:3000/api", { method: "POST", headers: { "Content-Type": "application/json", "X-RPC-Endpoint": n, "X-Hamlet-Source": "extension" }, body: i })).text(), h = JSON.parse(a);
    return { correlationId: o, body: h, error: null };
  } catch (s) {
    return console.error("Network error:", s), { correlationId: o, body: null, error: "Network Error: " + s.message };
  }
}
