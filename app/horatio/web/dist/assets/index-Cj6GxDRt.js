(function() {
  const n = document.createElement("link").relList;
  if (n && n.supports && n.supports("modulepreload")) return;
  for (const a of document.querySelectorAll('link[rel="modulepreload"]')) e(a);
  new MutationObserver((a) => {
    for (const u of a) if (u.type === "childList") for (const i of u.addedNodes) i.tagName === "LINK" && i.rel === "modulepreload" && e(i);
  }).observe(document, { childList: true, subtree: true });
  function t(a) {
    const u = {};
    return a.integrity && (u.integrity = a.integrity), a.referrerPolicy && (u.referrerPolicy = a.referrerPolicy), a.crossOrigin === "use-credentials" ? u.credentials = "include" : a.crossOrigin === "anonymous" ? u.credentials = "omit" : u.credentials = "same-origin", u;
  }
  function e(a) {
    if (a.ep) return;
    a.ep = true;
    const u = t(a);
    fetch(a.href, u);
  }
})();
let C;
function Pn(r, n) {
  return r = r >>> 0, je(r, n);
}
let Er = null;
function kr() {
  return (Er === null || Er.byteLength === 0) && (Er = new Uint8Array(C.memory.buffer)), Er;
}
function Yr(r, n, t) {
  if (t === void 0) {
    const $ = Cr.encode(r), c = n($.length, 1) >>> 0;
    return kr().subarray(c, c + $.length).set($), wr = $.length, c;
  }
  let e = r.length, a = n(e, 1) >>> 0;
  const u = kr();
  let i = 0;
  for (; i < e; i++) {
    const $ = r.charCodeAt(i);
    if ($ > 127) break;
    u[a + i] = $;
  }
  if (i !== e) {
    i !== 0 && (r = r.slice(i)), a = t(a, e, e = i + r.length * 3, 1) >>> 0;
    const $ = kr().subarray(a + i, a + e), c = Cr.encodeInto(r, $);
    i += c.written, a = t(a, e, i, 1) >>> 0;
  }
  return wr = i, a;
}
let qr = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true });
qr.decode();
const De = 2146435072;
let mn = 0;
function je(r, n) {
  return mn += n, mn >= De && (qr = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true }), qr.decode(), mn = n), qr.decode(kr().subarray(r, r + n));
}
const Cr = new TextEncoder();
"encodeInto" in Cr || (Cr.encodeInto = function(r, n) {
  const t = Cr.encode(r);
  return n.set(t), { read: r.length, written: t.length };
});
let wr = 0;
function Ee(r, n) {
  let t, e;
  try {
    const a = Yr(r, C.__wbindgen_malloc_command_export, C.__wbindgen_realloc_command_export), u = wr, i = Yr(n, C.__wbindgen_malloc_command_export, C.__wbindgen_realloc_command_export), $ = wr, c = C.decode_response(a, u, i, $);
    return t = c[0], e = c[1], Pn(c[0], c[1]);
  } finally {
    C.__wbindgen_free_command_export(t, e, 1);
  }
}
function Je(r, n) {
  let t, e;
  try {
    const a = Yr(r, C.__wbindgen_malloc_command_export, C.__wbindgen_realloc_command_export), u = wr, i = Yr(n, C.__wbindgen_malloc_command_export, C.__wbindgen_realloc_command_export), $ = wr, c = C.encode_request(a, u, i, $);
    return t = c[0], e = c[1], Pn(c[0], c[1]);
  } finally {
    C.__wbindgen_free_command_export(t, e, 1);
  }
}
const Re = /* @__PURE__ */ new Set(["basic", "cors", "default"]);
async function He(r, n) {
  if (typeof Response == "function" && r instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming == "function") try {
      return await WebAssembly.instantiateStreaming(r, n);
    } catch (e) {
      if (r.ok && Re.has(r.type) && r.headers.get("Content-Type") !== "application/wasm") console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);
      else throw e;
    }
    const t = await r.arrayBuffer();
    return await WebAssembly.instantiate(t, n);
  } else {
    const t = await WebAssembly.instantiate(r, n);
    return t instanceof WebAssembly.Instance ? { instance: t, module: r } : t;
  }
}
function Me() {
  const r = {};
  return r.wbg = {}, r.wbg.__wbg___wbindgen_throw_dd24417ed36fc46e = function(n, t) {
    throw new Error(Pn(n, t));
  }, r.wbg.__wbindgen_init_externref_table = function() {
    const n = C.__wbindgen_externrefs, t = n.grow(4);
    n.set(0, void 0), n.set(t + 0, void 0), n.set(t + 1, null), n.set(t + 2, true), n.set(t + 3, false);
  }, r;
}
function Be(r, n) {
  return C = r.exports, St.__wbindgen_wasm_module = n, Er = null, C.__wbindgen_start(), C;
}
async function St(r) {
  if (C !== void 0) return C;
  typeof r < "u" && (Object.getPrototypeOf(r) === Object.prototype ? { module_or_path: r } = r : console.warn("using deprecated parameters for the initialization function; pass a single object instead")), typeof r > "u" && (r = new URL("/assets/proto_rust_bg-BPM4G2Ay.wasm", import.meta.url));
  const n = Me();
  (typeof r == "string" || typeof Request == "function" && r instanceof Request || typeof URL == "function" && r instanceof URL) && (r = fetch(r));
  const { instance: t, module: e } = await He(await r, n);
  return Be(t, e);
}
function sr(r, n, t) {
  return t.a = r, t.f = n, t;
}
function f(r) {
  return sr(2, r, function(n) {
    return function(t) {
      return r(n, t);
    };
  });
}
function w(r) {
  return sr(3, r, function(n) {
    return function(t) {
      return function(e) {
        return r(n, t, e);
      };
    };
  });
}
function q(r) {
  return sr(4, r, function(n) {
    return function(t) {
      return function(e) {
        return function(a) {
          return r(n, t, e, a);
        };
      };
    };
  });
}
function br(r) {
  return sr(5, r, function(n) {
    return function(t) {
      return function(e) {
        return function(a) {
          return function(u) {
            return r(n, t, e, a, u);
          };
        };
      };
    };
  });
}
function nn(r) {
  return sr(6, r, function(n) {
    return function(t) {
      return function(e) {
        return function(a) {
          return function(u) {
            return function(i) {
              return r(n, t, e, a, u, i);
            };
          };
        };
      };
    };
  });
}
function tn(r) {
  return sr(7, r, function(n) {
    return function(t) {
      return function(e) {
        return function(a) {
          return function(u) {
            return function(i) {
              return function($) {
                return r(n, t, e, a, u, i, $);
              };
            };
          };
        };
      };
    };
  });
}
function At(r) {
  return sr(8, r, function(n) {
    return function(t) {
      return function(e) {
        return function(a) {
          return function(u) {
            return function(i) {
              return function($) {
                return function(c) {
                  return r(n, t, e, a, u, i, $, c);
                };
              };
            };
          };
        };
      };
    };
  });
}
function Fn(r) {
  return sr(9, r, function(n) {
    return function(t) {
      return function(e) {
        return function(a) {
          return function(u) {
            return function(i) {
              return function($) {
                return function(c) {
                  return function(v) {
                    return r(n, t, e, a, u, i, $, c, v);
                  };
                };
              };
            };
          };
        };
      };
    };
  });
}
function o(r, n, t) {
  return r.a === 2 ? r.f(n, t) : r(n)(t);
}
function d(r, n, t, e) {
  return r.a === 3 ? r.f(n, t, e) : r(n)(t)(e);
}
function tr(r, n, t, e, a) {
  return r.a === 4 ? r.f(n, t, e, a) : r(n)(t)(e)(a);
}
function h(r, n, t, e, a, u) {
  return r.a === 5 ? r.f(n, t, e, a, u) : r(n)(t)(e)(a)(u);
}
function dn(r, n, t, e, a, u, i) {
  return r.a === 6 ? r.f(n, t, e, a, u, i) : r(n)(t)(e)(a)(u)(i);
}
function Dt(r, n, t, e, a, u, i, $) {
  return r.a === 7 ? r.f(n, t, e, a, u, i, $) : r(n)(t)(e)(a)(u)(i)($);
}
function Te(r, n, t, e, a, u, i, $, c) {
  return r.a === 8 ? r.f(n, t, e, a, u, i, $, c) : r(n)(t)(e)(a)(u)(i)($)(c);
}
function lr(r, n) {
  for (var t, e = [], a = gn(r, n, 0, e); a && (t = e.pop()); a = gn(t.a, t.b, 0, e)) ;
  return a;
}
function gn(r, n, t, e) {
  if (r === n) return true;
  if (typeof r != "object" || r === null || n === null) return typeof r == "function" && jr(5), false;
  if (t > 100) return e.push(g(r, n)), true;
  r.$ < 0 && (r = ft(r), n = ft(n));
  for (var a in r) if (!gn(r[a], n[a], t + 1, e)) return false;
  return true;
}
f(lr);
f(function(r, n) {
  return !lr(r, n);
});
function U(r, n, t) {
  if (typeof r != "object") return r === n ? 0 : r < n ? -1 : 1;
  if (typeof r.$ > "u") return (t = U(r.a, n.a)) || (t = U(r.b, n.b)) ? t : U(r.c, n.c);
  for (; r.b && n.b && !(t = U(r.a, n.a)); r = r.b, n = n.b) ;
  return t || (r.b ? 1 : n.b ? -1 : 0);
}
f(function(r, n) {
  return U(r, n) < 0;
});
f(function(r, n) {
  return U(r, n) < 1;
});
f(function(r, n) {
  return U(r, n) > 0;
});
f(function(r, n) {
  return U(r, n) >= 0;
});
var Ce = f(function(r, n) {
  var t = U(r, n);
  return t < 0 ? It : t ? Ju : Gt;
}), hr = 0;
function g(r, n) {
  return { a: r, b: n };
}
function Z(r, n) {
  var t = {};
  for (var e in r) t[e] = r[e];
  for (var e in n) t[e] = n[e];
  return t;
}
f(Pe);
function Pe(r, n) {
  if (typeof r == "string") return r + n;
  if (!r.b) return n;
  var t = er(r.a, n);
  r = r.b;
  for (var e = t; r.b; r = r.b) e = e.b = er(r.a, n);
  return t;
}
var A = { $: 0 };
function er(r, n) {
  return { $: 1, a: r, b: n };
}
var Fe = f(er);
function m(r) {
  for (var n = A, t = r.length; t--; ) n = er(r[t], n);
  return n;
}
function Vn(r) {
  for (var n = []; r.b; r = r.b) n.push(r.a);
  return n;
}
var Ve = w(function(r, n, t) {
  for (var e = []; n.b && t.b; n = n.b, t = t.b) e.push(o(r, n.a, t.a));
  return m(e);
});
q(function(r, n, t, e) {
  for (var a = []; n.b && t.b && e.b; n = n.b, t = t.b, e = e.b) a.push(d(r, n.a, t.a, e.a));
  return m(a);
});
br(function(r, n, t, e, a) {
  for (var u = []; n.b && t.b && e.b && a.b; n = n.b, t = t.b, e = e.b, a = a.b) u.push(tr(r, n.a, t.a, e.a, a.a));
  return m(u);
});
nn(function(r, n, t, e, a, u) {
  for (var i = []; n.b && t.b && e.b && a.b && u.b; n = n.b, t = t.b, e = e.b, a = a.b, u = u.b) i.push(h(r, n.a, t.a, e.a, a.a, u.a));
  return m(i);
});
f(function(r, n) {
  return m(Vn(n).sort(function(t, e) {
    return U(r(t), r(e));
  }));
});
f(function(r, n) {
  return m(Vn(n).sort(function(t, e) {
    var a = o(r, t, e);
    return a === Gt ? 0 : a === It ? -1 : 1;
  }));
});
var Le = [];
function Oe(r) {
  return r.length;
}
var Ge = w(function(r, n, t) {
  for (var e = new Array(r), a = 0; a < r; a++) e[a] = t(n + a);
  return e;
}), Ie = f(function(r, n) {
  for (var t = new Array(r), e = 0; e < r && n.b; e++) t[e] = n.a, n = n.b;
  return t.length = e, g(t, n);
});
f(function(r, n) {
  return n[r];
});
w(function(r, n, t) {
  for (var e = t.length, a = new Array(e), u = 0; u < e; u++) a[u] = t[u];
  return a[r] = n, a;
});
f(function(r, n) {
  for (var t = n.length, e = new Array(t + 1), a = 0; a < t; a++) e[a] = n[a];
  return e[t] = r, e;
});
w(function(r, n, t) {
  for (var e = t.length, a = 0; a < e; a++) n = o(r, t[a], n);
  return n;
});
var Ue = w(function(r, n, t) {
  for (var e = t.length - 1; e >= 0; e--) n = o(r, t[e], n);
  return n;
});
f(function(r, n) {
  for (var t = n.length, e = new Array(t), a = 0; a < t; a++) e[a] = r(n[a]);
  return e;
});
w(function(r, n, t) {
  for (var e = t.length, a = new Array(e), u = 0; u < e; u++) a[u] = o(r, n + u, t[u]);
  return a;
});
w(function(r, n, t) {
  return t.slice(r, n);
});
w(function(r, n, t) {
  var e = n.length, a = r - e;
  a > t.length && (a = t.length);
  for (var u = e + a, i = new Array(u), $ = 0; $ < e; $++) i[$] = n[$];
  for (var $ = 0; $ < a; $++) i[$ + e] = t[$];
  return i;
});
f(function(r, n) {
  return n;
});
f(function(r, n) {
  return console.log(r + ": " + ze()), n;
});
function ze(r) {
  return "<internals>";
}
function jr(r) {
  throw new Error("https://github.com/elm/core/blob/1.0.0/hints/" + r + ".md");
}
f(function(r, n) {
  return r + n;
});
f(function(r, n) {
  return r - n;
});
f(function(r, n) {
  return r * n;
});
f(function(r, n) {
  return r / n;
});
f(function(r, n) {
  return r / n | 0;
});
f(Math.pow);
f(function(r, n) {
  return n % r;
});
var We = f(function(r, n) {
  var t = n % r;
  return r === 0 ? jr(11) : t > 0 && r < 0 || t < 0 && r > 0 ? t + r : t;
});
f(Math.atan2);
var ke = Math.ceil, qe = Math.floor, tt = Math.log;
f(function(r, n) {
  return r && n;
});
f(function(r, n) {
  return r || n;
});
f(function(r, n) {
  return r !== n;
});
f(function(r, n) {
  return r + n;
});
function ye(r) {
  var n = r.charCodeAt(0);
  return isNaN(n) ? R : V(55296 <= n && n <= 56319 ? g(r[0] + r[1], r.slice(2)) : g(r[0], r.slice(1)));
}
f(function(r, n) {
  return r + n;
});
function Xe(r) {
  return r.length;
}
f(function(r, n) {
  for (var t = n.length, e = new Array(t), a = 0; a < t; ) {
    var u = n.charCodeAt(a);
    if (55296 <= u && u <= 56319) {
      e[a] = r(n[a] + n[a + 1]), a += 2;
      continue;
    }
    e[a] = r(n[a]), a++;
  }
  return e.join("");
});
f(function(r, n) {
  for (var t = [], e = n.length, a = 0; a < e; ) {
    var u = n[a], i = n.charCodeAt(a);
    a++, 55296 <= i && i <= 56319 && (u += n[a], a++), r(u) && t.push(u);
  }
  return t.join("");
});
w(function(r, n, t) {
  for (var e = t.length, a = 0; a < e; ) {
    var u = t[a], i = t.charCodeAt(a);
    a++, 55296 <= i && i <= 56319 && (u += t[a], a++), n = o(r, u, n);
  }
  return n;
});
w(function(r, n, t) {
  for (var e = t.length; e--; ) {
    var a = t[e], u = t.charCodeAt(e);
    56320 <= u && u <= 57343 && (e--, a = t[e] + a), n = o(r, a, n);
  }
  return n;
});
var Ye = f(function(r, n) {
  return n.split(r);
}), Qe = f(function(r, n) {
  return n.join(r);
}), Ze = w(function(r, n, t) {
  return t.slice(r, n);
});
f(function(r, n) {
  for (var t = n.length; t--; ) {
    var e = n[t], a = n.charCodeAt(t);
    if (56320 <= a && a <= 57343 && (t--, e = n[t] + e), r(e)) return true;
  }
  return false;
});
var Ke = f(function(r, n) {
  for (var t = n.length; t--; ) {
    var e = n[t], a = n.charCodeAt(t);
    if (56320 <= a && a <= 57343 && (t--, e = n[t] + e), !r(e)) return false;
  }
  return true;
}), Ne = f(function(r, n) {
  return n.indexOf(r) > -1;
});
f(function(r, n) {
  return n.indexOf(r) === 0;
});
f(function(r, n) {
  return n.length >= r.length && n.lastIndexOf(r) === n.length - r.length;
});
var xe = f(function(r, n) {
  var t = r.length;
  if (t < 1) return A;
  for (var e = 0, a = []; (e = n.indexOf(r, e)) > -1; ) a.push(e), e = e + t;
  return m(a);
});
function ra(r) {
  return r + "";
}
function na(r) {
  for (var n = 0, t = r.charCodeAt(0), e = t == 43 || t == 45 ? 1 : 0, a = e; a < r.length; ++a) {
    var u = r.charCodeAt(a);
    if (u < 48 || 57 < u) return R;
    n = 10 * n + u - 48;
  }
  return a == e ? R : V(t == 45 ? -n : n);
}
function ta(r) {
  var n = r.charCodeAt(0);
  return 55296 <= n && n <= 56319 ? (n - 55296) * 1024 + r.charCodeAt(1) - 56320 + 65536 : n;
}
function ea(r) {
  return { $: 0, a: r };
}
function jt(r) {
  return { $: 2, b: r };
}
var aa = jt(function(r) {
  return typeof r != "number" ? rr("an INT", r) : -2147483647 < r && r < 2147483647 && (r | 0) === r || isFinite(r) && !(r % 1) ? nr(r) : rr("an INT", r);
}), ua = jt(function(r) {
  return typeof r == "string" ? nr(r) : r instanceof String ? nr(r + "") : rr("a STRING", r);
});
function oa(r) {
  return { $: 3, b: r };
}
function ia(r) {
  return { $: 5, c: r };
}
var $a = f(function(r, n) {
  return { $: 6, d: r, b: n };
});
f(function(r, n) {
  return { $: 7, e: r, b: n };
});
function mr(r, n) {
  return { $: 9, f: r, g: n };
}
var ca = f(function(r, n) {
  return { $: 10, b: n, h: r };
});
function fa(r) {
  return { $: 11, g: r };
}
var va = f(function(r, n) {
  return mr(r, [n]);
}), la = w(function(r, n, t) {
  return mr(r, [n, t]);
});
q(function(r, n, t, e) {
  return mr(r, [n, t, e]);
});
br(function(r, n, t, e, a) {
  return mr(r, [n, t, e, a]);
});
nn(function(r, n, t, e, a, u) {
  return mr(r, [n, t, e, a, u]);
});
tn(function(r, n, t, e, a, u, i) {
  return mr(r, [n, t, e, a, u, i]);
});
At(function(r, n, t, e, a, u, i, $) {
  return mr(r, [n, t, e, a, u, i, $]);
});
Fn(function(r, n, t, e, a, u, i, $, c) {
  return mr(r, [n, t, e, a, u, i, $, c]);
});
var sa = f(function(r, n) {
  try {
    var t = JSON.parse(n);
    return X(r, t);
  } catch (e) {
    return k(o(qn, "This is not valid JSON! " + e.message, n));
  }
}), Et = f(function(r, n) {
  return X(r, n);
});
function X(r, n) {
  switch (r.$) {
    case 2:
      return r.b(n);
    case 5:
      return n === null ? nr(r.c) : rr("null", n);
    case 3:
      return zr(n) ? et(r.b, n, m) : rr("a LIST", n);
    case 4:
      return zr(n) ? et(r.b, n, ma) : rr("an ARRAY", n);
    case 6:
      var t = r.d;
      if (typeof n != "object" || n === null || !(t in n)) return rr("an OBJECT with a field named `" + t + "`", n);
      var v = X(r.b, n[t]);
      return K(v) ? v : k(o(vt, t, v.a));
    case 7:
      var e = r.e;
      if (!zr(n)) return rr("an ARRAY", n);
      if (e >= n.length) return rr("a LONGER array. Need index " + e + " but only see " + n.length + " entries", n);
      var v = X(r.b, n[e]);
      return K(v) ? v : k(o(zt, e, v.a));
    case 8:
      if (typeof n != "object" || n === null || zr(n)) return rr("an OBJECT", n);
      var a = A;
      for (var u in n) if (Object.prototype.hasOwnProperty.call(n, u)) {
        var v = X(r.b, n[u]);
        if (!K(v)) return k(o(vt, u, v.a));
        a = er(g(u, v.a), a);
      }
      return nr(vr(a));
    case 9:
      for (var i = r.f, $ = r.g, c = 0; c < $.length; c++) {
        var v = X($[c], n);
        if (!K(v)) return v;
        i = i(v.a);
      }
      return nr(i);
    case 10:
      var v = X(r.b, n);
      return K(v) ? X(r.h(v.a), n) : v;
    case 11:
      for (var l = A, s = r.g; s.b; s = s.b) {
        var v = X(s.a, n);
        if (K(v)) return v;
        l = er(v.a, l);
      }
      return k(Ru(vr(l)));
    case 1:
      return k(o(qn, r.a, n));
    case 0:
      return nr(r.a);
  }
}
function et(r, n, t) {
  for (var e = n.length, a = new Array(e), u = 0; u < e; u++) {
    var i = X(r, n[u]);
    if (!K(i)) return k(o(zt, u, i.a));
    a[u] = i.a;
  }
  return nr(t(a));
}
function zr(r) {
  return Array.isArray(r) || typeof FileList < "u" && r instanceof FileList;
}
function ma(r) {
  return o(Zu, r.length, function(n) {
    return r[n];
  });
}
function rr(r, n) {
  return k(o(qn, "Expecting " + r, n));
}
function gr(r, n) {
  if (r === n) return true;
  if (r.$ !== n.$) return false;
  switch (r.$) {
    case 0:
    case 1:
      return r.a === n.a;
    case 2:
      return r.b === n.b;
    case 5:
      return r.c === n.c;
    case 3:
    case 4:
    case 8:
      return gr(r.b, n.b);
    case 6:
      return r.d === n.d && gr(r.b, n.b);
    case 7:
      return r.e === n.e && gr(r.b, n.b);
    case 9:
      return r.f === n.f && at(r.g, n.g);
    case 10:
      return r.h === n.h && gr(r.b, n.b);
    case 11:
      return at(r.g, n.g);
  }
}
function at(r, n) {
  var t = r.length;
  if (t !== n.length) return false;
  for (var e = 0; e < t; e++) if (!gr(r[e], n[e])) return false;
  return true;
}
var pa = f(function(r, n) {
  return JSON.stringify(n, null, r) + "";
});
function Jt(r) {
  return r;
}
function _a() {
  return [];
}
function ba() {
  return {};
}
var ha = w(function(r, n, t) {
  var e = n;
  return r === "toJSON" && typeof e == "function" || (t[r] = e), t;
});
function da(r) {
  return f(function(n, t) {
    return t.push(r(n)), t;
  });
}
var ga = null;
function ur(r) {
  return { $: 0, a: r };
}
function wa(r) {
  return { $: 1, a: r };
}
function W(r) {
  return { $: 2, b: r, c: null };
}
var wn = f(function(r, n) {
  return { $: 3, b: r, d: n };
});
f(function(r, n) {
  return { $: 4, b: r, d: n };
});
function Sa(r) {
  return { $: 5, b: r };
}
var Aa = 0;
function Sr(r) {
  var n = { $: 0, e: Aa++, f: r, g: null, h: [] };
  return On(n), n;
}
function Ln(r) {
  return W(function(n) {
    n(ur(Sr(r)));
  });
}
function Rt(r, n) {
  r.h.push(n), On(r);
}
var Da = f(function(r, n) {
  return W(function(t) {
    Rt(r, n), t(ur(hr));
  });
});
function ja(r) {
  return W(function(n) {
    var t = r.f;
    t.$ === 2 && t.c && t.c(), r.f = null, n(ur(hr));
  });
}
var pn = false, ut = [];
function On(r) {
  if (ut.push(r), !pn) {
    for (pn = true; r = ut.shift(); ) Ea(r);
    pn = false;
  }
}
function Ea(r) {
  for (; r.f; ) {
    var n = r.f.$;
    if (n === 0 || n === 1) {
      for (; r.g && r.g.$ !== n; ) r.g = r.g.i;
      if (!r.g) return;
      r.f = r.g.b(r.f.a), r.g = r.g.i;
    } else if (n === 2) {
      r.f.c = r.f.b(function(t) {
        r.f = t, On(r);
      });
      return;
    } else if (n === 5) {
      if (r.h.length === 0) return;
      r.f = r.f.b(r.h.shift());
    } else r.g = { $: n === 3 ? 0 : 1, b: r.f.b, i: r.g }, r.f = r.f.d;
  }
}
function Ja(r) {
  return W(function(n) {
    var t = setTimeout(function() {
      n(ur(hr));
    }, r);
    return function() {
      clearTimeout(t);
    };
  });
}
q(function(r, n, t, e) {
  return Gn(n, e, r.bo, r.bB, r.by, function() {
    return function() {
    };
  });
});
function Gn(r, n, t, e, a, u) {
  var i = o(Et, r, n ? n.flags : void 0);
  K(i) || jr(2);
  var $ = {}, c = t(i.a), v = c.a, l = u(p, v), s = Ra($, p);
  function p(_, D) {
    var E = o(e, _, v);
    l(v = E.a, D), it($, E.b, a(v));
  }
  return it($, c.b, a(v)), s ? { ports: s } : {};
}
var G = {};
function Ra(r, n) {
  var t;
  for (var e in G) {
    var a = G[e];
    a.a && (t = t || {}, t[e] = a.a(e, n)), r[e] = Ha(a, n);
  }
  return t;
}
function In(r, n, t, e, a) {
  return { b: r, c: n, d: t, e, f: a };
}
function Ha(r, n) {
  var t = { g: n, h: void 0 }, e = r.c, a = r.d, u = r.e, i = r.f;
  function $(c) {
    return o(wn, $, Sa(function(v) {
      var l = v.a;
      return v.$ === 0 ? d(a, t, l, c) : u && i ? tr(e, t, l.i, l.j, c) : d(e, t, u ? l.i : l.j, c);
    }));
  }
  return t.h = Sr(o(wn, $, r.b));
}
var Ma = f(function(r, n) {
  return W(function(t) {
    r.g(n), t(ur(hr));
  });
}), Ba = f(function(r, n) {
  return o(Da, r.h, { $: 0, a: n });
});
function Lr(r) {
  return function(n) {
    return { $: 1, k: r, l: n };
  };
}
function Ta(r) {
  return { $: 2, m: r };
}
f(function(r, n) {
  return { $: 3, n: r, o: n };
});
var ot = [], _n = false;
function it(r, n, t) {
  if (ot.push({ p: r, q: n, r: t }), !_n) {
    _n = true;
    for (var e; e = ot.shift(); ) Ca(e.p, e.q, e.r);
    _n = false;
  }
}
function Ca(r, n, t) {
  var e = {};
  Qr(true, n, e, null), Qr(false, t, e, null);
  for (var a in r) Rt(r[a], { $: "fx", a: e[a] || { i: A, j: A } });
}
function Qr(r, n, t, e) {
  switch (n.$) {
    case 1:
      var a = n.k, u = Pa(r, a, e, n.l);
      t[a] = Fa(r, u, t[a]);
      return;
    case 2:
      for (var i = n.m; i.b; i = i.b) Qr(r, i.a, t, e);
      return;
    case 3:
      Qr(r, n.o, t, { s: n.n, t: e });
      return;
  }
}
function Pa(r, n, t, e) {
  function a(i) {
    for (var $ = t; $; $ = $.t) i = $.s(i);
    return i;
  }
  var u = r ? G[n].e : G[n].f;
  return o(u, a, e);
}
function Fa(r, n, t) {
  return t = t || { i: A, j: A }, r ? t.i = er(n, t.i) : t.j = er(n, t.j), t;
}
function Ht(r) {
  G[r] && jr(3);
}
function Mt(r, n) {
  return Ht(r), G[r] = { e: Va, u: n, a: La }, Lr(r);
}
var Va = f(function(r, n) {
  return n;
});
function La(r) {
  var n = [], t = G[r].u, e = Ja(0);
  G[r].b = e, G[r].c = w(function(i, $, c) {
    for (; $.b; $ = $.b) for (var v = n, l = t($.a), s = 0; s < v.length; s++) v[s](l);
    return e;
  });
  function a(i) {
    n.push(i);
  }
  function u(i) {
    n = n.slice();
    var $ = n.indexOf(i);
    $ >= 0 && n.splice($, 1);
  }
  return { subscribe: a, unsubscribe: u };
}
function Oa(r, n) {
  return Ht(r), G[r] = { f: Ga, u: n, a: Ia }, Lr(r);
}
var Ga = f(function(r, n) {
  return function(t) {
    return r(n(t));
  };
});
function Ia(r, n) {
  var t = A, e = G[r].u, a = ur(null);
  G[r].b = a, G[r].c = w(function(i, $, c) {
    return t = $, a;
  });
  function u(i) {
    var $ = o(Et, e, i);
    K($) || jr(4, r, $.a);
    for (var c = $.a, v = t; v.b; v = v.b) n(v.a(c));
  }
  return { send: u };
}
var Zr, _r = typeof document < "u" ? document : {};
function Un(r, n) {
  r.appendChild(n);
}
q(function(r, n, t, e) {
  var a = e.node;
  return a.parentNode.replaceChild(fr(r, function() {
  }), a), {};
});
function Sn(r) {
  return { $: 0, a: r };
}
var Ua = f(function(r, n) {
  return f(function(t, e) {
    for (var a = [], u = 0; e.b; e = e.b) {
      var i = e.a;
      u += i.b || 0, a.push(i);
    }
    return u += a.length, { $: 1, c: n, d: Tt(t), e: a, f: r, b: u };
  });
}), y = Ua(void 0), za = f(function(r, n) {
  return f(function(t, e) {
    for (var a = [], u = 0; e.b; e = e.b) {
      var i = e.a;
      u += i.b.b || 0, a.push(i);
    }
    return u += a.length, { $: 2, c: n, d: Tt(t), e: a, f: r, b: u };
  });
});
za(void 0);
f(function(r, n) {
  return { $: 4, j: r, k: n, b: 1 + (n.b || 0) };
});
function pr(r, n) {
  return { $: 5, l: r, m: n, k: void 0 };
}
f(function(r, n) {
  return pr([r, n], function() {
    return r(n);
  });
});
w(function(r, n, t) {
  return pr([r, n, t], function() {
    return o(r, n, t);
  });
});
q(function(r, n, t, e) {
  return pr([r, n, t, e], function() {
    return d(r, n, t, e);
  });
});
br(function(r, n, t, e, a) {
  return pr([r, n, t, e, a], function() {
    return tr(r, n, t, e, a);
  });
});
nn(function(r, n, t, e, a, u) {
  return pr([r, n, t, e, a, u], function() {
    return h(r, n, t, e, a, u);
  });
});
tn(function(r, n, t, e, a, u, i) {
  return pr([r, n, t, e, a, u, i], function() {
    return dn(r, n, t, e, a, u, i);
  });
});
At(function(r, n, t, e, a, u, i, $) {
  return pr([r, n, t, e, a, u, i, $], function() {
    return Dt(r, n, t, e, a, u, i, $);
  });
});
Fn(function(r, n, t, e, a, u, i, $, c) {
  return pr([r, n, t, e, a, u, i, $, c], function() {
    return Te(r, n, t, e, a, u, i, $, c);
  });
});
var Bt = f(function(r, n) {
  return { $: "a0", n: r, o: n };
}), Wa = f(function(r, n) {
  return { $: "a1", n: r, o: n };
}), ka = f(function(r, n) {
  return { $: "a2", n: r, o: n };
}), qa = f(function(r, n) {
  return { $: "a3", n: r, o: n };
});
w(function(r, n, t) {
  return { $: "a4", n, o: { f: r, o: t } };
});
var ya = /^\s*j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t\s*:/i, Xa = /^\s*(j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t\s*:|d\s*a\s*t\s*a\s*:\s*t\s*e\s*x\s*t\s*\/\s*h\s*t\s*m\s*l\s*(,|;))/i;
function Ya(r) {
  return ya.test(r) ? "" : r;
}
function Qa(r) {
  return Xa.test(r) ? "" : r;
}
f(function(r, n) {
  return n.$ === "a0" ? o(Bt, n.n, Za(r, n.o)) : n;
});
function Za(r, n) {
  var t = Xn(n);
  return { $: n.$, a: t ? d(Ku, t < 3 ? Ka : Na, cr(r), n.a) : o(M, r, n.a) };
}
var Ka = f(function(r, n) {
  return g(r(n.a), n.b);
}), Na = f(function(r, n) {
  return { s: r(n.s), aq: n.aq, an: n.an };
});
function Tt(r) {
  for (var n = {}; r.b; r = r.b) {
    var t = r.a, e = t.$, a = t.n, u = t.o;
    if (e === "a2") {
      a === "className" ? $t(n, a, u) : n[a] = u;
      continue;
    }
    var i = n[e] || (n[e] = {});
    e === "a3" && a === "class" ? $t(i, a, u) : i[a] = u;
  }
  return n;
}
function $t(r, n, t) {
  var e = r[n];
  r[n] = e ? e + " " + t : t;
}
function fr(r, n) {
  var t = r.$;
  if (t === 5) return fr(r.k || (r.k = r.m()), n);
  if (t === 0) return _r.createTextNode(r.a);
  if (t === 4) {
    for (var e = r.k, a = r.j; e.$ === 4; ) typeof a != "object" ? a = [a, e.j] : a.push(e.j), e = e.k;
    var u = { j: a, p: n }, i = fr(e, u);
    return i.elm_event_node_ref = u, i;
  }
  if (t === 3) {
    var i = r.h(r.g);
    return An(i, n, r.d), i;
  }
  var i = r.f ? _r.createElementNS(r.f, r.c) : _r.createElement(r.c);
  Zr && r.c == "a" && i.addEventListener("click", Zr(i)), An(i, n, r.d);
  for (var $ = r.e, c = 0; c < $.length; c++) Un(i, fr(t === 1 ? $[c] : $[c].b, n));
  return i;
}
function An(r, n, t) {
  for (var e in t) {
    var a = t[e];
    e === "a1" ? xa(r, a) : e === "a0" ? tu(r, n, a) : e === "a3" ? ru(r, a) : e === "a4" ? nu(r, a) : (e !== "value" && e !== "checked" || r[e] !== a) && (r[e] = a);
  }
}
function xa(r, n) {
  var t = r.style;
  for (var e in n) t[e] = n[e];
}
function ru(r, n) {
  for (var t in n) {
    var e = n[t];
    typeof e < "u" ? r.setAttribute(t, e) : r.removeAttribute(t);
  }
}
function nu(r, n) {
  for (var t in n) {
    var e = n[t], a = e.f, u = e.o;
    typeof u < "u" ? r.setAttributeNS(a, t, u) : r.removeAttributeNS(a, t);
  }
}
function tu(r, n, t) {
  var e = r.elmFs || (r.elmFs = {});
  for (var a in t) {
    var u = t[a], i = e[a];
    if (!u) {
      r.removeEventListener(a, i), e[a] = void 0;
      continue;
    }
    if (i) {
      var $ = i.q;
      if ($.$ === u.$) {
        i.q = u;
        continue;
      }
      r.removeEventListener(a, i);
    }
    i = eu(n, u), r.addEventListener(a, i, zn && { passive: Xn(u) < 2 }), e[a] = i;
  }
}
var zn;
try {
  window.addEventListener("t", null, Object.defineProperty({}, "passive", { get: function() {
    zn = true;
  } }));
} catch {
}
function eu(r, n) {
  function t(e) {
    var a = t.q, u = X(a.a, e);
    if (K(u)) {
      for (var i = Xn(a), $ = u.a, c = i ? i < 3 ? $.a : $.s : $, v = i == 1 ? $.b : i == 3 && $.aq, l = (v && e.stopPropagation(), (i == 2 ? $.b : i == 3 && $.an) && e.preventDefault(), r), s, p; s = l.j; ) {
        if (typeof s == "function") c = s(c);
        else for (var p = s.length; p--; ) c = s[p](c);
        l = l.p;
      }
      l(c, v);
    }
  }
  return t.q = n, t;
}
function au(r, n) {
  return r.$ == n.$ && gr(r.a, n.a);
}
function Ct(r, n) {
  var t = [];
  return N(r, n, t, 0), t;
}
function I(r, n, t, e) {
  var a = { $: n, r: t, s: e, t: void 0, u: void 0 };
  return r.push(a), a;
}
function N(r, n, t, e) {
  if (r !== n) {
    var a = r.$, u = n.$;
    if (a !== u) if (a === 1 && u === 2) n = lu(n), u = 1;
    else {
      I(t, 0, e, n);
      return;
    }
    switch (u) {
      case 5:
        for (var i = r.l, $ = n.l, c = i.length, v = c === $.length; v && c--; ) v = i[c] === $[c];
        if (v) {
          n.k = r.k;
          return;
        }
        n.k = n.m();
        var l = [];
        N(r.k, n.k, l, 0), l.length > 0 && I(t, 1, e, l);
        return;
      case 4:
        for (var s = r.j, p = n.j, _ = false, D = r.k; D.$ === 4; ) _ = true, typeof s != "object" ? s = [s, D.j] : s.push(D.j), D = D.k;
        for (var E = n.k; E.$ === 4; ) _ = true, typeof p != "object" ? p = [p, E.j] : p.push(E.j), E = E.k;
        if (_ && s.length !== p.length) {
          I(t, 0, e, n);
          return;
        }
        (_ ? !uu(s, p) : s !== p) && I(t, 2, e, p), N(D, E, t, e + 1);
        return;
      case 0:
        r.a !== n.a && I(t, 3, e, n.a);
        return;
      case 1:
        ct(r, n, t, e, ou);
        return;
      case 2:
        ct(r, n, t, e, iu);
        return;
      case 3:
        if (r.h !== n.h) {
          I(t, 0, e, n);
          return;
        }
        var J = Wn(r.d, n.d);
        J && I(t, 4, e, J);
        var H = n.i(r.g, n.g);
        H && I(t, 5, e, H);
        return;
    }
  }
}
function uu(r, n) {
  for (var t = 0; t < r.length; t++) if (r[t] !== n[t]) return false;
  return true;
}
function ct(r, n, t, e, a) {
  if (r.c !== n.c || r.f !== n.f) {
    I(t, 0, e, n);
    return;
  }
  var u = Wn(r.d, n.d);
  u && I(t, 4, e, u), a(r, n, t, e);
}
function Wn(r, n, t) {
  var e;
  for (var a in r) {
    if (a === "a1" || a === "a0" || a === "a3" || a === "a4") {
      var u = Wn(r[a], n[a] || {}, a);
      u && (e = e || {}, e[a] = u);
      continue;
    }
    if (!(a in n)) {
      e = e || {}, e[a] = t ? t === "a1" ? "" : t === "a0" || t === "a3" ? void 0 : { f: r[a].f, o: void 0 } : typeof r[a] == "string" ? "" : null;
      continue;
    }
    var i = r[a], $ = n[a];
    i === $ && a !== "value" && a !== "checked" || t === "a0" && au(i, $) || (e = e || {}, e[a] = $);
  }
  for (var c in n) c in r || (e = e || {}, e[c] = n[c]);
  return e;
}
function ou(r, n, t, e) {
  var a = r.e, u = n.e, i = a.length, $ = u.length;
  i > $ ? I(t, 6, e, { v: $, i: i - $ }) : i < $ && I(t, 7, e, { v: i, e: u });
  for (var c = i < $ ? i : $, v = 0; v < c; v++) {
    var l = a[v];
    N(l, u[v], t, ++e), e += l.b || 0;
  }
}
function iu(r, n, t, e) {
  for (var a = [], u = {}, i = [], $ = r.e, c = n.e, v = $.length, l = c.length, s = 0, p = 0, _ = e; s < v && p < l; ) {
    var D = $[s], E = c[p], J = D.a, H = E.a, j = D.b, z = E.b, or = void 0, vn = void 0;
    if (J === H) {
      _++, N(j, z, a, _), _ += j.b || 0, s++, p++;
      continue;
    }
    var Ir = $[s + 1], ln = c[p + 1];
    if (Ir) {
      var rt = Ir.a, dr = Ir.b;
      vn = H === rt;
    }
    if (ln) {
      var nt = ln.a, sn = ln.b;
      or = J === nt;
    }
    if (or && vn) {
      _++, N(j, sn, a, _), Jr(u, a, J, z, p, i), _ += j.b || 0, _++, Rr(u, a, J, dr, _), _ += dr.b || 0, s += 2, p += 2;
      continue;
    }
    if (or) {
      _++, Jr(u, a, H, z, p, i), N(j, sn, a, _), _ += j.b || 0, s += 1, p += 2;
      continue;
    }
    if (vn) {
      _++, Rr(u, a, J, j, _), _ += j.b || 0, _++, N(dr, z, a, _), _ += dr.b || 0, s += 2, p += 1;
      continue;
    }
    if (Ir && rt === nt) {
      _++, Rr(u, a, J, j, _), Jr(u, a, H, z, p, i), _ += j.b || 0, _++, N(dr, sn, a, _), _ += dr.b || 0, s += 2, p += 2;
      continue;
    }
    break;
  }
  for (; s < v; ) {
    _++;
    var D = $[s], j = D.b;
    Rr(u, a, D.a, j, _), _ += j.b || 0, s++;
  }
  for (; p < l; ) {
    var Ur = Ur || [], E = c[p];
    Jr(u, a, E.a, E.b, void 0, Ur), p++;
  }
  (a.length > 0 || i.length > 0 || Ur) && I(t, 8, e, { w: a, x: i, y: Ur });
}
var Pt = "_elmW6BL";
function Jr(r, n, t, e, a, u) {
  var i = r[t];
  if (!i) {
    i = { c: 0, z: e, r: a, s: void 0 }, u.push({ r: a, A: i }), r[t] = i;
    return;
  }
  if (i.c === 1) {
    u.push({ r: a, A: i }), i.c = 2;
    var $ = [];
    N(i.z, e, $, i.r), i.r = a, i.s.s = { w: $, A: i };
    return;
  }
  Jr(r, n, t + Pt, e, a, u);
}
function Rr(r, n, t, e, a) {
  var u = r[t];
  if (!u) {
    var i = I(n, 9, a, void 0);
    r[t] = { c: 1, z: e, r: a, s: i };
    return;
  }
  if (u.c === 0) {
    u.c = 2;
    var $ = [];
    N(e, u.z, $, a), I(n, 9, a, { w: $, A: u });
    return;
  }
  Rr(r, n, t + Pt, e, a);
}
function Ft(r, n, t, e) {
  Hr(r, n, t, 0, 0, n.b, e);
}
function Hr(r, n, t, e, a, u, i) {
  for (var $ = t[e], c = $.r; c === a; ) {
    var v = $.$;
    if (v === 1) Ft(r, n.k, $.s, i);
    else if (v === 8) {
      $.t = r, $.u = i;
      var l = $.s.w;
      l.length > 0 && Hr(r, n, l, 0, a, u, i);
    } else if (v === 9) {
      $.t = r, $.u = i;
      var s = $.s;
      if (s) {
        s.A.s = r;
        var l = s.w;
        l.length > 0 && Hr(r, n, l, 0, a, u, i);
      }
    } else $.t = r, $.u = i;
    if (e++, !($ = t[e]) || (c = $.r) > u) return e;
  }
  var p = n.$;
  if (p === 4) {
    for (var _ = n.k; _.$ === 4; ) _ = _.k;
    return Hr(r, _, t, e, a + 1, u, r.elm_event_node_ref);
  }
  for (var D = n.e, E = r.childNodes, J = 0; J < D.length; J++) {
    a++;
    var H = p === 1 ? D[J] : D[J].b, j = a + (H.b || 0);
    if (a <= c && c <= j && (e = Hr(E[J], H, t, e, a, j, i), !($ = t[e]) || (c = $.r) > u)) return e;
    a = j;
  }
  return e;
}
function Vt(r, n, t, e) {
  return t.length === 0 ? r : (Ft(r, n, t, e), Kr(r, t));
}
function Kr(r, n) {
  for (var t = 0; t < n.length; t++) {
    var e = n[t], a = e.t, u = $u(a, e);
    a === r && (r = u);
  }
  return r;
}
function $u(r, n) {
  switch (n.$) {
    case 0:
      return cu(r, n.s, n.u);
    case 4:
      return An(r, n.u, n.s), r;
    case 3:
      return r.replaceData(0, r.length, n.s), r;
    case 1:
      return Kr(r, n.s);
    case 2:
      return r.elm_event_node_ref ? r.elm_event_node_ref.j = n.s : r.elm_event_node_ref = { j: n.s, p: n.u }, r;
    case 6:
      for (var u = n.s, e = 0; e < u.i; e++) r.removeChild(r.childNodes[u.v]);
      return r;
    case 7:
      for (var u = n.s, t = u.e, e = u.v, a = r.childNodes[e]; e < t.length; e++) r.insertBefore(fr(t[e], n.u), a);
      return r;
    case 9:
      var u = n.s;
      if (!u) return r.parentNode.removeChild(r), r;
      var i = u.A;
      return typeof i.r < "u" && r.parentNode.removeChild(r), i.s = Kr(r, u.w), r;
    case 8:
      return fu(r, n);
    case 5:
      return n.s(r);
    default:
      jr(10);
  }
}
function cu(r, n, t) {
  var e = r.parentNode, a = fr(n, t);
  return a.elm_event_node_ref || (a.elm_event_node_ref = r.elm_event_node_ref), e && a !== r && e.replaceChild(a, r), a;
}
function fu(r, n) {
  var t = n.s, e = vu(t.y, n);
  r = Kr(r, t.w);
  for (var a = t.x, u = 0; u < a.length; u++) {
    var i = a[u], $ = i.A, c = $.c === 2 ? $.s : fr($.z, n.u);
    r.insertBefore(c, r.childNodes[i.r]);
  }
  return e && Un(r, e), r;
}
function vu(r, n) {
  if (r) {
    for (var t = _r.createDocumentFragment(), e = 0; e < r.length; e++) {
      var a = r[e], u = a.A;
      Un(t, u.c === 2 ? u.s : fr(u.z, n.u));
    }
    return t;
  }
}
function kn(r) {
  if (r.nodeType === 3) return Sn(r.textContent);
  if (r.nodeType !== 1) return Sn("");
  for (var n = A, t = r.attributes, e = t.length; e--; ) {
    var a = t[e], u = a.name, i = a.value;
    n = er(o(qa, u, i), n);
  }
  for (var $ = r.tagName.toLowerCase(), c = A, v = r.childNodes, e = v.length; e--; ) c = er(kn(v[e]), c);
  return d(y, $, n, c);
}
function lu(r) {
  for (var n = r.e, t = n.length, e = new Array(t), a = 0; a < t; a++) e[a] = n[a].b;
  return { $: 1, c: r.c, d: r.d, e, f: r.f, b: r.b };
}
var su = q(function(r, n, t, e) {
  return Gn(n, e, r.bo, r.bB, r.by, function(a, u) {
    var i = r.bD, $ = e.node, c = kn($);
    return Lt(u, function(v) {
      var l = i(v), s = Ct(c, l);
      $ = Vt($, c, s, a), c = l;
    });
  });
});
q(function(r, n, t, e) {
  return Gn(n, e, r.bo, r.bB, r.by, function(a, u) {
    var i = r.ao && r.ao(a), $ = r.bD, c = _r.title, v = _r.body, l = kn(v);
    return Lt(u, function(s) {
      Zr = i;
      var p = $(s), _ = y("body")(A)(p.J), D = Ct(l, _);
      v = Vt(v, l, D, a), l = _, Zr = 0, c !== p.ak && (_r.title = c = p.ak);
    });
  });
});
var Nr = typeof requestAnimationFrame < "u" ? requestAnimationFrame : function(r) {
  return setTimeout(r, 1e3 / 60);
};
function Lt(r, n) {
  n(r);
  var t = 0;
  function e() {
    t = t === 1 ? 0 : (Nr(e), n(r), 1);
  }
  return function(a, u) {
    r = a, u ? (n(r), t === 2 && (t = 1)) : (t === 0 && Nr(e), t = 2);
  };
}
f(function(r, n) {
  return o(Kn, Qn, W(function() {
    n && history.go(n), r();
  }));
});
f(function(r, n) {
  return o(Kn, Qn, W(function() {
    history.pushState({}, "", n), r();
  }));
});
f(function(r, n) {
  return o(Kn, Qn, W(function() {
    history.replaceState({}, "", n), r();
  }));
});
var mu = { addEventListener: function() {
}, removeEventListener: function() {
} }, pu = typeof window < "u" ? window : mu;
w(function(r, n, t) {
  return Ln(W(function(e) {
    function a(u) {
      Sr(t(u));
    }
    return r.addEventListener(n, a, zn && { passive: true }), function() {
      r.removeEventListener(n, a);
    };
  }));
});
f(function(r, n) {
  var t = X(r, n);
  return K(t) ? V(t.a) : R;
});
function Ot(r, n) {
  return W(function(t) {
    Nr(function() {
      var e = document.getElementById(r);
      t(e ? ur(n(e)) : wa(Nu(r)));
    });
  });
}
function _u(r) {
  return W(function(n) {
    Nr(function() {
      n(ur(r()));
    });
  });
}
f(function(r, n) {
  return Ot(n, function(t) {
    return t[r](), hr;
  });
});
f(function(r, n) {
  return _u(function() {
    return pu.scroll(r, n), hr;
  });
});
w(function(r, n, t) {
  return Ot(r, function(e) {
    return e.scrollLeft = n, e.scrollTop = t, hr;
  });
});
var bu = w(function(r, n, t) {
  return W(function(e) {
    function a(i) {
      e(n(t.bj.a(i)));
    }
    var u = new XMLHttpRequest();
    u.addEventListener("error", function() {
      a(Ao);
    }), u.addEventListener("timeout", function() {
      a(Eo);
    }), u.addEventListener("load", function() {
      a(du(t.bj.b, u));
    }), ie(t.bA) && ju(r, u, t.bA.a);
    try {
      u.open(t.bp, t.bC, true);
    } catch {
      return a(wo(t.bC));
    }
    return hu(u, t), t.J.a && u.setRequestHeader("Content-Type", t.J.a), u.send(t.J.b), function() {
      u.c = true, u.abort();
    };
  });
});
function hu(r, n) {
  for (var t = n.bl; t.b; t = t.b) r.setRequestHeader(t.a.a, t.a.b);
  r.timeout = n.bz.a || 0, r.responseType = n.bj.d, r.withCredentials = n.be;
}
function du(r, n) {
  return o(200 <= n.status && n.status < 300 ? So : go, gu(n), r(n.response));
}
function gu(r) {
  return { bC: r.responseURL, bw: r.status, bx: r.statusText, bl: wu(r.getAllResponseHeaders()) };
}
function wu(r) {
  if (!r) return Hn;
  for (var n = Hn, t = r.split(`\r
`), e = t.length; e--; ) {
    var a = t[e], u = a.indexOf(": ");
    if (u > 0) {
      var i = a.substring(0, u), $ = a.substring(u + 2);
      n = d(Mo, i, function(c) {
        return V(ie(c) ? $ + ", " + c.a : $);
      }, n);
    }
  }
  return n;
}
var Su = w(function(r, n, t) {
  return { $: 0, d: r, b: n, a: t };
}), Au = f(function(r, n) {
  return { $: 0, d: n.d, b: n.b, a: function(t) {
    return r(n.a(t));
  } };
}), Du = f(function(r, n) {
  return { $: 0, a: r, b: n };
});
f(function(r, n) {
  return new Blob([n], { type: r });
});
function ju(r, n, t) {
  n.upload.addEventListener("progress", function(e) {
    n.c || Sr(o(bt, r, g(t, jo({ bv: e.loaded, a4: e.total }))));
  }), n.addEventListener("progress", function(e) {
    n.c || Sr(o(bt, r, g(t, Do({ bt: e.loaded, a4: e.lengthComputable ? V(e.total) : R }))));
  });
}
f(function(r, n) {
  return r & n;
});
f(function(r, n) {
  return r | n;
});
f(function(r, n) {
  return r ^ n;
});
f(function(r, n) {
  return n << r;
});
f(function(r, n) {
  return n >> r;
});
f(function(r, n) {
  return n >>> r;
});
function Eu(r) {
  return W(function(n) {
    n(ur(r(Date.now())));
  });
}
f(function(r, n) {
  return W(function(t) {
    var e = setInterval(function() {
      Sr(n);
    }, r);
    return function() {
      clearInterval(e);
    };
  });
});
var Gt = 1, Ju = 2, It = 0, Y = Fe, Ut = w(function(r, n, t) {
  r: for (; ; ) {
    if (t.$ === -2) return n;
    var e = t.b, a = t.c, u = t.d, i = t.e, $ = r, c = d(r, e, a, d(Ut, r, n, i)), v = u;
    r = $, n = c, t = v;
    continue r;
  }
}), ft = function(r) {
  return d(Ut, w(function(n, t, e) {
    return o(Y, g(n, t), e);
  }), A, r);
}, Wr = Ue;
w(function(r, n, t) {
  var e = t.c, a = t.d, u = f(function(i, $) {
    if (i.$) {
      var v = i.a;
      return d(Wr, r, $, v);
    } else {
      var c = i.a;
      return d(Wr, u, $, c);
    }
  });
  return d(Wr, u, d(Wr, r, n, a), e);
});
var k = function(r) {
  return { $: 1, a: r };
}, qn = f(function(r, n) {
  return { $: 3, a: r, b: n };
}), vt = f(function(r, n) {
  return { $: 0, a: r, b: n };
}), zt = f(function(r, n) {
  return { $: 1, a: r, b: n };
}), nr = function(r) {
  return { $: 0, a: r };
}, Ru = function(r) {
  return { $: 2, a: r };
}, V = function(r) {
  return { $: 0, a: r };
}, R = { $: 1 }, Hu = Ke, Wt = pa, Ar = ra, Mr = f(function(r, n) {
  return o(Qe, r, Vn(n));
}), Mu = f(function(r, n) {
  return m(o(Ye, r, n));
}), kt = function(r) {
  return o(Mr, `
    `, o(Mu, `
`, r));
}, Or = w(function(r, n, t) {
  r: for (; ; ) if (t.b) {
    var e = t.a, a = t.b, u = r, i = o(r, e, n), $ = a;
    r = u, n = i, t = $;
    continue r;
  } else return n;
}), qt = function(r) {
  return d(Or, f(function(n, t) {
    return t + 1;
  }), 0, r);
}, Bu = Ve, Tu = w(function(r, n, t) {
  r: for (; ; ) if (U(r, n) < 1) {
    var e = r, a = n - 1, u = o(Y, n, t);
    r = e, n = a, t = u;
    continue r;
  } else return t;
}), Cu = f(function(r, n) {
  return d(Tu, r, n, A);
}), Pu = f(function(r, n) {
  return d(Bu, r, o(Cu, 0, qt(n) - 1), n);
}), yn = ta, yt = function(r) {
  var n = yn(r);
  return 97 <= n && n <= 122;
}, Xt = function(r) {
  var n = yn(r);
  return n <= 90 && 65 <= n;
}, Fu = function(r) {
  return yt(r) || Xt(r);
}, Vu = function(r) {
  var n = yn(r);
  return n <= 57 && 48 <= n;
}, Lu = function(r) {
  return yt(r) || Xt(r) || Vu(r);
}, vr = function(r) {
  return d(Or, Y, A, r);
}, Ou = ye, Gu = f(function(r, n) {
  return `

(` + (Ar(r + 1) + (") " + kt(Yt(n))));
}), Yt = function(r) {
  return o(Iu, r, A);
}, Iu = f(function(r, n) {
  r: for (; ; ) switch (r.$) {
    case 0:
      var t = r.a, i = r.b, e = function() {
        var E = Ou(t);
        if (E.$ === 1) return false;
        var J = E.a, H = J.a, j = J.b;
        return Fu(H) && o(Hu, Lu, j);
      }(), a = e ? "." + t : "['" + (t + "']"), c = i, v = o(Y, a, n);
      r = c, n = v;
      continue r;
    case 1:
      var u = r.a, i = r.b, $ = "[" + (Ar(u) + "]"), c = i, v = o(Y, $, n);
      r = c, n = v;
      continue r;
    case 2:
      var l = r.a;
      if (l.b) if (l.b.b) {
        var s = function() {
          return n.b ? "The Json.Decode.oneOf at json" + o(Mr, "", vr(n)) : "Json.Decode.oneOf";
        }(), D = s + (" failed in the following " + (Ar(qt(l)) + " ways:"));
        return o(Mr, `

`, o(Y, D, o(Pu, Gu, l)));
      } else {
        var i = l.a, c = i, v = n;
        r = c, n = v;
        continue r;
      }
      else return "Ran into a Json.Decode.oneOf with no possibilities" + function() {
        return n.b ? " at json" + o(Mr, "", vr(n)) : "!";
      }();
    default:
      var p = r.a, _ = r.b, D = function() {
        return n.b ? "Problem with the value at json" + (o(Mr, "", vr(n)) + `:

    `) : `Problem with the given value:

`;
      }();
      return D + (kt(o(Wt, 4, _)) + (`

` + p));
  }
}), x = 32, Dn = q(function(r, n, t, e) {
  return { $: 0, a: r, b: n, c: t, d: e };
}), jn = Le, Qt = ke, Zt = f(function(r, n) {
  return tt(n) / tt(r);
}), En = Qt(o(Zt, 2, x)), Uu = tr(Dn, 0, En, jn, jn), Kt = Ge, zu = function(r) {
  return { $: 1, a: r };
};
f(function(r, n) {
  return r(n);
});
f(function(r, n) {
  return n(r);
});
var Wu = qe, lt = Oe, ku = f(function(r, n) {
  return U(r, n) > 0 ? r : n;
}), qu = function(r) {
  return { $: 0, a: r };
}, Nt = Ie, yu = f(function(r, n) {
  r: for (; ; ) {
    var t = o(Nt, x, r), e = t.a, a = t.b, u = o(Y, qu(e), n);
    if (a.b) {
      var i = a, $ = u;
      r = i, n = $;
      continue r;
    } else return vr(u);
  }
}), Xu = f(function(r, n) {
  r: for (; ; ) {
    var t = Qt(n / x);
    if (t === 1) return o(Nt, x, r).a;
    var e = o(yu, r, A), a = t;
    r = e, n = a;
    continue r;
  }
}), Yu = f(function(r, n) {
  if (n.a) {
    var t = n.a * x, e = Wu(o(Zt, x, t - 1)), a = r ? vr(n.d) : n.d, u = o(Xu, a, n.a);
    return tr(Dn, lt(n.c) + t, o(ku, 5, e * En), u, n.c);
  } else return tr(Dn, lt(n.c), En, jn, n.c);
}), Qu = br(function(r, n, t, e, a) {
  r: for (; ; ) {
    if (n < 0) return o(Yu, false, { d: e, a: t / x | 0, c: a });
    var u = zu(d(Kt, x, n, r)), i = r, $ = n - x, c = t, v = o(Y, u, e), l = a;
    r = i, n = $, t = c, e = v, a = l;
    continue r;
  }
}), Zu = f(function(r, n) {
  if (r <= 0) return Uu;
  var t = r % x, e = d(Kt, t, r - t, n), a = r - t - x;
  return h(Qu, n, a, r, A, e);
}), K = function(r) {
  return !r.$;
}, M = va, Ku = la, cr = ea, Xn = function(r) {
  switch (r.$) {
    case 0:
      return 0;
    case 1:
      return 1;
    case 2:
      return 2;
    default:
      return 3;
  }
}, Yn = function(r) {
  return r;
}, Nu = Yn, st = nn(function(r, n, t, e, a, u) {
  return { aC: u, k: n, aN: e, aP: t, aS: r, aT: a };
}), xu = Ne, ro = Xe, xt = Ze, en = f(function(r, n) {
  return r < 1 ? n : d(xt, r, ro(n), n);
}), an = xe, un = function(r) {
  return r === "";
}, on = f(function(r, n) {
  return r < 1 ? "" : d(xt, 0, r, n);
}), no = na, mt = br(function(r, n, t, e, a) {
  if (un(a) || o(xu, "@", a)) return R;
  var u = o(an, ":", a);
  if (u.b) {
    if (u.b.b) return R;
    var i = u.a, $ = no(o(en, i + 1, a));
    if ($.$ === 1) return R;
    var c = $;
    return V(dn(st, r, o(on, i, a), c, n, t, e));
  } else return V(dn(st, r, a, R, n, t, e));
}), pt = q(function(r, n, t, e) {
  if (un(e)) return R;
  var a = o(an, "/", e);
  if (a.b) {
    var u = a.a;
    return h(mt, r, o(en, u, e), n, t, o(on, u, e));
  } else return h(mt, r, "/", n, t, e);
}), _t = w(function(r, n, t) {
  if (un(t)) return R;
  var e = o(an, "?", t);
  if (e.b) {
    var a = e.a;
    return tr(pt, r, V(o(en, a + 1, t)), n, o(on, a, t));
  } else return tr(pt, r, R, n, t);
});
f(function(r, n) {
  if (un(n)) return R;
  var t = o(an, "#", n);
  if (t.b) {
    var e = t.a;
    return d(_t, r, V(o(en, e + 1, n)), o(on, e, n));
  } else return d(_t, r, R, n);
});
var Qn = function(r) {
}, Q = ur, to = Q(0), re = q(function(r, n, t, e) {
  if (e.b) {
    var a = e.a, u = e.b;
    if (u.b) {
      var i = u.a, $ = u.b;
      if ($.b) {
        var c = $.a, v = $.b;
        if (v.b) {
          var l = v.a, s = v.b, p = t > 500 ? d(Or, r, n, vr(s)) : tr(re, r, n, t + 1, s);
          return o(r, a, o(r, i, o(r, c, o(r, l, p))));
        } else return o(r, a, o(r, i, o(r, c, n)));
      } else return o(r, a, o(r, i, n));
    } else return o(r, a, n);
  } else return n;
}), Gr = w(function(r, n, t) {
  return tr(re, r, n, 0, t);
}), Fr = f(function(r, n) {
  return d(Gr, f(function(t, e) {
    return o(Y, r(t), e);
  }), A, n);
}), ar = wn, Zn = f(function(r, n) {
  return o(ar, function(t) {
    return Q(r(t));
  }, n);
}), eo = w(function(r, n, t) {
  return o(ar, function(e) {
    return o(ar, function(a) {
      return Q(o(r, e, a));
    }, t);
  }, n);
}), ne = function(r) {
  return d(Gr, eo(Y), Q(A), r);
}, $n = Ma, ao = f(function(r, n) {
  var t = n;
  return Ln(o(ar, $n(r), t));
}), uo = w(function(r, n, t) {
  return o(Zn, function(e) {
    return 0;
  }, ne(o(Fr, ao(r), n)));
}), oo = w(function(r, n, t) {
  return Q(0);
}), io = f(function(r, n) {
  var t = n;
  return o(Zn, r, t);
});
G.Task = In(to, uo, oo, io);
var $o = Lr("Task"), Kn = f(function(r, n) {
  return $o(o(Zn, r, n));
}), co = su, Jn = { $: 0 }, te = Ta, fo = function(r) {
  return { $: 1, a: r };
}, cn = function(r) {
  return d(Or, f(function(n, t) {
    var e = n.a, a = n.b;
    return d(ha, e, a, t);
  }), ba(), r);
}, L = Jt, vo = function(r) {
  return cn(m([g("host", L(r.k))]));
}, lo = function(r) {
  return { aJ: r };
}, T = ca, B = $a, Rn = oa, so = Fn(function(r, n, t, e, a, u, i, $, c) {
  return { au: $, Y: a, r, _: e, ac: t, ae: u, G: i, aj: c, ak: n };
}), Nn = aa, mo = tn(function(r, n, t, e, a, u, i) {
  return { R: a, aG: t, r, ab: n, af: e, ai: u, aj: i };
}), ee = ia, ae = fa, po = function(r) {
  return ae(m([ee(R), o(M, V, r)]));
}, O = ua, ue = o(T, function(r) {
  return o(M, r, o(B, "timestamp", Nn));
}, o(T, function(r) {
  return o(M, r, o(B, "text", O));
}, o(T, function(r) {
  return o(M, r, o(B, "author_name", O));
}, o(T, function(r) {
  return o(M, r, o(B, "parent_id", po(O)));
}, o(T, function(r) {
  return o(M, r, o(B, "guest_id", O));
}, o(T, function(r) {
  return o(M, r, o(B, "item_id", O));
}, o(T, function(r) {
  return o(M, r, o(B, "id", O));
}, cr(mo)))))))), oe = o(T, function(r) {
  return o(M, r, o(B, "timestamp", Nn));
}, o(T, function(r) {
  return o(M, r, o(B, "comments", Rn(ue)));
}, o(T, function(r) {
  return o(M, r, o(B, "tags", Rn(O)));
}, o(T, function(r) {
  return o(M, r, o(B, "owner_comment", O));
}, o(T, function(r) {
  return o(M, r, o(B, "extract", O));
}, o(T, function(r) {
  return o(M, r, o(B, "image", O));
}, o(T, function(r) {
  return o(M, r, o(B, "link", O));
}, o(T, function(r) {
  return o(M, r, o(B, "title", O));
}, o(T, function(r) {
  return o(M, r, o(B, "id", O));
}, cr(so)))))))))), _o = o(T, function(r) {
  return o(M, r, o(B, "items", Rn(oe)));
}, cr(lo)), bo = function(r) {
  return { J: vo(r), K: _o, L: "GetFeed" };
}, ho = sa, go = f(function(r, n) {
  return { $: 3, a: r, b: n };
}), wo = function(r) {
  return { $: 0, a: r };
}, So = f(function(r, n) {
  return { $: 4, a: r, b: n };
}), Ao = { $: 2 }, Do = function(r) {
  return { $: 1, a: r };
}, jo = function(r) {
  return { $: 0, a: r };
}, Eo = { $: 1 }, $r = { $: -2 }, Hn = $r, ie = function(r) {
  return !r.$;
}, bt = Ba, $e = Ce, ce = f(function(r, n) {
  r: for (; ; ) {
    if (n.$ === -2) return R;
    var t = n.b, e = n.c, a = n.d, u = n.e, i = o($e, r, t);
    switch (i) {
      case 0:
        var $ = r, c = a;
        r = $, n = c;
        continue r;
      case 1:
        return V(e);
      default:
        var $ = r, c = u;
        r = $, n = c;
        continue r;
    }
  }
}), S = br(function(r, n, t, e, a) {
  return { $: -1, a: r, b: n, c: t, d: e, e: a };
}), Dr = br(function(r, n, t, e, a) {
  if (a.$ === -1 && !a.a) {
    a.a;
    var u = a.b, i = a.c, $ = a.d, c = a.e;
    if (e.$ === -1 && !e.a) {
      e.a;
      var v = e.b, l = e.c, s = e.d, p = e.e;
      return h(S, 0, n, t, h(S, 1, v, l, s, p), h(S, 1, u, i, $, c));
    } else return h(S, r, u, i, h(S, 0, n, t, e, $), c);
  } else if (e.$ === -1 && !e.a && e.d.$ === -1 && !e.d.a) {
    e.a;
    var v = e.b, l = e.c, _ = e.d;
    _.a;
    var D = _.b, E = _.c, J = _.d, H = _.e, p = e.e;
    return h(S, 0, v, l, h(S, 1, D, E, J, H), h(S, 1, n, t, p, a));
  } else return h(S, r, n, t, e, a);
}), Mn = w(function(r, n, t) {
  if (t.$ === -2) return h(S, 0, r, n, $r, $r);
  var e = t.a, a = t.b, u = t.c, i = t.d, $ = t.e, c = o($e, r, a);
  switch (c) {
    case 0:
      return h(Dr, e, a, u, d(Mn, r, n, i), $);
    case 1:
      return h(S, e, a, n, i, $);
    default:
      return h(Dr, e, a, u, i, d(Mn, r, n, $));
  }
}), fe = w(function(r, n, t) {
  var e = d(Mn, r, n, t);
  if (e.$ === -1 && !e.a) {
    e.a;
    var a = e.b, u = e.c, i = e.d, $ = e.e;
    return h(S, 1, a, u, i, $);
  } else {
    var c = e;
    return c;
  }
}), Jo = function(r) {
  r: for (; ; ) if (r.$ === -1 && r.d.$ === -1) {
    var n = r.d, t = n;
    r = t;
    continue r;
  } else return r;
}, ve = function(r) {
  if (r.$ === -1 && r.d.$ === -1 && r.e.$ === -1) if (r.e.d.$ === -1 && !r.e.d.a) {
    var n = r.a, t = r.b, e = r.c, a = r.d;
    a.a;
    var u = a.b, i = a.c, $ = a.d, c = a.e, v = r.e;
    v.a;
    var l = v.b, s = v.c, p = v.d;
    p.a;
    var _ = p.b, D = p.c, E = p.d, J = p.e, H = v.e;
    return h(S, 0, _, D, h(S, 1, t, e, h(S, 0, u, i, $, c), E), h(S, 1, l, s, J, H));
  } else {
    var n = r.a, t = r.b, e = r.c, j = r.d;
    j.a;
    var u = j.b, i = j.c, $ = j.d, c = j.e, z = r.e;
    z.a;
    var l = z.b, s = z.c, p = z.d, H = z.e;
    return h(S, 1, t, e, h(S, 0, u, i, $, c), h(S, 0, l, s, p, H));
  }
  else return r;
}, ht = function(r) {
  if (r.$ === -1 && r.d.$ === -1 && r.e.$ === -1) if (r.d.d.$ === -1 && !r.d.d.a) {
    var n = r.a, t = r.b, e = r.c, a = r.d;
    a.a;
    var u = a.b, i = a.c, $ = a.d;
    $.a;
    var c = $.b, v = $.c, l = $.d, s = $.e, p = a.e, _ = r.e;
    _.a;
    var D = _.b, E = _.c, J = _.d, H = _.e;
    return h(S, 0, u, i, h(S, 1, c, v, l, s), h(S, 1, t, e, p, h(S, 0, D, E, J, H)));
  } else {
    var n = r.a, t = r.b, e = r.c, j = r.d;
    j.a;
    var u = j.b, i = j.c, z = j.d, p = j.e, or = r.e;
    or.a;
    var D = or.b, E = or.c, J = or.d, H = or.e;
    return h(S, 1, t, e, h(S, 0, u, i, z, p), h(S, 0, D, E, J, H));
  }
  else return r;
}, Ro = tn(function(r, n, t, e, a, u, i) {
  if (u.$ === -1 && !u.a) {
    u.a;
    var $ = u.b, c = u.c, v = u.d, l = u.e;
    return h(S, t, $, c, v, h(S, 0, e, a, l, i));
  } else {
    r: for (; ; ) if (i.$ === -1 && i.a === 1) if (i.d.$ === -1) if (i.d.a === 1) {
      i.a;
      var s = i.d;
      return s.a, ht(n);
    } else break r;
    else return i.a, i.d, ht(n);
    else break r;
    return n;
  }
}), yr = function(r) {
  if (r.$ === -1 && r.d.$ === -1) {
    var n = r.a, t = r.b, e = r.c, a = r.d, u = a.a, i = a.d, $ = r.e;
    if (u === 1) {
      if (i.$ === -1 && !i.a) return i.a, h(S, n, t, e, yr(a), $);
      var c = ve(r);
      if (c.$ === -1) {
        var v = c.a, l = c.b, s = c.c, p = c.d, _ = c.e;
        return h(Dr, v, l, s, yr(p), _);
      } else return $r;
    } else return h(S, n, t, e, yr(a), $);
  } else return $r;
}, Pr = f(function(r, n) {
  if (n.$ === -2) return $r;
  var t = n.a, e = n.b, a = n.c, u = n.d, i = n.e;
  if (U(r, e) < 0) if (u.$ === -1 && u.a === 1) {
    u.a;
    var $ = u.d;
    if ($.$ === -1 && !$.a) return $.a, h(S, t, e, a, o(Pr, r, u), i);
    var c = ve(n);
    if (c.$ === -1) {
      var v = c.a, l = c.b, s = c.c, p = c.d, _ = c.e;
      return h(Dr, v, l, s, o(Pr, r, p), _);
    } else return $r;
  } else return h(S, t, e, a, o(Pr, r, u), i);
  else return o(Ho, r, Dt(Ro, r, n, t, e, a, u, i));
}), Ho = f(function(r, n) {
  if (n.$ === -1) {
    var t = n.a, e = n.b, a = n.c, u = n.d, i = n.e;
    if (lr(r, e)) {
      var $ = Jo(i);
      if ($.$ === -1) {
        var c = $.b, v = $.c;
        return h(Dr, t, c, v, u, yr(i));
      } else return $r;
    } else return h(Dr, t, e, a, u, o(Pr, r, i));
  } else return $r;
}), le = f(function(r, n) {
  var t = o(Pr, r, n);
  if (t.$ === -1 && !t.a) {
    t.a;
    var e = t.b, a = t.c, u = t.d, i = t.e;
    return h(S, 1, e, a, u, i);
  } else {
    var $ = t;
    return $;
  }
}), Mo = w(function(r, n, t) {
  var e = n(o(ce, r, t));
  if (e.$) return o(le, r, t);
  var a = e.a;
  return d(fe, r, a, t);
}), se = w(function(r, n, t) {
  return n(r(t));
}), Bo = f(function(r, n) {
  return d(Su, "", Yn, o(se, n, r));
}), me = f(function(r, n) {
  if (n.$) {
    var e = n.a;
    return k(r(e));
  } else {
    var t = n.a;
    return nr(t);
  }
}), To = function(r) {
  return { $: 4, a: r };
}, Co = function(r) {
  return { $: 3, a: r };
}, Po = function(r) {
  return { $: 0, a: r };
}, Fo = { $: 2 }, Vo = { $: 1 }, Lo = f(function(r, n) {
  switch (n.$) {
    case 0:
      var t = n.a;
      return k(Po(t));
    case 1:
      return k(Vo);
    case 2:
      return k(Fo);
    case 3:
      var e = n.a;
      return k(Co(e.bw));
    default:
      var a = n.b;
      return o(me, To, r(a));
  }
}), Oo = f(function(r, n) {
  return o(Bo, r, Lo(function(t) {
    return o(me, Yt, o(ho, n, t));
  }));
}), Go = f(function(r, n) {
  return { $: 0, a: r, b: n };
}), Io = Go, Uo = function(r) {
  return o(Du, "application/json", o(Wt, 0, r));
}, pe = function(r) {
  return { $: 1, a: r };
}, _e = f(function(r, n) {
  return { aV: r, a5: n };
}), zo = Q(o(_e, Hn, A)), Wo = ja, ko = Ln, Xr = w(function(r, n, t) {
  r: for (; ; ) if (n.b) {
    var e = n.a, a = n.b;
    if (e.$) {
      var s = e.a;
      return o(ar, function(p) {
        var _ = s.bA;
        if (_.$ === 1) return d(Xr, r, a, t);
        var D = _.a;
        return d(Xr, r, a, d(fe, D, p, t));
      }, ko(d(bu, r, $n(r), s)));
    } else {
      var u = e.a, i = o(ce, u, t);
      if (i.$ === 1) {
        var $ = r, c = a, v = t;
        r = $, n = c, t = v;
        continue r;
      } else {
        var l = i.a;
        return o(ar, function(p) {
          return d(Xr, r, a, o(le, u, t));
        }, Wo(l));
      }
    }
  } else return Q(t);
}), qo = q(function(r, n, t, e) {
  return o(ar, function(a) {
    return Q(o(_e, a, t));
  }, d(Xr, r, n, e.aV));
}), yo = w(function(r, n, t) {
  var e = r(n);
  if (e.$) return t;
  var a = e.a;
  return o(Y, a, t);
}), Xo = f(function(r, n) {
  return d(Gr, yo(r), A, n);
}), Yo = q(function(r, n, t, e) {
  var a = e.a, u = e.b;
  return lr(n, a) ? V(o($n, r, u(t))) : R;
}), Qo = w(function(r, n, t) {
  var e = n.a, a = n.b;
  return o(ar, function(u) {
    return Q(t);
  }, ne(o(Xo, d(Yo, r, e, a), t.a5)));
}), Zo = function(r) {
  return { $: 0, a: r };
}, Ko = f(function(r, n) {
  if (n.$) {
    var e = n.a;
    return pe({ be: e.be, J: e.J, bj: o(Au, r, e.bj), bl: e.bl, bp: e.bp, bz: e.bz, bA: e.bA, bC: e.bC });
  } else {
    var t = n.a;
    return Zo(t);
  }
}), No = f(function(r, n) {
  return { $: 0, a: r, b: n };
}), xo = f(function(r, n) {
  var t = n.a, e = n.b;
  return o(No, t, o(se, e, r));
});
G.Http = In(zo, qo, Qo, Ko, xo);
var ri = Lr("Http"), ni = function(r) {
  return ri(pe({ be: false, J: r.J, bj: r.bj, bl: r.bl, bp: r.bp, bz: r.bz, bA: r.bA, bC: r.bC }));
}, xn = f(function(r, n) {
  return ni({ J: Uo(n.J), bj: o(Oo, r, n.K), bl: m([o(Io, "X-RPC-Endpoint", n.L)]), bp: "POST", bz: R, bA: R, bC: "/api/" + n.L });
}), Bn = o(xn, fo, bo({ k: "localhost" })), Tn = ga, ti = Mt("loadGuestSession", function(r) {
  return Tn;
}), ei = ti(0), ai = ei, ui = g({ n: Jn, x: R, t: "", A: R }, te(m([Bn, ai]))), oi = function(r) {
  return { $: 9, a: r };
}, ii = Oa("guestsessionLoaded", ae(m([ee(R), o(M, V, o(T, function(r) {
  return o(T, function(n) {
    return o(T, function(t) {
      return cr({ V: t, X: n, Z: r });
    }, o(B, "created_at", Nn));
  }, o(B, "display_name", O));
}, o(B, "guest_id", O)))]))), $i = function(r) {
  return ii(r);
}, ci = function(r) {
  return $i(r);
}, fi = function(r) {
  return ci(oi);
}, bn = function(r) {
  return { $: 2, a: r };
}, vi = function(r) {
  return { $: 1, a: r };
}, li = function(r) {
  return { $: 8, a: r };
}, Cn = f(function(r, n) {
  return { $: 0, a: r, b: n };
}), xr = function(r) {
  var n = r.a, t = r.b;
  return o(Cn, n * 1664525 + t >>> 0, t);
}, si = function(r) {
  var n = xr(o(Cn, 0, 1013904223)), t = n.a, e = n.b, a = t + r >>> 0;
  return xr(o(Cn, a, e));
};
f(function(r, n) {
  return { $: 0, a: r, b: n };
});
var mi = Yn, pi = Eu(mi), _i = function(r) {
  var n = r;
  return n;
}, bi = o(ar, function(r) {
  return Q(si(_i(r)));
}, pi), hi = f(function(r, n) {
  var t = r;
  return t(n);
}), be = w(function(r, n, t) {
  if (n.b) {
    var e = n.a, a = n.b, u = o(hi, e, t), i = u.a, $ = u.b;
    return o(ar, function(c) {
      return d(be, r, a, $);
    }, o($n, r, i));
  } else return Q(t);
}), di = w(function(r, n, t) {
  return Q(t);
}), he = f(function(r, n) {
  var t = n;
  return function(e) {
    var a = t(e), u = a.a, i = a.b;
    return g(r(u), i);
  };
}), gi = f(function(r, n) {
  var t = n;
  return o(he, r, t);
});
G.Random = In(bi, be, di, gi);
var wi = Lr("Random"), Si = f(function(r, n) {
  return wi(o(he, r, n));
}), dt = function(r) {
  var n = r.a, t = (n ^ n >>> (n >>> 28) + 4) * 277803737;
  return (t >>> 22 ^ t) >>> 0;
}, Ai = f(function(r, n) {
  return function(t) {
    var e = U(r, n) < 0 ? g(r, n) : g(n, r), a = e.a, u = e.b, i = u - a + 1;
    if (i - 1 & i) {
      var $ = (-i >>> 0) % i >>> 0, c = function(v) {
        r: for (; ; ) {
          var l = dt(v), s = xr(v);
          if (U(l, $) < 0) {
            var p = s;
            v = p;
            continue r;
          } else return g(l % i + a, s);
        }
      };
      return c(t);
    } else return g(((i - 1 & dt(t)) >>> 0) + a, xr(t));
  };
}), Di = We, ji = o(Si, function(r) {
  return li({ V: 0, X: "Guest" + Ar(o(Di, 1e3, r)), Z: "guest-" + Ar(r) });
}, o(Ai, 1, 9999)), hn = function(r) {
  switch (r.$) {
    case 0:
      var n = r.a;
      return "Bad Url: " + n;
    case 1:
      return "Timeout";
    case 2:
      return "Network Error";
    case 3:
      var t = r.a;
      return "Bad Status: " + Ar(t);
    default:
      var e = r.a;
      return "Bad Body: " + e;
  }
}, ir = te(A), Ei = Jt, Ji = Mt("saveGuestSession", function(r) {
  return cn(m([g("created_at", Ei(r.V)), g("display_name", L(r.X)), g("guest_id", L(r.Z))]));
}), Ri = function(r) {
  return Ji(r);
}, Hi = function(r) {
  return Ri(r);
}, Mi = function(r) {
  return { $: 6, a: r };
}, Vr = f(function(r, n) {
  if (n.$) return R;
  var t = n.a;
  return V(r(t));
}), gt = w(function(r, n, t) {
  return r(n(t));
}), rn = f(function(r, n) {
  if (n.$) return r;
  var t = n.a;
  return t;
}), Bi = function(r) {
  return cn(m([g("host", L(r.k)), g("item_id", L(r.ab)), g("parent_id", o(gt, rn(Tn), Vr(L))(r.af)), g("text", L(r.ai)), g("author_name", o(gt, rn(Tn), Vr(L))(r.R))]));
}, Ti = function(r) {
  return { at: r };
}, Ci = o(T, function(r) {
  return o(M, r, o(B, "comment", ue));
}, cr(Ti)), Pi = function(r) {
  return { J: Bi(r), K: Ci, L: "SubmitComment" };
}, Fi = function(r) {
  var n = r.A;
  if (n.$) return ir;
  var t = n.a.ab, e = n.a.af;
  return o(xn, Mi, Pi({ R: o(Vr, function(a) {
    return a.X;
  }, r.x), k: "localhost", ab: t, af: e, ai: r.t }));
}, Vi = function(r) {
  return { $: 2, a: r };
}, Li = f(function(r, n) {
  return d(Or, da(r), _a(), n);
}), Oi = function(r) {
  return cn(m([g("host", L(r.k)), g("title", L(r.ak)), g("link", L(r.ac)), g("image", L(r._)), g("extract", L(r.Y)), g("owner_comment", L(r.ae)), g("tags", Li(L)(r.G))]));
}, Gi = function(r) {
  return { aI: r };
}, Ii = o(T, function(r) {
  return o(M, r, o(B, "item", oe));
}, cr(Gi)), Ui = function(r) {
  return { J: Oi(r), K: Ii, L: "SubmitItem" };
}, zi = o(xn, Vi, Ui({ Y: "This item was submitted via the generated Elm API.", k: "localhost", _: "https://placehold.co/100x100", ac: "https://elm-lang.org", ae: "So much cleaner!", G: A, ak: "New Item from Elm" })), Wi = f(function(r, n) {
  switch (r.$) {
    case 0:
      return g(n, zi);
    case 1:
      if (r.a.$) {
        var e = r.a.a;
        return g(Z(n, { n: bn("Failed to fetch feed: " + hn(e)) }), ir);
      } else {
        var t = r.a.a;
        return g(Z(n, { n: vi(t.aJ) }), ir);
      }
    case 2:
      if (r.a.$) {
        var e = r.a.a;
        return g(Z(n, { n: bn("Failed to submit item: " + hn(e)) }), ir);
      } else {
        var t = r.a.a;
        return g(Z(n, { n: Jn }), Bn);
      }
    case 3:
      var a = r.a, u = r.b;
      return g(Z(n, { t: "", A: V({ ab: a, af: u }) }), ir);
    case 4:
      var i = r.a;
      return g(Z(n, { t: i }), ir);
    case 8:
      var $ = r.a;
      return g(Z(n, { x: V($) }), Hi($));
    case 9:
      var c = r.a;
      if (c.$) return g(n, ji);
      var $ = c.a;
      return g(Z(n, { x: V($) }), ir);
    case 5:
      return g(n, Fi(n));
    case 6:
      if (r.a.$) {
        var e = r.a.a;
        return g(Z(n, { n: bn("Failed to submit comment: " + hn(e)) }), ir);
      } else return g(Z(n, { n: Jn, t: "", A: R }), Bn);
    default:
      return g(Z(n, { t: "", A: R }), ir);
  }
}), ki = { $: 0 }, Br = y("button"), P = y("div"), qi = y("h1"), yi = function(r) {
  return { $: 0, a: r };
}, de = Bt, Xi = f(function(r, n) {
  return o(de, r, yi(n));
}), Tr = function(r) {
  return o(Xi, "click", cr(r));
}, Yi = y("span"), Qi = Wa, b = Qi, Zi = Sn, F = Zi, ge = y("h2"), Ki = y("a"), we = f(function(r, n) {
  return d(Gr, f(function(t, e) {
    return r(t) ? o(Y, t, e) : e;
  }), A, n);
}), Ni = function(r) {
  return o(we, function(n) {
    return lr(n.af, R);
  }, r);
}, xi = y("h3"), fn = f(function(r, n) {
  return o(ka, r, L(n));
}), r$ = function(r) {
  return o(fn, "href", Ya(r));
}, n$ = y("img"), t$ = y("p"), e$ = y("section"), a$ = function(r) {
  return o(fn, "src", Qa(r));
}, u$ = f(function(r, n) {
  return o(we, function(t) {
    return lr(t.af, V(r));
  }, n);
}), o$ = { $: 7 }, i$ = { $: 5 }, $$ = function(r) {
  return { $: 4, a: r };
}, wt = f(function(r, n) {
  return { $: 3, a: r, b: n };
}), c$ = function(r) {
  return g(r, true);
}, f$ = function(r) {
  return { $: 1, a: r };
}, v$ = f(function(r, n) {
  return o(de, r, f$(n));
}), l$ = f(function(r, n) {
  return d(Gr, B, n, r);
}), s$ = o(l$, m(["target", "value"]), O), m$ = function(r) {
  return o(v$, "input", o(M, c$, o(M, r, s$)));
}, p$ = fn("placeholder"), _$ = y("textarea"), b$ = fn("value"), Se = w(function(r, n, t) {
  var e = r.A;
  if (e.$) return o(Br, m([Tr(o(wt, n, t)), o(b, "font-size", "0.8em"), o(b, "color", "gray"), o(b, "background", "none"), o(b, "border", "none"), o(b, "cursor", "pointer"), o(b, "text-decoration", "underline")]), m([F("Reply")]));
  var a = e.a;
  return lr(a.ab, n) && lr(a.af, t) ? o(P, m([o(b, "margin-top", "5px"), o(b, "background", "#f0f0f0"), o(b, "padding", "10px")]), m([o(P, m([o(b, "margin-bottom", "5px"), o(b, "font-size", "0.9em"), o(b, "color", "#666")]), m([F("Commenting as: " + o(rn, "Guest", o(Vr, function(u) {
    return u.X;
  }, r.x)))])), o(_$, m([p$("Write a reply..."), b$(r.t), m$($$), o(b, "width", "100%"), o(b, "height", "60px")]), A), o(P, m([o(b, "margin-top", "5px")]), m([o(Br, m([Tr(i$), o(b, "margin-right", "5px")]), m([F("Submit")])), o(Br, m([Tr(o$)]), m([F("Cancel")]))]))])) : o(Br, m([Tr(o(wt, n, t)), o(b, "font-size", "0.8em"), o(b, "color", "gray"), o(b, "background", "none"), o(b, "border", "none"), o(b, "cursor", "pointer"), o(b, "text-decoration", "underline")]), m([F("Leave a comment")]));
}), Ae = q(function(r, n, t, e) {
  return o(P, m([o(b, "margin-left", "20px"), o(b, "margin-top", "10px"), o(b, "border-left", "2px solid #eee"), o(b, "padding-left", "10px")]), m([o(P, m([o(b, "font-weight", "bold"), o(b, "font-size", "0.9em")]), m([F(e.R)])), o(P, A, m([F(e.ai)])), d(Se, r, n, V(e.r)), o(P, A, o(Fr, d(Ae, r, n, t), o(u$, e.r, t)))]));
}), h$ = function(r) {
  return o(P, m([o(b, "display", "inline-block"), o(b, "background-color", "#e0e0e0"), o(b, "color", "#333"), o(b, "padding", "2px 8px"), o(b, "border-radius", "12px"), o(b, "font-size", "0.85em"), o(b, "margin-right", "5px")]), m([F(r)]));
}, d$ = f(function(r, n) {
  return o(e$, m([o(b, "border", "1px solid #ddd"), o(b, "padding", "15px"), o(b, "margin-bottom", "15px"), o(b, "border-radius", "8px")]), m([o(ge, A, m([F(n.ak)])), o(Ki, m([r$(n.ac), o(b, "color", "blue")]), m([F(n.ac)])), o(P, m([o(b, "margin", "10px 0")]), m([o(n$, m([a$(n._), o(b, "max-width", "100%"), o(b, "height", "auto")]), A)])), o(t$, A, m([F(n.Y)])), o(P, m([o(b, "margin-bottom", "10px")]), o(Fr, h$, n.G)), o(P, m([o(b, "background", "#f9f9f9"), o(b, "padding", "10px"), o(b, "font-style", "italic")]), m([F("Owner: " + n.ae)])), o(P, m([o(b, "margin-top", "20px"), o(b, "border-top", "1px solid #eee"), o(b, "padding-top", "10px")]), m([o(xi, A, m([F("Comments")])), o(P, A, o(Fr, d(Ae, r, n.r, n.au), Ni(n.au))), d(Se, r, n.r, R)]))]));
}), g$ = function(r) {
  var n = r.n;
  switch (n.$) {
    case 0:
      return o(P, A, m([F("Loading Feed...")]));
    case 1:
      var t = n.a;
      return o(P, A, o(Fr, d$(r), t));
    default:
      var e = n.a;
      return o(P, m([o(b, "color", "red")]), m([o(ge, A, m([F("Error")])), o(P, A, m([F(e)]))]));
  }
}, w$ = function(r) {
  return o(P, m([o(b, "font-family", "sans-serif"), o(b, "max-width", "800px"), o(b, "margin", "0 auto"), o(b, "padding", "20px")]), m([o(qi, A, m([F("Horatio Reader")])), o(P, m([o(b, "margin-bottom", "20px"), o(b, "display", "flex"), o(b, "justify-content", "space-between"), o(b, "align-items", "center")]), m([o(Br, m([Tr(ki)]), m([F("Test: Submit Item")])), o(Yi, m([o(b, "font-size", "0.9em"), o(b, "color", "#666")]), m([F("Signed in as: " + o(rn, "Loading...", o(Vr, function(n) {
    return n.X;
  }, r.x)))]))])), g$(r)]));
}, S$ = co({ bo: function(r) {
  return ui;
}, by: fi, bB: Wi, bD: w$ });
const A$ = { Main: { init: S$(cr(0))(0) } };
console.log("Horatio Client v1.0.0 - Ports Debug");
async function D$() {
  try {
    await St(), console.log("WASM module initialized successfully.");
  } catch (n) {
    console.error("Failed to initialize WASM module:", n);
    return;
  }
  console.log("About to initialize Elm app...");
  const r = A$.Main.init({ node: document.getElementById("app") });
  console.log("Elm app created:", !!r), window.app = r, console.log("Elm app initialized and assigned to window.app"), r.ports && r.ports.saveGuestSession && r.ports.saveGuestSession.subscribe(function(n) {
    console.log("Saving guest session:", n), localStorage.setItem("guest_session", JSON.stringify(n));
  }), r.ports && r.ports.loadGuestSession && r.ports.loadGuestSession.subscribe(function() {
    console.log("Loading guest session...");
    const n = localStorage.getItem("guest_session"), t = n ? JSON.parse(n) : null;
    console.log("Loaded guest session:", t), r.ports.guestsessionLoaded.send(t);
  }), r.ports && r.ports.log && r.ports.log.subscribe((n) => {
    console.log("ELM:", n);
  }), r.ports && r.ports.rpcRequest && r.ports.rpcRequest.subscribe(async ({ endpoint: n, body: t, correlationId: e }) => {
    try {
      if (console.log("RPC request received from Elm:", { endpoint: n, body: t, correlationId: e }), n === "GetClassWithStudents" && t.classId === 0) {
        const i = JSON.stringify({ type: "ValidationError", details: { field: "classId", message: "classId cannot be 0 for GetClassWithStudents (JS mock error)" } });
        console.log("Sending JS mock error response:", { endpoint: n, body: i, correlationId: e }), setTimeout(() => {
          r.ports.rpcResponse.send({ endpoint: n, body: i, correlationId: e });
        }, 500);
        return;
      }
      console.log("Encoding request via WASM...");
      const u = Je(n, JSON.stringify(t));
      console.log("Encoded request:", u), fetch(`/api/${n}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: u }).then(async (i) => {
        if (!i.ok) throw new Error(`HTTP error! status: ${i.status}`);
        return i.text();
      }).then((i) => {
        console.log("Received response from server:", i);
        const $ = Ee(n, i);
        console.log("Decoded response via WASM:", $), r.ports.rpcResponse.send({ endpoint: n, body: $, correlationId: e });
      }).catch((i) => {
        console.error("Fetch error:", i);
        const $ = JSON.stringify({ type: "InternalError", details: `Network error: ${i.message}` });
        r.ports.rpcResponse.send({ endpoint: n, body: $, correlationId: e });
      });
    } catch (a) {
      console.error("CRITICAL ERROR in rpcRequest handler:", a);
    }
  });
}
D$();
