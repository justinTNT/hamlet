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
let mr;
const Xr = new TextEncoder();
"encodeInto" in Xr || (Xr.encodeInto = function(r, n) {
  const t = Xr.encode(r);
  return n.set(t), { read: r.length, written: t.length };
});
let Yt = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true });
Yt.decode();
const Qt = /* @__PURE__ */ new Set(["basic", "cors", "default"]);
async function Zt(r, n) {
  if (typeof Response == "function" && r instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming == "function") try {
      return await WebAssembly.instantiateStreaming(r, n);
    } catch (e) {
      if (r.ok && Qt.has(r.type) && r.headers.get("Content-Type") !== "application/wasm") console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);
      else throw e;
    }
    const t = await r.arrayBuffer();
    return await WebAssembly.instantiate(t, n);
  } else {
    const t = await WebAssembly.instantiate(r, n);
    return t instanceof WebAssembly.Instance ? { instance: t, module: r } : t;
  }
}
function Xt() {
  const r = {};
  return r.wbg = {}, r.wbg.__wbindgen_init_externref_table = function() {
    const n = mr.__wbindgen_externrefs, t = n.grow(4);
    n.set(0, void 0), n.set(t + 0, void 0), n.set(t + 1, null), n.set(t + 2, true), n.set(t + 3, false);
  }, r;
}
function kt(r, n) {
  return mr = r.exports, Qn.__wbindgen_wasm_module = n, mr.__wbindgen_start(), mr;
}
async function Qn(r) {
  if (mr !== void 0) return mr;
  typeof r < "u" && (Object.getPrototypeOf(r) === Object.prototype ? { module_or_path: r } = r : console.warn("using deprecated parameters for the initialization function; pass a single object instead")), typeof r > "u" && (r = new URL("/assets/proto_rust_bg-o6QjJTyU.wasm", import.meta.url));
  const n = Xt();
  (typeof r == "string" || typeof Request == "function" && r instanceof Request || typeof URL == "function" && r instanceof URL) && (r = fetch(r));
  const { instance: t, module: e } = await Zt(await r, n);
  return kt(t, e);
}
function ar(r, n, t) {
  return t.a = r, t.f = n, t;
}
function f(r) {
  return ar(2, r, function(n) {
    return function(t) {
      return r(n, t);
    };
  });
}
function g(r) {
  return ar(3, r, function(n) {
    return function(t) {
      return function(e) {
        return r(n, t, e);
      };
    };
  });
}
function V(r) {
  return ar(4, r, function(n) {
    return function(t) {
      return function(e) {
        return function(a) {
          return r(n, t, e, a);
        };
      };
    };
  });
}
function fr(r) {
  return ar(5, r, function(n) {
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
function Or(r) {
  return ar(6, r, function(n) {
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
function Lr(r) {
  return ar(7, r, function(n) {
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
function Zn(r) {
  return ar(8, r, function(n) {
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
function Xn(r) {
  return ar(9, r, function(n) {
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
function _(r, n, t, e) {
  return r.a === 3 ? r.f(n, t, e) : r(n)(t)(e);
}
function Y(r, n, t, e, a) {
  return r.a === 4 ? r.f(n, t, e, a) : r(n)(t)(e)(a);
}
function b(r, n, t, e, a, u) {
  return r.a === 5 ? r.f(n, t, e, a, u) : r(n)(t)(e)(a)(u);
}
function Nr(r, n, t, e, a, u, i) {
  return r.a === 6 ? r.f(n, t, e, a, u, i) : r(n)(t)(e)(a)(u)(i);
}
function kn(r, n, t, e, a, u, i, $) {
  return r.a === 7 ? r.f(n, t, e, a, u, i, $) : r(n)(t)(e)(a)(u)(i)($);
}
function Kt(r, n, t, e, a, u, i, $, c) {
  return r.a === 8 ? r.f(n, t, e, a, u, i, $, c) : r(n)(t)(e)(a)(u)(i)($)(c);
}
function Cr(r, n) {
  for (var t, e = [], a = xr(r, n, 0, e); a && (t = e.pop()); a = xr(t.a, t.b, 0, e)) ;
  return a;
}
function xr(r, n, t, e) {
  if (r === n) return true;
  if (typeof r != "object" || r === null || n === null) return typeof r == "function" && Ur(5), false;
  if (t > 100) return e.push(H(r, n)), true;
  r.$ < 0 && (r = Vn(r), n = Vn(n));
  for (var a in r) if (!xr(r[a], n[a], t + 1, e)) return false;
  return true;
}
f(Cr);
f(function(r, n) {
  return !Cr(r, n);
});
function P(r, n, t) {
  if (typeof r != "object") return r === n ? 0 : r < n ? -1 : 1;
  if (typeof r.$ > "u") return (t = P(r.a, n.a)) || (t = P(r.b, n.b)) ? t : P(r.c, n.c);
  for (; r.b && n.b && !(t = P(r.a, n.a)); r = r.b, n = n.b) ;
  return t || (r.b ? 1 : n.b ? -1 : 0);
}
f(function(r, n) {
  return P(r, n) < 0;
});
f(function(r, n) {
  return P(r, n) < 1;
});
f(function(r, n) {
  return P(r, n) > 0;
});
f(function(r, n) {
  return P(r, n) >= 0;
});
var yt = f(function(r, n) {
  var t = P(r, n);
  return t < 0 ? ct : t ? Pa : ft;
}), _r = 0;
function H(r, n) {
  return { a: r, b: n };
}
f(Nt);
function Nt(r, n) {
  if (typeof r == "string") return r + n;
  if (!r.b) return n;
  var t = Q(r.a, n);
  r = r.b;
  for (var e = t; r.b; r = r.b) e = e.b = Q(r.a, n);
  return t;
}
var A = { $: 0 };
function Q(r, n) {
  return { $: 1, a: r, b: n };
}
var xt = f(Q);
function w(r) {
  for (var n = A, t = r.length; t--; ) n = Q(r[t], n);
  return n;
}
function fn(r) {
  for (var n = []; r.b; r = r.b) n.push(r.a);
  return n;
}
var re = g(function(r, n, t) {
  for (var e = []; n.b && t.b; n = n.b, t = t.b) e.push(o(r, n.a, t.a));
  return w(e);
});
V(function(r, n, t, e) {
  for (var a = []; n.b && t.b && e.b; n = n.b, t = t.b, e = e.b) a.push(_(r, n.a, t.a, e.a));
  return w(a);
});
fr(function(r, n, t, e, a) {
  for (var u = []; n.b && t.b && e.b && a.b; n = n.b, t = t.b, e = e.b, a = a.b) u.push(Y(r, n.a, t.a, e.a, a.a));
  return w(u);
});
Or(function(r, n, t, e, a, u) {
  for (var i = []; n.b && t.b && e.b && a.b && u.b; n = n.b, t = t.b, e = e.b, a = a.b, u = u.b) i.push(b(r, n.a, t.a, e.a, a.a, u.a));
  return w(i);
});
f(function(r, n) {
  return w(fn(n).sort(function(t, e) {
    return P(r(t), r(e));
  }));
});
f(function(r, n) {
  return w(fn(n).sort(function(t, e) {
    var a = o(r, t, e);
    return a === ft ? 0 : a === ct ? -1 : 1;
  }));
});
var ne = [];
function te(r) {
  return r.length;
}
var ee = g(function(r, n, t) {
  for (var e = new Array(r), a = 0; a < r; a++) e[a] = t(n + a);
  return e;
}), ae = f(function(r, n) {
  for (var t = new Array(r), e = 0; e < r && n.b; e++) t[e] = n.a, n = n.b;
  return t.length = e, H(t, n);
});
f(function(r, n) {
  return n[r];
});
g(function(r, n, t) {
  for (var e = t.length, a = new Array(e), u = 0; u < e; u++) a[u] = t[u];
  return a[r] = n, a;
});
f(function(r, n) {
  for (var t = n.length, e = new Array(t + 1), a = 0; a < t; a++) e[a] = n[a];
  return e[t] = r, e;
});
g(function(r, n, t) {
  for (var e = t.length, a = 0; a < e; a++) n = o(r, t[a], n);
  return n;
});
var ue = g(function(r, n, t) {
  for (var e = t.length - 1; e >= 0; e--) n = o(r, t[e], n);
  return n;
});
f(function(r, n) {
  for (var t = n.length, e = new Array(t), a = 0; a < t; a++) e[a] = r(n[a]);
  return e;
});
g(function(r, n, t) {
  for (var e = t.length, a = new Array(e), u = 0; u < e; u++) a[u] = o(r, n + u, t[u]);
  return a;
});
g(function(r, n, t) {
  return t.slice(r, n);
});
g(function(r, n, t) {
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
  return console.log(r + ": " + ie()), n;
});
function ie(r) {
  return "<internals>";
}
function Ur(r) {
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
  return r === 0 ? Ur(11) : t > 0 && r < 0 || t < 0 && r > 0 ? t + r : t;
});
f(Math.atan2);
var oe = Math.ceil, $e = Math.floor, Hn = Math.log;
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
function fe(r) {
  var n = r.charCodeAt(0);
  return isNaN(n) ? J : U(55296 <= n && n <= 56319 ? H(r[0] + r[1], r.slice(2)) : H(r[0], r.slice(1)));
}
f(function(r, n) {
  return r + n;
});
function ce(r) {
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
g(function(r, n, t) {
  for (var e = t.length, a = 0; a < e; ) {
    var u = t[a], i = t.charCodeAt(a);
    a++, 55296 <= i && i <= 56319 && (u += t[a], a++), n = o(r, u, n);
  }
  return n;
});
g(function(r, n, t) {
  for (var e = t.length; e--; ) {
    var a = t[e], u = t.charCodeAt(e);
    56320 <= u && u <= 57343 && (e--, a = t[e] + a), n = o(r, a, n);
  }
  return n;
});
var ve = f(function(r, n) {
  return n.split(r);
}), le = f(function(r, n) {
  return n.join(r);
}), se = g(function(r, n, t) {
  return t.slice(r, n);
});
f(function(r, n) {
  for (var t = n.length; t--; ) {
    var e = n[t], a = n.charCodeAt(t);
    if (56320 <= a && a <= 57343 && (t--, e = n[t] + e), r(e)) return true;
  }
  return false;
});
var me = f(function(r, n) {
  for (var t = n.length; t--; ) {
    var e = n[t], a = n.charCodeAt(t);
    if (56320 <= a && a <= 57343 && (t--, e = n[t] + e), !r(e)) return false;
  }
  return true;
}), pe = f(function(r, n) {
  return n.indexOf(r) > -1;
});
f(function(r, n) {
  return n.indexOf(r) === 0;
});
f(function(r, n) {
  return n.length >= r.length && n.lastIndexOf(r) === n.length - r.length;
});
var be = f(function(r, n) {
  var t = r.length;
  if (t < 1) return A;
  for (var e = 0, a = []; (e = n.indexOf(r, e)) > -1; ) a.push(e), e = e + t;
  return w(a);
});
function _e(r) {
  return r + "";
}
function he(r) {
  for (var n = 0, t = r.charCodeAt(0), e = t == 43 || t == 45 ? 1 : 0, a = e; a < r.length; ++a) {
    var u = r.charCodeAt(a);
    if (u < 48 || 57 < u) return J;
    n = 10 * n + u - 48;
  }
  return a == e ? J : U(t == 45 ? -n : n);
}
function ge(r) {
  var n = r.charCodeAt(0);
  return 55296 <= n && n <= 56319 ? (n - 55296) * 1024 + r.charCodeAt(1) - 56320 + 65536 : n;
}
function de(r) {
  return { $: 0, a: r };
}
function Kn(r) {
  return { $: 2, b: r };
}
var we = Kn(function(r) {
  return typeof r != "number" ? W("an INT", r) : -2147483647 < r && r < 2147483647 && (r | 0) === r || isFinite(r) && !(r % 1) ? G(r) : W("an INT", r);
}), De = Kn(function(r) {
  return typeof r == "string" ? G(r) : r instanceof String ? G(r + "") : W("a STRING", r);
});
function Ae(r) {
  return { $: 3, b: r };
}
var Se = f(function(r, n) {
  return { $: 6, d: r, b: n };
});
f(function(r, n) {
  return { $: 7, e: r, b: n };
});
function ur(r, n) {
  return { $: 9, f: r, g: n };
}
var je = f(function(r, n) {
  return { $: 10, b: n, h: r };
}), Ee = f(function(r, n) {
  return ur(r, [n]);
}), He = g(function(r, n, t) {
  return ur(r, [n, t]);
});
V(function(r, n, t, e) {
  return ur(r, [n, t, e]);
});
fr(function(r, n, t, e, a) {
  return ur(r, [n, t, e, a]);
});
Or(function(r, n, t, e, a, u) {
  return ur(r, [n, t, e, a, u]);
});
Lr(function(r, n, t, e, a, u, i) {
  return ur(r, [n, t, e, a, u, i]);
});
Zn(function(r, n, t, e, a, u, i, $) {
  return ur(r, [n, t, e, a, u, i, $]);
});
Xn(function(r, n, t, e, a, u, i, $, c) {
  return ur(r, [n, t, e, a, u, i, $, c]);
});
var Je = f(function(r, n) {
  try {
    var t = JSON.parse(n);
    return M(r, t);
  } catch (e) {
    return T(o(_n, "This is not valid JSON! " + e.message, n));
  }
}), Re = f(function(r, n) {
  return M(r, n);
});
function M(r, n) {
  switch (r.$) {
    case 2:
      return r.b(n);
    case 5:
      return n === null ? G(r.c) : W("null", n);
    case 3:
      return Hr(n) ? Jn(r.b, n, w) : W("a LIST", n);
    case 4:
      return Hr(n) ? Jn(r.b, n, Fe) : W("an ARRAY", n);
    case 6:
      var t = r.d;
      if (typeof n != "object" || n === null || !(t in n)) return W("an OBJECT with a field named `" + t + "`", n);
      var v = M(r.b, n[t]);
      return z(v) ? v : T(o(On, t, v.a));
    case 7:
      var e = r.e;
      if (!Hr(n)) return W("an ARRAY", n);
      if (e >= n.length) return W("a LONGER array. Need index " + e + " but only see " + n.length + " entries", n);
      var v = M(r.b, n[e]);
      return z(v) ? v : T(o(lt, e, v.a));
    case 8:
      if (typeof n != "object" || n === null || Hr(n)) return W("an OBJECT", n);
      var a = A;
      for (var u in n) if (Object.prototype.hasOwnProperty.call(n, u)) {
        var v = M(r.b, n[u]);
        if (!z(v)) return T(o(On, u, v.a));
        a = Q(H(u, v.a), a);
      }
      return G(tr(a));
    case 9:
      for (var i = r.f, $ = r.g, c = 0; c < $.length; c++) {
        var v = M($[c], n);
        if (!z(v)) return v;
        i = i(v.a);
      }
      return G(i);
    case 10:
      var v = M(r.b, n);
      return z(v) ? M(r.h(v.a), n) : v;
    case 11:
      for (var l = A, p = r.g; p.b; p = p.b) {
        var v = M(p.a, n);
        if (z(v)) return v;
        l = Q(v.a, l);
      }
      return T(Ma(tr(l)));
    case 1:
      return T(o(_n, r.a, n));
    case 0:
      return G(r.a);
  }
}
function Jn(r, n, t) {
  for (var e = n.length, a = new Array(e), u = 0; u < e; u++) {
    var i = M(r, n[u]);
    if (!z(i)) return T(o(lt, u, i.a));
    a[u] = i.a;
  }
  return G(t(a));
}
function Hr(r) {
  return Array.isArray(r) || typeof FileList < "u" && r instanceof FileList;
}
function Fe(r) {
  return o(tu, r.length, function(n) {
    return r[n];
  });
}
function W(r, n) {
  return T(o(_n, "Expecting " + r, n));
}
function sr(r, n) {
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
      return sr(r.b, n.b);
    case 6:
      return r.d === n.d && sr(r.b, n.b);
    case 7:
      return r.e === n.e && sr(r.b, n.b);
    case 9:
      return r.f === n.f && Rn(r.g, n.g);
    case 10:
      return r.h === n.h && sr(r.b, n.b);
    case 11:
      return Rn(r.g, n.g);
  }
}
function Rn(r, n) {
  var t = r.length;
  if (t !== n.length) return false;
  for (var e = 0; e < t; e++) if (!sr(r[e], n[e])) return false;
  return true;
}
var Be = f(function(r, n) {
  return JSON.stringify(n, null, r) + "";
});
function Te(r) {
  return r;
}
function Pe() {
  return {};
}
var Me = g(function(r, n, t) {
  var e = n;
  return r === "toJSON" && typeof e == "function" || (t[r] = e), t;
});
function cr(r) {
  return { $: 0, a: r };
}
function Ve(r) {
  return { $: 1, a: r };
}
function I(r) {
  return { $: 2, b: r, c: null };
}
var rn = f(function(r, n) {
  return { $: 3, b: r, d: n };
});
f(function(r, n) {
  return { $: 4, b: r, d: n };
});
function Oe(r) {
  return { $: 5, b: r };
}
var Le = 0;
function Sr(r) {
  var n = { $: 0, e: Le++, f: r, g: null, h: [] };
  return vn(n), n;
}
function cn(r) {
  return I(function(n) {
    n(cr(Sr(r)));
  });
}
function yn(r, n) {
  r.h.push(n), vn(r);
}
var Ce = f(function(r, n) {
  return I(function(t) {
    yn(r, n), t(cr(_r));
  });
});
function Ue(r) {
  return I(function(n) {
    var t = r.f;
    t.$ === 2 && t.c && t.c(), r.f = null, n(cr(_r));
  });
}
var kr = false, Fn = [];
function vn(r) {
  if (Fn.push(r), !kr) {
    for (kr = true; r = Fn.shift(); ) Ie(r);
    kr = false;
  }
}
function Ie(r) {
  for (; r.f; ) {
    var n = r.f.$;
    if (n === 0 || n === 1) {
      for (; r.g && r.g.$ !== n; ) r.g = r.g.i;
      if (!r.g) return;
      r.f = r.g.b(r.f.a), r.g = r.g.i;
    } else if (n === 2) {
      r.f.c = r.f.b(function(t) {
        r.f = t, vn(r);
      });
      return;
    } else if (n === 5) {
      if (r.h.length === 0) return;
      r.f = r.f.b(r.h.shift());
    } else r.g = { $: n === 3 ? 0 : 1, b: r.f.b, i: r.g }, r.f = r.f.d;
  }
}
V(function(r, n, t, e) {
  return ln(n, e, r.a$, r.bc, r.a9, function() {
    return function() {
    };
  });
});
function ln(r, n, t, e, a, u) {
  var i = o(Re, r, n ? n.flags : void 0);
  z(i) || Ur(2);
  var $ = {}, c = t(i.a), v = c.a, l = u(s, v), p = We($, s);
  function s(m, d) {
    var S = o(e, m, v);
    l(v = S.a, d), Tn($, S.b, a(v));
  }
  return Tn($, c.b, a(v)), p ? { ports: p } : {};
}
var pr = {};
function We(r, n) {
  var t;
  for (var e in pr) {
    var a = pr[e];
    a.a && (t = t || {}, t[e] = a.a(e, n)), r[e] = qe(a, n);
  }
  return t;
}
function Nn(r, n, t, e, a) {
  return { b: r, c: n, d: t, e, f: a };
}
function qe(r, n) {
  var t = { g: n, h: void 0 }, e = r.c, a = r.d, u = r.e, i = r.f;
  function $(c) {
    return o(rn, $, Oe(function(v) {
      var l = v.a;
      return v.$ === 0 ? _(a, t, l, c) : u && i ? Y(e, t, l.i, l.j, c) : _(e, t, u ? l.i : l.j, c);
    }));
  }
  return t.h = Sr(o(rn, $, r.b));
}
var ze = f(function(r, n) {
  return I(function(t) {
    r.g(n), t(cr(_r));
  });
}), Ge = f(function(r, n) {
  return o(Ce, r.h, { $: 0, a: n });
});
function xn(r) {
  return function(n) {
    return { $: 1, k: r, l: n };
  };
}
function rt(r) {
  return { $: 2, m: r };
}
f(function(r, n) {
  return { $: 3, n: r, o: n };
});
var Bn = [], Kr = false;
function Tn(r, n, t) {
  if (Bn.push({ p: r, q: n, r: t }), !Kr) {
    Kr = true;
    for (var e; e = Bn.shift(); ) Ye(e.p, e.q, e.r);
    Kr = false;
  }
}
function Ye(r, n, t) {
  var e = {};
  Br(true, n, e, null), Br(false, t, e, null);
  for (var a in r) yn(r[a], { $: "fx", a: e[a] || { i: A, j: A } });
}
function Br(r, n, t, e) {
  switch (n.$) {
    case 1:
      var a = n.k, u = Qe(r, a, e, n.l);
      t[a] = Ze(r, u, t[a]);
      return;
    case 2:
      for (var i = n.m; i.b; i = i.b) Br(r, i.a, t, e);
      return;
    case 3:
      Br(r, n.o, t, { s: n.n, t: e });
      return;
  }
}
function Qe(r, n, t, e) {
  function a(i) {
    for (var $ = t; $; $ = $.t) i = $.s(i);
    return i;
  }
  var u = r ? pr[n].e : pr[n].f;
  return o(u, a, e);
}
function Ze(r, n, t) {
  return t = t || { i: A, j: A }, r ? t.i = Q(n, t.i) : t.j = Q(n, t.j), t;
}
f(function(r, n) {
  return n;
});
f(function(r, n) {
  return function(t) {
    return r(n(t));
  };
});
var Tr, $r = typeof document < "u" ? document : {};
function sn(r, n) {
  r.appendChild(n);
}
V(function(r, n, t, e) {
  var a = e.node;
  return a.parentNode.replaceChild(nr(r, function() {
  }), a), {};
});
function nn(r) {
  return { $: 0, a: r };
}
var Xe = f(function(r, n) {
  return f(function(t, e) {
    for (var a = [], u = 0; e.b; e = e.b) {
      var i = e.a;
      u += i.b || 0, a.push(i);
    }
    return u += a.length, { $: 1, c: n, d: tt(t), e: a, f: r, b: u };
  });
}), Z = Xe(void 0), ke = f(function(r, n) {
  return f(function(t, e) {
    for (var a = [], u = 0; e.b; e = e.b) {
      var i = e.a;
      u += i.b.b || 0, a.push(i);
    }
    return u += a.length, { $: 2, c: n, d: tt(t), e: a, f: r, b: u };
  });
});
ke(void 0);
f(function(r, n) {
  return { $: 4, j: r, k: n, b: 1 + (n.b || 0) };
});
function ir(r, n) {
  return { $: 5, l: r, m: n, k: void 0 };
}
f(function(r, n) {
  return ir([r, n], function() {
    return r(n);
  });
});
g(function(r, n, t) {
  return ir([r, n, t], function() {
    return o(r, n, t);
  });
});
V(function(r, n, t, e) {
  return ir([r, n, t, e], function() {
    return _(r, n, t, e);
  });
});
fr(function(r, n, t, e, a) {
  return ir([r, n, t, e, a], function() {
    return Y(r, n, t, e, a);
  });
});
Or(function(r, n, t, e, a, u) {
  return ir([r, n, t, e, a, u], function() {
    return b(r, n, t, e, a, u);
  });
});
Lr(function(r, n, t, e, a, u, i) {
  return ir([r, n, t, e, a, u, i], function() {
    return Nr(r, n, t, e, a, u, i);
  });
});
Zn(function(r, n, t, e, a, u, i, $) {
  return ir([r, n, t, e, a, u, i, $], function() {
    return kn(r, n, t, e, a, u, i, $);
  });
});
Xn(function(r, n, t, e, a, u, i, $, c) {
  return ir([r, n, t, e, a, u, i, $, c], function() {
    return Kt(r, n, t, e, a, u, i, $, c);
  });
});
var nt = f(function(r, n) {
  return { $: "a0", n: r, o: n };
}), Ke = f(function(r, n) {
  return { $: "a1", n: r, o: n };
}), ye = f(function(r, n) {
  return { $: "a2", n: r, o: n };
}), Ne = f(function(r, n) {
  return { $: "a3", n: r, o: n };
});
g(function(r, n, t) {
  return { $: "a4", n, o: { f: r, o: t } };
});
var xe = /^\s*j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t\s*:/i, ra = /^\s*(j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t\s*:|d\s*a\s*t\s*a\s*:\s*t\s*e\s*x\s*t\s*\/\s*h\s*t\s*m\s*l\s*(,|;))/i;
function na(r) {
  return xe.test(r) ? "" : r;
}
function ta(r) {
  return ra.test(r) ? "" : r;
}
f(function(r, n) {
  return n.$ === "a0" ? o(nt, n.n, ea(r, n.o)) : n;
});
function ea(r, n) {
  var t = gn(n);
  return { $: n.$, a: t ? _(eu, t < 3 ? aa : ua, hr(r), n.a) : o(q, r, n.a) };
}
var aa = f(function(r, n) {
  return H(r(n.a), n.b);
}), ua = f(function(r, n) {
  return { p: r(n.p), ae: n.ae, ab: n.ab };
});
function tt(r) {
  for (var n = {}; r.b; r = r.b) {
    var t = r.a, e = t.$, a = t.n, u = t.o;
    if (e === "a2") {
      a === "className" ? Pn(n, a, u) : n[a] = u;
      continue;
    }
    var i = n[e] || (n[e] = {});
    e === "a3" && a === "class" ? Pn(i, a, u) : i[a] = u;
  }
  return n;
}
function Pn(r, n, t) {
  var e = r[n];
  r[n] = e ? e + " " + t : t;
}
function nr(r, n) {
  var t = r.$;
  if (t === 5) return nr(r.k || (r.k = r.m()), n);
  if (t === 0) return $r.createTextNode(r.a);
  if (t === 4) {
    for (var e = r.k, a = r.j; e.$ === 4; ) typeof a != "object" ? a = [a, e.j] : a.push(e.j), e = e.k;
    var u = { j: a, p: n }, i = nr(e, u);
    return i.elm_event_node_ref = u, i;
  }
  if (t === 3) {
    var i = r.h(r.g);
    return tn(i, n, r.d), i;
  }
  var i = r.f ? $r.createElementNS(r.f, r.c) : $r.createElement(r.c);
  Tr && r.c == "a" && i.addEventListener("click", Tr(i)), tn(i, n, r.d);
  for (var $ = r.e, c = 0; c < $.length; c++) sn(i, nr(t === 1 ? $[c] : $[c].b, n));
  return i;
}
function tn(r, n, t) {
  for (var e in t) {
    var a = t[e];
    e === "a1" ? ia(r, a) : e === "a0" ? fa(r, n, a) : e === "a3" ? oa(r, a) : e === "a4" ? $a(r, a) : (e !== "value" && e !== "checked" || r[e] !== a) && (r[e] = a);
  }
}
function ia(r, n) {
  var t = r.style;
  for (var e in n) t[e] = n[e];
}
function oa(r, n) {
  for (var t in n) {
    var e = n[t];
    typeof e < "u" ? r.setAttribute(t, e) : r.removeAttribute(t);
  }
}
function $a(r, n) {
  for (var t in n) {
    var e = n[t], a = e.f, u = e.o;
    typeof u < "u" ? r.setAttributeNS(a, t, u) : r.removeAttributeNS(a, t);
  }
}
function fa(r, n, t) {
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
    i = ca(n, u), r.addEventListener(a, i, mn && { passive: gn(u) < 2 }), e[a] = i;
  }
}
var mn;
try {
  window.addEventListener("t", null, Object.defineProperty({}, "passive", { get: function() {
    mn = true;
  } }));
} catch {
}
function ca(r, n) {
  function t(e) {
    var a = t.q, u = M(a.a, e);
    if (z(u)) {
      for (var i = gn(a), $ = u.a, c = i ? i < 3 ? $.a : $.p : $, v = i == 1 ? $.b : i == 3 && $.ae, l = (v && e.stopPropagation(), (i == 2 ? $.b : i == 3 && $.ab) && e.preventDefault(), r), p, s; p = l.j; ) {
        if (typeof p == "function") c = p(c);
        else for (var s = p.length; s--; ) c = p[s](c);
        l = l.p;
      }
      l(c, v);
    }
  }
  return t.q = n, t;
}
function va(r, n) {
  return r.$ == n.$ && sr(r.a, n.a);
}
function et(r, n) {
  var t = [];
  return O(r, n, t, 0), t;
}
function F(r, n, t, e) {
  var a = { $: n, r: t, s: e, t: void 0, u: void 0 };
  return r.push(a), a;
}
function O(r, n, t, e) {
  if (r !== n) {
    var a = r.$, u = n.$;
    if (a !== u) if (a === 1 && u === 2) n = ga(n), u = 1;
    else {
      F(t, 0, e, n);
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
        O(r.k, n.k, l, 0), l.length > 0 && F(t, 1, e, l);
        return;
      case 4:
        for (var p = r.j, s = n.j, m = false, d = r.k; d.$ === 4; ) m = true, typeof p != "object" ? p = [p, d.j] : p.push(d.j), d = d.k;
        for (var S = n.k; S.$ === 4; ) m = true, typeof s != "object" ? s = [s, S.j] : s.push(S.j), S = S.k;
        if (m && p.length !== s.length) {
          F(t, 0, e, n);
          return;
        }
        (m ? !la(p, s) : p !== s) && F(t, 2, e, s), O(d, S, t, e + 1);
        return;
      case 0:
        r.a !== n.a && F(t, 3, e, n.a);
        return;
      case 1:
        Mn(r, n, t, e, sa);
        return;
      case 2:
        Mn(r, n, t, e, ma);
        return;
      case 3:
        if (r.h !== n.h) {
          F(t, 0, e, n);
          return;
        }
        var j = pn(r.d, n.d);
        j && F(t, 4, e, j);
        var E = n.i(r.g, n.g);
        E && F(t, 5, e, E);
        return;
    }
  }
}
function la(r, n) {
  for (var t = 0; t < r.length; t++) if (r[t] !== n[t]) return false;
  return true;
}
function Mn(r, n, t, e, a) {
  if (r.c !== n.c || r.f !== n.f) {
    F(t, 0, e, n);
    return;
  }
  var u = pn(r.d, n.d);
  u && F(t, 4, e, u), a(r, n, t, e);
}
function pn(r, n, t) {
  var e;
  for (var a in r) {
    if (a === "a1" || a === "a0" || a === "a3" || a === "a4") {
      var u = pn(r[a], n[a] || {}, a);
      u && (e = e || {}, e[a] = u);
      continue;
    }
    if (!(a in n)) {
      e = e || {}, e[a] = t ? t === "a1" ? "" : t === "a0" || t === "a3" ? void 0 : { f: r[a].f, o: void 0 } : typeof r[a] == "string" ? "" : null;
      continue;
    }
    var i = r[a], $ = n[a];
    i === $ && a !== "value" && a !== "checked" || t === "a0" && va(i, $) || (e = e || {}, e[a] = $);
  }
  for (var c in n) c in r || (e = e || {}, e[c] = n[c]);
  return e;
}
function sa(r, n, t, e) {
  var a = r.e, u = n.e, i = a.length, $ = u.length;
  i > $ ? F(t, 6, e, { v: $, i: i - $ }) : i < $ && F(t, 7, e, { v: i, e: u });
  for (var c = i < $ ? i : $, v = 0; v < c; v++) {
    var l = a[v];
    O(l, u[v], t, ++e), e += l.b || 0;
  }
}
function ma(r, n, t, e) {
  for (var a = [], u = {}, i = [], $ = r.e, c = n.e, v = $.length, l = c.length, p = 0, s = 0, m = e; p < v && s < l; ) {
    var d = $[p], S = c[s], j = d.a, E = S.a, D = d.b, B = S.b, X = void 0, Yr = void 0;
    if (j === E) {
      m++, O(D, B, a, m), m += D.b || 0, p++, s++;
      continue;
    }
    var jr = $[p + 1], Qr = c[s + 1];
    if (jr) {
      var jn = jr.a, vr = jr.b;
      Yr = E === jn;
    }
    if (Qr) {
      var En = Qr.a, Zr = Qr.b;
      X = j === En;
    }
    if (X && Yr) {
      m++, O(D, Zr, a, m), gr(u, a, j, B, s, i), m += D.b || 0, m++, dr(u, a, j, vr, m), m += vr.b || 0, p += 2, s += 2;
      continue;
    }
    if (X) {
      m++, gr(u, a, E, B, s, i), O(D, Zr, a, m), m += D.b || 0, p += 1, s += 2;
      continue;
    }
    if (Yr) {
      m++, dr(u, a, j, D, m), m += D.b || 0, m++, O(vr, B, a, m), m += vr.b || 0, p += 2, s += 1;
      continue;
    }
    if (jr && jn === En) {
      m++, dr(u, a, j, D, m), gr(u, a, E, B, s, i), m += D.b || 0, m++, O(vr, Zr, a, m), m += vr.b || 0, p += 2, s += 2;
      continue;
    }
    break;
  }
  for (; p < v; ) {
    m++;
    var d = $[p], D = d.b;
    dr(u, a, d.a, D, m), m += D.b || 0, p++;
  }
  for (; s < l; ) {
    var Er = Er || [], S = c[s];
    gr(u, a, S.a, S.b, void 0, Er), s++;
  }
  (a.length > 0 || i.length > 0 || Er) && F(t, 8, e, { w: a, x: i, y: Er });
}
var at = "_elmW6BL";
function gr(r, n, t, e, a, u) {
  var i = r[t];
  if (!i) {
    i = { c: 0, z: e, r: a, s: void 0 }, u.push({ r: a, A: i }), r[t] = i;
    return;
  }
  if (i.c === 1) {
    u.push({ r: a, A: i }), i.c = 2;
    var $ = [];
    O(i.z, e, $, i.r), i.r = a, i.s.s = { w: $, A: i };
    return;
  }
  gr(r, n, t + at, e, a, u);
}
function dr(r, n, t, e, a) {
  var u = r[t];
  if (!u) {
    var i = F(n, 9, a, void 0);
    r[t] = { c: 1, z: e, r: a, s: i };
    return;
  }
  if (u.c === 0) {
    u.c = 2;
    var $ = [];
    O(e, u.z, $, a), F(n, 9, a, { w: $, A: u });
    return;
  }
  dr(r, n, t + at, e, a);
}
function ut(r, n, t, e) {
  wr(r, n, t, 0, 0, n.b, e);
}
function wr(r, n, t, e, a, u, i) {
  for (var $ = t[e], c = $.r; c === a; ) {
    var v = $.$;
    if (v === 1) ut(r, n.k, $.s, i);
    else if (v === 8) {
      $.t = r, $.u = i;
      var l = $.s.w;
      l.length > 0 && wr(r, n, l, 0, a, u, i);
    } else if (v === 9) {
      $.t = r, $.u = i;
      var p = $.s;
      if (p) {
        p.A.s = r;
        var l = p.w;
        l.length > 0 && wr(r, n, l, 0, a, u, i);
      }
    } else $.t = r, $.u = i;
    if (e++, !($ = t[e]) || (c = $.r) > u) return e;
  }
  var s = n.$;
  if (s === 4) {
    for (var m = n.k; m.$ === 4; ) m = m.k;
    return wr(r, m, t, e, a + 1, u, r.elm_event_node_ref);
  }
  for (var d = n.e, S = r.childNodes, j = 0; j < d.length; j++) {
    a++;
    var E = s === 1 ? d[j] : d[j].b, D = a + (E.b || 0);
    if (a <= c && c <= D && (e = wr(S[j], E, t, e, a, D, i), !($ = t[e]) || (c = $.r) > u)) return e;
    a = D;
  }
  return e;
}
function it(r, n, t, e) {
  return t.length === 0 ? r : (ut(r, n, t, e), Pr(r, t));
}
function Pr(r, n) {
  for (var t = 0; t < n.length; t++) {
    var e = n[t], a = e.t, u = pa(a, e);
    a === r && (r = u);
  }
  return r;
}
function pa(r, n) {
  switch (n.$) {
    case 0:
      return ba(r, n.s, n.u);
    case 4:
      return tn(r, n.u, n.s), r;
    case 3:
      return r.replaceData(0, r.length, n.s), r;
    case 1:
      return Pr(r, n.s);
    case 2:
      return r.elm_event_node_ref ? r.elm_event_node_ref.j = n.s : r.elm_event_node_ref = { j: n.s, p: n.u }, r;
    case 6:
      for (var u = n.s, e = 0; e < u.i; e++) r.removeChild(r.childNodes[u.v]);
      return r;
    case 7:
      for (var u = n.s, t = u.e, e = u.v, a = r.childNodes[e]; e < t.length; e++) r.insertBefore(nr(t[e], n.u), a);
      return r;
    case 9:
      var u = n.s;
      if (!u) return r.parentNode.removeChild(r), r;
      var i = u.A;
      return typeof i.r < "u" && r.parentNode.removeChild(r), i.s = Pr(r, u.w), r;
    case 8:
      return _a(r, n);
    case 5:
      return n.s(r);
    default:
      Ur(10);
  }
}
function ba(r, n, t) {
  var e = r.parentNode, a = nr(n, t);
  return a.elm_event_node_ref || (a.elm_event_node_ref = r.elm_event_node_ref), e && a !== r && e.replaceChild(a, r), a;
}
function _a(r, n) {
  var t = n.s, e = ha(t.y, n);
  r = Pr(r, t.w);
  for (var a = t.x, u = 0; u < a.length; u++) {
    var i = a[u], $ = i.A, c = $.c === 2 ? $.s : nr($.z, n.u);
    r.insertBefore(c, r.childNodes[i.r]);
  }
  return e && sn(r, e), r;
}
function ha(r, n) {
  if (r) {
    for (var t = $r.createDocumentFragment(), e = 0; e < r.length; e++) {
      var a = r[e], u = a.A;
      sn(t, u.c === 2 ? u.s : nr(u.z, n.u));
    }
    return t;
  }
}
function bn(r) {
  if (r.nodeType === 3) return nn(r.textContent);
  if (r.nodeType !== 1) return nn("");
  for (var n = A, t = r.attributes, e = t.length; e--; ) {
    var a = t[e], u = a.name, i = a.value;
    n = Q(o(Ne, u, i), n);
  }
  for (var $ = r.tagName.toLowerCase(), c = A, v = r.childNodes, e = v.length; e--; ) c = Q(bn(v[e]), c);
  return _(Z, $, n, c);
}
function ga(r) {
  for (var n = r.e, t = n.length, e = new Array(t), a = 0; a < t; a++) e[a] = n[a].b;
  return { $: 1, c: r.c, d: r.d, e, f: r.f, b: r.b };
}
var da = V(function(r, n, t, e) {
  return ln(n, e, r.a$, r.bc, r.a9, function(a, u) {
    var i = r.be, $ = e.node, c = bn($);
    return ot(u, function(v) {
      var l = i(v), p = et(c, l);
      $ = it($, c, p, a), c = l;
    });
  });
});
V(function(r, n, t, e) {
  return ln(n, e, r.a$, r.bc, r.a9, function(a, u) {
    var i = r.ac && r.ac(a), $ = r.be, c = $r.title, v = $r.body, l = bn(v);
    return ot(u, function(p) {
      Tr = i;
      var s = $(p), m = Z("body")(A)(s.K), d = et(l, m);
      v = it(v, l, d, a), l = m, Tr = 0, c !== s.Z && ($r.title = c = s.Z);
    });
  });
});
var Mr = typeof requestAnimationFrame < "u" ? requestAnimationFrame : function(r) {
  return setTimeout(r, 1e3 / 60);
};
function ot(r, n) {
  n(r);
  var t = 0;
  function e() {
    t = t === 1 ? 0 : (Mr(e), n(r), 1);
  }
  return function(a, u) {
    r = a, u ? (n(r), t === 2 && (t = 1)) : (t === 0 && Mr(e), t = 2);
  };
}
f(function(r, n) {
  return o(Sn, dn, I(function() {
    n && history.go(n), r();
  }));
});
f(function(r, n) {
  return o(Sn, dn, I(function() {
    history.pushState({}, "", n), r();
  }));
});
f(function(r, n) {
  return o(Sn, dn, I(function() {
    history.replaceState({}, "", n), r();
  }));
});
var wa = { addEventListener: function() {
}, removeEventListener: function() {
} }, Da = typeof window < "u" ? window : wa;
g(function(r, n, t) {
  return cn(I(function(e) {
    function a(u) {
      Sr(t(u));
    }
    return r.addEventListener(n, a, mn && { passive: true }), function() {
      r.removeEventListener(n, a);
    };
  }));
});
f(function(r, n) {
  var t = M(r, n);
  return z(t) ? U(t.a) : J;
});
function $t(r, n) {
  return I(function(t) {
    Mr(function() {
      var e = document.getElementById(r);
      t(e ? cr(n(e)) : Ve(au(r)));
    });
  });
}
function Aa(r) {
  return I(function(n) {
    Mr(function() {
      n(cr(r()));
    });
  });
}
f(function(r, n) {
  return $t(n, function(t) {
    return t[r](), _r;
  });
});
f(function(r, n) {
  return Aa(function() {
    return Da.scroll(r, n), _r;
  });
});
g(function(r, n, t) {
  return $t(r, function(e) {
    return e.scrollLeft = n, e.scrollTop = t, _r;
  });
});
var Sa = g(function(r, n, t) {
  return I(function(e) {
    function a(i) {
      e(n(t.aW.a(i)));
    }
    var u = new XMLHttpRequest();
    u.addEventListener("error", function() {
      a(Ju);
    }), u.addEventListener("timeout", function() {
      a(Bu);
    }), u.addEventListener("load", function() {
      a(Ea(t.aW.b, u));
    }), Bt(t.bb) && Ta(r, u, t.bb.a);
    try {
      u.open(t.a0, t.bd, true);
    } catch {
      return a(Eu(t.bd));
    }
    return ja(u, t), t.K.a && u.setRequestHeader("Content-Type", t.K.a), u.send(t.K.b), function() {
      u.c = true, u.abort();
    };
  });
});
function ja(r, n) {
  for (var t = n.aY; t.b; t = t.b) r.setRequestHeader(t.a.a, t.a.b);
  r.timeout = n.ba.a || 0, r.responseType = n.aW.d, r.withCredentials = n.aR;
}
function Ea(r, n) {
  return o(200 <= n.status && n.status < 300 ? Hu : ju, Ha(n), r(n.response));
}
function Ha(r) {
  return { bd: r.responseURL, a7: r.status, a8: r.statusText, aY: Ja(r.getAllResponseHeaders()) };
}
function Ja(r) {
  if (!r) return on;
  for (var n = on, t = r.split(`\r
`), e = t.length; e--; ) {
    var a = t[e], u = a.indexOf(": ");
    if (u > 0) {
      var i = a.substring(0, u), $ = a.substring(u + 2);
      n = _(Vu, i, function(c) {
        return U(Bt(c) ? $ + ", " + c.a : $);
      }, n);
    }
  }
  return n;
}
var Ra = g(function(r, n, t) {
  return { $: 0, d: r, b: n, a: t };
}), Fa = f(function(r, n) {
  return { $: 0, d: n.d, b: n.b, a: function(t) {
    return r(n.a(t));
  } };
}), Ba = f(function(r, n) {
  return { $: 0, a: r, b: n };
});
f(function(r, n) {
  return new Blob([n], { type: r });
});
function Ta(r, n, t) {
  n.upload.addEventListener("progress", function(e) {
    n.c || Sr(o(qn, r, H(t, Fu({ a6: e.loaded, aJ: e.total }))));
  }), n.addEventListener("progress", function(e) {
    n.c || Sr(o(qn, r, H(t, Ru({ a4: e.loaded, aJ: e.lengthComputable ? U(e.total) : J }))));
  });
}
var ft = 1, Pa = 2, ct = 0, L = xt, vt = g(function(r, n, t) {
  r: for (; ; ) {
    if (t.$ === -2) return n;
    var e = t.b, a = t.c, u = t.d, i = t.e, $ = r, c = _(r, e, a, _(vt, r, n, i)), v = u;
    r = $, n = c, t = v;
    continue r;
  }
}), Vn = function(r) {
  return _(vt, g(function(n, t, e) {
    return o(L, H(n, t), e);
  }), A, r);
}, Jr = ue;
g(function(r, n, t) {
  var e = t.c, a = t.d, u = f(function(i, $) {
    if (i.$) {
      var v = i.a;
      return _(Jr, r, $, v);
    } else {
      var c = i.a;
      return _(Jr, u, $, c);
    }
  });
  return _(Jr, u, _(Jr, r, n, a), e);
});
var T = function(r) {
  return { $: 1, a: r };
}, _n = f(function(r, n) {
  return { $: 3, a: r, b: n };
}), On = f(function(r, n) {
  return { $: 0, a: r, b: n };
}), lt = f(function(r, n) {
  return { $: 1, a: r, b: n };
}), G = function(r) {
  return { $: 0, a: r };
}, Ma = function(r) {
  return { $: 2, a: r };
}, U = function(r) {
  return { $: 0, a: r };
}, J = { $: 1 }, Va = me, st = Be, Vr = _e, Dr = f(function(r, n) {
  return o(le, r, fn(n));
}), Oa = f(function(r, n) {
  return w(o(ve, r, n));
}), mt = function(r) {
  return o(Dr, `
    `, o(Oa, `
`, r));
}, Ir = g(function(r, n, t) {
  r: for (; ; ) if (t.b) {
    var e = t.a, a = t.b, u = r, i = o(r, e, n), $ = a;
    r = u, n = i, t = $;
    continue r;
  } else return n;
}), pt = function(r) {
  return _(Ir, f(function(n, t) {
    return t + 1;
  }), 0, r);
}, La = re, Ca = g(function(r, n, t) {
  r: for (; ; ) if (P(r, n) < 1) {
    var e = r, a = n - 1, u = o(L, n, t);
    r = e, n = a, t = u;
    continue r;
  } else return t;
}), Ua = f(function(r, n) {
  return _(Ca, r, n, A);
}), Ia = f(function(r, n) {
  return _(La, r, o(Ua, 0, pt(n) - 1), n);
}), hn = ge, bt = function(r) {
  var n = hn(r);
  return 97 <= n && n <= 122;
}, _t = function(r) {
  var n = hn(r);
  return n <= 90 && 65 <= n;
}, Wa = function(r) {
  return bt(r) || _t(r);
}, qa = function(r) {
  var n = hn(r);
  return n <= 57 && 48 <= n;
}, za = function(r) {
  return bt(r) || _t(r) || qa(r);
}, tr = function(r) {
  return _(Ir, L, A, r);
}, Ga = fe, Ya = f(function(r, n) {
  return `

(` + (Vr(r + 1) + (") " + mt(ht(n))));
}), ht = function(r) {
  return o(Qa, r, A);
}, Qa = f(function(r, n) {
  r: for (; ; ) switch (r.$) {
    case 0:
      var t = r.a, i = r.b, e = (function() {
        var S = Ga(t);
        if (S.$ === 1) return false;
        var j = S.a, E = j.a, D = j.b;
        return Wa(E) && o(Va, za, D);
      })(), a = e ? "." + t : "['" + (t + "']"), c = i, v = o(L, a, n);
      r = c, n = v;
      continue r;
    case 1:
      var u = r.a, i = r.b, $ = "[" + (Vr(u) + "]"), c = i, v = o(L, $, n);
      r = c, n = v;
      continue r;
    case 2:
      var l = r.a;
      if (l.b) if (l.b.b) {
        var p = (function() {
          return n.b ? "The Json.Decode.oneOf at json" + o(Dr, "", tr(n)) : "Json.Decode.oneOf";
        })(), d = p + (" failed in the following " + (Vr(pt(l)) + " ways:"));
        return o(Dr, `

`, o(L, d, o(Ia, Ya, l)));
      } else {
        var i = l.a, c = i, v = n;
        r = c, n = v;
        continue r;
      }
      else return "Ran into a Json.Decode.oneOf with no possibilities" + (function() {
        return n.b ? " at json" + o(Dr, "", tr(n)) : "!";
      })();
    default:
      var s = r.a, m = r.b, d = (function() {
        return n.b ? "Problem with the value at json" + (o(Dr, "", tr(n)) + `:

    `) : `Problem with the given value:

`;
      })();
      return d + (mt(o(st, 4, m)) + (`

` + s));
  }
}), C = 32, en = V(function(r, n, t, e) {
  return { $: 0, a: r, b: n, c: t, d: e };
}), an = ne, gt = oe, dt = f(function(r, n) {
  return Hn(n) / Hn(r);
}), un = gt(o(dt, 2, C)), Za = Y(en, 0, un, an, an), wt = ee, Xa = function(r) {
  return { $: 1, a: r };
};
f(function(r, n) {
  return r(n);
});
f(function(r, n) {
  return n(r);
});
var ka = $e, Ln = te, Ka = f(function(r, n) {
  return P(r, n) > 0 ? r : n;
}), ya = function(r) {
  return { $: 0, a: r };
}, Dt = ae, Na = f(function(r, n) {
  r: for (; ; ) {
    var t = o(Dt, C, r), e = t.a, a = t.b, u = o(L, ya(e), n);
    if (a.b) {
      var i = a, $ = u;
      r = i, n = $;
      continue r;
    } else return tr(u);
  }
}), xa = f(function(r, n) {
  r: for (; ; ) {
    var t = gt(n / C);
    if (t === 1) return o(Dt, C, r).a;
    var e = o(Na, r, A), a = t;
    r = e, n = a;
    continue r;
  }
}), ru = f(function(r, n) {
  if (n.a) {
    var t = n.a * C, e = ka(o(dt, C, t - 1)), a = r ? tr(n.d) : n.d, u = o(xa, a, n.a);
    return Y(en, Ln(n.c) + t, o(Ka, 5, e * un), u, n.c);
  } else return Y(en, Ln(n.c), un, an, n.c);
}), nu = fr(function(r, n, t, e, a) {
  r: for (; ; ) {
    if (n < 0) return o(ru, false, { d: e, a: t / C | 0, c: a });
    var u = Xa(_(wt, C, n, r)), i = r, $ = n - C, c = t, v = o(L, u, e), l = a;
    r = i, n = $, t = c, e = v, a = l;
    continue r;
  }
}), tu = f(function(r, n) {
  if (r <= 0) return Za;
  var t = r % C, e = _(wt, t, r - t, n), a = r - t - C;
  return b(nu, n, a, r, A, e);
}), z = function(r) {
  return !r.$;
}, q = Ee, eu = He, hr = de, gn = function(r) {
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
}, At = function(r) {
  return r;
}, au = At, Cn = Or(function(r, n, t, e, a, u) {
  return { al: u, y: n, at: e, av: t, ay: r, az: a };
}), uu = pe, iu = ce, St = se, Wr = f(function(r, n) {
  return r < 1 ? n : _(St, r, iu(n), n);
}), qr = be, zr = function(r) {
  return r === "";
}, Gr = f(function(r, n) {
  return r < 1 ? "" : _(St, 0, r, n);
}), ou = he, Un = fr(function(r, n, t, e, a) {
  if (zr(a) || o(uu, "@", a)) return J;
  var u = o(qr, ":", a);
  if (u.b) {
    if (u.b.b) return J;
    var i = u.a, $ = ou(o(Wr, i + 1, a));
    if ($.$ === 1) return J;
    var c = $;
    return U(Nr(Cn, r, o(Gr, i, a), c, n, t, e));
  } else return U(Nr(Cn, r, a, J, n, t, e));
}), In = V(function(r, n, t, e) {
  if (zr(e)) return J;
  var a = o(qr, "/", e);
  if (a.b) {
    var u = a.a;
    return b(Un, r, o(Wr, u, e), n, t, o(Gr, u, e));
  } else return b(Un, r, "/", n, t, e);
}), Wn = g(function(r, n, t) {
  if (zr(t)) return J;
  var e = o(qr, "?", t);
  if (e.b) {
    var a = e.a;
    return Y(In, r, U(o(Wr, a + 1, t)), n, o(Gr, a, t));
  } else return Y(In, r, J, n, t);
});
f(function(r, n) {
  if (zr(n)) return J;
  var t = o(qr, "#", n);
  if (t.b) {
    var e = t.a;
    return _(Wn, r, U(o(Wr, e + 1, n)), o(Gr, e, n));
  } else return _(Wn, r, J, n);
});
var dn = function(r) {
}, x = cr, $u = x(0), jt = V(function(r, n, t, e) {
  if (e.b) {
    var a = e.a, u = e.b;
    if (u.b) {
      var i = u.a, $ = u.b;
      if ($.b) {
        var c = $.a, v = $.b;
        if (v.b) {
          var l = v.a, p = v.b, s = t > 500 ? _(Ir, r, n, tr(p)) : Y(jt, r, n, t + 1, p);
          return o(r, a, o(r, i, o(r, c, o(r, l, s))));
        } else return o(r, a, o(r, i, o(r, c, n)));
      } else return o(r, a, o(r, i, n));
    } else return o(r, a, n);
  } else return n;
}), wn = g(function(r, n, t) {
  return Y(jt, r, n, 0, t);
}), Et = f(function(r, n) {
  return _(wn, f(function(t, e) {
    return o(L, r(t), e);
  }), A, n);
}), er = rn, Dn = f(function(r, n) {
  return o(er, function(t) {
    return x(r(t));
  }, n);
}), fu = g(function(r, n, t) {
  return o(er, function(e) {
    return o(er, function(a) {
      return x(o(r, e, a));
    }, t);
  }, n);
}), Ht = function(r) {
  return _(wn, fu(L), x(A), r);
}, An = ze, cu = f(function(r, n) {
  var t = n;
  return cn(o(er, An(r), t));
}), vu = g(function(r, n, t) {
  return o(Dn, function(e) {
    return 0;
  }, Ht(o(Et, cu(r), n)));
}), lu = g(function(r, n, t) {
  return x(0);
}), su = f(function(r, n) {
  var t = n;
  return o(Dn, r, t);
});
pr.Task = Nn($u, vu, lu, su);
var mu = xn("Task"), Sn = f(function(r, n) {
  return mu(o(Dn, r, n));
}), pu = da, Jt = { $: 0 }, bu = function(r) {
  return { $: 1, a: r };
}, Rt = function(r) {
  return _(Ir, f(function(n, t) {
    var e = n.a, a = n.b;
    return _(Me, e, a, t);
  }), Pe(), r);
}, rr = Te, _u = function(r) {
  return Rt(w([H("host", rr(r.y))]));
}, hu = function(r) {
  return { ao: r };
}, k = je, K = Se, gu = Ae, du = Lr(function(r, n, t, e, a, u, i) {
  return { P: a, z: r, R: e, T: t, U: u, Y: i, Z: n };
}), wu = we, lr = De, Ft = o(k, function(r) {
  return o(q, r, o(K, "timestamp", wu));
}, o(k, function(r) {
  return o(q, r, o(K, "owner_comment", lr));
}, o(k, function(r) {
  return o(q, r, o(K, "extract", lr));
}, o(k, function(r) {
  return o(q, r, o(K, "image", lr));
}, o(k, function(r) {
  return o(q, r, o(K, "link", lr));
}, o(k, function(r) {
  return o(q, r, o(K, "title", lr));
}, o(k, function(r) {
  return o(q, r, o(K, "id", lr));
}, hr(du)))))))), Du = o(k, function(r) {
  return o(q, r, o(K, "items", gu(Ft)));
}, hr(hu)), Au = function(r) {
  return { K: _u(r), N: Du, O: "GetFeed" };
}, Su = Je, ju = f(function(r, n) {
  return { $: 3, a: r, b: n };
}), Eu = function(r) {
  return { $: 0, a: r };
}, Hu = f(function(r, n) {
  return { $: 4, a: r, b: n };
}), Ju = { $: 2 }, Ru = function(r) {
  return { $: 1, a: r };
}, Fu = function(r) {
  return { $: 0, a: r };
}, Bu = { $: 1 }, N = { $: -2 }, on = N, Bt = function(r) {
  return !r.$;
}, qn = Ge, Tt = yt, Pt = f(function(r, n) {
  r: for (; ; ) {
    if (n.$ === -2) return J;
    var t = n.b, e = n.c, a = n.d, u = n.e, i = o(Tt, r, t);
    switch (i) {
      case 0:
        var $ = r, c = a;
        r = $, n = c;
        continue r;
      case 1:
        return U(e);
      default:
        var $ = r, c = u;
        r = $, n = c;
        continue r;
    }
  }
}), h = fr(function(r, n, t, e, a) {
  return { $: -1, a: r, b: n, c: t, d: e, e: a };
}), br = fr(function(r, n, t, e, a) {
  if (a.$ === -1 && !a.a) {
    a.a;
    var u = a.b, i = a.c, $ = a.d, c = a.e;
    if (e.$ === -1 && !e.a) {
      e.a;
      var v = e.b, l = e.c, p = e.d, s = e.e;
      return b(h, 0, n, t, b(h, 1, v, l, p, s), b(h, 1, u, i, $, c));
    } else return b(h, r, u, i, b(h, 0, n, t, e, $), c);
  } else if (e.$ === -1 && !e.a && e.d.$ === -1 && !e.d.a) {
    e.a;
    var v = e.b, l = e.c, m = e.d;
    m.a;
    var d = m.b, S = m.c, j = m.d, E = m.e, s = e.e;
    return b(h, 0, v, l, b(h, 1, d, S, j, E), b(h, 1, n, t, s, a));
  } else return b(h, r, n, t, e, a);
}), $n = g(function(r, n, t) {
  if (t.$ === -2) return b(h, 0, r, n, N, N);
  var e = t.a, a = t.b, u = t.c, i = t.d, $ = t.e, c = o(Tt, r, a);
  switch (c) {
    case 0:
      return b(br, e, a, u, _($n, r, n, i), $);
    case 1:
      return b(h, e, a, n, i, $);
    default:
      return b(br, e, a, u, i, _($n, r, n, $));
  }
}), Mt = g(function(r, n, t) {
  var e = _($n, r, n, t);
  if (e.$ === -1 && !e.a) {
    e.a;
    var a = e.b, u = e.c, i = e.d, $ = e.e;
    return b(h, 1, a, u, i, $);
  } else {
    var c = e;
    return c;
  }
}), Tu = function(r) {
  r: for (; ; ) if (r.$ === -1 && r.d.$ === -1) {
    var n = r.d, t = n;
    r = t;
    continue r;
  } else return r;
}, Vt = function(r) {
  if (r.$ === -1 && r.d.$ === -1 && r.e.$ === -1) if (r.e.d.$ === -1 && !r.e.d.a) {
    var n = r.a, t = r.b, e = r.c, a = r.d;
    a.a;
    var u = a.b, i = a.c, $ = a.d, c = a.e, v = r.e;
    v.a;
    var l = v.b, p = v.c, s = v.d;
    s.a;
    var m = s.b, d = s.c, S = s.d, j = s.e, E = v.e;
    return b(h, 0, m, d, b(h, 1, t, e, b(h, 0, u, i, $, c), S), b(h, 1, l, p, j, E));
  } else {
    var n = r.a, t = r.b, e = r.c, D = r.d;
    D.a;
    var u = D.b, i = D.c, $ = D.d, c = D.e, B = r.e;
    B.a;
    var l = B.b, p = B.c, s = B.d, E = B.e;
    return b(h, 1, t, e, b(h, 0, u, i, $, c), b(h, 0, l, p, s, E));
  }
  else return r;
}, zn = function(r) {
  if (r.$ === -1 && r.d.$ === -1 && r.e.$ === -1) if (r.d.d.$ === -1 && !r.d.d.a) {
    var n = r.a, t = r.b, e = r.c, a = r.d;
    a.a;
    var u = a.b, i = a.c, $ = a.d;
    $.a;
    var c = $.b, v = $.c, l = $.d, p = $.e, s = a.e, m = r.e;
    m.a;
    var d = m.b, S = m.c, j = m.d, E = m.e;
    return b(h, 0, u, i, b(h, 1, c, v, l, p), b(h, 1, t, e, s, b(h, 0, d, S, j, E)));
  } else {
    var n = r.a, t = r.b, e = r.c, D = r.d;
    D.a;
    var u = D.b, i = D.c, B = D.d, s = D.e, X = r.e;
    X.a;
    var d = X.b, S = X.c, j = X.d, E = X.e;
    return b(h, 1, t, e, b(h, 0, u, i, B, s), b(h, 0, d, S, j, E));
  }
  else return r;
}, Pu = Lr(function(r, n, t, e, a, u, i) {
  if (u.$ === -1 && !u.a) {
    u.a;
    var $ = u.b, c = u.c, v = u.d, l = u.e;
    return b(h, t, $, c, v, b(h, 0, e, a, l, i));
  } else {
    r: for (; ; ) if (i.$ === -1 && i.a === 1) if (i.d.$ === -1) if (i.d.a === 1) {
      i.a;
      var p = i.d;
      return p.a, zn(n);
    } else break r;
    else return i.a, i.d, zn(n);
    else break r;
    return n;
  }
}), Rr = function(r) {
  if (r.$ === -1 && r.d.$ === -1) {
    var n = r.a, t = r.b, e = r.c, a = r.d, u = a.a, i = a.d, $ = r.e;
    if (u === 1) {
      if (i.$ === -1 && !i.a) return i.a, b(h, n, t, e, Rr(a), $);
      var c = Vt(r);
      if (c.$ === -1) {
        var v = c.a, l = c.b, p = c.c, s = c.d, m = c.e;
        return b(br, v, l, p, Rr(s), m);
      } else return N;
    } else return b(h, n, t, e, Rr(a), $);
  } else return N;
}, Ar = f(function(r, n) {
  if (n.$ === -2) return N;
  var t = n.a, e = n.b, a = n.c, u = n.d, i = n.e;
  if (P(r, e) < 0) if (u.$ === -1 && u.a === 1) {
    u.a;
    var $ = u.d;
    if ($.$ === -1 && !$.a) return $.a, b(h, t, e, a, o(Ar, r, u), i);
    var c = Vt(n);
    if (c.$ === -1) {
      var v = c.a, l = c.b, p = c.c, s = c.d, m = c.e;
      return b(br, v, l, p, o(Ar, r, s), m);
    } else return N;
  } else return b(h, t, e, a, o(Ar, r, u), i);
  else return o(Mu, r, kn(Pu, r, n, t, e, a, u, i));
}), Mu = f(function(r, n) {
  if (n.$ === -1) {
    var t = n.a, e = n.b, a = n.c, u = n.d, i = n.e;
    if (Cr(r, e)) {
      var $ = Tu(i);
      if ($.$ === -1) {
        var c = $.b, v = $.c;
        return b(br, t, c, v, u, Rr(i));
      } else return N;
    } else return b(br, t, e, a, u, o(Ar, r, i));
  } else return N;
}), Ot = f(function(r, n) {
  var t = o(Ar, r, n);
  if (t.$ === -1 && !t.a) {
    t.a;
    var e = t.b, a = t.c, u = t.d, i = t.e;
    return b(h, 1, e, a, u, i);
  } else {
    var $ = t;
    return $;
  }
}), Vu = g(function(r, n, t) {
  var e = n(o(Pt, r, t));
  if (e.$) return o(Ot, r, t);
  var a = e.a;
  return _(Mt, r, a, t);
}), Lt = g(function(r, n, t) {
  return n(r(t));
}), Ou = f(function(r, n) {
  return _(Ra, "", At, o(Lt, n, r));
}), Ct = f(function(r, n) {
  if (n.$) {
    var e = n.a;
    return T(r(e));
  } else {
    var t = n.a;
    return G(t);
  }
}), Lu = function(r) {
  return { $: 4, a: r };
}, Cu = function(r) {
  return { $: 3, a: r };
}, Uu = function(r) {
  return { $: 0, a: r };
}, Iu = { $: 2 }, Wu = { $: 1 }, qu = f(function(r, n) {
  switch (n.$) {
    case 0:
      var t = n.a;
      return T(Uu(t));
    case 1:
      return T(Wu);
    case 2:
      return T(Iu);
    case 3:
      var e = n.a;
      return T(Cu(e.a7));
    default:
      var a = n.b;
      return o(Ct, Lu, r(a));
  }
}), zu = f(function(r, n) {
  return o(Ou, r, qu(function(t) {
    return o(Ct, ht, o(Su, n, t));
  }));
}), Gu = f(function(r, n) {
  return { $: 0, a: r, b: n };
}), Yu = Gu, Qu = function(r) {
  return o(Ba, "application/json", o(st, 0, r));
}, Ut = function(r) {
  return { $: 1, a: r };
}, It = f(function(r, n) {
  return { aB: r, aK: n };
}), Zu = x(o(It, on, A)), Xu = Ue, ku = cn, Fr = g(function(r, n, t) {
  r: for (; ; ) if (n.b) {
    var e = n.a, a = n.b;
    if (e.$) {
      var p = e.a;
      return o(er, function(s) {
        var m = p.bb;
        if (m.$ === 1) return _(Fr, r, a, t);
        var d = m.a;
        return _(Fr, r, a, _(Mt, d, s, t));
      }, ku(_(Sa, r, An(r), p)));
    } else {
      var u = e.a, i = o(Pt, u, t);
      if (i.$ === 1) {
        var $ = r, c = a, v = t;
        r = $, n = c, t = v;
        continue r;
      } else {
        var l = i.a;
        return o(er, function(s) {
          return _(Fr, r, a, o(Ot, u, t));
        }, Xu(l));
      }
    }
  } else return x(t);
}), Ku = V(function(r, n, t, e) {
  return o(er, function(a) {
    return x(o(It, a, t));
  }, _(Fr, r, n, e.aB));
}), yu = g(function(r, n, t) {
  var e = r(n);
  if (e.$) return t;
  var a = e.a;
  return o(L, a, t);
}), Nu = f(function(r, n) {
  return _(wn, yu(r), A, n);
}), xu = V(function(r, n, t, e) {
  var a = e.a, u = e.b;
  return Cr(n, a) ? U(o(An, r, u(t))) : J;
}), ri = g(function(r, n, t) {
  var e = n.a, a = n.b;
  return o(er, function(u) {
    return x(t);
  }, Ht(o(Nu, _(xu, r, e, a), t.aK)));
}), ni = function(r) {
  return { $: 0, a: r };
}, ti = f(function(r, n) {
  if (n.$) {
    var e = n.a;
    return Ut({ aR: e.aR, K: e.K, aW: o(Fa, r, e.aW), aY: e.aY, a0: e.a0, ba: e.ba, bb: e.bb, bd: e.bd });
  } else {
    var t = n.a;
    return ni(t);
  }
}), ei = f(function(r, n) {
  return { $: 0, a: r, b: n };
}), ai = f(function(r, n) {
  var t = n.a, e = n.b;
  return o(ei, t, o(Lt, e, r));
});
pr.Http = Nn(Zu, Ku, ri, ti, ai);
var ui = xn("Http"), ii = function(r) {
  return ui(Ut({ aR: false, K: r.K, aW: r.aW, aY: r.aY, a0: r.a0, ba: r.ba, bb: r.bb, bd: r.bd }));
}, Wt = f(function(r, n) {
  return ii({ K: Qu(n.K), aW: o(zu, r, n.N), aY: w([o(Yu, "X-RPC-Endpoint", n.O)]), a0: "POST", ba: J, bb: J, bd: "/api" });
}), qt = o(Wt, bu, Au({ y: "localhost" })), oi = H(Jt, qt), $i = rt, fi = $i(A), Gn = function(r) {
  return { $: 2, a: r };
}, ci = function(r) {
  return { $: 1, a: r };
}, Yn = function(r) {
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
      return "Bad Status: " + Vr(t);
    default:
      var e = r.a;
      return "Bad Body: " + e;
  }
}, vi = rt, yr = vi(A), li = function(r) {
  return { $: 2, a: r };
}, si = function(r) {
  return Rt(w([H("host", rr(r.y)), H("title", rr(r.Z)), H("link", rr(r.T)), H("image", rr(r.R)), H("extract", rr(r.P)), H("owner_comment", rr(r.U))]));
}, mi = function(r) {
  return { an: r };
}, pi = o(k, function(r) {
  return o(q, r, o(K, "item", Ft));
}, hr(mi)), bi = function(r) {
  return { K: si(r), N: pi, O: "SubmitItem" };
}, _i = o(Wt, li, bi({ P: "This item was submitted via the generated Elm API.", y: "localhost", R: "https://placehold.co/100x100", T: "https://elm-lang.org", U: "So much cleaner!", Z: "New Item from Elm" })), hi = f(function(r, n) {
  switch (r.$) {
    case 0:
      return H(n, _i);
    case 1:
      if (r.a.$) {
        var e = r.a.a;
        return H(Gn("Failed to fetch feed: " + Yn(e)), yr);
      } else {
        var t = r.a.a;
        return H(ci(t.ao), yr);
      }
    default:
      if (r.a.$) {
        var e = r.a.a;
        return H(Gn("Failed to submit item: " + Yn(e)), yr);
      } else {
        var t = r.a.a;
        return H(Jt, qt);
      }
  }
}), gi = { $: 0 }, di = Z("button"), or = Z("div"), wi = Z("h1"), Di = function(r) {
  return { $: 0, a: r };
}, Ai = nt, Si = f(function(r, n) {
  return o(Ai, r, Di(n));
}), ji = function(r) {
  return o(Si, "click", hr(r));
}, Ei = Ke, R = Ei, Hi = nn, y = Hi, zt = Z("h2"), Ji = Z("a"), Gt = f(function(r, n) {
  return o(ye, r, rr(n));
}), Ri = function(r) {
  return o(Gt, "href", na(r));
}, Fi = Z("img"), Bi = Z("p"), Ti = Z("section"), Pi = function(r) {
  return o(Gt, "src", ta(r));
}, Mi = function(r) {
  return o(Ti, w([o(R, "border", "1px solid #ddd"), o(R, "padding", "15px"), o(R, "margin-bottom", "15px"), o(R, "border-radius", "8px")]), w([o(zt, A, w([y(r.Z)])), o(Ji, w([Ri(r.T), o(R, "color", "blue")]), w([y(r.T)])), o(or, w([o(R, "margin", "10px 0")]), w([o(Fi, w([Pi(r.R), o(R, "max-width", "100%"), o(R, "height", "auto")]), A)])), o(Bi, A, w([y(r.P)])), o(or, w([o(R, "background", "#f9f9f9"), o(R, "padding", "10px"), o(R, "font-style", "italic")]), w([y("Owner: " + r.U)]))]));
}, Vi = function(r) {
  switch (r.$) {
    case 0:
      return o(or, A, w([y("Loading Feed...")]));
    case 1:
      var n = r.a;
      return o(or, A, o(Et, Mi, n));
    default:
      var t = r.a;
      return o(or, w([o(R, "color", "red")]), w([o(zt, A, w([y("Error")])), o(or, A, w([y(t)]))]));
  }
}, Oi = function(r) {
  return o(or, w([o(R, "font-family", "sans-serif"), o(R, "max-width", "800px"), o(R, "margin", "0 auto"), o(R, "padding", "20px")]), w([o(wi, A, w([y("Horatio Reader")])), o(di, w([ji(gi), o(R, "margin-bottom", "20px")]), w([y("Test: Submit Item")])), Vi(r)]));
}, Li = pu({ a$: function(r) {
  return oi;
}, a9: function(r) {
  return fi;
}, bc: hi, be: Oi });
const Ci = { Main: { init: Li(hr(0))(0) } };
console.log("Horatio Client v1.0.0 - Ports Debug");
async function Ui() {
  try {
    await Qn(), console.log("WASM module initialized successfully.");
  } catch (n) {
    console.error("Failed to initialize WASM module:", n);
    return;
  }
  const r = Ci.Main.init({ node: document.getElementById("app") });
  console.log("Elm app initialized. Ports:", r.ports), r.ports.log ? r.ports.log.subscribe((n) => {
    console.log("ELM DEBUG PORT:", n);
  }) : console.warn("Elm 'log' port not found."), r.ports.rpcRequest.subscribe(async ({ endpoint: n, body: t, correlationId: e }) => {
    try {
      if (console.log("RPC request received from Elm:", { endpoint: n, body: t, correlationId: e }), n === "GetClassWithStudents" && t.classId === 0) {
        const i = JSON.stringify({ type: "ValidationError", details: { field: "classId", message: "classId cannot be 0 for GetClassWithStudents (JS mock error)" } });
        console.log("Sending JS mock error response:", { endpoint: n, body: i, correlationId: e }), setTimeout(() => {
          r.ports.rpcResponse.send({ endpoint: n, body: i, correlationId: e });
        }, 500);
        return;
      }
      console.log("Encoding request via WASM...");
      const u = encode_request(n, JSON.stringify(t));
      console.log("Encoded request:", u), fetch("/api", { method: "POST", headers: { "Content-Type": "application/json", "X-RPC-Endpoint": n }, body: u }).then(async (i) => {
        if (!i.ok) throw new Error(`HTTP error! status: ${i.status}`);
        return i.text();
      }).then((i) => {
        console.log("Received response from server:", i);
        const $ = decode_response(n, i);
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
