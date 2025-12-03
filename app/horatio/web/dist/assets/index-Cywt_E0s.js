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
let F;
function jn(r, n) {
  return r = r >>> 0, be(r, n);
}
let Ar = null;
function zr() {
  return (Ar === null || Ar.byteLength === 0) && (Ar = new Uint8Array(F.memory.buffer)), Ar;
}
function Cr(r, n, t) {
  if (t === void 0) {
    const $ = Mr.encode(r), c = n($.length, 1) >>> 0;
    return zr().subarray(c, c + $.length).set($), pr = $.length, c;
  }
  let e = r.length, a = n(e, 1) >>> 0;
  const u = zr();
  let i = 0;
  for (; i < e; i++) {
    const $ = r.charCodeAt(i);
    if ($ > 127) break;
    u[a + i] = $;
  }
  if (i !== e) {
    i !== 0 && (r = r.slice(i)), a = t(a, e, e = i + r.length * 3, 1) >>> 0;
    const $ = zr().subarray(a + i, a + e), c = Mr.encodeInto(r, $);
    i += c.written, a = t(a, e, i, 1) >>> 0;
  }
  return pr = i, a;
}
let Wr = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true });
Wr.decode();
const _e = 2146435072;
let $n = 0;
function be(r, n) {
  return $n += n, $n >= _e && (Wr = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true }), Wr.decode(), $n = n), Wr.decode(zr().subarray(r, r + n));
}
const Mr = new TextEncoder();
"encodeInto" in Mr || (Mr.encodeInto = function(r, n) {
  const t = Mr.encode(r);
  return n.set(t), { read: r.length, written: t.length };
});
let pr = 0;
function he(r) {
  let n, t;
  try {
    const e = Cr(r, F.__wbindgen_malloc_command_export, F.__wbindgen_realloc_command_export), a = pr, u = F.create_session_id(e, a);
    return n = u[0], t = u[1], jn(u[0], u[1]);
  } finally {
    F.__wbindgen_free_command_export(n, t, 1);
  }
}
function de(r, n) {
  let t, e;
  try {
    const a = Cr(r, F.__wbindgen_malloc_command_export, F.__wbindgen_realloc_command_export), u = pr, i = Cr(n, F.__wbindgen_malloc_command_export, F.__wbindgen_realloc_command_export), $ = pr, c = F.decode_response(a, u, i, $);
    return t = c[0], e = c[1], jn(c[0], c[1]);
  } finally {
    F.__wbindgen_free_command_export(t, e, 1);
  }
}
function ge(r, n) {
  let t, e;
  try {
    const a = Cr(r, F.__wbindgen_malloc_command_export, F.__wbindgen_realloc_command_export), u = pr, i = Cr(n, F.__wbindgen_malloc_command_export, F.__wbindgen_realloc_command_export), $ = pr, c = F.encode_request(a, u, i, $);
    return t = c[0], e = c[1], jn(c[0], c[1]);
  } finally {
    F.__wbindgen_free_command_export(t, e, 1);
  }
}
const we = /* @__PURE__ */ new Set(["basic", "cors", "default"]);
async function Se(r, n) {
  if (typeof Response == "function" && r instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming == "function") try {
      return await WebAssembly.instantiateStreaming(r, n);
    } catch (e) {
      if (r.ok && we.has(r.type) && r.headers.get("Content-Type") !== "application/wasm") console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);
      else throw e;
    }
    const t = await r.arrayBuffer();
    return await WebAssembly.instantiate(t, n);
  } else {
    const t = await WebAssembly.instantiate(r, n);
    return t instanceof WebAssembly.Instance ? { instance: t, module: r } : t;
  }
}
function Ae() {
  const r = {};
  return r.wbg = {}, r.wbg.__wbindgen_init_externref_table = function() {
    const n = F.__wbindgen_externrefs, t = n.grow(4);
    n.set(0, void 0), n.set(t + 0, void 0), n.set(t + 1, null), n.set(t + 2, true), n.set(t + 3, false);
  }, r;
}
function De(r, n) {
  return F = r.exports, ht.__wbindgen_wasm_module = n, Ar = null, F.__wbindgen_start(), F;
}
async function ht(r) {
  if (F !== void 0) return F;
  typeof r < "u" && (Object.getPrototypeOf(r) === Object.prototype ? { module_or_path: r } = r : console.warn("using deprecated parameters for the initialization function; pass a single object instead")), typeof r > "u" && (r = new URL("/assets/proto_rust_bg-Ceh0AzMY.wasm", import.meta.url));
  const n = Ae();
  (typeof r == "string" || typeof Request == "function" && r instanceof Request || typeof URL == "function" && r instanceof URL) && (r = fetch(r));
  const { instance: t, module: e } = await Se(await r, n);
  return De(t, e);
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
function S(r) {
  return fr(3, r, function(n) {
    return function(t) {
      return function(e) {
        return r(n, t, e);
      };
    };
  });
}
function W(r) {
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
function _r(r) {
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
function xr(r) {
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
function Hn(r) {
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
function Ee(r, n, t, e, a, u, i, $, c) {
  return r.a === 8 ? r.f(n, t, e, a, u, i, $, c) : r(n)(t)(e)(a)(u)(i)($)(c);
}
function $r(r, n) {
  for (var t, e = [], a = mn(r, n, 0, e); a && (t = e.pop()); a = mn(t.a, t.b, 0, e)) ;
  return a;
}
function mn(r, n, t, e) {
  if (r === n) return true;
  if (typeof r != "object" || r === null || n === null) return typeof r == "function" && Nr(5), false;
  if (t > 100) return e.push(A(r, n)), true;
  r.$ < 0 && (r = nt(r), n = nt(n));
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
  return t < 0 ? Pt : t ? su : Bt;
}), Sr = 0;
function A(r, n) {
  return { a: r, b: n };
}
function Z(r, n) {
  var t = {};
  for (var e in r) t[e] = r[e];
  for (var e in n) t[e] = n[e];
  return t;
}
f(He);
function He(r, n) {
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
var Je = f(nr);
function _(r) {
  for (var n = w, t = r.length; t--; ) n = nr(r[t], n);
  return n;
}
function Jn(r) {
  for (var n = []; r.b; r = r.b) n.push(r.a);
  return n;
}
var Re = S(function(r, n, t) {
  for (var e = []; n.b && t.b; n = n.b, t = t.b) e.push(o(r, n.a, t.a));
  return _(e);
});
W(function(r, n, t, e) {
  for (var a = []; n.b && t.b && e.b; n = n.b, t = t.b, e = e.b) a.push(d(r, n.a, t.a, e.a));
  return _(a);
});
_r(function(r, n, t, e, a) {
  for (var u = []; n.b && t.b && e.b && a.b; n = n.b, t = t.b, e = e.b, a = a.b) u.push(rr(r, n.a, t.a, e.a, a.a));
  return _(u);
});
Kr(function(r, n, t, e, a, u) {
  for (var i = []; n.b && t.b && e.b && a.b && u.b; n = n.b, t = t.b, e = e.b, a = a.b, u = u.b) i.push(h(r, n.a, t.a, e.a, a.a, u.a));
  return _(i);
});
f(function(r, n) {
  return _(Jn(n).sort(function(t, e) {
    return z(r(t), r(e));
  }));
});
f(function(r, n) {
  return _(Jn(n).sort(function(t, e) {
    var a = o(r, t, e);
    return a === Bt ? 0 : a === Pt ? -1 : 1;
  }));
});
var Me = [];
function Fe(r) {
  return r.length;
}
var Ce = S(function(r, n, t) {
  for (var e = new Array(r), a = 0; a < r; a++) e[a] = t(n + a);
  return e;
}), Te = f(function(r, n) {
  for (var t = new Array(r), e = 0; e < r && n.b; e++) t[e] = n.a, n = n.b;
  return t.length = e, A(t, n);
});
f(function(r, n) {
  return n[r];
});
S(function(r, n, t) {
  for (var e = t.length, a = new Array(e), u = 0; u < e; u++) a[u] = t[u];
  return a[r] = n, a;
});
f(function(r, n) {
  for (var t = n.length, e = new Array(t + 1), a = 0; a < t; a++) e[a] = n[a];
  return e[t] = r, e;
});
S(function(r, n, t) {
  for (var e = t.length, a = 0; a < e; a++) n = o(r, t[a], n);
  return n;
});
var Be = S(function(r, n, t) {
  for (var e = t.length - 1; e >= 0; e--) n = o(r, t[e], n);
  return n;
});
f(function(r, n) {
  for (var t = n.length, e = new Array(t), a = 0; a < t; a++) e[a] = r(n[a]);
  return e;
});
S(function(r, n, t) {
  for (var e = t.length, a = new Array(e), u = 0; u < e; u++) a[u] = o(r, n + u, t[u]);
  return a;
});
S(function(r, n, t) {
  return t.slice(r, n);
});
S(function(r, n, t) {
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
  return console.log(r + ": " + Pe()), n;
});
function Pe(r) {
  return "<internals>";
}
function Nr(r) {
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
  return r === 0 ? Nr(11) : t > 0 && r < 0 || t < 0 && r > 0 ? t + r : t;
});
f(Math.atan2);
var Ve = Math.ceil, Oe = Math.floor, Qn = Math.log;
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
function Le(r) {
  var n = r.charCodeAt(0);
  return isNaN(n) ? J : V(55296 <= n && n <= 56319 ? A(r[0] + r[1], r.slice(2)) : A(r[0], r.slice(1)));
}
f(function(r, n) {
  return r + n;
});
function Ie(r) {
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
S(function(r, n, t) {
  for (var e = t.length, a = 0; a < e; ) {
    var u = t[a], i = t.charCodeAt(a);
    a++, 55296 <= i && i <= 56319 && (u += t[a], a++), n = o(r, u, n);
  }
  return n;
});
S(function(r, n, t) {
  for (var e = t.length; e--; ) {
    var a = t[e], u = t.charCodeAt(e);
    56320 <= u && u <= 57343 && (e--, a = t[e] + a), n = o(r, a, n);
  }
  return n;
});
var ye = f(function(r, n) {
  return n.split(r);
}), Ue = f(function(r, n) {
  return n.join(r);
}), ze = S(function(r, n, t) {
  return t.slice(r, n);
});
f(function(r, n) {
  for (var t = n.length; t--; ) {
    var e = n[t], a = n.charCodeAt(t);
    if (56320 <= a && a <= 57343 && (t--, e = n[t] + e), r(e)) return true;
  }
  return false;
});
var We = f(function(r, n) {
  for (var t = n.length; t--; ) {
    var e = n[t], a = n.charCodeAt(t);
    if (56320 <= a && a <= 57343 && (t--, e = n[t] + e), !r(e)) return false;
  }
  return true;
}), ke = f(function(r, n) {
  return n.indexOf(r) > -1;
});
f(function(r, n) {
  return n.indexOf(r) === 0;
});
f(function(r, n) {
  return n.length >= r.length && n.lastIndexOf(r) === n.length - r.length;
});
var qe = f(function(r, n) {
  var t = r.length;
  if (t < 1) return w;
  for (var e = 0, a = []; (e = n.indexOf(r, e)) > -1; ) a.push(e), e = e + t;
  return _(a);
});
function Ge(r) {
  return r + "";
}
function Qe(r) {
  for (var n = 0, t = r.charCodeAt(0), e = t == 43 || t == 45 ? 1 : 0, a = e; a < r.length; ++a) {
    var u = r.charCodeAt(a);
    if (u < 48 || 57 < u) return J;
    n = 10 * n + u - 48;
  }
  return a == e ? J : V(t == 45 ? -n : n);
}
function Ye(r) {
  var n = r.charCodeAt(0);
  return 55296 <= n && n <= 56319 ? (n - 55296) * 1024 + r.charCodeAt(1) - 56320 + 65536 : n;
}
function Xe(r) {
  return { $: 0, a: r };
}
function wt(r) {
  return { $: 2, b: r };
}
var Ze = wt(function(r) {
  return typeof r != "number" ? K("an INT", r) : -2147483647 < r && r < 2147483647 && (r | 0) === r || isFinite(r) && !(r % 1) ? N(r) : K("an INT", r);
}), Ke = wt(function(r) {
  return typeof r == "string" ? N(r) : r instanceof String ? N(r + "") : K("a STRING", r);
});
function xe(r) {
  return { $: 3, b: r };
}
function Ne(r) {
  return { $: 5, c: r };
}
var ra = f(function(r, n) {
  return { $: 6, d: r, b: n };
});
f(function(r, n) {
  return { $: 7, e: r, b: n };
});
function lr(r, n) {
  return { $: 9, f: r, g: n };
}
var na = f(function(r, n) {
  return { $: 10, b: n, h: r };
});
function ta(r) {
  return { $: 11, g: r };
}
var ea = f(function(r, n) {
  return lr(r, [n]);
}), aa = S(function(r, n, t) {
  return lr(r, [n, t]);
});
W(function(r, n, t, e) {
  return lr(r, [n, t, e]);
});
_r(function(r, n, t, e, a) {
  return lr(r, [n, t, e, a]);
});
Kr(function(r, n, t, e, a, u) {
  return lr(r, [n, t, e, a, u]);
});
xr(function(r, n, t, e, a, u, i) {
  return lr(r, [n, t, e, a, u, i]);
});
dt(function(r, n, t, e, a, u, i, $) {
  return lr(r, [n, t, e, a, u, i, $]);
});
Hn(function(r, n, t, e, a, u, i, $, c) {
  return lr(r, [n, t, e, a, u, i, $, c]);
});
var ua = f(function(r, n) {
  try {
    var t = JSON.parse(n);
    return q(r, t);
  } catch (e) {
    return U(o(Vn, "This is not valid JSON! " + e.message, n));
  }
}), oa = f(function(r, n) {
  return q(r, n);
});
function q(r, n) {
  switch (r.$) {
    case 2:
      return r.b(n);
    case 5:
      return n === null ? N(r.c) : K("null", n);
    case 3:
      return yr(n) ? Yn(r.b, n, _) : K("a LIST", n);
    case 4:
      return yr(n) ? Yn(r.b, n, ia) : K("an ARRAY", n);
    case 6:
      var t = r.d;
      if (typeof n != "object" || n === null || !(t in n)) return K("an OBJECT with a field named `" + t + "`", n);
      var l = q(r.b, n[t]);
      return x(l) ? l : U(o(tt, t, l.a));
    case 7:
      var e = r.e;
      if (!yr(n)) return K("an ARRAY", n);
      if (e >= n.length) return K("a LONGER array. Need index " + e + " but only see " + n.length + " entries", n);
      var l = q(r.b, n[e]);
      return x(l) ? l : U(o(Ot, e, l.a));
    case 8:
      if (typeof n != "object" || n === null || yr(n)) return K("an OBJECT", n);
      var a = w;
      for (var u in n) if (Object.prototype.hasOwnProperty.call(n, u)) {
        var l = q(r.b, n[u]);
        if (!x(l)) return U(o(tt, u, l.a));
        a = nr(A(u, l.a), a);
      }
      return N(ir(a));
    case 9:
      for (var i = r.f, $ = r.g, c = 0; c < $.length; c++) {
        var l = q($[c], n);
        if (!x(l)) return l;
        i = i(l.a);
      }
      return N(i);
    case 10:
      var l = q(r.b, n);
      return x(l) ? q(r.h(l.a), n) : l;
    case 11:
      for (var v = w, p = r.g; p.b; p = p.b) {
        var l = q(p.a, n);
        if (x(l)) return l;
        v = nr(l.a, v);
      }
      return U(mu(ir(v)));
    case 1:
      return U(o(Vn, r.a, n));
    case 0:
      return N(r.a);
  }
}
function Yn(r, n, t) {
  for (var e = n.length, a = new Array(e), u = 0; u < e; u++) {
    var i = q(r, n[u]);
    if (!x(i)) return U(o(Ot, u, i.a));
    a[u] = i.a;
  }
  return N(t(a));
}
function yr(r) {
  return Array.isArray(r) || typeof FileList < "u" && r instanceof FileList;
}
function ia(r) {
  return o(Vu, r.length, function(n) {
    return r[n];
  });
}
function K(r, n) {
  return U(o(Vn, "Expecting " + r, n));
}
function dr(r, n) {
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
      return dr(r.b, n.b);
    case 6:
      return r.d === n.d && dr(r.b, n.b);
    case 7:
      return r.e === n.e && dr(r.b, n.b);
    case 9:
      return r.f === n.f && Xn(r.g, n.g);
    case 10:
      return r.h === n.h && dr(r.b, n.b);
    case 11:
      return Xn(r.g, n.g);
  }
}
function Xn(r, n) {
  var t = r.length;
  if (t !== n.length) return false;
  for (var e = 0; e < t; e++) if (!dr(r[e], n[e])) return false;
  return true;
}
var $a = f(function(r, n) {
  return JSON.stringify(n, null, r) + "";
});
function ca(r) {
  return r;
}
function fa() {
  return [];
}
function la() {
  return {};
}
var va = S(function(r, n, t) {
  var e = n;
  return r === "toJSON" && typeof e == "function" || (t[r] = e), t;
});
function sa(r) {
  return f(function(n, t) {
    return t.push(r(n)), t;
  });
}
var ma = null;
function br(r) {
  return { $: 0, a: r };
}
function pa(r) {
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
function _a(r) {
  return { $: 5, b: r };
}
var ba = 0;
function Tr(r) {
  var n = { $: 0, e: ba++, f: r, g: null, h: [] };
  return Mn(n), n;
}
function Rn(r) {
  return X(function(n) {
    n(br(Tr(r)));
  });
}
function St(r, n) {
  r.h.push(n), Mn(r);
}
var ha = f(function(r, n) {
  return X(function(t) {
    St(r, n), t(br(Sr));
  });
});
function da(r) {
  return X(function(n) {
    var t = r.f;
    t.$ === 2 && t.c && t.c(), r.f = null, n(br(Sr));
  });
}
var cn = false, Zn = [];
function Mn(r) {
  if (Zn.push(r), !cn) {
    for (cn = true; r = Zn.shift(); ) ga(r);
    cn = false;
  }
}
function ga(r) {
  for (; r.f; ) {
    var n = r.f.$;
    if (n === 0 || n === 1) {
      for (; r.g && r.g.$ !== n; ) r.g = r.g.i;
      if (!r.g) return;
      r.f = r.g.b(r.f.a), r.g = r.g.i;
    } else if (n === 2) {
      r.f.c = r.f.b(function(t) {
        r.f = t, Mn(r);
      });
      return;
    } else if (n === 5) {
      if (r.h.length === 0) return;
      r.f = r.f.b(r.h.shift());
    } else r.g = { $: n === 3 ? 0 : 1, b: r.f.b, i: r.g }, r.f = r.f.d;
  }
}
W(function(r, n, t, e) {
  return Fn(n, e, r.bk, r.bx, r.bu, function() {
    return function() {
    };
  });
});
function Fn(r, n, t, e, a, u) {
  var i = o(oa, r, n ? n.flags : void 0);
  x(i) || Nr(2);
  var $ = {}, c = t(i.a), l = c.a, v = u(s, l), p = wa($, s);
  function s(m, D) {
    var j = o(e, m, l);
    v(l = j.a, D), xn($, j.b, a(l));
  }
  return xn($, c.b, a(l)), p ? { ports: p } : {};
}
var gr = {};
function wa(r, n) {
  var t;
  for (var e in gr) {
    var a = gr[e];
    a.a && (t = t || {}, t[e] = a.a(e, n)), r[e] = Sa(a, n);
  }
  return t;
}
function At(r, n, t, e, a) {
  return { b: r, c: n, d: t, e, f: a };
}
function Sa(r, n) {
  var t = { g: n, h: void 0 }, e = r.c, a = r.d, u = r.e, i = r.f;
  function $(c) {
    return o(pn, $, _a(function(l) {
      var v = l.a;
      return l.$ === 0 ? d(a, t, v, c) : u && i ? rr(e, t, v.i, v.j, c) : d(e, t, u ? v.i : v.j, c);
    }));
  }
  return t.h = Tr(o(pn, $, r.b));
}
var Aa = f(function(r, n) {
  return X(function(t) {
    r.g(n), t(br(Sr));
  });
}), Da = f(function(r, n) {
  return o(ha, r.h, { $: 0, a: n });
});
function Dt(r) {
  return function(n) {
    return { $: 1, k: r, l: n };
  };
}
function Et(r) {
  return { $: 2, m: r };
}
f(function(r, n) {
  return { $: 3, n: r, o: n };
});
var Kn = [], fn = false;
function xn(r, n, t) {
  if (Kn.push({ p: r, q: n, r: t }), !fn) {
    fn = true;
    for (var e; e = Kn.shift(); ) Ea(e.p, e.q, e.r);
    fn = false;
  }
}
function Ea(r, n, t) {
  var e = {};
  Gr(true, n, e, null), Gr(false, t, e, null);
  for (var a in r) St(r[a], { $: "fx", a: e[a] || { i: w, j: w } });
}
function Gr(r, n, t, e) {
  switch (n.$) {
    case 1:
      var a = n.k, u = ja(r, a, e, n.l);
      t[a] = Ha(r, u, t[a]);
      return;
    case 2:
      for (var i = n.m; i.b; i = i.b) Gr(r, i.a, t, e);
      return;
    case 3:
      Gr(r, n.o, t, { s: n.n, t: e });
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
function Ha(r, n, t) {
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
var Qr, mr = typeof document < "u" ? document : {};
function Cn(r, n) {
  r.appendChild(n);
}
W(function(r, n, t, e) {
  var a = e.node;
  return a.parentNode.replaceChild(or(r, function() {
  }), a), {};
});
function _n(r) {
  return { $: 0, a: r };
}
var Ja = f(function(r, n) {
  return f(function(t, e) {
    for (var a = [], u = 0; e.b; e = e.b) {
      var i = e.a;
      u += i.b || 0, a.push(i);
    }
    return u += a.length, { $: 1, c: n, d: Ht(t), e: a, f: r, b: u };
  });
}), k = Ja(void 0), Ra = f(function(r, n) {
  return f(function(t, e) {
    for (var a = [], u = 0; e.b; e = e.b) {
      var i = e.a;
      u += i.b.b || 0, a.push(i);
    }
    return u += a.length, { $: 2, c: n, d: Ht(t), e: a, f: r, b: u };
  });
});
Ra(void 0);
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
S(function(r, n, t) {
  return vr([r, n, t], function() {
    return o(r, n, t);
  });
});
W(function(r, n, t, e) {
  return vr([r, n, t, e], function() {
    return d(r, n, t, e);
  });
});
_r(function(r, n, t, e, a) {
  return vr([r, n, t, e, a], function() {
    return rr(r, n, t, e, a);
  });
});
Kr(function(r, n, t, e, a, u) {
  return vr([r, n, t, e, a, u], function() {
    return h(r, n, t, e, a, u);
  });
});
xr(function(r, n, t, e, a, u, i) {
  return vr([r, n, t, e, a, u, i], function() {
    return sn(r, n, t, e, a, u, i);
  });
});
dt(function(r, n, t, e, a, u, i, $) {
  return vr([r, n, t, e, a, u, i, $], function() {
    return gt(r, n, t, e, a, u, i, $);
  });
});
Hn(function(r, n, t, e, a, u, i, $, c) {
  return vr([r, n, t, e, a, u, i, $, c], function() {
    return Ee(r, n, t, e, a, u, i, $, c);
  });
});
var jt = f(function(r, n) {
  return { $: "a0", n: r, o: n };
}), Ma = f(function(r, n) {
  return { $: "a1", n: r, o: n };
}), Fa = f(function(r, n) {
  return { $: "a2", n: r, o: n };
}), Ca = f(function(r, n) {
  return { $: "a3", n: r, o: n };
});
S(function(r, n, t) {
  return { $: "a4", n, o: { f: r, o: t } };
});
var Ta = /^\s*j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t\s*:/i, Ba = /^\s*(j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t\s*:|d\s*a\s*t\s*a\s*:\s*t\s*e\s*x\s*t\s*\/\s*h\s*t\s*m\s*l\s*(,|;))/i;
function Pa(r) {
  return Ta.test(r) ? "" : r;
}
function Va(r) {
  return Ba.test(r) ? "" : r;
}
f(function(r, n) {
  return n.$ === "a0" ? o(jt, n.n, Oa(r, n.o)) : n;
});
function Oa(r, n) {
  var t = Ln(n);
  return { $: n.$, a: t ? d(Ou, t < 3 ? La : Ia, sr(r), n.a) : o(M, r, n.a) };
}
var La = f(function(r, n) {
  return A(r(n.a), n.b);
}), Ia = f(function(r, n) {
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
    return bn(i, n, r.d), i;
  }
  var i = r.f ? mr.createElementNS(r.f, r.c) : mr.createElement(r.c);
  Qr && r.c == "a" && i.addEventListener("click", Qr(i)), bn(i, n, r.d);
  for (var $ = r.e, c = 0; c < $.length; c++) Cn(i, or(t === 1 ? $[c] : $[c].b, n));
  return i;
}
function bn(r, n, t) {
  for (var e in t) {
    var a = t[e];
    e === "a1" ? ya(r, a) : e === "a0" ? Wa(r, n, a) : e === "a3" ? Ua(r, a) : e === "a4" ? za(r, a) : (e !== "value" && e !== "checked" || r[e] !== a) && (r[e] = a);
  }
}
function ya(r, n) {
  var t = r.style;
  for (var e in n) t[e] = n[e];
}
function Ua(r, n) {
  for (var t in n) {
    var e = n[t];
    typeof e < "u" ? r.setAttribute(t, e) : r.removeAttribute(t);
  }
}
function za(r, n) {
  for (var t in n) {
    var e = n[t], a = e.f, u = e.o;
    typeof u < "u" ? r.setAttributeNS(a, t, u) : r.removeAttributeNS(a, t);
  }
}
function Wa(r, n, t) {
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
    i = ka(n, u), r.addEventListener(a, i, Tn && { passive: Ln(u) < 2 }), e[a] = i;
  }
}
var Tn;
try {
  window.addEventListener("t", null, Object.defineProperty({}, "passive", { get: function() {
    Tn = true;
  } }));
} catch {
}
function ka(r, n) {
  function t(e) {
    var a = t.q, u = q(a.a, e);
    if (x(u)) {
      for (var i = Ln(a), $ = u.a, c = i ? i < 3 ? $.a : $.s : $, l = i == 1 ? $.b : i == 3 && $.am, v = (l && e.stopPropagation(), (i == 2 ? $.b : i == 3 && $.aj) && e.preventDefault(), r), p, s; p = v.j; ) {
        if (typeof p == "function") c = p(c);
        else for (var s = p.length; s--; ) c = p[s](c);
        v = v.p;
      }
      v(c, l);
    }
  }
  return t.q = n, t;
}
function qa(r, n) {
  return r.$ == n.$ && dr(r.a, n.a);
}
function Jt(r, n) {
  var t = [];
  return Q(r, n, t, 0), t;
}
function O(r, n, t, e) {
  var a = { $: n, r: t, s: e, t: void 0, u: void 0 };
  return r.push(a), a;
}
function Q(r, n, t, e) {
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
        Q(r.k, n.k, v, 0), v.length > 0 && O(t, 1, e, v);
        return;
      case 4:
        for (var p = r.j, s = n.j, m = false, D = r.k; D.$ === 4; ) m = true, typeof p != "object" ? p = [p, D.j] : p.push(D.j), D = D.k;
        for (var j = n.k; j.$ === 4; ) m = true, typeof s != "object" ? s = [s, j.j] : s.push(j.j), j = j.k;
        if (m && p.length !== s.length) {
          O(t, 0, e, n);
          return;
        }
        (m ? !Ga(p, s) : p !== s) && O(t, 2, e, s), Q(D, j, t, e + 1);
        return;
      case 0:
        r.a !== n.a && O(t, 3, e, n.a);
        return;
      case 1:
        rt(r, n, t, e, Qa);
        return;
      case 2:
        rt(r, n, t, e, Ya);
        return;
      case 3:
        if (r.h !== n.h) {
          O(t, 0, e, n);
          return;
        }
        var H = Bn(r.d, n.d);
        H && O(t, 4, e, H);
        var R = n.i(r.g, n.g);
        R && O(t, 5, e, R);
        return;
    }
  }
}
function Ga(r, n) {
  for (var t = 0; t < r.length; t++) if (r[t] !== n[t]) return false;
  return true;
}
function rt(r, n, t, e, a) {
  if (r.c !== n.c || r.f !== n.f) {
    O(t, 0, e, n);
    return;
  }
  var u = Bn(r.d, n.d);
  u && O(t, 4, e, u), a(r, n, t, e);
}
function Bn(r, n, t) {
  var e;
  for (var a in r) {
    if (a === "a1" || a === "a0" || a === "a3" || a === "a4") {
      var u = Bn(r[a], n[a] || {}, a);
      u && (e = e || {}, e[a] = u);
      continue;
    }
    if (!(a in n)) {
      e = e || {}, e[a] = t ? t === "a1" ? "" : t === "a0" || t === "a3" ? void 0 : { f: r[a].f, o: void 0 } : typeof r[a] == "string" ? "" : null;
      continue;
    }
    var i = r[a], $ = n[a];
    i === $ && a !== "value" && a !== "checked" || t === "a0" && qa(i, $) || (e = e || {}, e[a] = $);
  }
  for (var c in n) c in r || (e = e || {}, e[c] = n[c]);
  return e;
}
function Qa(r, n, t, e) {
  var a = r.e, u = n.e, i = a.length, $ = u.length;
  i > $ ? O(t, 6, e, { v: $, i: i - $ }) : i < $ && O(t, 7, e, { v: i, e: u });
  for (var c = i < $ ? i : $, l = 0; l < c; l++) {
    var v = a[l];
    Q(v, u[l], t, ++e), e += v.b || 0;
  }
}
function Ya(r, n, t, e) {
  for (var a = [], u = {}, i = [], $ = r.e, c = n.e, l = $.length, v = c.length, p = 0, s = 0, m = e; p < l && s < v; ) {
    var D = $[p], j = c[s], H = D.a, R = j.a, E = D.b, L = j.b, tr = void 0, an = void 0;
    if (H === R) {
      m++, Q(E, L, a, m), m += E.b || 0, p++, s++;
      continue;
    }
    var Lr = $[p + 1], un = c[s + 1];
    if (Lr) {
      var qn = Lr.a, hr = Lr.b;
      an = R === qn;
    }
    if (un) {
      var Gn = un.a, on = un.b;
      tr = H === Gn;
    }
    if (tr && an) {
      m++, Q(E, on, a, m), Dr(u, a, H, L, s, i), m += E.b || 0, m++, Er(u, a, H, hr, m), m += hr.b || 0, p += 2, s += 2;
      continue;
    }
    if (tr) {
      m++, Dr(u, a, R, L, s, i), Q(E, on, a, m), m += E.b || 0, p += 1, s += 2;
      continue;
    }
    if (an) {
      m++, Er(u, a, H, E, m), m += E.b || 0, m++, Q(hr, L, a, m), m += hr.b || 0, p += 2, s += 1;
      continue;
    }
    if (Lr && qn === Gn) {
      m++, Er(u, a, H, E, m), Dr(u, a, R, L, s, i), m += E.b || 0, m++, Q(hr, on, a, m), m += hr.b || 0, p += 2, s += 2;
      continue;
    }
    break;
  }
  for (; p < l; ) {
    m++;
    var D = $[p], E = D.b;
    Er(u, a, D.a, E, m), m += E.b || 0, p++;
  }
  for (; s < v; ) {
    var Ir = Ir || [], j = c[s];
    Dr(u, a, j.a, j.b, void 0, Ir), s++;
  }
  (a.length > 0 || i.length > 0 || Ir) && O(t, 8, e, { w: a, x: i, y: Ir });
}
var Rt = "_elmW6BL";
function Dr(r, n, t, e, a, u) {
  var i = r[t];
  if (!i) {
    i = { c: 0, z: e, r: a, s: void 0 }, u.push({ r: a, A: i }), r[t] = i;
    return;
  }
  if (i.c === 1) {
    u.push({ r: a, A: i }), i.c = 2;
    var $ = [];
    Q(i.z, e, $, i.r), i.r = a, i.s.s = { w: $, A: i };
    return;
  }
  Dr(r, n, t + Rt, e, a, u);
}
function Er(r, n, t, e, a) {
  var u = r[t];
  if (!u) {
    var i = O(n, 9, a, void 0);
    r[t] = { c: 1, z: e, r: a, s: i };
    return;
  }
  if (u.c === 0) {
    u.c = 2;
    var $ = [];
    Q(e, u.z, $, a), O(n, 9, a, { w: $, A: u });
    return;
  }
  Er(r, n, t + Rt, e, a);
}
function Mt(r, n, t, e) {
  jr(r, n, t, 0, 0, n.b, e);
}
function jr(r, n, t, e, a, u, i) {
  for (var $ = t[e], c = $.r; c === a; ) {
    var l = $.$;
    if (l === 1) Mt(r, n.k, $.s, i);
    else if (l === 8) {
      $.t = r, $.u = i;
      var v = $.s.w;
      v.length > 0 && jr(r, n, v, 0, a, u, i);
    } else if (l === 9) {
      $.t = r, $.u = i;
      var p = $.s;
      if (p) {
        p.A.s = r;
        var v = p.w;
        v.length > 0 && jr(r, n, v, 0, a, u, i);
      }
    } else $.t = r, $.u = i;
    if (e++, !($ = t[e]) || (c = $.r) > u) return e;
  }
  var s = n.$;
  if (s === 4) {
    for (var m = n.k; m.$ === 4; ) m = m.k;
    return jr(r, m, t, e, a + 1, u, r.elm_event_node_ref);
  }
  for (var D = n.e, j = r.childNodes, H = 0; H < D.length; H++) {
    a++;
    var R = s === 1 ? D[H] : D[H].b, E = a + (R.b || 0);
    if (a <= c && c <= E && (e = jr(j[H], R, t, e, a, E, i), !($ = t[e]) || (c = $.r) > u)) return e;
    a = E;
  }
  return e;
}
function Ft(r, n, t, e) {
  return t.length === 0 ? r : (Mt(r, n, t, e), Yr(r, t));
}
function Yr(r, n) {
  for (var t = 0; t < n.length; t++) {
    var e = n[t], a = e.t, u = Xa(a, e);
    a === r && (r = u);
  }
  return r;
}
function Xa(r, n) {
  switch (n.$) {
    case 0:
      return Za(r, n.s, n.u);
    case 4:
      return bn(r, n.u, n.s), r;
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
      return Ka(r, n);
    case 5:
      return n.s(r);
    default:
      Nr(10);
  }
}
function Za(r, n, t) {
  var e = r.parentNode, a = or(n, t);
  return a.elm_event_node_ref || (a.elm_event_node_ref = r.elm_event_node_ref), e && a !== r && e.replaceChild(a, r), a;
}
function Ka(r, n) {
  var t = n.s, e = xa(t.y, n);
  r = Yr(r, t.w);
  for (var a = t.x, u = 0; u < a.length; u++) {
    var i = a[u], $ = i.A, c = $.c === 2 ? $.s : or($.z, n.u);
    r.insertBefore(c, r.childNodes[i.r]);
  }
  return e && Cn(r, e), r;
}
function xa(r, n) {
  if (r) {
    for (var t = mr.createDocumentFragment(), e = 0; e < r.length; e++) {
      var a = r[e], u = a.A;
      Cn(t, u.c === 2 ? u.s : or(u.z, n.u));
    }
    return t;
  }
}
function Pn(r) {
  if (r.nodeType === 3) return _n(r.textContent);
  if (r.nodeType !== 1) return _n("");
  for (var n = w, t = r.attributes, e = t.length; e--; ) {
    var a = t[e], u = a.name, i = a.value;
    n = nr(o(Ca, u, i), n);
  }
  for (var $ = r.tagName.toLowerCase(), c = w, l = r.childNodes, e = l.length; e--; ) c = nr(Pn(l[e]), c);
  return d(k, $, n, c);
}
function Na(r) {
  for (var n = r.e, t = n.length, e = new Array(t), a = 0; a < t; a++) e[a] = n[a].b;
  return { $: 1, c: r.c, d: r.d, e, f: r.f, b: r.b };
}
var ru = W(function(r, n, t, e) {
  return Fn(n, e, r.bk, r.bx, r.bu, function(a, u) {
    var i = r.bz, $ = e.node, c = Pn($);
    return Ct(u, function(l) {
      var v = i(l), p = Jt(c, v);
      $ = Ft($, c, p, a), c = v;
    });
  });
});
W(function(r, n, t, e) {
  return Fn(n, e, r.bk, r.bx, r.bu, function(a, u) {
    var i = r.ak && r.ak(a), $ = r.bz, c = mr.title, l = mr.body, v = Pn(l);
    return Ct(u, function(p) {
      Qr = i;
      var s = $(p), m = k("body")(w)(s.I), D = Jt(v, m);
      l = Ft(l, v, D, a), v = m, Qr = 0, c !== s.ag && (mr.title = c = s.ag);
    });
  });
});
var Xr = typeof requestAnimationFrame < "u" ? requestAnimationFrame : function(r) {
  return setTimeout(r, 1e3 / 60);
};
function Ct(r, n) {
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
  return o(zn, In, X(function() {
    n && history.go(n), r();
  }));
});
f(function(r, n) {
  return o(zn, In, X(function() {
    history.pushState({}, "", n), r();
  }));
});
f(function(r, n) {
  return o(zn, In, X(function() {
    history.replaceState({}, "", n), r();
  }));
});
var nu = { addEventListener: function() {
}, removeEventListener: function() {
} }, tu = typeof window < "u" ? window : nu;
S(function(r, n, t) {
  return Rn(X(function(e) {
    function a(u) {
      Tr(t(u));
    }
    return r.addEventListener(n, a, Tn && { passive: true }), function() {
      r.removeEventListener(n, a);
    };
  }));
});
f(function(r, n) {
  var t = q(r, n);
  return x(t) ? V(t.a) : J;
});
function Tt(r, n) {
  return X(function(t) {
    Xr(function() {
      var e = document.getElementById(r);
      t(e ? br(n(e)) : pa(Lu(r)));
    });
  });
}
function eu(r) {
  return X(function(n) {
    Xr(function() {
      n(br(r()));
    });
  });
}
f(function(r, n) {
  return Tt(n, function(t) {
    return t[r](), Sr;
  });
});
f(function(r, n) {
  return eu(function() {
    return tu.scroll(r, n), Sr;
  });
});
S(function(r, n, t) {
  return Tt(r, function(e) {
    return e.scrollLeft = n, e.scrollTop = t, Sr;
  });
});
var au = S(function(r, n, t) {
  return X(function(e) {
    function a(i) {
      e(n(t.bf.a(i)));
    }
    var u = new XMLHttpRequest();
    u.addEventListener("error", function() {
      a(fo);
    }), u.addEventListener("timeout", function() {
      a(so);
    }), u.addEventListener("load", function() {
      a(ou(t.bf.b, u));
    }), ne(t.bw) && vu(r, u, t.bw.a);
    try {
      u.open(t.bl, t.by, true);
    } catch {
      return a($o(t.by));
    }
    return uu(u, t), t.I.a && u.setRequestHeader("Content-Type", t.I.a), u.send(t.I.b), function() {
      u.c = true, u.abort();
    };
  });
});
function uu(r, n) {
  for (var t = n.bh; t.b; t = t.b) r.setRequestHeader(t.a.a, t.a.b);
  r.timeout = n.bv.a || 0, r.responseType = n.bf.d, r.withCredentials = n.ba;
}
function ou(r, n) {
  return o(200 <= n.status && n.status < 300 ? co : io, iu(n), r(n.response));
}
function iu(r) {
  return { by: r.responseURL, bs: r.status, bt: r.statusText, bh: $u(r.getAllResponseHeaders()) };
}
function $u(r) {
  if (!r) return An;
  for (var n = An, t = r.split(`\r
`), e = t.length; e--; ) {
    var a = t[e], u = a.indexOf(": ");
    if (u > 0) {
      var i = a.substring(0, u), $ = a.substring(u + 2);
      n = d(bo, i, function(c) {
        return V(ne(c) ? $ + ", " + c.a : $);
      }, n);
    }
  }
  return n;
}
var cu = S(function(r, n, t) {
  return { $: 0, d: r, b: n, a: t };
}), fu = f(function(r, n) {
  return { $: 0, d: n.d, b: n.b, a: function(t) {
    return r(n.a(t));
  } };
}), lu = f(function(r, n) {
  return { $: 0, a: r, b: n };
});
f(function(r, n) {
  return new Blob([n], { type: r });
});
function vu(r, n, t) {
  n.upload.addEventListener("progress", function(e) {
    n.c || Tr(o($t, r, A(t, vo({ br: e.loaded, a0: e.total }))));
  }), n.addEventListener("progress", function(e) {
    n.c || Tr(o($t, r, A(t, lo({ bp: e.loaded, a0: e.lengthComputable ? V(e.total) : J }))));
  });
}
var Bt = 1, su = 2, Pt = 0, G = Je, Vt = S(function(r, n, t) {
  r: for (; ; ) {
    if (t.$ === -2) return n;
    var e = t.b, a = t.c, u = t.d, i = t.e, $ = r, c = d(r, e, a, d(Vt, r, n, i)), l = u;
    r = $, n = c, t = l;
    continue r;
  }
}), nt = function(r) {
  return d(Vt, S(function(n, t, e) {
    return o(G, A(n, t), e);
  }), w, r);
}, Ur = Be;
S(function(r, n, t) {
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
var U = function(r) {
  return { $: 1, a: r };
}, Vn = f(function(r, n) {
  return { $: 3, a: r, b: n };
}), tt = f(function(r, n) {
  return { $: 0, a: r, b: n };
}), Ot = f(function(r, n) {
  return { $: 1, a: r, b: n };
}), N = function(r) {
  return { $: 0, a: r };
}, mu = function(r) {
  return { $: 2, a: r };
}, V = function(r) {
  return { $: 0, a: r };
}, J = { $: 1 }, pu = We, Lt = $a, Zr = Ge, Hr = f(function(r, n) {
  return o(Ue, r, Jn(n));
}), _u = f(function(r, n) {
  return _(o(ye, r, n));
}), It = function(r) {
  return o(Hr, `
    `, o(_u, `
`, r));
}, Pr = S(function(r, n, t) {
  r: for (; ; ) if (t.b) {
    var e = t.a, a = t.b, u = r, i = o(r, e, n), $ = a;
    r = u, n = i, t = $;
    continue r;
  } else return n;
}), yt = function(r) {
  return d(Pr, f(function(n, t) {
    return t + 1;
  }), 0, r);
}, bu = Re, hu = S(function(r, n, t) {
  r: for (; ; ) if (z(r, n) < 1) {
    var e = r, a = n - 1, u = o(G, n, t);
    r = e, n = a, t = u;
    continue r;
  } else return t;
}), du = f(function(r, n) {
  return d(hu, r, n, w);
}), gu = f(function(r, n) {
  return d(bu, r, o(du, 0, yt(n) - 1), n);
}), On = Ye, Ut = function(r) {
  var n = On(r);
  return 97 <= n && n <= 122;
}, zt = function(r) {
  var n = On(r);
  return n <= 90 && 65 <= n;
}, wu = function(r) {
  return Ut(r) || zt(r);
}, Su = function(r) {
  var n = On(r);
  return n <= 57 && 48 <= n;
}, Au = function(r) {
  return Ut(r) || zt(r) || Su(r);
}, ir = function(r) {
  return d(Pr, G, w, r);
}, Du = Le, Eu = f(function(r, n) {
  return `

(` + (Zr(r + 1) + (") " + It(Wt(n))));
}), Wt = function(r) {
  return o(ju, r, w);
}, ju = f(function(r, n) {
  r: for (; ; ) switch (r.$) {
    case 0:
      var t = r.a, i = r.b, e = function() {
        var j = Du(t);
        if (j.$ === 1) return false;
        var H = j.a, R = H.a, E = H.b;
        return wu(R) && o(pu, Au, E);
      }(), a = e ? "." + t : "['" + (t + "']"), c = i, l = o(G, a, n);
      r = c, n = l;
      continue r;
    case 1:
      var u = r.a, i = r.b, $ = "[" + (Zr(u) + "]"), c = i, l = o(G, $, n);
      r = c, n = l;
      continue r;
    case 2:
      var v = r.a;
      if (v.b) if (v.b.b) {
        var p = function() {
          return n.b ? "The Json.Decode.oneOf at json" + o(Hr, "", ir(n)) : "Json.Decode.oneOf";
        }(), D = p + (" failed in the following " + (Zr(yt(v)) + " ways:"));
        return o(Hr, `

`, o(G, D, o(gu, Eu, v)));
      } else {
        var i = v.a, c = i, l = n;
        r = c, n = l;
        continue r;
      }
      else return "Ran into a Json.Decode.oneOf with no possibilities" + function() {
        return n.b ? " at json" + o(Hr, "", ir(n)) : "!";
      }();
    default:
      var s = r.a, m = r.b, D = function() {
        return n.b ? "Problem with the value at json" + (o(Hr, "", ir(n)) + `:

    `) : `Problem with the given value:

`;
      }();
      return D + (It(o(Lt, 4, m)) + (`

` + s));
  }
}), Y = 32, hn = W(function(r, n, t, e) {
  return { $: 0, a: r, b: n, c: t, d: e };
}), dn = Me, kt = Ve, qt = f(function(r, n) {
  return Qn(n) / Qn(r);
}), gn = kt(o(qt, 2, Y)), Hu = rr(hn, 0, gn, dn, dn), Gt = Ce, Ju = function(r) {
  return { $: 1, a: r };
};
f(function(r, n) {
  return r(n);
});
f(function(r, n) {
  return n(r);
});
var Ru = Oe, et = Fe, Mu = f(function(r, n) {
  return z(r, n) > 0 ? r : n;
}), Fu = function(r) {
  return { $: 0, a: r };
}, Qt = Te, Cu = f(function(r, n) {
  r: for (; ; ) {
    var t = o(Qt, Y, r), e = t.a, a = t.b, u = o(G, Fu(e), n);
    if (a.b) {
      var i = a, $ = u;
      r = i, n = $;
      continue r;
    } else return ir(u);
  }
}), Tu = f(function(r, n) {
  r: for (; ; ) {
    var t = kt(n / Y);
    if (t === 1) return o(Qt, Y, r).a;
    var e = o(Cu, r, w), a = t;
    r = e, n = a;
    continue r;
  }
}), Bu = f(function(r, n) {
  if (n.a) {
    var t = n.a * Y, e = Ru(o(qt, Y, t - 1)), a = r ? ir(n.d) : n.d, u = o(Tu, a, n.a);
    return rr(hn, et(n.c) + t, o(Mu, 5, e * gn), u, n.c);
  } else return rr(hn, et(n.c), gn, dn, n.c);
}), Pu = _r(function(r, n, t, e, a) {
  r: for (; ; ) {
    if (n < 0) return o(Bu, false, { d: e, a: t / Y | 0, c: a });
    var u = Ju(d(Gt, Y, n, r)), i = r, $ = n - Y, c = t, l = o(G, u, e), v = a;
    r = i, n = $, t = c, e = l, a = v;
    continue r;
  }
}), Vu = f(function(r, n) {
  if (r <= 0) return Hu;
  var t = r % Y, e = d(Gt, t, r - t, n), a = r - t - Y;
  return h(Pu, n, a, r, w, e);
}), x = function(r) {
  return !r.$;
}, M = ea, Ou = aa, sr = Xe, Ln = function(r) {
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
}, Lu = Yt, at = Kr(function(r, n, t, e, a, u) {
  return { ay: u, k: n, aJ: e, aL: t, aO: r, aP: a };
}), Iu = ke, yu = Ie, Xt = ze, rn = f(function(r, n) {
  return r < 1 ? n : d(Xt, r, yu(n), n);
}), nn = qe, Vr = function(r) {
  return r === "";
}, tn = f(function(r, n) {
  return r < 1 ? "" : d(Xt, 0, r, n);
}), Uu = Qe, ut = _r(function(r, n, t, e, a) {
  if (Vr(a) || o(Iu, "@", a)) return J;
  var u = o(nn, ":", a);
  if (u.b) {
    if (u.b.b) return J;
    var i = u.a, $ = Uu(o(rn, i + 1, a));
    if ($.$ === 1) return J;
    var c = $;
    return V(sn(at, r, o(tn, i, a), c, n, t, e));
  } else return V(sn(at, r, a, J, n, t, e));
}), ot = W(function(r, n, t, e) {
  if (Vr(e)) return J;
  var a = o(nn, "/", e);
  if (a.b) {
    var u = a.a;
    return h(ut, r, o(rn, u, e), n, t, o(tn, u, e));
  } else return h(ut, r, "/", n, t, e);
}), it = S(function(r, n, t) {
  if (Vr(t)) return J;
  var e = o(nn, "?", t);
  if (e.b) {
    var a = e.a;
    return rr(ot, r, V(o(rn, a + 1, t)), n, o(tn, a, t));
  } else return rr(ot, r, J, n, t);
});
f(function(r, n) {
  if (Vr(n)) return J;
  var t = o(nn, "#", n);
  if (t.b) {
    var e = t.a;
    return d(it, r, V(o(rn, e + 1, n)), o(tn, e, n));
  } else return d(it, r, J, n);
});
var In = function(r) {
}, ur = br, zu = ur(0), Zt = W(function(r, n, t, e) {
  if (e.b) {
    var a = e.a, u = e.b;
    if (u.b) {
      var i = u.a, $ = u.b;
      if ($.b) {
        var c = $.a, l = $.b;
        if (l.b) {
          var v = l.a, p = l.b, s = t > 500 ? d(Pr, r, n, ir(p)) : rr(Zt, r, n, t + 1, p);
          return o(r, a, o(r, i, o(r, c, o(r, v, s))));
        } else return o(r, a, o(r, i, o(r, c, n)));
      } else return o(r, a, o(r, i, n));
    } else return o(r, a, n);
  } else return n;
}), Or = S(function(r, n, t) {
  return rr(Zt, r, n, 0, t);
}), Br = f(function(r, n) {
  return d(Or, f(function(t, e) {
    return o(G, r(t), e);
  }), w, n);
}), cr = pn, yn = f(function(r, n) {
  return o(cr, function(t) {
    return ur(r(t));
  }, n);
}), Wu = S(function(r, n, t) {
  return o(cr, function(e) {
    return o(cr, function(a) {
      return ur(o(r, e, a));
    }, t);
  }, n);
}), Kt = function(r) {
  return d(Or, Wu(G), ur(w), r);
}, Un = Aa, ku = f(function(r, n) {
  var t = n;
  return Rn(o(cr, Un(r), t));
}), qu = S(function(r, n, t) {
  return o(yn, function(e) {
    return 0;
  }, Kt(o(Br, ku(r), n)));
}), Gu = S(function(r, n, t) {
  return ur(0);
}), Qu = f(function(r, n) {
  var t = n;
  return o(yn, r, t);
});
gr.Task = At(zu, qu, Gu, Qu);
var Yu = Dt("Task"), zn = f(function(r, n) {
  return Yu(o(yn, r, n));
}), Xu = ru, wn = { $: 0 }, Zu = function(r) {
  return { $: 1, a: r };
}, Wn = function(r) {
  return d(Pr, f(function(n, t) {
    var e = n.a, a = n.b;
    return d(va, e, a, t);
  }), la(), r);
}, I = ca, Ku = function(r) {
  return Wn(_([A("host", I(r.k))]));
}, xu = function(r) {
  return { aF: r };
}, T = na, C = ra, Sn = xe, Nu = Hn(function(r, n, t, e, a, u, i, $, c) {
  return { aq: $, V: a, r, W: e, Z: t, aa: u, F: i, af: c, ag: n };
}), xt = Ze, ro = xr(function(r, n, t, e, a, u, i) {
  return { Q: a, aC: t, r, Y: n, ab: e, ae: u, af: i };
}), no = Ne, to = ta, eo = function(r) {
  return to(_([no(J), o(M, V, r)]));
}, y = Ke, Nt = o(T, function(r) {
  return o(M, r, o(C, "timestamp", xt));
}, o(T, function(r) {
  return o(M, r, o(C, "text", y));
}, o(T, function(r) {
  return o(M, r, o(C, "author_name", y));
}, o(T, function(r) {
  return o(M, r, o(C, "parent_id", eo(y)));
}, o(T, function(r) {
  return o(M, r, o(C, "guest_id", y));
}, o(T, function(r) {
  return o(M, r, o(C, "item_id", y));
}, o(T, function(r) {
  return o(M, r, o(C, "id", y));
}, sr(ro)))))))), re = o(T, function(r) {
  return o(M, r, o(C, "timestamp", xt));
}, o(T, function(r) {
  return o(M, r, o(C, "comments", Sn(Nt)));
}, o(T, function(r) {
  return o(M, r, o(C, "tags", Sn(y)));
}, o(T, function(r) {
  return o(M, r, o(C, "owner_comment", y));
}, o(T, function(r) {
  return o(M, r, o(C, "extract", y));
}, o(T, function(r) {
  return o(M, r, o(C, "image", y));
}, o(T, function(r) {
  return o(M, r, o(C, "link", y));
}, o(T, function(r) {
  return o(M, r, o(C, "title", y));
}, o(T, function(r) {
  return o(M, r, o(C, "id", y));
}, sr(Nu)))))))))), ao = o(T, function(r) {
  return o(M, r, o(C, "items", Sn(re)));
}, sr(xu)), uo = function(r) {
  return { I: Ku(r), J: ao, K: "GetFeed" };
}, oo = ua, io = f(function(r, n) {
  return { $: 3, a: r, b: n };
}), $o = function(r) {
  return { $: 0, a: r };
}, co = f(function(r, n) {
  return { $: 4, a: r, b: n };
}), fo = { $: 2 }, lo = function(r) {
  return { $: 1, a: r };
}, vo = function(r) {
  return { $: 0, a: r };
}, so = { $: 1 }, ar = { $: -2 }, An = ar, ne = function(r) {
  return !r.$;
}, $t = Da, te = je, ee = f(function(r, n) {
  r: for (; ; ) {
    if (n.$ === -2) return J;
    var t = n.b, e = n.c, a = n.d, u = n.e, i = o(te, r, t);
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
}), g = _r(function(r, n, t, e, a) {
  return { $: -1, a: r, b: n, c: t, d: e, e: a };
}), wr = _r(function(r, n, t, e, a) {
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
    var D = m.b, j = m.c, H = m.d, R = m.e, s = e.e;
    return h(g, 0, l, v, h(g, 1, D, j, H, R), h(g, 1, n, t, s, a));
  } else return h(g, r, n, t, e, a);
}), Dn = S(function(r, n, t) {
  if (t.$ === -2) return h(g, 0, r, n, ar, ar);
  var e = t.a, a = t.b, u = t.c, i = t.d, $ = t.e, c = o(te, r, a);
  switch (c) {
    case 0:
      return h(wr, e, a, u, d(Dn, r, n, i), $);
    case 1:
      return h(g, e, a, n, i, $);
    default:
      return h(wr, e, a, u, i, d(Dn, r, n, $));
  }
}), ae = S(function(r, n, t) {
  var e = d(Dn, r, n, t);
  if (e.$ === -1 && !e.a) {
    e.a;
    var a = e.b, u = e.c, i = e.d, $ = e.e;
    return h(g, 1, a, u, i, $);
  } else {
    var c = e;
    return c;
  }
}), mo = function(r) {
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
    var m = s.b, D = s.c, j = s.d, H = s.e, R = l.e;
    return h(g, 0, m, D, h(g, 1, t, e, h(g, 0, u, i, $, c), j), h(g, 1, v, p, H, R));
  } else {
    var n = r.a, t = r.b, e = r.c, E = r.d;
    E.a;
    var u = E.b, i = E.c, $ = E.d, c = E.e, L = r.e;
    L.a;
    var v = L.b, p = L.c, s = L.d, R = L.e;
    return h(g, 1, t, e, h(g, 0, u, i, $, c), h(g, 0, v, p, s, R));
  }
  else return r;
}, ct = function(r) {
  if (r.$ === -1 && r.d.$ === -1 && r.e.$ === -1) if (r.d.d.$ === -1 && !r.d.d.a) {
    var n = r.a, t = r.b, e = r.c, a = r.d;
    a.a;
    var u = a.b, i = a.c, $ = a.d;
    $.a;
    var c = $.b, l = $.c, v = $.d, p = $.e, s = a.e, m = r.e;
    m.a;
    var D = m.b, j = m.c, H = m.d, R = m.e;
    return h(g, 0, u, i, h(g, 1, c, l, v, p), h(g, 1, t, e, s, h(g, 0, D, j, H, R)));
  } else {
    var n = r.a, t = r.b, e = r.c, E = r.d;
    E.a;
    var u = E.b, i = E.c, L = E.d, s = E.e, tr = r.e;
    tr.a;
    var D = tr.b, j = tr.c, H = tr.d, R = tr.e;
    return h(g, 1, t, e, h(g, 0, u, i, L, s), h(g, 0, D, j, H, R));
  }
  else return r;
}, po = xr(function(r, n, t, e, a, u, i) {
  if (u.$ === -1 && !u.a) {
    u.a;
    var $ = u.b, c = u.c, l = u.d, v = u.e;
    return h(g, t, $, c, l, h(g, 0, e, a, v, i));
  } else {
    r: for (; ; ) if (i.$ === -1 && i.a === 1) if (i.d.$ === -1) if (i.d.a === 1) {
      i.a;
      var p = i.d;
      return p.a, ct(n);
    } else break r;
    else return i.a, i.d, ct(n);
    else break r;
    return n;
  }
}), kr = function(r) {
  if (r.$ === -1 && r.d.$ === -1) {
    var n = r.a, t = r.b, e = r.c, a = r.d, u = a.a, i = a.d, $ = r.e;
    if (u === 1) {
      if (i.$ === -1 && !i.a) return i.a, h(g, n, t, e, kr(a), $);
      var c = ue(r);
      if (c.$ === -1) {
        var l = c.a, v = c.b, p = c.c, s = c.d, m = c.e;
        return h(wr, l, v, p, kr(s), m);
      } else return ar;
    } else return h(g, n, t, e, kr(a), $);
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
  else return o(_o, r, gt(po, r, n, t, e, a, u, i));
}), _o = f(function(r, n) {
  if (n.$ === -1) {
    var t = n.a, e = n.b, a = n.c, u = n.d, i = n.e;
    if ($r(r, e)) {
      var $ = mo(i);
      if ($.$ === -1) {
        var c = $.b, l = $.c;
        return h(wr, t, c, l, u, kr(i));
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
}), bo = S(function(r, n, t) {
  var e = n(o(ee, r, t));
  if (e.$) return o(oe, r, t);
  var a = e.a;
  return d(ae, r, a, t);
}), ie = S(function(r, n, t) {
  return n(r(t));
}), ho = f(function(r, n) {
  return d(cu, "", Yt, o(ie, n, r));
}), $e = f(function(r, n) {
  if (n.$) {
    var e = n.a;
    return U(r(e));
  } else {
    var t = n.a;
    return N(t);
  }
}), go = function(r) {
  return { $: 4, a: r };
}, wo = function(r) {
  return { $: 3, a: r };
}, So = function(r) {
  return { $: 0, a: r };
}, Ao = { $: 2 }, Do = { $: 1 }, Eo = f(function(r, n) {
  switch (n.$) {
    case 0:
      var t = n.a;
      return U(So(t));
    case 1:
      return U(Do);
    case 2:
      return U(Ao);
    case 3:
      var e = n.a;
      return U(wo(e.bs));
    default:
      var a = n.b;
      return o($e, go, r(a));
  }
}), jo = f(function(r, n) {
  return o(ho, r, Eo(function(t) {
    return o($e, Wt, o(oo, n, t));
  }));
}), Ho = f(function(r, n) {
  return { $: 0, a: r, b: n };
}), Jo = Ho, Ro = function(r) {
  return o(lu, "application/json", o(Lt, 0, r));
}, ce = function(r) {
  return { $: 1, a: r };
}, fe = f(function(r, n) {
  return { aR: r, a1: n };
}), Mo = ur(o(fe, An, w)), Fo = da, Co = Rn, qr = S(function(r, n, t) {
  r: for (; ; ) if (n.b) {
    var e = n.a, a = n.b;
    if (e.$) {
      var p = e.a;
      return o(cr, function(s) {
        var m = p.bw;
        if (m.$ === 1) return d(qr, r, a, t);
        var D = m.a;
        return d(qr, r, a, d(ae, D, s, t));
      }, Co(d(au, r, Un(r), p)));
    } else {
      var u = e.a, i = o(ee, u, t);
      if (i.$ === 1) {
        var $ = r, c = a, l = t;
        r = $, n = c, t = l;
        continue r;
      } else {
        var v = i.a;
        return o(cr, function(s) {
          return d(qr, r, a, o(oe, u, t));
        }, Fo(v));
      }
    }
  } else return ur(t);
}), To = W(function(r, n, t, e) {
  return o(cr, function(a) {
    return ur(o(fe, a, t));
  }, d(qr, r, n, e.aR));
}), Bo = S(function(r, n, t) {
  var e = r(n);
  if (e.$) return t;
  var a = e.a;
  return o(G, a, t);
}), Po = f(function(r, n) {
  return d(Or, Bo(r), w, n);
}), Vo = W(function(r, n, t, e) {
  var a = e.a, u = e.b;
  return $r(n, a) ? V(o(Un, r, u(t))) : J;
}), Oo = S(function(r, n, t) {
  var e = n.a, a = n.b;
  return o(cr, function(u) {
    return ur(t);
  }, Kt(o(Po, d(Vo, r, e, a), t.a1)));
}), Lo = function(r) {
  return { $: 0, a: r };
}, Io = f(function(r, n) {
  if (n.$) {
    var e = n.a;
    return ce({ ba: e.ba, I: e.I, bf: o(fu, r, e.bf), bh: e.bh, bl: e.bl, bv: e.bv, bw: e.bw, by: e.by });
  } else {
    var t = n.a;
    return Lo(t);
  }
}), yo = f(function(r, n) {
  return { $: 0, a: r, b: n };
}), Uo = f(function(r, n) {
  var t = n.a, e = n.b;
  return o(yo, t, o(ie, e, r));
});
gr.Http = At(Mo, To, Oo, Io, Uo);
var zo = Dt("Http"), Wo = function(r) {
  return zo(ce({ ba: false, I: r.I, bf: r.bf, bh: r.bh, bl: r.bl, bv: r.bv, bw: r.bw, by: r.by }));
}, kn = f(function(r, n) {
  return Wo({ I: Ro(n.I), bf: o(jo, r, n.J), bh: _([o(Jo, "X-RPC-Endpoint", n.K)]), bl: "POST", bv: J, bw: J, by: "/api" });
}), En = o(kn, Zu, uo({ k: "localhost" })), ko = A({ Q: "", n: wn, t: "", z: J }, En), qo = Et, Go = qo(w), ln = function(r) {
  return { $: 2, a: r };
}, Qo = function(r) {
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
}, Yo = Et, er = Yo(w), Xo = function(r) {
  return { $: 7, a: r };
}, ft = S(function(r, n, t) {
  return r(n(t));
}), lt = f(function(r, n) {
  if (n.$) return J;
  var t = n.a;
  return V(r(t));
}), vt = ma, st = f(function(r, n) {
  if (n.$) return r;
  var t = n.a;
  return t;
}), Zo = function(r) {
  return Wn(_([A("host", I(r.k)), A("item_id", I(r.Y)), A("parent_id", o(ft, st(vt), lt(I))(r.ab)), A("text", I(r.ae)), A("author_name", o(ft, st(vt), lt(I))(r.Q))]));
}, Ko = function(r) {
  return { ap: r };
}, xo = o(T, function(r) {
  return o(M, r, o(C, "comment", Nt));
}, sr(Ko)), No = function(r) {
  return { I: Zo(r), J: xo, K: "SubmitComment" };
}, ri = function(r) {
  var n = r.z;
  if (n.$) return er;
  var t = n.a.Y, e = n.a.ab;
  return o(kn, Xo, No({ Q: Vr(r.Q) ? J : V(r.Q), k: "localhost", Y: t, ab: e, ae: r.t }));
}, ni = function(r) {
  return { $: 2, a: r };
}, ti = f(function(r, n) {
  return d(Pr, sa(r), fa(), n);
}), ei = function(r) {
  return Wn(_([A("host", I(r.k)), A("title", I(r.ag)), A("link", I(r.Z)), A("image", I(r.W)), A("extract", I(r.V)), A("owner_comment", I(r.aa)), A("tags", ti(I)(r.F))]));
}, ai = function(r) {
  return { aE: r };
}, ui = o(T, function(r) {
  return o(M, r, o(C, "item", re));
}, sr(ai)), oi = function(r) {
  return { I: ei(r), J: ui, K: "SubmitItem" };
}, ii = o(kn, ni, oi({ V: "This item was submitted via the generated Elm API.", k: "localhost", W: "https://placehold.co/100x100", Z: "https://elm-lang.org", aa: "So much cleaner!", F: w, ag: "New Item from Elm" })), $i = f(function(r, n) {
  switch (r.$) {
    case 0:
      return A(n, ii);
    case 1:
      if (r.a.$) {
        var e = r.a.a;
        return A(Z(n, { n: ln("Failed to fetch feed: " + vn(e)) }), er);
      } else {
        var t = r.a.a;
        return A(Z(n, { n: Qo(t.aF) }), er);
      }
    case 2:
      if (r.a.$) {
        var e = r.a.a;
        return A(Z(n, { n: ln("Failed to submit item: " + vn(e)) }), er);
      } else {
        var t = r.a.a;
        return A(Z(n, { n: wn }), En);
      }
    case 3:
      var a = r.a, u = r.b;
      return A(Z(n, { t: "", z: V({ Y: a, ab: u }) }), er);
    case 4:
      var i = r.a;
      return A(Z(n, { t: i }), er);
    case 5:
      var $ = r.a;
      return A(Z(n, { Q: $ }), er);
    case 6:
      return A(n, ri(n));
    case 7:
      if (r.a.$) {
        var e = r.a.a;
        return A(Z(n, { n: ln("Failed to submit comment: " + vn(e)) }), er);
      } else return A(Z(n, { n: wn, t: "", z: J }), En);
    default:
      return A(Z(n, { t: "", z: J }), er);
  }
}), ci = { $: 0 }, Jr = k("button"), B = k("div"), fi = k("h1"), li = function(r) {
  return { $: 0, a: r };
}, le = jt, vi = f(function(r, n) {
  return o(le, r, li(n));
}), Rr = function(r) {
  return o(vi, "click", sr(r));
}, si = Ma, b = si, mi = _n, P = mi, ve = k("h2"), pi = k("a"), se = f(function(r, n) {
  return d(Or, f(function(t, e) {
    return r(t) ? o(G, t, e) : e;
  }), w, n);
}), _i = function(r) {
  return o(se, function(n) {
    return $r(n.ab, J);
  }, r);
}, bi = k("h3"), en = f(function(r, n) {
  return o(Fa, r, I(n));
}), hi = function(r) {
  return o(en, "href", Pa(r));
}, di = k("img"), gi = k("p"), wi = k("section"), Si = function(r) {
  return o(en, "src", Va(r));
}, Ai = f(function(r, n) {
  return o(se, function(t) {
    return $r(t.ab, V(r));
  }, n);
}), Di = { $: 8 }, Ei = { $: 6 }, ji = function(r) {
  return { $: 5, a: r };
}, Hi = function(r) {
  return { $: 4, a: r };
}, mt = f(function(r, n) {
  return { $: 3, a: r, b: n };
}), Ji = k("input"), Ri = function(r) {
  return A(r, true);
}, Mi = function(r) {
  return { $: 1, a: r };
}, Fi = f(function(r, n) {
  return o(le, r, Mi(n));
}), Ci = f(function(r, n) {
  return d(Or, C, n, r);
}), Ti = o(Ci, _(["target", "value"]), y), pt = function(r) {
  return o(Fi, "input", o(M, Ri, o(M, r, Ti)));
}, _t = en("placeholder"), Bi = k("textarea"), bt = en("value"), me = S(function(r, n, t) {
  var e = r.z;
  if (e.$) return o(Jr, _([Rr(o(mt, n, t)), o(b, "font-size", "0.8em"), o(b, "color", "gray"), o(b, "background", "none"), o(b, "border", "none"), o(b, "cursor", "pointer"), o(b, "text-decoration", "underline")]), _([P("Reply")]));
  var a = e.a;
  return $r(a.Y, n) && $r(a.ab, t) ? o(B, _([o(b, "margin-top", "5px"), o(b, "background", "#f0f0f0"), o(b, "padding", "10px")]), _([o(Ji, _([_t("Your Name (Optional for returning users)"), bt(r.Q), pt(ji), o(b, "display", "block"), o(b, "margin-bottom", "5px"), o(b, "width", "100%")]), w), o(Bi, _([_t("Write a reply..."), bt(r.t), pt(Hi), o(b, "width", "100%"), o(b, "height", "60px")]), w), o(B, _([o(b, "margin-top", "5px")]), _([o(Jr, _([Rr(Ei), o(b, "margin-right", "5px")]), _([P("Submit")])), o(Jr, _([Rr(Di)]), _([P("Cancel")]))]))])) : o(Jr, _([Rr(o(mt, n, t)), o(b, "font-size", "0.8em"), o(b, "color", "gray"), o(b, "background", "none"), o(b, "border", "none"), o(b, "cursor", "pointer"), o(b, "text-decoration", "underline")]), _([P("Reply")]));
}), pe = W(function(r, n, t, e) {
  return o(B, _([o(b, "margin-left", "20px"), o(b, "margin-top", "10px"), o(b, "border-left", "2px solid #eee"), o(b, "padding-left", "10px")]), _([o(B, _([o(b, "font-weight", "bold"), o(b, "font-size", "0.9em")]), _([P(e.Q)])), o(B, w, _([P(e.ae)])), d(me, r, n, V(e.r)), o(B, w, o(Br, d(pe, r, n, t), o(Ai, e.r, t)))]));
}), Pi = function(r) {
  return o(B, _([o(b, "display", "inline-block"), o(b, "background-color", "#e0e0e0"), o(b, "color", "#333"), o(b, "padding", "2px 8px"), o(b, "border-radius", "12px"), o(b, "font-size", "0.85em"), o(b, "margin-right", "5px")]), _([P(r)]));
}, Vi = f(function(r, n) {
  return o(wi, _([o(b, "border", "1px solid #ddd"), o(b, "padding", "15px"), o(b, "margin-bottom", "15px"), o(b, "border-radius", "8px")]), _([o(ve, w, _([P(n.ag)])), o(pi, _([hi(n.Z), o(b, "color", "blue")]), _([P(n.Z)])), o(B, _([o(b, "margin", "10px 0")]), _([o(di, _([Si(n.W), o(b, "max-width", "100%"), o(b, "height", "auto")]), w)])), o(gi, w, _([P(n.V)])), o(B, _([o(b, "margin-bottom", "10px")]), o(Br, Pi, n.F)), o(B, _([o(b, "background", "#f9f9f9"), o(b, "padding", "10px"), o(b, "font-style", "italic")]), _([P("Owner: " + n.aa)])), o(B, _([o(b, "margin-top", "20px"), o(b, "border-top", "1px solid #eee"), o(b, "padding-top", "10px")]), _([o(bi, w, _([P("Comments")])), o(B, w, o(Br, d(pe, r, n.r, n.aq), _i(n.aq))), d(me, r, n.r, J)]))]));
}), Oi = function(r) {
  var n = r.n;
  switch (n.$) {
    case 0:
      return o(B, w, _([P("Loading Feed...")]));
    case 1:
      var t = n.a;
      return o(B, w, o(Br, Vi(r), t));
    default:
      var e = n.a;
      return o(B, _([o(b, "color", "red")]), _([o(ve, w, _([P("Error")])), o(B, w, _([P(e)]))]));
  }
}, Li = function(r) {
  return o(B, _([o(b, "font-family", "sans-serif"), o(b, "max-width", "800px"), o(b, "margin", "0 auto"), o(b, "padding", "20px")]), _([o(fi, w, _([P("Horatio Reader")])), o(Jr, _([Rr(ci), o(b, "margin-bottom", "20px")]), _([P("Test: Submit Item")])), Oi(r)]));
}, Ii = Xu({ bk: function(r) {
  return ko;
}, bu: function(r) {
  return Go;
}, bx: $i, bz: Li });
const yi = { Main: { init: Ii(sr(0))(0) } };
async function Ui() {
  return { canvas: await zi(), webgl: await Wi(), fonts: await ki(), audio: await qi(), performance: Gi() };
}
async function zi() {
  const r = document.createElement("canvas"), n = r.getContext("2d");
  return n.textBaseline = "top", n.font = "14px Arial", n.fillText("Browser fingerprint \u{1F512}", 2, 2), n.fillStyle = "rgba(255,0,0,0.5)", n.fillRect(0, 0, 100, 50), r.toDataURL();
}
async function Wi() {
  const r = document.createElement("canvas"), n = r.getContext("webgl") || r.getContext("experimental-webgl");
  return n ? { renderer: n.getParameter(n.RENDERER), vendor: n.getParameter(n.VENDOR), extensions: n.getSupportedExtensions(), params: { maxTextureSize: n.getParameter(n.MAX_TEXTURE_SIZE), maxViewportDims: n.getParameter(n.MAX_VIEWPORT_DIMS) } } : "no-webgl";
}
async function ki() {
  const r = ["Arial", "Times", "Courier", "Helvetica", "Georgia"], n = {};
  for (const t of r) {
    const e = document.createElement("span");
    e.style.font = `16px ${t}`, e.textContent = "mmmmmmmmmmlli", document.body.appendChild(e), n[t] = { width: e.offsetWidth, height: e.offsetHeight }, document.body.removeChild(e);
  }
  return n;
}
async function qi() {
  if (!window.AudioContext && !window.webkitAudioContext) return "no-audio";
  const r = window.AudioContext || window.webkitAudioContext, n = new r(), t = n.createOscillator(), e = n.createAnalyser();
  t.connect(e), e.connect(n.destination), t.start(0);
  const a = e.frequencyBinCount, u = new Uint8Array(a);
  return e.getByteFrequencyData(u), t.stop(), n.close(), Array.from(u.slice(0, 32));
}
function Gi() {
  const r = performance.now();
  return { timing: performance.now() - r, memory: performance.memory ? { used: performance.memory.usedJSHeapSize, total: performance.memory.totalJSHeapSize } : null, navigation: performance.navigation ? performance.navigation.type : null };
}
console.log("Horatio Client v1.0.0 - Ports Debug");
async function Qi() {
  try {
    await ht(), console.log("WASM module initialized successfully.");
  } catch (n) {
    console.error("Failed to initialize WASM module:", n);
    return;
  }
  try {
    const n = await Ui(), t = he(JSON.stringify(n));
    window.HAMLET_SESSION_ID = t, console.log("Generated Session ID:", t);
  } catch (n) {
    console.error("Failed to generate session ID:", n), window.HAMLET_SESSION_ID = "fallback-session-id";
  }
  const r = yi.Main.init({ node: document.getElementById("app") });
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
      const u = ge(n, JSON.stringify(t));
      console.log("Encoded request:", u), fetch("/api", { method: "POST", headers: { "Content-Type": "application/json", "X-RPC-Endpoint": n, "X-Session-ID": window.HAMLET_SESSION_ID || "unknown-session" }, body: u }).then(async (i) => {
        if (!i.ok) throw new Error(`HTTP error! status: ${i.status}`);
        return i.text();
      }).then((i) => {
        console.log("Received response from server:", i);
        const $ = de(n, i);
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
Qi();
