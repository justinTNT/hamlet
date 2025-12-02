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
let T;
function _t(r, n) {
  return r = r >>> 0, _e(r, n);
}
let Ar = null;
function Wr() {
  return (Ar === null || Ar.byteLength === 0) && (Ar = new Uint8Array(T.memory.buffer)), Ar;
}
function Qr(r, n, t) {
  if (t === void 0) {
    const $ = Mr.encode(r), c = n($.length, 1) >>> 0;
    return Wr().subarray(c, c + $.length).set($), dr = $.length, c;
  }
  let e = r.length, a = n(e, 1) >>> 0;
  const u = Wr();
  let i = 0;
  for (; i < e; i++) {
    const $ = r.charCodeAt(i);
    if ($ > 127) break;
    u[a + i] = $;
  }
  if (i !== e) {
    i !== 0 && (r = r.slice(i)), a = t(a, e, e = i + r.length * 3, 1) >>> 0;
    const $ = Wr().subarray(a + i, a + e), c = Mr.encodeInto(r, $);
    i += c.written, a = t(a, e, i, 1) >>> 0;
  }
  return dr = i, a;
}
let zr = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true });
zr.decode();
const be = 2146435072;
let $n = 0;
function _e(r, n) {
  return $n += n, $n >= be && (zr = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true }), zr.decode(), $n = n), zr.decode(Wr().subarray(r, r + n));
}
const Mr = new TextEncoder();
"encodeInto" in Mr || (Mr.encodeInto = function(r, n) {
  const t = Mr.encode(r);
  return n.set(t), { read: r.length, written: t.length };
});
let dr = 0;
function he(r, n) {
  let t, e;
  try {
    const a = Qr(r, T.__wbindgen_malloc_command_export, T.__wbindgen_realloc_command_export), u = dr, i = Qr(n, T.__wbindgen_malloc_command_export, T.__wbindgen_realloc_command_export), $ = dr, c = T.decode_response(a, u, i, $);
    return t = c[0], e = c[1], _t(c[0], c[1]);
  } finally {
    T.__wbindgen_free_command_export(t, e, 1);
  }
}
function de(r, n) {
  let t, e;
  try {
    const a = Qr(r, T.__wbindgen_malloc_command_export, T.__wbindgen_realloc_command_export), u = dr, i = Qr(n, T.__wbindgen_malloc_command_export, T.__wbindgen_realloc_command_export), $ = dr, c = T.encode_request(a, u, i, $);
    return t = c[0], e = c[1], _t(c[0], c[1]);
  } finally {
    T.__wbindgen_free_command_export(t, e, 1);
  }
}
const ge = /* @__PURE__ */ new Set(["basic", "cors", "default"]);
async function we(r, n) {
  if (typeof Response == "function" && r instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming == "function") try {
      return await WebAssembly.instantiateStreaming(r, n);
    } catch (e) {
      if (r.ok && ge.has(r.type) && r.headers.get("Content-Type") !== "application/wasm") console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);
      else throw e;
    }
    const t = await r.arrayBuffer();
    return await WebAssembly.instantiate(t, n);
  } else {
    const t = await WebAssembly.instantiate(r, n);
    return t instanceof WebAssembly.Instance ? { instance: t, module: r } : t;
  }
}
function De() {
  const r = {};
  return r.wbg = {}, r.wbg.__wbindgen_init_externref_table = function() {
    const n = T.__wbindgen_externrefs, t = n.grow(4);
    n.set(0, void 0), n.set(t + 0, void 0), n.set(t + 1, null), n.set(t + 2, true), n.set(t + 3, false);
  }, r;
}
function Ae(r, n) {
  return T = r.exports, ht.__wbindgen_wasm_module = n, Ar = null, T.__wbindgen_start(), T;
}
async function ht(r) {
  if (T !== void 0) return T;
  typeof r < "u" && (Object.getPrototypeOf(r) === Object.prototype ? { module_or_path: r } = r : console.warn("using deprecated parameters for the initialization function; pass a single object instead")), typeof r > "u" && (r = new URL("/assets/proto_rust_bg-BvbUmSWB.wasm", import.meta.url));
  const n = De();
  (typeof r == "string" || typeof Request == "function" && r instanceof Request || typeof URL == "function" && r instanceof URL) && (r = fetch(r));
  const { instance: t, module: e } = await we(await r, n);
  return Ae(t, e);
}
function fr(r, n, t) {
  return t.a = r, t.f = n, t;
}
function f(r) {
  return fr(2, r, function(n) {
    return function(t) {
      return r(n, t);
    };
  });
}
function D(r) {
  return fr(3, r, function(n) {
    return function(t) {
      return function(e) {
        return r(n, t, e);
      };
    };
  });
}
function q(r) {
  return fr(4, r, function(n) {
    return function(t) {
      return function(e) {
        return function(a) {
          return r(n, t, e, a);
        };
      };
    };
  });
}
function pr(r) {
  return fr(5, r, function(n) {
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
function Kr(r) {
  return fr(6, r, function(n) {
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
function Nr(r) {
  return fr(7, r, function(n) {
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
function dt(r) {
  return fr(8, r, function(n) {
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
function En(r) {
  return fr(9, r, function(n) {
    return function(t) {
      return function(e) {
        return function(a) {
          return function(u) {
            return function(i) {
              return function($) {
                return function(c) {
                  return function(l) {
                    return r(n, t, e, a, u, i, $, c, l);
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
function rr(r, n, t, e, a) {
  return r.a === 4 ? r.f(n, t, e, a) : r(n)(t)(e)(a);
}
function h(r, n, t, e, a, u) {
  return r.a === 5 ? r.f(n, t, e, a, u) : r(n)(t)(e)(a)(u);
}
function sn(r, n, t, e, a, u, i) {
  return r.a === 6 ? r.f(n, t, e, a, u, i) : r(n)(t)(e)(a)(u)(i);
}
function gt(r, n, t, e, a, u, i, $) {
  return r.a === 7 ? r.f(n, t, e, a, u, i, $) : r(n)(t)(e)(a)(u)(i)($);
}
function Se(r, n, t, e, a, u, i, $, c) {
  return r.a === 8 ? r.f(n, t, e, a, u, i, $, c) : r(n)(t)(e)(a)(u)(i)($)(c);
}
function $r(r, n) {
  for (var t, e = [], a = mn(r, n, 0, e); a && (t = e.pop()); a = mn(t.a, t.b, 0, e)) ;
  return a;
}
function mn(r, n, t, e) {
  if (r === n) return true;
  if (typeof r != "object" || r === null || n === null) return typeof r == "function" && xr(5), false;
  if (t > 100) return e.push(A(r, n)), true;
  r.$ < 0 && (r = rt(r), n = rt(n));
  for (var a in r) if (!mn(r[a], n[a], t + 1, e)) return false;
  return true;
}
f($r);
f(function(r, n) {
  return !$r(r, n);
});
function z(r, n, t) {
  if (typeof r != "object") return r === n ? 0 : r < n ? -1 : 1;
  if (typeof r.$ > "u") return (t = z(r.a, n.a)) || (t = z(r.b, n.b)) ? t : z(r.c, n.c);
  for (; r.b && n.b && !(t = z(r.a, n.a)); r = r.b, n = n.b) ;
  return t || (r.b ? 1 : n.b ? -1 : 0);
}
f(function(r, n) {
  return z(r, n) < 0;
});
f(function(r, n) {
  return z(r, n) < 1;
});
f(function(r, n) {
  return z(r, n) > 0;
});
f(function(r, n) {
  return z(r, n) >= 0;
});
var je = f(function(r, n) {
  var t = z(r, n);
  return t < 0 ? Vt : t ? vu : Ct;
}), Dr = 0;
function A(r, n) {
  return { a: r, b: n };
}
function Z(r, n) {
  var t = {};
  for (var e in r) t[e] = r[e];
  for (var e in n) t[e] = n[e];
  return t;
}
f(Ee);
function Ee(r, n) {
  if (typeof r == "string") return r + n;
  if (!r.b) return n;
  var t = nr(r.a, n);
  r = r.b;
  for (var e = t; r.b; r = r.b) e = e.b = nr(r.a, n);
  return t;
}
var w = { $: 0 };
function nr(r, n) {
  return { $: 1, a: r, b: n };
}
var He = f(nr);
function b(r) {
  for (var n = w, t = r.length; t--; ) n = nr(r[t], n);
  return n;
}
function Hn(r) {
  for (var n = []; r.b; r = r.b) n.push(r.a);
  return n;
}
var Je = D(function(r, n, t) {
  for (var e = []; n.b && t.b; n = n.b, t = t.b) e.push(o(r, n.a, t.a));
  return b(e);
});
q(function(r, n, t, e) {
  for (var a = []; n.b && t.b && e.b; n = n.b, t = t.b, e = e.b) a.push(d(r, n.a, t.a, e.a));
  return b(a);
});
pr(function(r, n, t, e, a) {
  for (var u = []; n.b && t.b && e.b && a.b; n = n.b, t = t.b, e = e.b, a = a.b) u.push(rr(r, n.a, t.a, e.a, a.a));
  return b(u);
});
Kr(function(r, n, t, e, a, u) {
  for (var i = []; n.b && t.b && e.b && a.b && u.b; n = n.b, t = t.b, e = e.b, a = a.b, u = u.b) i.push(h(r, n.a, t.a, e.a, a.a, u.a));
  return b(i);
});
f(function(r, n) {
  return b(Hn(n).sort(function(t, e) {
    return z(r(t), r(e));
  }));
});
f(function(r, n) {
  return b(Hn(n).sort(function(t, e) {
    var a = o(r, t, e);
    return a === Ct ? 0 : a === Vt ? -1 : 1;
  }));
});
var Re = [];
function Me(r) {
  return r.length;
}
var Fe = D(function(r, n, t) {
  for (var e = new Array(r), a = 0; a < r; a++) e[a] = t(n + a);
  return e;
}), Be = f(function(r, n) {
  for (var t = new Array(r), e = 0; e < r && n.b; e++) t[e] = n.a, n = n.b;
  return t.length = e, A(t, n);
});
f(function(r, n) {
  return n[r];
});
D(function(r, n, t) {
  for (var e = t.length, a = new Array(e), u = 0; u < e; u++) a[u] = t[u];
  return a[r] = n, a;
});
f(function(r, n) {
  for (var t = n.length, e = new Array(t + 1), a = 0; a < t; a++) e[a] = n[a];
  return e[t] = r, e;
});
D(function(r, n, t) {
  for (var e = t.length, a = 0; a < e; a++) n = o(r, t[a], n);
  return n;
});
var Te = D(function(r, n, t) {
  for (var e = t.length - 1; e >= 0; e--) n = o(r, t[e], n);
  return n;
});
f(function(r, n) {
  for (var t = n.length, e = new Array(t), a = 0; a < t; a++) e[a] = r(n[a]);
  return e;
});
D(function(r, n, t) {
  for (var e = t.length, a = new Array(e), u = 0; u < e; u++) a[u] = o(r, n + u, t[u]);
  return a;
});
D(function(r, n, t) {
  return t.slice(r, n);
});
D(function(r, n, t) {
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
  return console.log(r + ": " + Ce()), n;
});
function Ce(r) {
  return "<internals>";
}
function xr(r) {
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
f(function(r, n) {
  var t = n % r;
  return r === 0 ? xr(11) : t > 0 && r < 0 || t < 0 && r > 0 ? t + r : t;
});
f(Math.atan2);
var Ve = Math.ceil, Pe = Math.floor, yn = Math.log;
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
function Oe(r) {
  var n = r.charCodeAt(0);
  return isNaN(n) ? J : P(55296 <= n && n <= 56319 ? A(r[0] + r[1], r.slice(2)) : A(r[0], r.slice(1)));
}
f(function(r, n) {
  return r + n;
});
function Le(r) {
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
D(function(r, n, t) {
  for (var e = t.length, a = 0; a < e; ) {
    var u = t[a], i = t.charCodeAt(a);
    a++, 55296 <= i && i <= 56319 && (u += t[a], a++), n = o(r, u, n);
  }
  return n;
});
D(function(r, n, t) {
  for (var e = t.length; e--; ) {
    var a = t[e], u = t.charCodeAt(e);
    56320 <= u && u <= 57343 && (e--, a = t[e] + a), n = o(r, a, n);
  }
  return n;
});
var Ie = f(function(r, n) {
  return n.split(r);
}), Ue = f(function(r, n) {
  return n.join(r);
}), We = D(function(r, n, t) {
  return t.slice(r, n);
});
f(function(r, n) {
  for (var t = n.length; t--; ) {
    var e = n[t], a = n.charCodeAt(t);
    if (56320 <= a && a <= 57343 && (t--, e = n[t] + e), r(e)) return true;
  }
  return false;
});
var ze = f(function(r, n) {
  for (var t = n.length; t--; ) {
    var e = n[t], a = n.charCodeAt(t);
    if (56320 <= a && a <= 57343 && (t--, e = n[t] + e), !r(e)) return false;
  }
  return true;
}), qe = f(function(r, n) {
  return n.indexOf(r) > -1;
});
f(function(r, n) {
  return n.indexOf(r) === 0;
});
f(function(r, n) {
  return n.length >= r.length && n.lastIndexOf(r) === n.length - r.length;
});
var ke = f(function(r, n) {
  var t = r.length;
  if (t < 1) return w;
  for (var e = 0, a = []; (e = n.indexOf(r, e)) > -1; ) a.push(e), e = e + t;
  return b(a);
});
function Qe(r) {
  return r + "";
}
function ye(r) {
  for (var n = 0, t = r.charCodeAt(0), e = t == 43 || t == 45 ? 1 : 0, a = e; a < r.length; ++a) {
    var u = r.charCodeAt(a);
    if (u < 48 || 57 < u) return J;
    n = 10 * n + u - 48;
  }
  return a == e ? J : P(t == 45 ? -n : n);
}
function Ge(r) {
  var n = r.charCodeAt(0);
  return 55296 <= n && n <= 56319 ? (n - 55296) * 1024 + r.charCodeAt(1) - 56320 + 65536 : n;
}
function Ye(r) {
  return { $: 0, a: r };
}
function wt(r) {
  return { $: 2, b: r };
}
var Xe = wt(function(r) {
  return typeof r != "number" ? K("an INT", r) : -2147483647 < r && r < 2147483647 && (r | 0) === r || isFinite(r) && !(r % 1) ? x(r) : K("an INT", r);
}), Ze = wt(function(r) {
  return typeof r == "string" ? x(r) : r instanceof String ? x(r + "") : K("a STRING", r);
});
function Ke(r) {
  return { $: 3, b: r };
}
function Ne(r) {
  return { $: 5, c: r };
}
var xe = f(function(r, n) {
  return { $: 6, d: r, b: n };
});
f(function(r, n) {
  return { $: 7, e: r, b: n };
});
function lr(r, n) {
  return { $: 9, f: r, g: n };
}
var ra = f(function(r, n) {
  return { $: 10, b: n, h: r };
});
function na(r) {
  return { $: 11, g: r };
}
var ta = f(function(r, n) {
  return lr(r, [n]);
}), ea = D(function(r, n, t) {
  return lr(r, [n, t]);
});
q(function(r, n, t, e) {
  return lr(r, [n, t, e]);
});
pr(function(r, n, t, e, a) {
  return lr(r, [n, t, e, a]);
});
Kr(function(r, n, t, e, a, u) {
  return lr(r, [n, t, e, a, u]);
});
Nr(function(r, n, t, e, a, u, i) {
  return lr(r, [n, t, e, a, u, i]);
});
dt(function(r, n, t, e, a, u, i, $) {
  return lr(r, [n, t, e, a, u, i, $]);
});
En(function(r, n, t, e, a, u, i, $, c) {
  return lr(r, [n, t, e, a, u, i, $, c]);
});
var aa = f(function(r, n) {
  try {
    var t = JSON.parse(n);
    return Q(r, t);
  } catch (e) {
    return W(o(Vn, "This is not valid JSON! " + e.message, n));
  }
}), ua = f(function(r, n) {
  return Q(r, n);
});
function Q(r, n) {
  switch (r.$) {
    case 2:
      return r.b(n);
    case 5:
      return n === null ? x(r.c) : K("null", n);
    case 3:
      return Ir(n) ? Gn(r.b, n, b) : K("a LIST", n);
    case 4:
      return Ir(n) ? Gn(r.b, n, oa) : K("an ARRAY", n);
    case 6:
      var t = r.d;
      if (typeof n != "object" || n === null || !(t in n)) return K("an OBJECT with a field named `" + t + "`", n);
      var l = Q(r.b, n[t]);
      return N(l) ? l : W(o(nt, t, l.a));
    case 7:
      var e = r.e;
      if (!Ir(n)) return K("an ARRAY", n);
      if (e >= n.length) return K("a LONGER array. Need index " + e + " but only see " + n.length + " entries", n);
      var l = Q(r.b, n[e]);
      return N(l) ? l : W(o(Ot, e, l.a));
    case 8:
      if (typeof n != "object" || n === null || Ir(n)) return K("an OBJECT", n);
      var a = w;
      for (var u in n) if (Object.prototype.hasOwnProperty.call(n, u)) {
        var l = Q(r.b, n[u]);
        if (!N(l)) return W(o(nt, u, l.a));
        a = nr(A(u, l.a), a);
      }
      return x(ir(a));
    case 9:
      for (var i = r.f, $ = r.g, c = 0; c < $.length; c++) {
        var l = Q($[c], n);
        if (!N(l)) return l;
        i = i(l.a);
      }
      return x(i);
    case 10:
      var l = Q(r.b, n);
      return N(l) ? Q(r.h(l.a), n) : l;
    case 11:
      for (var v = w, p = r.g; p.b; p = p.b) {
        var l = Q(p.a, n);
        if (N(l)) return l;
        v = nr(l.a, v);
      }
      return W(su(ir(v)));
    case 1:
      return W(o(Vn, r.a, n));
    case 0:
      return x(r.a);
  }
}
function Gn(r, n, t) {
  for (var e = n.length, a = new Array(e), u = 0; u < e; u++) {
    var i = Q(r, n[u]);
    if (!N(i)) return W(o(Ot, u, i.a));
    a[u] = i.a;
  }
  return x(t(a));
}
function Ir(r) {
  return Array.isArray(r) || typeof FileList < "u" && r instanceof FileList;
}
function oa(r) {
  return o(Vu, r.length, function(n) {
    return r[n];
  });
}
function K(r, n) {
  return W(o(Vn, "Expecting " + r, n));
}
function hr(r, n) {
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
      return hr(r.b, n.b);
    case 6:
      return r.d === n.d && hr(r.b, n.b);
    case 7:
      return r.e === n.e && hr(r.b, n.b);
    case 9:
      return r.f === n.f && Yn(r.g, n.g);
    case 10:
      return r.h === n.h && hr(r.b, n.b);
    case 11:
      return Yn(r.g, n.g);
  }
}
function Yn(r, n) {
  var t = r.length;
  if (t !== n.length) return false;
  for (var e = 0; e < t; e++) if (!hr(r[e], n[e])) return false;
  return true;
}
var ia = f(function(r, n) {
  return JSON.stringify(n, null, r) + "";
});
function $a(r) {
  return r;
}
function ca() {
  return [];
}
function fa() {
  return {};
}
var la = D(function(r, n, t) {
  var e = n;
  return r === "toJSON" && typeof e == "function" || (t[r] = e), t;
});
function va(r) {
  return f(function(n, t) {
    return t.push(r(n)), t;
  });
}
var sa = null;
function br(r) {
  return { $: 0, a: r };
}
function ma(r) {
  return { $: 1, a: r };
}
function X(r) {
  return { $: 2, b: r, c: null };
}
var pn = f(function(r, n) {
  return { $: 3, b: r, d: n };
});
f(function(r, n) {
  return { $: 4, b: r, d: n };
});
function pa(r) {
  return { $: 5, b: r };
}
var ba = 0;
function Br(r) {
  var n = { $: 0, e: ba++, f: r, g: null, h: [] };
  return Rn(n), n;
}
function Jn(r) {
  return X(function(n) {
    n(br(Br(r)));
  });
}
function Dt(r, n) {
  r.h.push(n), Rn(r);
}
var _a = f(function(r, n) {
  return X(function(t) {
    Dt(r, n), t(br(Dr));
  });
});
function ha(r) {
  return X(function(n) {
    var t = r.f;
    t.$ === 2 && t.c && t.c(), r.f = null, n(br(Dr));
  });
}
var cn = false, Xn = [];
function Rn(r) {
  if (Xn.push(r), !cn) {
    for (cn = true; r = Xn.shift(); ) da(r);
    cn = false;
  }
}
function da(r) {
  for (; r.f; ) {
    var n = r.f.$;
    if (n === 0 || n === 1) {
      for (; r.g && r.g.$ !== n; ) r.g = r.g.i;
      if (!r.g) return;
      r.f = r.g.b(r.f.a), r.g = r.g.i;
    } else if (n === 2) {
      r.f.c = r.f.b(function(t) {
        r.f = t, Rn(r);
      });
      return;
    } else if (n === 5) {
      if (r.h.length === 0) return;
      r.f = r.f.b(r.h.shift());
    } else r.g = { $: n === 3 ? 0 : 1, b: r.f.b, i: r.g }, r.f = r.f.d;
  }
}
q(function(r, n, t, e) {
  return Mn(n, e, r.bk, r.bx, r.bu, function() {
    return function() {
    };
  });
});
function Mn(r, n, t, e, a, u) {
  var i = o(ua, r, n ? n.flags : void 0);
  N(i) || xr(2);
  var $ = {}, c = t(i.a), l = c.a, v = u(s, l), p = ga($, s);
  function s(m, S) {
    var E = o(e, m, l);
    v(l = E.a, S), Kn($, E.b, a(l));
  }
  return Kn($, c.b, a(l)), p ? { ports: p } : {};
}
var gr = {};
function ga(r, n) {
  var t;
  for (var e in gr) {
    var a = gr[e];
    a.a && (t = t || {}, t[e] = a.a(e, n)), r[e] = wa(a, n);
  }
  return t;
}
function At(r, n, t, e, a) {
  return { b: r, c: n, d: t, e, f: a };
}
function wa(r, n) {
  var t = { g: n, h: void 0 }, e = r.c, a = r.d, u = r.e, i = r.f;
  function $(c) {
    return o(pn, $, pa(function(l) {
      var v = l.a;
      return l.$ === 0 ? d(a, t, v, c) : u && i ? rr(e, t, v.i, v.j, c) : d(e, t, u ? v.i : v.j, c);
    }));
  }
  return t.h = Br(o(pn, $, r.b));
}
var Da = f(function(r, n) {
  return X(function(t) {
    r.g(n), t(br(Dr));
  });
}), Aa = f(function(r, n) {
  return o(_a, r.h, { $: 0, a: n });
});
function St(r) {
  return function(n) {
    return { $: 1, k: r, l: n };
  };
}
function jt(r) {
  return { $: 2, m: r };
}
f(function(r, n) {
  return { $: 3, n: r, o: n };
});
var Zn = [], fn = false;
function Kn(r, n, t) {
  if (Zn.push({ p: r, q: n, r: t }), !fn) {
    fn = true;
    for (var e; e = Zn.shift(); ) Sa(e.p, e.q, e.r);
    fn = false;
  }
}
function Sa(r, n, t) {
  var e = {};
  yr(true, n, e, null), yr(false, t, e, null);
  for (var a in r) Dt(r[a], { $: "fx", a: e[a] || { i: w, j: w } });
}
function yr(r, n, t, e) {
  switch (n.$) {
    case 1:
      var a = n.k, u = ja(r, a, e, n.l);
      t[a] = Ea(r, u, t[a]);
      return;
    case 2:
      for (var i = n.m; i.b; i = i.b) yr(r, i.a, t, e);
      return;
    case 3:
      yr(r, n.o, t, { s: n.n, t: e });
      return;
  }
}
function ja(r, n, t, e) {
  function a(i) {
    for (var $ = t; $; $ = $.t) i = $.s(i);
    return i;
  }
  var u = r ? gr[n].e : gr[n].f;
  return o(u, a, e);
}
function Ea(r, n, t) {
  return t = t || { i: w, j: w }, r ? t.i = nr(n, t.i) : t.j = nr(n, t.j), t;
}
f(function(r, n) {
  return n;
});
f(function(r, n) {
  return function(t) {
    return r(n(t));
  };
});
var Gr, mr = typeof document < "u" ? document : {};
function Fn(r, n) {
  r.appendChild(n);
}
q(function(r, n, t, e) {
  var a = e.node;
  return a.parentNode.replaceChild(or(r, function() {
  }), a), {};
});
function bn(r) {
  return { $: 0, a: r };
}
var Ha = f(function(r, n) {
  return f(function(t, e) {
    for (var a = [], u = 0; e.b; e = e.b) {
      var i = e.a;
      u += i.b || 0, a.push(i);
    }
    return u += a.length, { $: 1, c: n, d: Ht(t), e: a, f: r, b: u };
  });
}), k = Ha(void 0), Ja = f(function(r, n) {
  return f(function(t, e) {
    for (var a = [], u = 0; e.b; e = e.b) {
      var i = e.a;
      u += i.b.b || 0, a.push(i);
    }
    return u += a.length, { $: 2, c: n, d: Ht(t), e: a, f: r, b: u };
  });
});
Ja(void 0);
f(function(r, n) {
  return { $: 4, j: r, k: n, b: 1 + (n.b || 0) };
});
function vr(r, n) {
  return { $: 5, l: r, m: n, k: void 0 };
}
f(function(r, n) {
  return vr([r, n], function() {
    return r(n);
  });
});
D(function(r, n, t) {
  return vr([r, n, t], function() {
    return o(r, n, t);
  });
});
q(function(r, n, t, e) {
  return vr([r, n, t, e], function() {
    return d(r, n, t, e);
  });
});
pr(function(r, n, t, e, a) {
  return vr([r, n, t, e, a], function() {
    return rr(r, n, t, e, a);
  });
});
Kr(function(r, n, t, e, a, u) {
  return vr([r, n, t, e, a, u], function() {
    return h(r, n, t, e, a, u);
  });
});
Nr(function(r, n, t, e, a, u, i) {
  return vr([r, n, t, e, a, u, i], function() {
    return sn(r, n, t, e, a, u, i);
  });
});
dt(function(r, n, t, e, a, u, i, $) {
  return vr([r, n, t, e, a, u, i, $], function() {
    return gt(r, n, t, e, a, u, i, $);
  });
});
En(function(r, n, t, e, a, u, i, $, c) {
  return vr([r, n, t, e, a, u, i, $, c], function() {
    return Se(r, n, t, e, a, u, i, $, c);
  });
});
var Et = f(function(r, n) {
  return { $: "a0", n: r, o: n };
}), Ra = f(function(r, n) {
  return { $: "a1", n: r, o: n };
}), Ma = f(function(r, n) {
  return { $: "a2", n: r, o: n };
}), Fa = f(function(r, n) {
  return { $: "a3", n: r, o: n };
});
D(function(r, n, t) {
  return { $: "a4", n, o: { f: r, o: t } };
});
var Ba = /^\s*j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t\s*:/i, Ta = /^\s*(j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t\s*:|d\s*a\s*t\s*a\s*:\s*t\s*e\s*x\s*t\s*\/\s*h\s*t\s*m\s*l\s*(,|;))/i;
function Ca(r) {
  return Ba.test(r) ? "" : r;
}
function Va(r) {
  return Ta.test(r) ? "" : r;
}
f(function(r, n) {
  return n.$ === "a0" ? o(Et, n.n, Pa(r, n.o)) : n;
});
function Pa(r, n) {
  var t = On(n);
  return { $: n.$, a: t ? d(Pu, t < 3 ? Oa : La, sr(r), n.a) : o(M, r, n.a) };
}
var Oa = f(function(r, n) {
  return A(r(n.a), n.b);
}), La = f(function(r, n) {
  return { s: r(n.s), am: n.am, aj: n.aj };
});
function Ht(r) {
  for (var n = {}; r.b; r = r.b) {
    var t = r.a, e = t.$, a = t.n, u = t.o;
    if (e === "a2") {
      a === "className" ? Nn(n, a, u) : n[a] = u;
      continue;
    }
    var i = n[e] || (n[e] = {});
    e === "a3" && a === "class" ? Nn(i, a, u) : i[a] = u;
  }
  return n;
}
function Nn(r, n, t) {
  var e = r[n];
  r[n] = e ? e + " " + t : t;
}
function or(r, n) {
  var t = r.$;
  if (t === 5) return or(r.k || (r.k = r.m()), n);
  if (t === 0) return mr.createTextNode(r.a);
  if (t === 4) {
    for (var e = r.k, a = r.j; e.$ === 4; ) typeof a != "object" ? a = [a, e.j] : a.push(e.j), e = e.k;
    var u = { j: a, p: n }, i = or(e, u);
    return i.elm_event_node_ref = u, i;
  }
  if (t === 3) {
    var i = r.h(r.g);
    return _n(i, n, r.d), i;
  }
  var i = r.f ? mr.createElementNS(r.f, r.c) : mr.createElement(r.c);
  Gr && r.c == "a" && i.addEventListener("click", Gr(i)), _n(i, n, r.d);
  for (var $ = r.e, c = 0; c < $.length; c++) Fn(i, or(t === 1 ? $[c] : $[c].b, n));
  return i;
}
function _n(r, n, t) {
  for (var e in t) {
    var a = t[e];
    e === "a1" ? Ia(r, a) : e === "a0" ? za(r, n, a) : e === "a3" ? Ua(r, a) : e === "a4" ? Wa(r, a) : (e !== "value" && e !== "checked" || r[e] !== a) && (r[e] = a);
  }
}
function Ia(r, n) {
  var t = r.style;
  for (var e in n) t[e] = n[e];
}
function Ua(r, n) {
  for (var t in n) {
    var e = n[t];
    typeof e < "u" ? r.setAttribute(t, e) : r.removeAttribute(t);
  }
}
function Wa(r, n) {
  for (var t in n) {
    var e = n[t], a = e.f, u = e.o;
    typeof u < "u" ? r.setAttributeNS(a, t, u) : r.removeAttributeNS(a, t);
  }
}
function za(r, n, t) {
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
    i = qa(n, u), r.addEventListener(a, i, Bn && { passive: On(u) < 2 }), e[a] = i;
  }
}
var Bn;
try {
  window.addEventListener("t", null, Object.defineProperty({}, "passive", { get: function() {
    Bn = true;
  } }));
} catch {
}
function qa(r, n) {
  function t(e) {
    var a = t.q, u = Q(a.a, e);
    if (N(u)) {
      for (var i = On(a), $ = u.a, c = i ? i < 3 ? $.a : $.s : $, l = i == 1 ? $.b : i == 3 && $.am, v = (l && e.stopPropagation(), (i == 2 ? $.b : i == 3 && $.aj) && e.preventDefault(), r), p, s; p = v.j; ) {
        if (typeof p == "function") c = p(c);
        else for (var s = p.length; s--; ) c = p[s](c);
        v = v.p;
      }
      v(c, l);
    }
  }
  return t.q = n, t;
}
function ka(r, n) {
  return r.$ == n.$ && hr(r.a, n.a);
}
function Jt(r, n) {
  var t = [];
  return G(r, n, t, 0), t;
}
function O(r, n, t, e) {
  var a = { $: n, r: t, s: e, t: void 0, u: void 0 };
  return r.push(a), a;
}
function G(r, n, t, e) {
  if (r !== n) {
    var a = r.$, u = n.$;
    if (a !== u) if (a === 1 && u === 2) n = Na(n), u = 1;
    else {
      O(t, 0, e, n);
      return;
    }
    switch (u) {
      case 5:
        for (var i = r.l, $ = n.l, c = i.length, l = c === $.length; l && c--; ) l = i[c] === $[c];
        if (l) {
          n.k = r.k;
          return;
        }
        n.k = n.m();
        var v = [];
        G(r.k, n.k, v, 0), v.length > 0 && O(t, 1, e, v);
        return;
      case 4:
        for (var p = r.j, s = n.j, m = false, S = r.k; S.$ === 4; ) m = true, typeof p != "object" ? p = [p, S.j] : p.push(S.j), S = S.k;
        for (var E = n.k; E.$ === 4; ) m = true, typeof s != "object" ? s = [s, E.j] : s.push(E.j), E = E.k;
        if (m && p.length !== s.length) {
          O(t, 0, e, n);
          return;
        }
        (m ? !Qa(p, s) : p !== s) && O(t, 2, e, s), G(S, E, t, e + 1);
        return;
      case 0:
        r.a !== n.a && O(t, 3, e, n.a);
        return;
      case 1:
        xn(r, n, t, e, ya);
        return;
      case 2:
        xn(r, n, t, e, Ga);
        return;
      case 3:
        if (r.h !== n.h) {
          O(t, 0, e, n);
          return;
        }
        var H = Tn(r.d, n.d);
        H && O(t, 4, e, H);
        var R = n.i(r.g, n.g);
        R && O(t, 5, e, R);
        return;
    }
  }
}
function Qa(r, n) {
  for (var t = 0; t < r.length; t++) if (r[t] !== n[t]) return false;
  return true;
}
function xn(r, n, t, e, a) {
  if (r.c !== n.c || r.f !== n.f) {
    O(t, 0, e, n);
    return;
  }
  var u = Tn(r.d, n.d);
  u && O(t, 4, e, u), a(r, n, t, e);
}
function Tn(r, n, t) {
  var e;
  for (var a in r) {
    if (a === "a1" || a === "a0" || a === "a3" || a === "a4") {
      var u = Tn(r[a], n[a] || {}, a);
      u && (e = e || {}, e[a] = u);
      continue;
    }
    if (!(a in n)) {
      e = e || {}, e[a] = t ? t === "a1" ? "" : t === "a0" || t === "a3" ? void 0 : { f: r[a].f, o: void 0 } : typeof r[a] == "string" ? "" : null;
      continue;
    }
    var i = r[a], $ = n[a];
    i === $ && a !== "value" && a !== "checked" || t === "a0" && ka(i, $) || (e = e || {}, e[a] = $);
  }
  for (var c in n) c in r || (e = e || {}, e[c] = n[c]);
  return e;
}
function ya(r, n, t, e) {
  var a = r.e, u = n.e, i = a.length, $ = u.length;
  i > $ ? O(t, 6, e, { v: $, i: i - $ }) : i < $ && O(t, 7, e, { v: i, e: u });
  for (var c = i < $ ? i : $, l = 0; l < c; l++) {
    var v = a[l];
    G(v, u[l], t, ++e), e += v.b || 0;
  }
}
function Ga(r, n, t, e) {
  for (var a = [], u = {}, i = [], $ = r.e, c = n.e, l = $.length, v = c.length, p = 0, s = 0, m = e; p < l && s < v; ) {
    var S = $[p], E = c[s], H = S.a, R = E.a, j = S.b, L = E.b, tr = void 0, an = void 0;
    if (H === R) {
      m++, G(j, L, a, m), m += j.b || 0, p++, s++;
      continue;
    }
    var Or = $[p + 1], un = c[s + 1];
    if (Or) {
      var kn = Or.a, _r = Or.b;
      an = R === kn;
    }
    if (un) {
      var Qn = un.a, on = un.b;
      tr = H === Qn;
    }
    if (tr && an) {
      m++, G(j, on, a, m), Sr(u, a, H, L, s, i), m += j.b || 0, m++, jr(u, a, H, _r, m), m += _r.b || 0, p += 2, s += 2;
      continue;
    }
    if (tr) {
      m++, Sr(u, a, R, L, s, i), G(j, on, a, m), m += j.b || 0, p += 1, s += 2;
      continue;
    }
    if (an) {
      m++, jr(u, a, H, j, m), m += j.b || 0, m++, G(_r, L, a, m), m += _r.b || 0, p += 2, s += 1;
      continue;
    }
    if (Or && kn === Qn) {
      m++, jr(u, a, H, j, m), Sr(u, a, R, L, s, i), m += j.b || 0, m++, G(_r, on, a, m), m += _r.b || 0, p += 2, s += 2;
      continue;
    }
    break;
  }
  for (; p < l; ) {
    m++;
    var S = $[p], j = S.b;
    jr(u, a, S.a, j, m), m += j.b || 0, p++;
  }
  for (; s < v; ) {
    var Lr = Lr || [], E = c[s];
    Sr(u, a, E.a, E.b, void 0, Lr), s++;
  }
  (a.length > 0 || i.length > 0 || Lr) && O(t, 8, e, { w: a, x: i, y: Lr });
}
var Rt = "_elmW6BL";
function Sr(r, n, t, e, a, u) {
  var i = r[t];
  if (!i) {
    i = { c: 0, z: e, r: a, s: void 0 }, u.push({ r: a, A: i }), r[t] = i;
    return;
  }
  if (i.c === 1) {
    u.push({ r: a, A: i }), i.c = 2;
    var $ = [];
    G(i.z, e, $, i.r), i.r = a, i.s.s = { w: $, A: i };
    return;
  }
  Sr(r, n, t + Rt, e, a, u);
}
function jr(r, n, t, e, a) {
  var u = r[t];
  if (!u) {
    var i = O(n, 9, a, void 0);
    r[t] = { c: 1, z: e, r: a, s: i };
    return;
  }
  if (u.c === 0) {
    u.c = 2;
    var $ = [];
    G(e, u.z, $, a), O(n, 9, a, { w: $, A: u });
    return;
  }
  jr(r, n, t + Rt, e, a);
}
function Mt(r, n, t, e) {
  Er(r, n, t, 0, 0, n.b, e);
}
function Er(r, n, t, e, a, u, i) {
  for (var $ = t[e], c = $.r; c === a; ) {
    var l = $.$;
    if (l === 1) Mt(r, n.k, $.s, i);
    else if (l === 8) {
      $.t = r, $.u = i;
      var v = $.s.w;
      v.length > 0 && Er(r, n, v, 0, a, u, i);
    } else if (l === 9) {
      $.t = r, $.u = i;
      var p = $.s;
      if (p) {
        p.A.s = r;
        var v = p.w;
        v.length > 0 && Er(r, n, v, 0, a, u, i);
      }
    } else $.t = r, $.u = i;
    if (e++, !($ = t[e]) || (c = $.r) > u) return e;
  }
  var s = n.$;
  if (s === 4) {
    for (var m = n.k; m.$ === 4; ) m = m.k;
    return Er(r, m, t, e, a + 1, u, r.elm_event_node_ref);
  }
  for (var S = n.e, E = r.childNodes, H = 0; H < S.length; H++) {
    a++;
    var R = s === 1 ? S[H] : S[H].b, j = a + (R.b || 0);
    if (a <= c && c <= j && (e = Er(E[H], R, t, e, a, j, i), !($ = t[e]) || (c = $.r) > u)) return e;
    a = j;
  }
  return e;
}
function Ft(r, n, t, e) {
  return t.length === 0 ? r : (Mt(r, n, t, e), Yr(r, t));
}
function Yr(r, n) {
  for (var t = 0; t < n.length; t++) {
    var e = n[t], a = e.t, u = Ya(a, e);
    a === r && (r = u);
  }
  return r;
}
function Ya(r, n) {
  switch (n.$) {
    case 0:
      return Xa(r, n.s, n.u);
    case 4:
      return _n(r, n.u, n.s), r;
    case 3:
      return r.replaceData(0, r.length, n.s), r;
    case 1:
      return Yr(r, n.s);
    case 2:
      return r.elm_event_node_ref ? r.elm_event_node_ref.j = n.s : r.elm_event_node_ref = { j: n.s, p: n.u }, r;
    case 6:
      for (var u = n.s, e = 0; e < u.i; e++) r.removeChild(r.childNodes[u.v]);
      return r;
    case 7:
      for (var u = n.s, t = u.e, e = u.v, a = r.childNodes[e]; e < t.length; e++) r.insertBefore(or(t[e], n.u), a);
      return r;
    case 9:
      var u = n.s;
      if (!u) return r.parentNode.removeChild(r), r;
      var i = u.A;
      return typeof i.r < "u" && r.parentNode.removeChild(r), i.s = Yr(r, u.w), r;
    case 8:
      return Za(r, n);
    case 5:
      return n.s(r);
    default:
      xr(10);
  }
}
function Xa(r, n, t) {
  var e = r.parentNode, a = or(n, t);
  return a.elm_event_node_ref || (a.elm_event_node_ref = r.elm_event_node_ref), e && a !== r && e.replaceChild(a, r), a;
}
function Za(r, n) {
  var t = n.s, e = Ka(t.y, n);
  r = Yr(r, t.w);
  for (var a = t.x, u = 0; u < a.length; u++) {
    var i = a[u], $ = i.A, c = $.c === 2 ? $.s : or($.z, n.u);
    r.insertBefore(c, r.childNodes[i.r]);
  }
  return e && Fn(r, e), r;
}
function Ka(r, n) {
  if (r) {
    for (var t = mr.createDocumentFragment(), e = 0; e < r.length; e++) {
      var a = r[e], u = a.A;
      Fn(t, u.c === 2 ? u.s : or(u.z, n.u));
    }
    return t;
  }
}
function Cn(r) {
  if (r.nodeType === 3) return bn(r.textContent);
  if (r.nodeType !== 1) return bn("");
  for (var n = w, t = r.attributes, e = t.length; e--; ) {
    var a = t[e], u = a.name, i = a.value;
    n = nr(o(Fa, u, i), n);
  }
  for (var $ = r.tagName.toLowerCase(), c = w, l = r.childNodes, e = l.length; e--; ) c = nr(Cn(l[e]), c);
  return d(k, $, n, c);
}
function Na(r) {
  for (var n = r.e, t = n.length, e = new Array(t), a = 0; a < t; a++) e[a] = n[a].b;
  return { $: 1, c: r.c, d: r.d, e, f: r.f, b: r.b };
}
var xa = q(function(r, n, t, e) {
  return Mn(n, e, r.bk, r.bx, r.bu, function(a, u) {
    var i = r.bz, $ = e.node, c = Cn($);
    return Bt(u, function(l) {
      var v = i(l), p = Jt(c, v);
      $ = Ft($, c, p, a), c = v;
    });
  });
});
q(function(r, n, t, e) {
  return Mn(n, e, r.bk, r.bx, r.bu, function(a, u) {
    var i = r.ak && r.ak(a), $ = r.bz, c = mr.title, l = mr.body, v = Cn(l);
    return Bt(u, function(p) {
      Gr = i;
      var s = $(p), m = k("body")(w)(s.I), S = Jt(v, m);
      l = Ft(l, v, S, a), v = m, Gr = 0, c !== s.ag && (mr.title = c = s.ag);
    });
  });
});
var Xr = typeof requestAnimationFrame < "u" ? requestAnimationFrame : function(r) {
  return setTimeout(r, 1e3 / 60);
};
function Bt(r, n) {
  n(r);
  var t = 0;
  function e() {
    t = t === 1 ? 0 : (Xr(e), n(r), 1);
  }
  return function(a, u) {
    r = a, u ? (n(r), t === 2 && (t = 1)) : (t === 0 && Xr(e), t = 2);
  };
}
f(function(r, n) {
  return o(Wn, Ln, X(function() {
    n && history.go(n), r();
  }));
});
f(function(r, n) {
  return o(Wn, Ln, X(function() {
    history.pushState({}, "", n), r();
  }));
});
f(function(r, n) {
  return o(Wn, Ln, X(function() {
    history.replaceState({}, "", n), r();
  }));
});
var ru = { addEventListener: function() {
}, removeEventListener: function() {
} }, nu = typeof window < "u" ? window : ru;
D(function(r, n, t) {
  return Jn(X(function(e) {
    function a(u) {
      Br(t(u));
    }
    return r.addEventListener(n, a, Bn && { passive: true }), function() {
      r.removeEventListener(n, a);
    };
  }));
});
f(function(r, n) {
  var t = Q(r, n);
  return N(t) ? P(t.a) : J;
});
function Tt(r, n) {
  return X(function(t) {
    Xr(function() {
      var e = document.getElementById(r);
      t(e ? br(n(e)) : ma(Ou(r)));
    });
  });
}
function tu(r) {
  return X(function(n) {
    Xr(function() {
      n(br(r()));
    });
  });
}
f(function(r, n) {
  return Tt(n, function(t) {
    return t[r](), Dr;
  });
});
f(function(r, n) {
  return tu(function() {
    return nu.scroll(r, n), Dr;
  });
});
D(function(r, n, t) {
  return Tt(r, function(e) {
    return e.scrollLeft = n, e.scrollTop = t, Dr;
  });
});
var eu = D(function(r, n, t) {
  return X(function(e) {
    function a(i) {
      e(n(t.bf.a(i)));
    }
    var u = new XMLHttpRequest();
    u.addEventListener("error", function() {
      a(co);
    }), u.addEventListener("timeout", function() {
      a(vo);
    }), u.addEventListener("load", function() {
      a(uu(t.bf.b, u));
    }), ne(t.bw) && lu(r, u, t.bw.a);
    try {
      u.open(t.bl, t.by, true);
    } catch {
      return a(io(t.by));
    }
    return au(u, t), t.I.a && u.setRequestHeader("Content-Type", t.I.a), u.send(t.I.b), function() {
      u.c = true, u.abort();
    };
  });
});
function au(r, n) {
  for (var t = n.bh; t.b; t = t.b) r.setRequestHeader(t.a.a, t.a.b);
  r.timeout = n.bv.a || 0, r.responseType = n.bf.d, r.withCredentials = n.ba;
}
function uu(r, n) {
  return o(200 <= n.status && n.status < 300 ? $o : oo, ou(n), r(n.response));
}
function ou(r) {
  return { by: r.responseURL, bs: r.status, bt: r.statusText, bh: iu(r.getAllResponseHeaders()) };
}
function iu(r) {
  if (!r) return An;
  for (var n = An, t = r.split(`\r
`), e = t.length; e--; ) {
    var a = t[e], u = a.indexOf(": ");
    if (u > 0) {
      var i = a.substring(0, u), $ = a.substring(u + 2);
      n = d(bo, i, function(c) {
        return P(ne(c) ? $ + ", " + c.a : $);
      }, n);
    }
  }
  return n;
}
var $u = D(function(r, n, t) {
  return { $: 0, d: r, b: n, a: t };
}), cu = f(function(r, n) {
  return { $: 0, d: n.d, b: n.b, a: function(t) {
    return r(n.a(t));
  } };
}), fu = f(function(r, n) {
  return { $: 0, a: r, b: n };
});
f(function(r, n) {
  return new Blob([n], { type: r });
});
function lu(r, n, t) {
  n.upload.addEventListener("progress", function(e) {
    n.c || Br(o(it, r, A(t, lo({ br: e.loaded, a0: e.total }))));
  }), n.addEventListener("progress", function(e) {
    n.c || Br(o(it, r, A(t, fo({ bp: e.loaded, a0: e.lengthComputable ? P(e.total) : J }))));
  });
}
var Ct = 1, vu = 2, Vt = 0, y = He, Pt = D(function(r, n, t) {
  r: for (; ; ) {
    if (t.$ === -2) return n;
    var e = t.b, a = t.c, u = t.d, i = t.e, $ = r, c = d(r, e, a, d(Pt, r, n, i)), l = u;
    r = $, n = c, t = l;
    continue r;
  }
}), rt = function(r) {
  return d(Pt, D(function(n, t, e) {
    return o(y, A(n, t), e);
  }), w, r);
}, Ur = Te;
D(function(r, n, t) {
  var e = t.c, a = t.d, u = f(function(i, $) {
    if (i.$) {
      var l = i.a;
      return d(Ur, r, $, l);
    } else {
      var c = i.a;
      return d(Ur, u, $, c);
    }
  });
  return d(Ur, u, d(Ur, r, n, a), e);
});
var W = function(r) {
  return { $: 1, a: r };
}, Vn = f(function(r, n) {
  return { $: 3, a: r, b: n };
}), nt = f(function(r, n) {
  return { $: 0, a: r, b: n };
}), Ot = f(function(r, n) {
  return { $: 1, a: r, b: n };
}), x = function(r) {
  return { $: 0, a: r };
}, su = function(r) {
  return { $: 2, a: r };
}, P = function(r) {
  return { $: 0, a: r };
}, J = { $: 1 }, mu = ze, Lt = ia, Zr = Qe, Hr = f(function(r, n) {
  return o(Ue, r, Hn(n));
}), pu = f(function(r, n) {
  return b(o(Ie, r, n));
}), It = function(r) {
  return o(Hr, `
    `, o(pu, `
`, r));
}, Cr = D(function(r, n, t) {
  r: for (; ; ) if (t.b) {
    var e = t.a, a = t.b, u = r, i = o(r, e, n), $ = a;
    r = u, n = i, t = $;
    continue r;
  } else return n;
}), Ut = function(r) {
  return d(Cr, f(function(n, t) {
    return t + 1;
  }), 0, r);
}, bu = Je, _u = D(function(r, n, t) {
  r: for (; ; ) if (z(r, n) < 1) {
    var e = r, a = n - 1, u = o(y, n, t);
    r = e, n = a, t = u;
    continue r;
  } else return t;
}), hu = f(function(r, n) {
  return d(_u, r, n, w);
}), du = f(function(r, n) {
  return d(bu, r, o(hu, 0, Ut(n) - 1), n);
}), Pn = Ge, Wt = function(r) {
  var n = Pn(r);
  return 97 <= n && n <= 122;
}, zt = function(r) {
  var n = Pn(r);
  return n <= 90 && 65 <= n;
}, gu = function(r) {
  return Wt(r) || zt(r);
}, wu = function(r) {
  var n = Pn(r);
  return n <= 57 && 48 <= n;
}, Du = function(r) {
  return Wt(r) || zt(r) || wu(r);
}, ir = function(r) {
  return d(Cr, y, w, r);
}, Au = Oe, Su = f(function(r, n) {
  return `

(` + (Zr(r + 1) + (") " + It(qt(n))));
}), qt = function(r) {
  return o(ju, r, w);
}, ju = f(function(r, n) {
  r: for (; ; ) switch (r.$) {
    case 0:
      var t = r.a, i = r.b, e = function() {
        var E = Au(t);
        if (E.$ === 1) return false;
        var H = E.a, R = H.a, j = H.b;
        return gu(R) && o(mu, Du, j);
      }(), a = e ? "." + t : "['" + (t + "']"), c = i, l = o(y, a, n);
      r = c, n = l;
      continue r;
    case 1:
      var u = r.a, i = r.b, $ = "[" + (Zr(u) + "]"), c = i, l = o(y, $, n);
      r = c, n = l;
      continue r;
    case 2:
      var v = r.a;
      if (v.b) if (v.b.b) {
        var p = function() {
          return n.b ? "The Json.Decode.oneOf at json" + o(Hr, "", ir(n)) : "Json.Decode.oneOf";
        }(), S = p + (" failed in the following " + (Zr(Ut(v)) + " ways:"));
        return o(Hr, `

`, o(y, S, o(du, Su, v)));
      } else {
        var i = v.a, c = i, l = n;
        r = c, n = l;
        continue r;
      }
      else return "Ran into a Json.Decode.oneOf with no possibilities" + function() {
        return n.b ? " at json" + o(Hr, "", ir(n)) : "!";
      }();
    default:
      var s = r.a, m = r.b, S = function() {
        return n.b ? "Problem with the value at json" + (o(Hr, "", ir(n)) + `:

    `) : `Problem with the given value:

`;
      }();
      return S + (It(o(Lt, 4, m)) + (`

` + s));
  }
}), Y = 32, hn = q(function(r, n, t, e) {
  return { $: 0, a: r, b: n, c: t, d: e };
}), dn = Re, kt = Ve, Qt = f(function(r, n) {
  return yn(n) / yn(r);
}), gn = kt(o(Qt, 2, Y)), Eu = rr(hn, 0, gn, dn, dn), yt = Fe, Hu = function(r) {
  return { $: 1, a: r };
};
f(function(r, n) {
  return r(n);
});
f(function(r, n) {
  return n(r);
});
var Ju = Pe, tt = Me, Ru = f(function(r, n) {
  return z(r, n) > 0 ? r : n;
}), Mu = function(r) {
  return { $: 0, a: r };
}, Gt = Be, Fu = f(function(r, n) {
  r: for (; ; ) {
    var t = o(Gt, Y, r), e = t.a, a = t.b, u = o(y, Mu(e), n);
    if (a.b) {
      var i = a, $ = u;
      r = i, n = $;
      continue r;
    } else return ir(u);
  }
}), Bu = f(function(r, n) {
  r: for (; ; ) {
    var t = kt(n / Y);
    if (t === 1) return o(Gt, Y, r).a;
    var e = o(Fu, r, w), a = t;
    r = e, n = a;
    continue r;
  }
}), Tu = f(function(r, n) {
  if (n.a) {
    var t = n.a * Y, e = Ju(o(Qt, Y, t - 1)), a = r ? ir(n.d) : n.d, u = o(Bu, a, n.a);
    return rr(hn, tt(n.c) + t, o(Ru, 5, e * gn), u, n.c);
  } else return rr(hn, tt(n.c), gn, dn, n.c);
}), Cu = pr(function(r, n, t, e, a) {
  r: for (; ; ) {
    if (n < 0) return o(Tu, false, { d: e, a: t / Y | 0, c: a });
    var u = Hu(d(yt, Y, n, r)), i = r, $ = n - Y, c = t, l = o(y, u, e), v = a;
    r = i, n = $, t = c, e = l, a = v;
    continue r;
  }
}), Vu = f(function(r, n) {
  if (r <= 0) return Eu;
  var t = r % Y, e = d(yt, t, r - t, n), a = r - t - Y;
  return h(Cu, n, a, r, w, e);
}), N = function(r) {
  return !r.$;
}, M = ta, Pu = ea, sr = Ye, On = function(r) {
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
}, Yt = function(r) {
  return r;
}, Ou = Yt, et = Kr(function(r, n, t, e, a, u) {
  return { ay: u, k: n, aJ: e, aL: t, aO: r, aP: a };
}), Lu = qe, Iu = Le, Xt = We, rn = f(function(r, n) {
  return r < 1 ? n : d(Xt, r, Iu(n), n);
}), nn = ke, Vr = function(r) {
  return r === "";
}, tn = f(function(r, n) {
  return r < 1 ? "" : d(Xt, 0, r, n);
}), Uu = ye, at = pr(function(r, n, t, e, a) {
  if (Vr(a) || o(Lu, "@", a)) return J;
  var u = o(nn, ":", a);
  if (u.b) {
    if (u.b.b) return J;
    var i = u.a, $ = Uu(o(rn, i + 1, a));
    if ($.$ === 1) return J;
    var c = $;
    return P(sn(et, r, o(tn, i, a), c, n, t, e));
  } else return P(sn(et, r, a, J, n, t, e));
}), ut = q(function(r, n, t, e) {
  if (Vr(e)) return J;
  var a = o(nn, "/", e);
  if (a.b) {
    var u = a.a;
    return h(at, r, o(rn, u, e), n, t, o(tn, u, e));
  } else return h(at, r, "/", n, t, e);
}), ot = D(function(r, n, t) {
  if (Vr(t)) return J;
  var e = o(nn, "?", t);
  if (e.b) {
    var a = e.a;
    return rr(ut, r, P(o(rn, a + 1, t)), n, o(tn, a, t));
  } else return rr(ut, r, J, n, t);
});
f(function(r, n) {
  if (Vr(n)) return J;
  var t = o(nn, "#", n);
  if (t.b) {
    var e = t.a;
    return d(ot, r, P(o(rn, e + 1, n)), o(tn, e, n));
  } else return d(ot, r, J, n);
});
var Ln = function(r) {
}, ur = br, Wu = ur(0), Zt = q(function(r, n, t, e) {
  if (e.b) {
    var a = e.a, u = e.b;
    if (u.b) {
      var i = u.a, $ = u.b;
      if ($.b) {
        var c = $.a, l = $.b;
        if (l.b) {
          var v = l.a, p = l.b, s = t > 500 ? d(Cr, r, n, ir(p)) : rr(Zt, r, n, t + 1, p);
          return o(r, a, o(r, i, o(r, c, o(r, v, s))));
        } else return o(r, a, o(r, i, o(r, c, n)));
      } else return o(r, a, o(r, i, n));
    } else return o(r, a, n);
  } else return n;
}), Pr = D(function(r, n, t) {
  return rr(Zt, r, n, 0, t);
}), Tr = f(function(r, n) {
  return d(Pr, f(function(t, e) {
    return o(y, r(t), e);
  }), w, n);
}), cr = pn, In = f(function(r, n) {
  return o(cr, function(t) {
    return ur(r(t));
  }, n);
}), zu = D(function(r, n, t) {
  return o(cr, function(e) {
    return o(cr, function(a) {
      return ur(o(r, e, a));
    }, t);
  }, n);
}), Kt = function(r) {
  return d(Pr, zu(y), ur(w), r);
}, Un = Da, qu = f(function(r, n) {
  var t = n;
  return Jn(o(cr, Un(r), t));
}), ku = D(function(r, n, t) {
  return o(In, function(e) {
    return 0;
  }, Kt(o(Tr, qu(r), n)));
}), Qu = D(function(r, n, t) {
  return ur(0);
}), yu = f(function(r, n) {
  var t = n;
  return o(In, r, t);
});
gr.Task = At(Wu, ku, Qu, yu);
var Gu = St("Task"), Wn = f(function(r, n) {
  return Gu(o(In, r, n));
}), Yu = xa, wn = { $: 0 }, Xu = function(r) {
  return { $: 1, a: r };
}, zn = function(r) {
  return d(Cr, f(function(n, t) {
    var e = n.a, a = n.b;
    return d(la, e, a, t);
  }), fa(), r);
}, I = $a, Zu = function(r) {
  return zn(b([A("host", I(r.k))]));
}, Ku = function(r) {
  return { aF: r };
}, B = ra, F = xe, Dn = Ke, Nu = En(function(r, n, t, e, a, u, i, $, c) {
  return { aq: $, V: a, r, W: e, Z: t, aa: u, F: i, af: c, ag: n };
}), Nt = Xe, xu = Nr(function(r, n, t, e, a, u, i) {
  return { Q: a, aC: t, r, Y: n, ab: e, ae: u, af: i };
}), ro = Ne, no = na, to = function(r) {
  return no(b([ro(J), o(M, P, r)]));
}, U = Ze, xt = o(B, function(r) {
  return o(M, r, o(F, "timestamp", Nt));
}, o(B, function(r) {
  return o(M, r, o(F, "text", U));
}, o(B, function(r) {
  return o(M, r, o(F, "author_name", U));
}, o(B, function(r) {
  return o(M, r, o(F, "parent_id", to(U)));
}, o(B, function(r) {
  return o(M, r, o(F, "guest_id", U));
}, o(B, function(r) {
  return o(M, r, o(F, "item_id", U));
}, o(B, function(r) {
  return o(M, r, o(F, "id", U));
}, sr(xu)))))))), re = o(B, function(r) {
  return o(M, r, o(F, "timestamp", Nt));
}, o(B, function(r) {
  return o(M, r, o(F, "comments", Dn(xt)));
}, o(B, function(r) {
  return o(M, r, o(F, "tags", Dn(U)));
}, o(B, function(r) {
  return o(M, r, o(F, "owner_comment", U));
}, o(B, function(r) {
  return o(M, r, o(F, "extract", U));
}, o(B, function(r) {
  return o(M, r, o(F, "image", U));
}, o(B, function(r) {
  return o(M, r, o(F, "link", U));
}, o(B, function(r) {
  return o(M, r, o(F, "title", U));
}, o(B, function(r) {
  return o(M, r, o(F, "id", U));
}, sr(Nu)))))))))), eo = o(B, function(r) {
  return o(M, r, o(F, "items", Dn(re)));
}, sr(Ku)), ao = function(r) {
  return { I: Zu(r), J: eo, K: "GetFeed" };
}, uo = aa, oo = f(function(r, n) {
  return { $: 3, a: r, b: n };
}), io = function(r) {
  return { $: 0, a: r };
}, $o = f(function(r, n) {
  return { $: 4, a: r, b: n };
}), co = { $: 2 }, fo = function(r) {
  return { $: 1, a: r };
}, lo = function(r) {
  return { $: 0, a: r };
}, vo = { $: 1 }, ar = { $: -2 }, An = ar, ne = function(r) {
  return !r.$;
}, it = Aa, te = je, ee = f(function(r, n) {
  r: for (; ; ) {
    if (n.$ === -2) return J;
    var t = n.b, e = n.c, a = n.d, u = n.e, i = o(te, r, t);
    switch (i) {
      case 0:
        var $ = r, c = a;
        r = $, n = c;
        continue r;
      case 1:
        return P(e);
      default:
        var $ = r, c = u;
        r = $, n = c;
        continue r;
    }
  }
}), g = pr(function(r, n, t, e, a) {
  return { $: -1, a: r, b: n, c: t, d: e, e: a };
}), wr = pr(function(r, n, t, e, a) {
  if (a.$ === -1 && !a.a) {
    a.a;
    var u = a.b, i = a.c, $ = a.d, c = a.e;
    if (e.$ === -1 && !e.a) {
      e.a;
      var l = e.b, v = e.c, p = e.d, s = e.e;
      return h(g, 0, n, t, h(g, 1, l, v, p, s), h(g, 1, u, i, $, c));
    } else return h(g, r, u, i, h(g, 0, n, t, e, $), c);
  } else if (e.$ === -1 && !e.a && e.d.$ === -1 && !e.d.a) {
    e.a;
    var l = e.b, v = e.c, m = e.d;
    m.a;
    var S = m.b, E = m.c, H = m.d, R = m.e, s = e.e;
    return h(g, 0, l, v, h(g, 1, S, E, H, R), h(g, 1, n, t, s, a));
  } else return h(g, r, n, t, e, a);
}), Sn = D(function(r, n, t) {
  if (t.$ === -2) return h(g, 0, r, n, ar, ar);
  var e = t.a, a = t.b, u = t.c, i = t.d, $ = t.e, c = o(te, r, a);
  switch (c) {
    case 0:
      return h(wr, e, a, u, d(Sn, r, n, i), $);
    case 1:
      return h(g, e, a, n, i, $);
    default:
      return h(wr, e, a, u, i, d(Sn, r, n, $));
  }
}), ae = D(function(r, n, t) {
  var e = d(Sn, r, n, t);
  if (e.$ === -1 && !e.a) {
    e.a;
    var a = e.b, u = e.c, i = e.d, $ = e.e;
    return h(g, 1, a, u, i, $);
  } else {
    var c = e;
    return c;
  }
}), so = function(r) {
  r: for (; ; ) if (r.$ === -1 && r.d.$ === -1) {
    var n = r.d, t = n;
    r = t;
    continue r;
  } else return r;
}, ue = function(r) {
  if (r.$ === -1 && r.d.$ === -1 && r.e.$ === -1) if (r.e.d.$ === -1 && !r.e.d.a) {
    var n = r.a, t = r.b, e = r.c, a = r.d;
    a.a;
    var u = a.b, i = a.c, $ = a.d, c = a.e, l = r.e;
    l.a;
    var v = l.b, p = l.c, s = l.d;
    s.a;
    var m = s.b, S = s.c, E = s.d, H = s.e, R = l.e;
    return h(g, 0, m, S, h(g, 1, t, e, h(g, 0, u, i, $, c), E), h(g, 1, v, p, H, R));
  } else {
    var n = r.a, t = r.b, e = r.c, j = r.d;
    j.a;
    var u = j.b, i = j.c, $ = j.d, c = j.e, L = r.e;
    L.a;
    var v = L.b, p = L.c, s = L.d, R = L.e;
    return h(g, 1, t, e, h(g, 0, u, i, $, c), h(g, 0, v, p, s, R));
  }
  else return r;
}, $t = function(r) {
  if (r.$ === -1 && r.d.$ === -1 && r.e.$ === -1) if (r.d.d.$ === -1 && !r.d.d.a) {
    var n = r.a, t = r.b, e = r.c, a = r.d;
    a.a;
    var u = a.b, i = a.c, $ = a.d;
    $.a;
    var c = $.b, l = $.c, v = $.d, p = $.e, s = a.e, m = r.e;
    m.a;
    var S = m.b, E = m.c, H = m.d, R = m.e;
    return h(g, 0, u, i, h(g, 1, c, l, v, p), h(g, 1, t, e, s, h(g, 0, S, E, H, R)));
  } else {
    var n = r.a, t = r.b, e = r.c, j = r.d;
    j.a;
    var u = j.b, i = j.c, L = j.d, s = j.e, tr = r.e;
    tr.a;
    var S = tr.b, E = tr.c, H = tr.d, R = tr.e;
    return h(g, 1, t, e, h(g, 0, u, i, L, s), h(g, 0, S, E, H, R));
  }
  else return r;
}, mo = Nr(function(r, n, t, e, a, u, i) {
  if (u.$ === -1 && !u.a) {
    u.a;
    var $ = u.b, c = u.c, l = u.d, v = u.e;
    return h(g, t, $, c, l, h(g, 0, e, a, v, i));
  } else {
    r: for (; ; ) if (i.$ === -1 && i.a === 1) if (i.d.$ === -1) if (i.d.a === 1) {
      i.a;
      var p = i.d;
      return p.a, $t(n);
    } else break r;
    else return i.a, i.d, $t(n);
    else break r;
    return n;
  }
}), qr = function(r) {
  if (r.$ === -1 && r.d.$ === -1) {
    var n = r.a, t = r.b, e = r.c, a = r.d, u = a.a, i = a.d, $ = r.e;
    if (u === 1) {
      if (i.$ === -1 && !i.a) return i.a, h(g, n, t, e, qr(a), $);
      var c = ue(r);
      if (c.$ === -1) {
        var l = c.a, v = c.b, p = c.c, s = c.d, m = c.e;
        return h(wr, l, v, p, qr(s), m);
      } else return ar;
    } else return h(g, n, t, e, qr(a), $);
  } else return ar;
}, Fr = f(function(r, n) {
  if (n.$ === -2) return ar;
  var t = n.a, e = n.b, a = n.c, u = n.d, i = n.e;
  if (z(r, e) < 0) if (u.$ === -1 && u.a === 1) {
    u.a;
    var $ = u.d;
    if ($.$ === -1 && !$.a) return $.a, h(g, t, e, a, o(Fr, r, u), i);
    var c = ue(n);
    if (c.$ === -1) {
      var l = c.a, v = c.b, p = c.c, s = c.d, m = c.e;
      return h(wr, l, v, p, o(Fr, r, s), m);
    } else return ar;
  } else return h(g, t, e, a, o(Fr, r, u), i);
  else return o(po, r, gt(mo, r, n, t, e, a, u, i));
}), po = f(function(r, n) {
  if (n.$ === -1) {
    var t = n.a, e = n.b, a = n.c, u = n.d, i = n.e;
    if ($r(r, e)) {
      var $ = so(i);
      if ($.$ === -1) {
        var c = $.b, l = $.c;
        return h(wr, t, c, l, u, qr(i));
      } else return ar;
    } else return h(wr, t, e, a, u, o(Fr, r, i));
  } else return ar;
}), oe = f(function(r, n) {
  var t = o(Fr, r, n);
  if (t.$ === -1 && !t.a) {
    t.a;
    var e = t.b, a = t.c, u = t.d, i = t.e;
    return h(g, 1, e, a, u, i);
  } else {
    var $ = t;
    return $;
  }
}), bo = D(function(r, n, t) {
  var e = n(o(ee, r, t));
  if (e.$) return o(oe, r, t);
  var a = e.a;
  return d(ae, r, a, t);
}), ie = D(function(r, n, t) {
  return n(r(t));
}), _o = f(function(r, n) {
  return d($u, "", Yt, o(ie, n, r));
}), $e = f(function(r, n) {
  if (n.$) {
    var e = n.a;
    return W(r(e));
  } else {
    var t = n.a;
    return x(t);
  }
}), ho = function(r) {
  return { $: 4, a: r };
}, go = function(r) {
  return { $: 3, a: r };
}, wo = function(r) {
  return { $: 0, a: r };
}, Do = { $: 2 }, Ao = { $: 1 }, So = f(function(r, n) {
  switch (n.$) {
    case 0:
      var t = n.a;
      return W(wo(t));
    case 1:
      return W(Ao);
    case 2:
      return W(Do);
    case 3:
      var e = n.a;
      return W(go(e.bs));
    default:
      var a = n.b;
      return o($e, ho, r(a));
  }
}), jo = f(function(r, n) {
  return o(_o, r, So(function(t) {
    return o($e, qt, o(uo, n, t));
  }));
}), Eo = f(function(r, n) {
  return { $: 0, a: r, b: n };
}), Ho = Eo, Jo = function(r) {
  return o(fu, "application/json", o(Lt, 0, r));
}, ce = function(r) {
  return { $: 1, a: r };
}, fe = f(function(r, n) {
  return { aR: r, a1: n };
}), Ro = ur(o(fe, An, w)), Mo = ha, Fo = Jn, kr = D(function(r, n, t) {
  r: for (; ; ) if (n.b) {
    var e = n.a, a = n.b;
    if (e.$) {
      var p = e.a;
      return o(cr, function(s) {
        var m = p.bw;
        if (m.$ === 1) return d(kr, r, a, t);
        var S = m.a;
        return d(kr, r, a, d(ae, S, s, t));
      }, Fo(d(eu, r, Un(r), p)));
    } else {
      var u = e.a, i = o(ee, u, t);
      if (i.$ === 1) {
        var $ = r, c = a, l = t;
        r = $, n = c, t = l;
        continue r;
      } else {
        var v = i.a;
        return o(cr, function(s) {
          return d(kr, r, a, o(oe, u, t));
        }, Mo(v));
      }
    }
  } else return ur(t);
}), Bo = q(function(r, n, t, e) {
  return o(cr, function(a) {
    return ur(o(fe, a, t));
  }, d(kr, r, n, e.aR));
}), To = D(function(r, n, t) {
  var e = r(n);
  if (e.$) return t;
  var a = e.a;
  return o(y, a, t);
}), Co = f(function(r, n) {
  return d(Pr, To(r), w, n);
}), Vo = q(function(r, n, t, e) {
  var a = e.a, u = e.b;
  return $r(n, a) ? P(o(Un, r, u(t))) : J;
}), Po = D(function(r, n, t) {
  var e = n.a, a = n.b;
  return o(cr, function(u) {
    return ur(t);
  }, Kt(o(Co, d(Vo, r, e, a), t.a1)));
}), Oo = function(r) {
  return { $: 0, a: r };
}, Lo = f(function(r, n) {
  if (n.$) {
    var e = n.a;
    return ce({ ba: e.ba, I: e.I, bf: o(cu, r, e.bf), bh: e.bh, bl: e.bl, bv: e.bv, bw: e.bw, by: e.by });
  } else {
    var t = n.a;
    return Oo(t);
  }
}), Io = f(function(r, n) {
  return { $: 0, a: r, b: n };
}), Uo = f(function(r, n) {
  var t = n.a, e = n.b;
  return o(Io, t, o(ie, e, r));
});
gr.Http = At(Ro, Bo, Po, Lo, Uo);
var Wo = St("Http"), zo = function(r) {
  return Wo(ce({ ba: false, I: r.I, bf: r.bf, bh: r.bh, bl: r.bl, bv: r.bv, bw: r.bw, by: r.by }));
}, qn = f(function(r, n) {
  return zo({ I: Jo(n.I), bf: o(jo, r, n.J), bh: b([o(Ho, "X-RPC-Endpoint", n.K)]), bl: "POST", bv: J, bw: J, by: "/api" });
}), jn = o(qn, Xu, ao({ k: "localhost" })), qo = A({ Q: "", n: wn, t: "", z: J }, jn), ko = jt, Qo = ko(w), ln = function(r) {
  return { $: 2, a: r };
}, yo = function(r) {
  return { $: 1, a: r };
}, vn = function(r) {
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
      return "Bad Status: " + Zr(t);
    default:
      var e = r.a;
      return "Bad Body: " + e;
  }
}, Go = jt, er = Go(w), Yo = function(r) {
  return { $: 7, a: r };
}, ct = D(function(r, n, t) {
  return r(n(t));
}), ft = f(function(r, n) {
  if (n.$) return J;
  var t = n.a;
  return P(r(t));
}), lt = sa, vt = f(function(r, n) {
  if (n.$) return r;
  var t = n.a;
  return t;
}), Xo = function(r) {
  return zn(b([A("host", I(r.k)), A("item_id", I(r.Y)), A("parent_id", o(ct, vt(lt), ft(I))(r.ab)), A("text", I(r.ae)), A("author_name", o(ct, vt(lt), ft(I))(r.Q))]));
}, Zo = function(r) {
  return { ap: r };
}, Ko = o(B, function(r) {
  return o(M, r, o(F, "comment", xt));
}, sr(Zo)), No = function(r) {
  return { I: Xo(r), J: Ko, K: "SubmitComment" };
}, xo = function(r) {
  var n = r.z;
  if (n.$) return er;
  var t = n.a.Y, e = n.a.ab;
  return o(qn, Yo, No({ Q: Vr(r.Q) ? J : P(r.Q), k: "localhost", Y: t, ab: e, ae: r.t }));
}, ri = function(r) {
  return { $: 2, a: r };
}, ni = f(function(r, n) {
  return d(Cr, va(r), ca(), n);
}), ti = function(r) {
  return zn(b([A("host", I(r.k)), A("title", I(r.ag)), A("link", I(r.Z)), A("image", I(r.W)), A("extract", I(r.V)), A("owner_comment", I(r.aa)), A("tags", ni(I)(r.F))]));
}, ei = function(r) {
  return { aE: r };
}, ai = o(B, function(r) {
  return o(M, r, o(F, "item", re));
}, sr(ei)), ui = function(r) {
  return { I: ti(r), J: ai, K: "SubmitItem" };
}, oi = o(qn, ri, ui({ V: "This item was submitted via the generated Elm API.", k: "localhost", W: "https://placehold.co/100x100", Z: "https://elm-lang.org", aa: "So much cleaner!", F: w, ag: "New Item from Elm" })), ii = f(function(r, n) {
  switch (r.$) {
    case 0:
      return A(n, oi);
    case 1:
      if (r.a.$) {
        var e = r.a.a;
        return A(Z(n, { n: ln("Failed to fetch feed: " + vn(e)) }), er);
      } else {
        var t = r.a.a;
        return A(Z(n, { n: yo(t.aF) }), er);
      }
    case 2:
      if (r.a.$) {
        var e = r.a.a;
        return A(Z(n, { n: ln("Failed to submit item: " + vn(e)) }), er);
      } else {
        var t = r.a.a;
        return A(Z(n, { n: wn }), jn);
      }
    case 3:
      var a = r.a, u = r.b;
      return A(Z(n, { t: "", z: P({ Y: a, ab: u }) }), er);
    case 4:
      var i = r.a;
      return A(Z(n, { t: i }), er);
    case 5:
      var $ = r.a;
      return A(Z(n, { Q: $ }), er);
    case 6:
      return A(n, xo(n));
    case 7:
      if (r.a.$) {
        var e = r.a.a;
        return A(Z(n, { n: ln("Failed to submit comment: " + vn(e)) }), er);
      } else return A(Z(n, { n: wn, t: "", z: J }), jn);
    default:
      return A(Z(n, { t: "", z: J }), er);
  }
}), $i = { $: 0 }, Jr = k("button"), C = k("div"), ci = k("h1"), fi = function(r) {
  return { $: 0, a: r };
}, le = Et, li = f(function(r, n) {
  return o(le, r, fi(n));
}), Rr = function(r) {
  return o(li, "click", sr(r));
}, vi = Ra, _ = vi, si = bn, V = si, ve = k("h2"), mi = k("a"), se = f(function(r, n) {
  return d(Pr, f(function(t, e) {
    return r(t) ? o(y, t, e) : e;
  }), w, n);
}), pi = function(r) {
  return o(se, function(n) {
    return $r(n.ab, J);
  }, r);
}, bi = k("h3"), en = f(function(r, n) {
  return o(Ma, r, I(n));
}), _i = function(r) {
  return o(en, "href", Ca(r));
}, hi = k("img"), di = k("p"), gi = k("section"), wi = function(r) {
  return o(en, "src", Va(r));
}, Di = f(function(r, n) {
  return o(se, function(t) {
    return $r(t.ab, P(r));
  }, n);
}), Ai = { $: 8 }, Si = { $: 6 }, ji = function(r) {
  return { $: 5, a: r };
}, Ei = function(r) {
  return { $: 4, a: r };
}, st = f(function(r, n) {
  return { $: 3, a: r, b: n };
}), Hi = k("input"), Ji = function(r) {
  return A(r, true);
}, Ri = function(r) {
  return { $: 1, a: r };
}, Mi = f(function(r, n) {
  return o(le, r, Ri(n));
}), Fi = f(function(r, n) {
  return d(Pr, F, n, r);
}), Bi = o(Fi, b(["target", "value"]), U), mt = function(r) {
  return o(Mi, "input", o(M, Ji, o(M, r, Bi)));
}, pt = en("placeholder"), Ti = k("textarea"), bt = en("value"), me = D(function(r, n, t) {
  var e = r.z;
  if (e.$) return o(Jr, b([Rr(o(st, n, t)), o(_, "font-size", "0.8em"), o(_, "color", "gray"), o(_, "background", "none"), o(_, "border", "none"), o(_, "cursor", "pointer"), o(_, "text-decoration", "underline")]), b([V("Reply")]));
  var a = e.a;
  return $r(a.Y, n) && $r(a.ab, t) ? o(C, b([o(_, "margin-top", "5px"), o(_, "background", "#f0f0f0"), o(_, "padding", "10px")]), b([o(Hi, b([pt("Your Name (Optional for returning users)"), bt(r.Q), mt(ji), o(_, "display", "block"), o(_, "margin-bottom", "5px"), o(_, "width", "100%")]), w), o(Ti, b([pt("Write a reply..."), bt(r.t), mt(Ei), o(_, "width", "100%"), o(_, "height", "60px")]), w), o(C, b([o(_, "margin-top", "5px")]), b([o(Jr, b([Rr(Si), o(_, "margin-right", "5px")]), b([V("Submit")])), o(Jr, b([Rr(Ai)]), b([V("Cancel")]))]))])) : o(Jr, b([Rr(o(st, n, t)), o(_, "font-size", "0.8em"), o(_, "color", "gray"), o(_, "background", "none"), o(_, "border", "none"), o(_, "cursor", "pointer"), o(_, "text-decoration", "underline")]), b([V("Reply")]));
}), pe = q(function(r, n, t, e) {
  return o(C, b([o(_, "margin-left", "20px"), o(_, "margin-top", "10px"), o(_, "border-left", "2px solid #eee"), o(_, "padding-left", "10px")]), b([o(C, b([o(_, "font-weight", "bold"), o(_, "font-size", "0.9em")]), b([V(e.Q)])), o(C, w, b([V(e.ae)])), d(me, r, n, P(e.r)), o(C, w, o(Tr, d(pe, r, n, t), o(Di, e.r, t)))]));
}), Ci = function(r) {
  return o(C, b([o(_, "display", "inline-block"), o(_, "background-color", "#e0e0e0"), o(_, "color", "#333"), o(_, "padding", "2px 8px"), o(_, "border-radius", "12px"), o(_, "font-size", "0.85em"), o(_, "margin-right", "5px")]), b([V(r)]));
}, Vi = f(function(r, n) {
  return o(gi, b([o(_, "border", "1px solid #ddd"), o(_, "padding", "15px"), o(_, "margin-bottom", "15px"), o(_, "border-radius", "8px")]), b([o(ve, w, b([V(n.ag)])), o(mi, b([_i(n.Z), o(_, "color", "blue")]), b([V(n.Z)])), o(C, b([o(_, "margin", "10px 0")]), b([o(hi, b([wi(n.W), o(_, "max-width", "100%"), o(_, "height", "auto")]), w)])), o(di, w, b([V(n.V)])), o(C, b([o(_, "margin-bottom", "10px")]), o(Tr, Ci, n.F)), o(C, b([o(_, "background", "#f9f9f9"), o(_, "padding", "10px"), o(_, "font-style", "italic")]), b([V("Owner: " + n.aa)])), o(C, b([o(_, "margin-top", "20px"), o(_, "border-top", "1px solid #eee"), o(_, "padding-top", "10px")]), b([o(bi, w, b([V("Comments")])), o(C, w, o(Tr, d(pe, r, n.r, n.aq), pi(n.aq))), d(me, r, n.r, J)]))]));
}), Pi = function(r) {
  var n = r.n;
  switch (n.$) {
    case 0:
      return o(C, w, b([V("Loading Feed...")]));
    case 1:
      var t = n.a;
      return o(C, w, o(Tr, Vi(r), t));
    default:
      var e = n.a;
      return o(C, b([o(_, "color", "red")]), b([o(ve, w, b([V("Error")])), o(C, w, b([V(e)]))]));
  }
}, Oi = function(r) {
  return o(C, b([o(_, "font-family", "sans-serif"), o(_, "max-width", "800px"), o(_, "margin", "0 auto"), o(_, "padding", "20px")]), b([o(ci, w, b([V("Horatio Reader")])), o(Jr, b([Rr($i), o(_, "margin-bottom", "20px")]), b([V("Test: Submit Item")])), Pi(r)]));
}, Li = Yu({ bk: function(r) {
  return qo;
}, bu: function(r) {
  return Qo;
}, bx: ii, bz: Oi });
const Ii = { Main: { init: Li(sr(0))(0) } };
console.log("Horatio Client v1.0.0 - Ports Debug");
async function Ui() {
  try {
    await ht(), console.log("WASM module initialized successfully.");
  } catch (n) {
    console.error("Failed to initialize WASM module:", n);
    return;
  }
  const r = Ii.Main.init({ node: document.getElementById("app") });
  console.log("Elm app initialized. Ports:", r.ports), r.ports && r.ports.log ? r.ports.log.subscribe((n) => {
    console.log("ELM DEBUG PORT:", n);
  }) : console.warn("Elm 'log' port not found."), r.ports && r.ports.rpcRequest && r.ports.rpcRequest.subscribe(async ({ endpoint: n, body: t, correlationId: e }) => {
    try {
      if (console.log("RPC request received from Elm:", { endpoint: n, body: t, correlationId: e }), n === "GetClassWithStudents" && t.classId === 0) {
        const i = JSON.stringify({ type: "ValidationError", details: { field: "classId", message: "classId cannot be 0 for GetClassWithStudents (JS mock error)" } });
        console.log("Sending JS mock error response:", { endpoint: n, body: i, correlationId: e }), setTimeout(() => {
          r.ports.rpcResponse.send({ endpoint: n, body: i, correlationId: e });
        }, 500);
        return;
      }
      console.log("Encoding request via WASM...");
      const u = de(n, JSON.stringify(t));
      console.log("Encoded request:", u), fetch("/api", { method: "POST", headers: { "Content-Type": "application/json", "X-RPC-Endpoint": n }, body: u }).then(async (i) => {
        if (!i.ok) throw new Error(`HTTP error! status: ${i.status}`);
        return i.text();
      }).then((i) => {
        console.log("Received response from server:", i);
        const $ = he(n, i);
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
Ui();
