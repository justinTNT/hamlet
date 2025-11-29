(function() {
  const n = document.createElement("link").relList;
  if (n && n.supports && n.supports("modulepreload")) return;
  for (const a of document.querySelectorAll('link[rel="modulepreload"]')) t(a);
  new MutationObserver((a) => {
    for (const u of a) if (u.type === "childList") for (const i of u.addedNodes) i.tagName === "LINK" && i.rel === "modulepreload" && t(i);
  }).observe(document, { childList: true, subtree: true });
  function e(a) {
    const u = {};
    return a.integrity && (u.integrity = a.integrity), a.referrerPolicy && (u.referrerPolicy = a.referrerPolicy), a.crossOrigin === "use-credentials" ? u.credentials = "include" : a.crossOrigin === "anonymous" ? u.credentials = "omit" : u.credentials = "same-origin", u;
  }
  function t(a) {
    if (a.ep) return;
    a.ep = true;
    const u = e(a);
    fetch(a.href, u);
  }
})();
function $r(r, n, e) {
  return e.a = r, e.f = n, e;
}
function c(r) {
  return $r(2, r, function(n) {
    return function(e) {
      return r(n, e);
    };
  });
}
function j(r) {
  return $r(3, r, function(n) {
    return function(e) {
      return function(t) {
        return r(n, e, t);
      };
    };
  });
}
function rr(r) {
  return $r(4, r, function(n) {
    return function(e) {
      return function(t) {
        return function(a) {
          return r(n, e, t, a);
        };
      };
    };
  });
}
function sr(r) {
  return $r(5, r, function(n) {
    return function(e) {
      return function(t) {
        return function(a) {
          return function(u) {
            return r(n, e, t, a, u);
          };
        };
      };
    };
  });
}
function qr(r) {
  return $r(6, r, function(n) {
    return function(e) {
      return function(t) {
        return function(a) {
          return function(u) {
            return function(i) {
              return r(n, e, t, a, u, i);
            };
          };
        };
      };
    };
  });
}
function Ir(r) {
  return $r(7, r, function(n) {
    return function(e) {
      return function(t) {
        return function(a) {
          return function(u) {
            return function(i) {
              return function($) {
                return r(n, e, t, a, u, i, $);
              };
            };
          };
        };
      };
    };
  });
}
function Kn(r) {
  return $r(8, r, function(n) {
    return function(e) {
      return function(t) {
        return function(a) {
          return function(u) {
            return function(i) {
              return function($) {
                return function(f) {
                  return r(n, e, t, a, u, i, $, f);
                };
              };
            };
          };
        };
      };
    };
  });
}
function yn(r) {
  return $r(9, r, function(n) {
    return function(e) {
      return function(t) {
        return function(a) {
          return function(u) {
            return function(i) {
              return function($) {
                return function(f) {
                  return function(v) {
                    return r(n, e, t, a, u, i, $, f, v);
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
function o(r, n, e) {
  return r.a === 2 ? r.f(n, e) : r(n)(e);
}
function A(r, n, e, t) {
  return r.a === 3 ? r.f(n, e, t) : r(n)(e)(t);
}
function Z(r, n, e, t, a) {
  return r.a === 4 ? r.f(n, e, t, a) : r(n)(e)(t)(a);
}
function b(r, n, e, t, a, u) {
  return r.a === 5 ? r.f(n, e, t, a, u) : r(n)(e)(t)(a)(u);
}
function xr(r, n, e, t, a, u, i) {
  return r.a === 6 ? r.f(n, e, t, a, u, i) : r(n)(e)(t)(a)(u)(i);
}
function Nn(r, n, e, t, a, u, i, $) {
  return r.a === 7 ? r.f(n, e, t, a, u, i, $) : r(n)(e)(t)(a)(u)(i)($);
}
function Te(r, n, e, t, a, u, i, $, f) {
  return r.a === 8 ? r.f(n, e, t, a, u, i, $, f) : r(n)(e)(t)(a)(u)(i)($)(f);
}
var Ce = [];
function He(r) {
  return r.length;
}
var Re = j(function(r, n, e) {
  for (var t = new Array(r), a = 0; a < r; a++) t[a] = e(n + a);
  return t;
}), Le = c(function(r, n) {
  for (var e = new Array(r), t = 0; t < r && n.b; t++) e[t] = n.a, n = n.b;
  return e.length = t, w(e, n);
});
c(function(r, n) {
  return n[r];
});
j(function(r, n, e) {
  for (var t = e.length, a = new Array(t), u = 0; u < t; u++) a[u] = e[u];
  return a[r] = n, a;
});
c(function(r, n) {
  for (var e = n.length, t = new Array(e + 1), a = 0; a < e; a++) t[a] = n[a];
  return t[e] = r, t;
});
j(function(r, n, e) {
  for (var t = e.length, a = 0; a < t; a++) n = o(r, e[a], n);
  return n;
});
var Me = j(function(r, n, e) {
  for (var t = e.length - 1; t >= 0; t--) n = o(r, e[t], n);
  return n;
});
c(function(r, n) {
  for (var e = n.length, t = new Array(e), a = 0; a < e; a++) t[a] = r(n[a]);
  return t;
});
j(function(r, n, e) {
  for (var t = e.length, a = new Array(t), u = 0; u < t; u++) a[u] = o(r, n + u, e[u]);
  return a;
});
j(function(r, n, e) {
  return e.slice(r, n);
});
j(function(r, n, e) {
  var t = n.length, a = r - t;
  a > e.length && (a = e.length);
  for (var u = t + a, i = new Array(u), $ = 0; $ < t; $++) i[$] = n[$];
  for (var $ = 0; $ < a; $++) i[$ + t] = e[$];
  return i;
});
c(function(r, n) {
  return n;
});
c(function(r, n) {
  return console.log(r + ": " + qe()), n;
});
function qe(r) {
  return "<internals>";
}
function pr(r) {
  throw new Error("https://github.com/elm/core/blob/1.0.0/hints/" + r + ".md");
}
function Jr(r, n) {
  for (var e, t = [], a = rn(r, n, 0, t); a && (e = t.pop()); a = rn(e.a, e.b, 0, t)) ;
  return a;
}
function rn(r, n, e, t) {
  if (r === n) return true;
  if (typeof r != "object" || r === null || n === null) return typeof r == "function" && pr(5), false;
  if (e > 100) return t.push(w(r, n)), true;
  r.$ < 0 && (r = Mn(r), n = Mn(n));
  for (var a in r) if (!rn(r[a], n[a], e + 1, t)) return false;
  return true;
}
c(Jr);
c(function(r, n) {
  return !Jr(r, n);
});
function L(r, n, e) {
  if (typeof r != "object") return r === n ? 0 : r < n ? -1 : 1;
  if (typeof r.$ > "u") return (e = L(r.a, n.a)) || (e = L(r.b, n.b)) ? e : L(r.c, n.c);
  for (; r.b && n.b && !(e = L(r.a, n.a)); r = r.b, n = n.b) ;
  return e || (r.b ? 1 : n.b ? -1 : 0);
}
c(function(r, n) {
  return L(r, n) < 0;
});
c(function(r, n) {
  return L(r, n) < 1;
});
c(function(r, n) {
  return L(r, n) > 0;
});
c(function(r, n) {
  return L(r, n) >= 0;
});
var Ie = c(function(r, n) {
  var e = L(r, n);
  return e < 0 ? le : e ? _a : ve;
}), hr = 0;
function w(r, n) {
  return { a: r, b: n };
}
function O(r, n) {
  var e = {};
  for (var t in r) e[t] = r[t];
  for (var t in n) e[t] = n[t];
  return e;
}
c(Ue);
function Ue(r, n) {
  if (typeof r == "string") return r + n;
  if (!r.b) return n;
  var e = x(r.a, n);
  r = r.b;
  for (var t = e; r.b; r = r.b) t = t.b = x(r.a, n);
  return e;
}
var d = { $: 0 };
function x(r, n) {
  return { $: 1, a: r, b: n };
}
var We = c(x);
function p(r) {
  for (var n = d, e = r.length; e--; ) n = x(r[e], n);
  return n;
}
function fn(r) {
  for (var n = []; r.b; r = r.b) n.push(r.a);
  return n;
}
var Qe = j(function(r, n, e) {
  for (var t = []; n.b && e.b; n = n.b, e = e.b) t.push(o(r, n.a, e.a));
  return p(t);
});
rr(function(r, n, e, t) {
  for (var a = []; n.b && e.b && t.b; n = n.b, e = e.b, t = t.b) a.push(A(r, n.a, e.a, t.a));
  return p(a);
});
sr(function(r, n, e, t, a) {
  for (var u = []; n.b && e.b && t.b && a.b; n = n.b, e = e.b, t = t.b, a = a.b) u.push(Z(r, n.a, e.a, t.a, a.a));
  return p(u);
});
qr(function(r, n, e, t, a, u) {
  for (var i = []; n.b && e.b && t.b && a.b && u.b; n = n.b, e = e.b, t = t.b, a = a.b, u = u.b) i.push(b(r, n.a, e.a, t.a, a.a, u.a));
  return p(i);
});
c(function(r, n) {
  return p(fn(n).sort(function(e, t) {
    return L(r(e), r(t));
  }));
});
c(function(r, n) {
  return p(fn(n).sort(function(e, t) {
    var a = o(r, e, t);
    return a === ve ? 0 : a === le ? -1 : 1;
  }));
});
c(function(r, n) {
  return r + n;
});
c(function(r, n) {
  return r - n;
});
c(function(r, n) {
  return r * n;
});
c(function(r, n) {
  return r / n;
});
c(function(r, n) {
  return r / n | 0;
});
c(Math.pow);
c(function(r, n) {
  return n % r;
});
c(function(r, n) {
  var e = n % r;
  return r === 0 ? pr(11) : e > 0 && r < 0 || e < 0 && r > 0 ? e + r : e;
});
c(Math.atan2);
var ze = Math.ceil, Ge = Math.floor, Fn = Math.log;
c(function(r, n) {
  return r && n;
});
c(function(r, n) {
  return r || n;
});
c(function(r, n) {
  return r !== n;
});
c(function(r, n) {
  return r + n;
});
function Xe(r) {
  var n = r.charCodeAt(0);
  return isNaN(n) ? V : W(55296 <= n && n <= 56319 ? w(r[0] + r[1], r.slice(2)) : w(r[0], r.slice(1)));
}
c(function(r, n) {
  return r + n;
});
function Ye(r) {
  return r.length;
}
c(function(r, n) {
  for (var e = n.length, t = new Array(e), a = 0; a < e; ) {
    var u = n.charCodeAt(a);
    if (55296 <= u && u <= 56319) {
      t[a] = r(n[a] + n[a + 1]), a += 2;
      continue;
    }
    t[a] = r(n[a]), a++;
  }
  return t.join("");
});
c(function(r, n) {
  for (var e = [], t = n.length, a = 0; a < t; ) {
    var u = n[a], i = n.charCodeAt(a);
    a++, 55296 <= i && i <= 56319 && (u += n[a], a++), r(u) && e.push(u);
  }
  return e.join("");
});
j(function(r, n, e) {
  for (var t = e.length, a = 0; a < t; ) {
    var u = e[a], i = e.charCodeAt(a);
    a++, 55296 <= i && i <= 56319 && (u += e[a], a++), n = o(r, u, n);
  }
  return n;
});
j(function(r, n, e) {
  for (var t = e.length; t--; ) {
    var a = e[t], u = e.charCodeAt(t);
    56320 <= u && u <= 57343 && (t--, a = e[t] + a), n = o(r, a, n);
  }
  return n;
});
var Ze = c(function(r, n) {
  return n.split(r);
}), ke = c(function(r, n) {
  return n.join(r);
}), Ke = j(function(r, n, e) {
  return e.slice(r, n);
});
c(function(r, n) {
  for (var e = n.length; e--; ) {
    var t = n[e], a = n.charCodeAt(e);
    if (56320 <= a && a <= 57343 && (e--, t = n[e] + t), r(t)) return true;
  }
  return false;
});
var ye = c(function(r, n) {
  for (var e = n.length; e--; ) {
    var t = n[e], a = n.charCodeAt(e);
    if (56320 <= a && a <= 57343 && (e--, t = n[e] + t), !r(t)) return false;
  }
  return true;
}), Ne = c(function(r, n) {
  return n.indexOf(r) > -1;
}), xe = c(function(r, n) {
  return n.indexOf(r) === 0;
});
c(function(r, n) {
  return n.length >= r.length && n.lastIndexOf(r) === n.length - r.length;
});
var rt = c(function(r, n) {
  var e = r.length;
  if (e < 1) return d;
  for (var t = 0, a = []; (t = n.indexOf(r, t)) > -1; ) a.push(t), t = t + e;
  return p(a);
});
function nt(r) {
  return r + "";
}
function et(r) {
  for (var n = 0, e = r.charCodeAt(0), t = e == 43 || e == 45 ? 1 : 0, a = t; a < r.length; ++a) {
    var u = r.charCodeAt(a);
    if (u < 48 || 57 < u) return V;
    n = 10 * n + u - 48;
  }
  return a == t ? V : W(e == 45 ? -n : n);
}
function tt(r) {
  var n = r.charCodeAt(0);
  return 55296 <= n && n <= 56319 ? (n - 55296) * 1024 + r.charCodeAt(1) - 56320 + 65536 : n;
}
function at(r) {
  return { $: 0, a: r };
}
function cn(r) {
  return { $: 2, b: r };
}
var ut = cn(function(r) {
  return typeof r != "number" ? y("an INT", r) : -2147483647 < r && r < 2147483647 && (r | 0) === r || isFinite(r) && !(r % 1) ? U(r) : y("an INT", r);
}), it = cn(function(r) {
  return U(r);
}), ot = cn(function(r) {
  return typeof r == "string" ? U(r) : r instanceof String ? U(r + "") : y("a STRING", r);
});
function $t(r) {
  return { $: 3, b: r };
}
var ft = c(function(r, n) {
  return { $: 6, d: r, b: n };
});
c(function(r, n) {
  return { $: 7, e: r, b: n };
});
function fr(r, n) {
  return { $: 9, f: r, g: n };
}
var ct = c(function(r, n) {
  return { $: 10, b: n, h: r };
});
function vt(r) {
  return { $: 11, g: r };
}
var lt = c(function(r, n) {
  return fr(r, [n]);
}), st = j(function(r, n, e) {
  return fr(r, [n, e]);
}), mt = rr(function(r, n, e, t) {
  return fr(r, [n, e, t]);
});
sr(function(r, n, e, t, a) {
  return fr(r, [n, e, t, a]);
});
qr(function(r, n, e, t, a, u) {
  return fr(r, [n, e, t, a, u]);
});
Ir(function(r, n, e, t, a, u, i) {
  return fr(r, [n, e, t, a, u, i]);
});
Kn(function(r, n, e, t, a, u, i, $) {
  return fr(r, [n, e, t, a, u, i, $]);
});
yn(function(r, n, e, t, a, u, i, $, f) {
  return fr(r, [n, e, t, a, u, i, $, f]);
});
c(function(r, n) {
  try {
    var e = JSON.parse(n);
    return M(r, e);
  } catch (t) {
    return X(o(Dn, "This is not valid JSON! " + t.message, n));
  }
});
var vn = c(function(r, n) {
  return M(r, n);
});
function M(r, n) {
  switch (r.$) {
    case 2:
      return r.b(n);
    case 5:
      return n === null ? U(r.c) : y("null", n);
    case 3:
      return Fr(n) ? Bn(r.b, n, p) : y("a LIST", n);
    case 4:
      return Fr(n) ? Bn(r.b, n, _t) : y("an ARRAY", n);
    case 6:
      var e = r.d;
      if (typeof n != "object" || n === null || !(e in n)) return y("an OBJECT with a field named `" + e + "`", n);
      var v = M(r.b, n[e]);
      return z(v) ? v : X(o(qn, e, v.a));
    case 7:
      var t = r.e;
      if (!Fr(n)) return y("an ARRAY", n);
      if (t >= n.length) return y("a LONGER array. Need index " + t + " but only see " + n.length + " entries", n);
      var v = M(r.b, n[t]);
      return z(v) ? v : X(o(se, t, v.a));
    case 8:
      if (typeof n != "object" || n === null || Fr(n)) return y("an OBJECT", n);
      var a = d;
      for (var u in n) if (Object.prototype.hasOwnProperty.call(n, u)) {
        var v = M(r.b, n[u]);
        if (!z(v)) return X(o(qn, u, v.a));
        a = x(w(u, v.a), a);
      }
      return U(or(a));
    case 9:
      for (var i = r.f, $ = r.g, f = 0; f < $.length; f++) {
        var v = M($[f], n);
        if (!z(v)) return v;
        i = i(v.a);
      }
      return U(i);
    case 10:
      var v = M(r.b, n);
      return z(v) ? M(r.h(v.a), n) : v;
    case 11:
      for (var l = d, m = r.g; m.b; m = m.b) {
        var v = M(m.a, n);
        if (z(v)) return v;
        l = x(v.a, l);
      }
      return X(ba(or(l)));
    case 1:
      return X(o(Dn, r.a, n));
    case 0:
      return U(r.a);
  }
}
function Bn(r, n, e) {
  for (var t = n.length, a = new Array(t), u = 0; u < t; u++) {
    var i = M(r, n[u]);
    if (!z(i)) return X(o(se, u, i.a));
    a[u] = i.a;
  }
  return U(e(a));
}
function Fr(r) {
  return Array.isArray(r) || typeof FileList < "u" && r instanceof FileList;
}
function _t(r) {
  return o(qa, r.length, function(n) {
    return r[n];
  });
}
function y(r, n) {
  return X(o(Dn, "Expecting " + r, n));
}
function _r(r, n) {
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
      return _r(r.b, n.b);
    case 6:
      return r.d === n.d && _r(r.b, n.b);
    case 7:
      return r.e === n.e && _r(r.b, n.b);
    case 9:
      return r.f === n.f && On(r.g, n.g);
    case 10:
      return r.h === n.h && _r(r.b, n.b);
    case 11:
      return On(r.g, n.g);
  }
}
function On(r, n) {
  var e = r.length;
  if (e !== n.length) return false;
  for (var t = 0; t < e; t++) if (!_r(r[t], n[t])) return false;
  return true;
}
var bt = c(function(r, n) {
  return JSON.stringify(n, null, r) + "";
});
function pt(r) {
  return r;
}
function ht() {
  return {};
}
var gt = j(function(r, n, e) {
  var t = n;
  return r === "toJSON" && typeof t == "function" || (e[r] = t), e;
});
function cr(r) {
  return { $: 0, a: r };
}
function Dt(r) {
  return { $: 1, a: r };
}
function nr(r) {
  return { $: 2, b: r, c: null };
}
var nn = c(function(r, n) {
  return { $: 3, b: r, d: n };
});
c(function(r, n) {
  return { $: 4, b: r, d: n };
});
function At(r) {
  return { $: 5, b: r };
}
var wt = 0;
function ln(r) {
  var n = { $: 0, e: wt++, f: r, g: null, h: [] };
  return sn(n), n;
}
function xn(r) {
  return nr(function(n) {
    n(cr(ln(r)));
  });
}
function re(r, n) {
  r.h.push(n), sn(r);
}
var jt = c(function(r, n) {
  return nr(function(e) {
    re(r, n), e(cr(hr));
  });
}), kr = false, Tn = [];
function sn(r) {
  if (Tn.push(r), !kr) {
    for (kr = true; r = Tn.shift(); ) St(r);
    kr = false;
  }
}
function St(r) {
  for (; r.f; ) {
    var n = r.f.$;
    if (n === 0 || n === 1) {
      for (; r.g && r.g.$ !== n; ) r.g = r.g.i;
      if (!r.g) return;
      r.f = r.g.b(r.f.a), r.g = r.g.i;
    } else if (n === 2) {
      r.f.c = r.f.b(function(e) {
        r.f = e, sn(r);
      });
      return;
    } else if (n === 5) {
      if (r.h.length === 0) return;
      r.f = r.f.b(r.h.shift());
    } else r.g = { $: n === 3 ? 0 : 1, b: r.f.b, i: r.g }, r.f = r.f.d;
  }
}
function Pt(r) {
  return nr(function(n) {
    var e = setTimeout(function() {
      n(cr(hr));
    }, r);
    return function() {
      clearTimeout(e);
    };
  });
}
rr(function(r, n, e, t) {
  return mn(n, t, r.a$, r.bc, r.ba, function() {
    return function() {
    };
  });
});
function mn(r, n, e, t, a, u) {
  var i = o(vn, r, n ? n.flags : void 0);
  z(i) || pr(2);
  var $ = {}, f = e(i.a), v = f.a, l = u(s, v), m = Et($, s);
  function s(_, D) {
    var P = o(t, _, v);
    l(v = P.a, D), Hn($, P.b, a(v));
  }
  return Hn($, f.b, a(v)), m ? { ports: m } : {};
}
var H = {};
function Et(r, n) {
  var e;
  for (var t in H) {
    var a = H[t];
    a.a && (e = e || {}, e[t] = a.a(t, n)), r[t] = dt(a, n);
  }
  return e;
}
function Jt(r, n, e, t, a) {
  return { b: r, c: n, d: e, e: t, f: a };
}
function dt(r, n) {
  var e = { g: n, h: void 0 }, t = r.c, a = r.d, u = r.e, i = r.f;
  function $(f) {
    return o(nn, $, At(function(v) {
      var l = v.a;
      return v.$ === 0 ? A(a, e, l, f) : u && i ? Z(t, e, l.i, l.j, f) : A(t, e, u ? l.i : l.j, f);
    }));
  }
  return e.h = ln(o(nn, $, r.b));
}
var Vt = c(function(r, n) {
  return nr(function(e) {
    r.g(n), e(cr(hr));
  });
});
c(function(r, n) {
  return o(jt, r.h, { $: 0, a: n });
});
function _n(r) {
  return function(n) {
    return { $: 1, k: r, l: n };
  };
}
function Ft(r) {
  return { $: 2, m: r };
}
c(function(r, n) {
  return { $: 3, n: r, o: n };
});
var Cn = [], Kr = false;
function Hn(r, n, e) {
  if (Cn.push({ p: r, q: n, r: e }), !Kr) {
    Kr = true;
    for (var t; t = Cn.shift(); ) Bt(t.p, t.q, t.r);
    Kr = false;
  }
}
function Bt(r, n, e) {
  var t = {};
  Tr(true, n, t, null), Tr(false, e, t, null);
  for (var a in r) re(r[a], { $: "fx", a: t[a] || { i: d, j: d } });
}
function Tr(r, n, e, t) {
  switch (n.$) {
    case 1:
      var a = n.k, u = Ot(r, a, t, n.l);
      e[a] = Tt(r, u, e[a]);
      return;
    case 2:
      for (var i = n.m; i.b; i = i.b) Tr(r, i.a, e, t);
      return;
    case 3:
      Tr(r, n.o, e, { s: n.n, t });
      return;
  }
}
function Ot(r, n, e, t) {
  function a(i) {
    for (var $ = e; $; $ = $.t) i = $.s(i);
    return i;
  }
  var u = r ? H[n].e : H[n].f;
  return o(u, a, t);
}
function Tt(r, n, e) {
  return e = e || { i: d, j: d }, r ? e.i = x(n, e.i) : e.j = x(n, e.j), e;
}
function ne(r) {
  H[r] && pr(3);
}
function Ct(r, n) {
  return ne(r), H[r] = { e: Ht, u: n, a: Rt }, _n(r);
}
var Ht = c(function(r, n) {
  return n;
});
function Rt(r) {
  var n = [], e = H[r].u, t = Pt(0);
  H[r].b = t, H[r].c = j(function(i, $, f) {
    for (; $.b; $ = $.b) for (var v = n, l = e($.a), m = 0; m < v.length; m++) v[m](l);
    return t;
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
function Lt(r, n) {
  return ne(r), H[r] = { f: Mt, u: n, a: qt }, _n(r);
}
var Mt = c(function(r, n) {
  return function(e) {
    return r(n(e));
  };
});
function qt(r, n) {
  var e = d, t = H[r].u, a = cr(null);
  H[r].b = a, H[r].c = j(function(i, $, f) {
    return e = $, a;
  });
  function u(i) {
    var $ = o(vn, t, i);
    z($) || pr(4, r, $.a);
    for (var f = $.a, v = e; v.b; v = v.b) n(v.a(f));
  }
  return { send: u };
}
var Cr, lr = typeof document < "u" ? document : {};
function bn(r, n) {
  r.appendChild(n);
}
rr(function(r, n, e, t) {
  var a = t.node;
  return a.parentNode.replaceChild(ir(r, function() {
  }), a), {};
});
function en(r) {
  return { $: 0, a: r };
}
var It = c(function(r, n) {
  return c(function(e, t) {
    for (var a = [], u = 0; t.b; t = t.b) {
      var i = t.a;
      u += i.b || 0, a.push(i);
    }
    return u += a.length, { $: 1, c: n, d: te(e), e: a, f: r, b: u };
  });
}), ar = It(void 0), Ut = c(function(r, n) {
  return c(function(e, t) {
    for (var a = [], u = 0; t.b; t = t.b) {
      var i = t.a;
      u += i.b.b || 0, a.push(i);
    }
    return u += a.length, { $: 2, c: n, d: te(e), e: a, f: r, b: u };
  });
});
Ut(void 0);
c(function(r, n) {
  return { $: 4, j: r, k: n, b: 1 + (n.b || 0) };
});
function vr(r, n) {
  return { $: 5, l: r, m: n, k: void 0 };
}
c(function(r, n) {
  return vr([r, n], function() {
    return r(n);
  });
});
j(function(r, n, e) {
  return vr([r, n, e], function() {
    return o(r, n, e);
  });
});
rr(function(r, n, e, t) {
  return vr([r, n, e, t], function() {
    return A(r, n, e, t);
  });
});
sr(function(r, n, e, t, a) {
  return vr([r, n, e, t, a], function() {
    return Z(r, n, e, t, a);
  });
});
qr(function(r, n, e, t, a, u) {
  return vr([r, n, e, t, a, u], function() {
    return b(r, n, e, t, a, u);
  });
});
Ir(function(r, n, e, t, a, u, i) {
  return vr([r, n, e, t, a, u, i], function() {
    return xr(r, n, e, t, a, u, i);
  });
});
Kn(function(r, n, e, t, a, u, i, $) {
  return vr([r, n, e, t, a, u, i, $], function() {
    return Nn(r, n, e, t, a, u, i, $);
  });
});
yn(function(r, n, e, t, a, u, i, $, f) {
  return vr([r, n, e, t, a, u, i, $, f], function() {
    return Te(r, n, e, t, a, u, i, $, f);
  });
});
var ee = c(function(r, n) {
  return { $: "a0", n: r, o: n };
}), Wt = c(function(r, n) {
  return { $: "a1", n: r, o: n };
}), Qt = c(function(r, n) {
  return { $: "a2", n: r, o: n };
}), zt = c(function(r, n) {
  return { $: "a3", n: r, o: n };
});
j(function(r, n, e) {
  return { $: "a4", n, o: { f: r, o: e } };
});
var Gt = /^\s*(j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t\s*:|d\s*a\s*t\s*a\s*:\s*t\s*e\s*x\s*t\s*\/\s*h\s*t\s*m\s*l\s*(,|;))/i;
function Xt(r) {
  return Gt.test(r) ? "" : r;
}
c(function(r, n) {
  return n.$ === "a0" ? o(ee, n.n, Yt(r, n.o)) : n;
});
function Yt(r, n) {
  var e = wn(n);
  return { $: n.$, a: e ? A(Ia, e < 3 ? Zt : kt, gr(r), n.a) : o(I, r, n.a) };
}
var Zt = c(function(r, n) {
  return w(r(n.a), n.b);
}), kt = c(function(r, n) {
  return { r: r(n.r), ag: n.ag, ad: n.ad };
});
function te(r) {
  for (var n = {}; r.b; r = r.b) {
    var e = r.a, t = e.$, a = e.n, u = e.o;
    if (t === "a2") {
      a === "className" ? Rn(n, a, u) : n[a] = u;
      continue;
    }
    var i = n[t] || (n[t] = {});
    t === "a3" && a === "class" ? Rn(i, a, u) : i[a] = u;
  }
  return n;
}
function Rn(r, n, e) {
  var t = r[n];
  r[n] = t ? t + " " + e : e;
}
function ir(r, n) {
  var e = r.$;
  if (e === 5) return ir(r.k || (r.k = r.m()), n);
  if (e === 0) return lr.createTextNode(r.a);
  if (e === 4) {
    for (var t = r.k, a = r.j; t.$ === 4; ) typeof a != "object" ? a = [a, t.j] : a.push(t.j), t = t.k;
    var u = { j: a, p: n }, i = ir(t, u);
    return i.elm_event_node_ref = u, i;
  }
  if (e === 3) {
    var i = r.h(r.g);
    return tn(i, n, r.d), i;
  }
  var i = r.f ? lr.createElementNS(r.f, r.c) : lr.createElement(r.c);
  Cr && r.c == "a" && i.addEventListener("click", Cr(i)), tn(i, n, r.d);
  for (var $ = r.e, f = 0; f < $.length; f++) bn(i, ir(e === 1 ? $[f] : $[f].b, n));
  return i;
}
function tn(r, n, e) {
  for (var t in e) {
    var a = e[t];
    t === "a1" ? Kt(r, a) : t === "a0" ? xt(r, n, a) : t === "a3" ? yt(r, a) : t === "a4" ? Nt(r, a) : (t !== "value" && t !== "checked" || r[t] !== a) && (r[t] = a);
  }
}
function Kt(r, n) {
  var e = r.style;
  for (var t in n) e[t] = n[t];
}
function yt(r, n) {
  for (var e in n) {
    var t = n[e];
    typeof t < "u" ? r.setAttribute(e, t) : r.removeAttribute(e);
  }
}
function Nt(r, n) {
  for (var e in n) {
    var t = n[e], a = t.f, u = t.o;
    typeof u < "u" ? r.setAttributeNS(a, e, u) : r.removeAttributeNS(a, e);
  }
}
function xt(r, n, e) {
  var t = r.elmFs || (r.elmFs = {});
  for (var a in e) {
    var u = e[a], i = t[a];
    if (!u) {
      r.removeEventListener(a, i), t[a] = void 0;
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
    i = ra(n, u), r.addEventListener(a, i, pn && { passive: wn(u) < 2 }), t[a] = i;
  }
}
var pn;
try {
  window.addEventListener("t", null, Object.defineProperty({}, "passive", { get: function() {
    pn = true;
  } }));
} catch {
}
function ra(r, n) {
  function e(t) {
    var a = e.q, u = M(a.a, t);
    if (z(u)) {
      for (var i = wn(a), $ = u.a, f = i ? i < 3 ? $.a : $.r : $, v = i == 1 ? $.b : i == 3 && $.ag, l = (v && t.stopPropagation(), (i == 2 ? $.b : i == 3 && $.ad) && t.preventDefault(), r), m, s; m = l.j; ) {
        if (typeof m == "function") f = m(f);
        else for (var s = m.length; s--; ) f = m[s](f);
        l = l.p;
      }
      l(f, v);
    }
  }
  return e.q = n, e;
}
function na(r, n) {
  return r.$ == n.$ && _r(r.a, n.a);
}
function ae(r, n) {
  var e = [];
  return G(r, n, e, 0), e;
}
function T(r, n, e, t) {
  var a = { $: n, r: e, s: t, t: void 0, u: void 0 };
  return r.push(a), a;
}
function G(r, n, e, t) {
  if (r !== n) {
    var a = r.$, u = n.$;
    if (a !== u) if (a === 1 && u === 2) n = fa(n), u = 1;
    else {
      T(e, 0, t, n);
      return;
    }
    switch (u) {
      case 5:
        for (var i = r.l, $ = n.l, f = i.length, v = f === $.length; v && f--; ) v = i[f] === $[f];
        if (v) {
          n.k = r.k;
          return;
        }
        n.k = n.m();
        var l = [];
        G(r.k, n.k, l, 0), l.length > 0 && T(e, 1, t, l);
        return;
      case 4:
        for (var m = r.j, s = n.j, _ = false, D = r.k; D.$ === 4; ) _ = true, typeof m != "object" ? m = [m, D.j] : m.push(D.j), D = D.k;
        for (var P = n.k; P.$ === 4; ) _ = true, typeof s != "object" ? s = [s, P.j] : s.push(P.j), P = P.k;
        if (_ && m.length !== s.length) {
          T(e, 0, t, n);
          return;
        }
        (_ ? !ea(m, s) : m !== s) && T(e, 2, t, s), G(D, P, e, t + 1);
        return;
      case 0:
        r.a !== n.a && T(e, 3, t, n.a);
        return;
      case 1:
        Ln(r, n, e, t, ta);
        return;
      case 2:
        Ln(r, n, e, t, aa);
        return;
      case 3:
        if (r.h !== n.h) {
          T(e, 0, t, n);
          return;
        }
        var E = hn(r.d, n.d);
        E && T(e, 4, t, E);
        var J = n.i(r.g, n.g);
        J && T(e, 5, t, J);
        return;
    }
  }
}
function ea(r, n) {
  for (var e = 0; e < r.length; e++) if (r[e] !== n[e]) return false;
  return true;
}
function Ln(r, n, e, t, a) {
  if (r.c !== n.c || r.f !== n.f) {
    T(e, 0, t, n);
    return;
  }
  var u = hn(r.d, n.d);
  u && T(e, 4, t, u), a(r, n, e, t);
}
function hn(r, n, e) {
  var t;
  for (var a in r) {
    if (a === "a1" || a === "a0" || a === "a3" || a === "a4") {
      var u = hn(r[a], n[a] || {}, a);
      u && (t = t || {}, t[a] = u);
      continue;
    }
    if (!(a in n)) {
      t = t || {}, t[a] = e ? e === "a1" ? "" : e === "a0" || e === "a3" ? void 0 : { f: r[a].f, o: void 0 } : typeof r[a] == "string" ? "" : null;
      continue;
    }
    var i = r[a], $ = n[a];
    i === $ && a !== "value" && a !== "checked" || e === "a0" && na(i, $) || (t = t || {}, t[a] = $);
  }
  for (var f in n) f in r || (t = t || {}, t[f] = n[f]);
  return t;
}
function ta(r, n, e, t) {
  var a = r.e, u = n.e, i = a.length, $ = u.length;
  i > $ ? T(e, 6, t, { v: $, i: i - $ }) : i < $ && T(e, 7, t, { v: i, e: u });
  for (var f = i < $ ? i : $, v = 0; v < f; v++) {
    var l = a[v];
    G(l, u[v], e, ++t), t += l.b || 0;
  }
}
function aa(r, n, e, t) {
  for (var a = [], u = {}, i = [], $ = r.e, f = n.e, v = $.length, l = f.length, m = 0, s = 0, _ = t; m < v && s < l; ) {
    var D = $[m], P = f[s], E = D.a, J = P.a, S = D.b, F = P.b, Q = void 0, Xr = void 0;
    if (E === J) {
      _++, G(S, F, a, _), _ += S.b || 0, m++, s++;
      continue;
    }
    var dr = $[m + 1], Yr = f[s + 1];
    if (dr) {
      var dn = dr.a, mr = dr.b;
      Xr = J === dn;
    }
    if (Yr) {
      var Vn = Yr.a, Zr = Yr.b;
      Q = E === Vn;
    }
    if (Q && Xr) {
      _++, G(S, Zr, a, _), wr(u, a, E, F, s, i), _ += S.b || 0, _++, jr(u, a, E, mr, _), _ += mr.b || 0, m += 2, s += 2;
      continue;
    }
    if (Q) {
      _++, wr(u, a, J, F, s, i), G(S, Zr, a, _), _ += S.b || 0, m += 1, s += 2;
      continue;
    }
    if (Xr) {
      _++, jr(u, a, E, S, _), _ += S.b || 0, _++, G(mr, F, a, _), _ += mr.b || 0, m += 2, s += 1;
      continue;
    }
    if (dr && dn === Vn) {
      _++, jr(u, a, E, S, _), wr(u, a, J, F, s, i), _ += S.b || 0, _++, G(mr, Zr, a, _), _ += mr.b || 0, m += 2, s += 2;
      continue;
    }
    break;
  }
  for (; m < v; ) {
    _++;
    var D = $[m], S = D.b;
    jr(u, a, D.a, S, _), _ += S.b || 0, m++;
  }
  for (; s < l; ) {
    var Vr = Vr || [], P = f[s];
    wr(u, a, P.a, P.b, void 0, Vr), s++;
  }
  (a.length > 0 || i.length > 0 || Vr) && T(e, 8, t, { w: a, x: i, y: Vr });
}
var ue = "_elmW6BL";
function wr(r, n, e, t, a, u) {
  var i = r[e];
  if (!i) {
    i = { c: 0, z: t, r: a, s: void 0 }, u.push({ r: a, A: i }), r[e] = i;
    return;
  }
  if (i.c === 1) {
    u.push({ r: a, A: i }), i.c = 2;
    var $ = [];
    G(i.z, t, $, i.r), i.r = a, i.s.s = { w: $, A: i };
    return;
  }
  wr(r, n, e + ue, t, a, u);
}
function jr(r, n, e, t, a) {
  var u = r[e];
  if (!u) {
    var i = T(n, 9, a, void 0);
    r[e] = { c: 1, z: t, r: a, s: i };
    return;
  }
  if (u.c === 0) {
    u.c = 2;
    var $ = [];
    G(t, u.z, $, a), T(n, 9, a, { w: $, A: u });
    return;
  }
  jr(r, n, e + ue, t, a);
}
function ie(r, n, e, t) {
  Sr(r, n, e, 0, 0, n.b, t);
}
function Sr(r, n, e, t, a, u, i) {
  for (var $ = e[t], f = $.r; f === a; ) {
    var v = $.$;
    if (v === 1) ie(r, n.k, $.s, i);
    else if (v === 8) {
      $.t = r, $.u = i;
      var l = $.s.w;
      l.length > 0 && Sr(r, n, l, 0, a, u, i);
    } else if (v === 9) {
      $.t = r, $.u = i;
      var m = $.s;
      if (m) {
        m.A.s = r;
        var l = m.w;
        l.length > 0 && Sr(r, n, l, 0, a, u, i);
      }
    } else $.t = r, $.u = i;
    if (t++, !($ = e[t]) || (f = $.r) > u) return t;
  }
  var s = n.$;
  if (s === 4) {
    for (var _ = n.k; _.$ === 4; ) _ = _.k;
    return Sr(r, _, e, t, a + 1, u, r.elm_event_node_ref);
  }
  for (var D = n.e, P = r.childNodes, E = 0; E < D.length; E++) {
    a++;
    var J = s === 1 ? D[E] : D[E].b, S = a + (J.b || 0);
    if (a <= f && f <= S && (t = Sr(P[E], J, e, t, a, S, i), !($ = e[t]) || (f = $.r) > u)) return t;
    a = S;
  }
  return t;
}
function oe(r, n, e, t) {
  return e.length === 0 ? r : (ie(r, n, e, t), Hr(r, e));
}
function Hr(r, n) {
  for (var e = 0; e < n.length; e++) {
    var t = n[e], a = t.t, u = ua(a, t);
    a === r && (r = u);
  }
  return r;
}
function ua(r, n) {
  switch (n.$) {
    case 0:
      return ia(r, n.s, n.u);
    case 4:
      return tn(r, n.u, n.s), r;
    case 3:
      return r.replaceData(0, r.length, n.s), r;
    case 1:
      return Hr(r, n.s);
    case 2:
      return r.elm_event_node_ref ? r.elm_event_node_ref.j = n.s : r.elm_event_node_ref = { j: n.s, p: n.u }, r;
    case 6:
      for (var u = n.s, t = 0; t < u.i; t++) r.removeChild(r.childNodes[u.v]);
      return r;
    case 7:
      for (var u = n.s, e = u.e, t = u.v, a = r.childNodes[t]; t < e.length; t++) r.insertBefore(ir(e[t], n.u), a);
      return r;
    case 9:
      var u = n.s;
      if (!u) return r.parentNode.removeChild(r), r;
      var i = u.A;
      return typeof i.r < "u" && r.parentNode.removeChild(r), i.s = Hr(r, u.w), r;
    case 8:
      return oa(r, n);
    case 5:
      return n.s(r);
    default:
      pr(10);
  }
}
function ia(r, n, e) {
  var t = r.parentNode, a = ir(n, e);
  return a.elm_event_node_ref || (a.elm_event_node_ref = r.elm_event_node_ref), t && a !== r && t.replaceChild(a, r), a;
}
function oa(r, n) {
  var e = n.s, t = $a(e.y, n);
  r = Hr(r, e.w);
  for (var a = e.x, u = 0; u < a.length; u++) {
    var i = a[u], $ = i.A, f = $.c === 2 ? $.s : ir($.z, n.u);
    r.insertBefore(f, r.childNodes[i.r]);
  }
  return t && bn(r, t), r;
}
function $a(r, n) {
  if (r) {
    for (var e = lr.createDocumentFragment(), t = 0; t < r.length; t++) {
      var a = r[t], u = a.A;
      bn(e, u.c === 2 ? u.s : ir(u.z, n.u));
    }
    return e;
  }
}
function gn(r) {
  if (r.nodeType === 3) return en(r.textContent);
  if (r.nodeType !== 1) return en("");
  for (var n = d, e = r.attributes, t = e.length; t--; ) {
    var a = e[t], u = a.name, i = a.value;
    n = x(o(zt, u, i), n);
  }
  for (var $ = r.tagName.toLowerCase(), f = d, v = r.childNodes, t = v.length; t--; ) f = x(gn(v[t]), f);
  return A(ar, $, n, f);
}
function fa(r) {
  for (var n = r.e, e = n.length, t = new Array(e), a = 0; a < e; a++) t[a] = n[a].b;
  return { $: 1, c: r.c, d: r.d, e: t, f: r.f, b: r.b };
}
var ca = rr(function(r, n, e, t) {
  return mn(n, t, r.a$, r.bc, r.ba, function(a, u) {
    var i = r.bd, $ = t.node, f = gn($);
    return $e(u, function(v) {
      var l = i(v), m = ae(f, l);
      $ = oe($, f, m, a), f = l;
    });
  });
});
rr(function(r, n, e, t) {
  return mn(n, t, r.a$, r.bc, r.ba, function(a, u) {
    var i = r.ae && r.ae(a), $ = r.bd, f = lr.title, v = lr.body, l = gn(v);
    return $e(u, function(m) {
      Cr = i;
      var s = $(m), _ = ar("body")(d)(s.O), D = ae(l, _);
      v = oe(v, l, D, a), l = _, Cr = 0, f !== s._ && (lr.title = f = s._);
    });
  });
});
var Rr = typeof requestAnimationFrame < "u" ? requestAnimationFrame : function(r) {
  return setTimeout(r, 1e3 / 60);
};
function $e(r, n) {
  n(r);
  var e = 0;
  function t() {
    e = e === 1 ? 0 : (Rr(t), n(r), 1);
  }
  return function(a, u) {
    r = a, u ? (n(r), e === 2 && (e = 1)) : (e === 0 && Rr(t), e = 2);
  };
}
c(function(r, n) {
  return o(Gr, Sn, nr(function() {
    n && history.go(n), r();
  }));
});
c(function(r, n) {
  return o(Gr, Sn, nr(function() {
    history.pushState({}, "", n), r();
  }));
});
c(function(r, n) {
  return o(Gr, Sn, nr(function() {
    history.replaceState({}, "", n), r();
  }));
});
var va = { addEventListener: function() {
}, removeEventListener: function() {
} }, la = typeof window < "u" ? window : va;
j(function(r, n, e) {
  return xn(nr(function(t) {
    function a(u) {
      ln(e(u));
    }
    return r.addEventListener(n, a, pn && { passive: true }), function() {
      r.removeEventListener(n, a);
    };
  }));
});
c(function(r, n) {
  var e = M(r, n);
  return z(e) ? W(e.a) : V;
});
function fe(r, n) {
  return nr(function(e) {
    Rr(function() {
      var t = document.getElementById(r);
      e(t ? cr(n(t)) : Dt(Ua(r)));
    });
  });
}
function sa(r) {
  return nr(function(n) {
    Rr(function() {
      n(cr(r()));
    });
  });
}
c(function(r, n) {
  return fe(n, function(e) {
    return e[r](), hr;
  });
});
c(function(r, n) {
  return sa(function() {
    return la.scroll(r, n), hr;
  });
});
j(function(r, n, e) {
  return fe(r, function(t) {
    return t.scrollLeft = n, t.scrollTop = e, hr;
  });
});
var ma = function(r) {
  return { $: 0, a: r };
}, N = We, Br = Me;
j(function(r, n, e) {
  var t = e.c, a = e.d, u = c(function(i, $) {
    if (i.$) {
      var v = i.a;
      return A(Br, r, $, v);
    } else {
      var f = i.a;
      return A(Br, u, $, f);
    }
  });
  return A(Br, u, A(Br, r, n, a), t);
});
var ce = j(function(r, n, e) {
  r: for (; ; ) {
    if (e.$ === -2) return n;
    var t = e.b, a = e.c, u = e.d, i = e.e, $ = r, f = A(r, t, a, A(ce, r, n, i)), v = u;
    r = $, n = f, e = v;
    continue r;
  }
}), Mn = function(r) {
  return A(ce, j(function(n, e, t) {
    return o(N, w(n, e), t);
  }), d, r);
}, ve = 1, _a = 2, le = 0, X = function(r) {
  return { $: 1, a: r };
}, Dn = c(function(r, n) {
  return { $: 3, a: r, b: n };
}), qn = c(function(r, n) {
  return { $: 0, a: r, b: n };
}), se = c(function(r, n) {
  return { $: 1, a: r, b: n };
}), U = function(r) {
  return { $: 0, a: r };
}, ba = function(r) {
  return { $: 2, a: r };
}, W = function(r) {
  return { $: 0, a: r };
}, V = { $: 1 }, pa = ye, ha = bt, Lr = nt, Pr = c(function(r, n) {
  return o(ke, r, fn(n));
}), ga = c(function(r, n) {
  return p(o(Ze, r, n));
}), me = function(r) {
  return o(Pr, `
    `, o(ga, `
`, r));
}, Ur = j(function(r, n, e) {
  r: for (; ; ) if (e.b) {
    var t = e.a, a = e.b, u = r, i = o(r, t, n), $ = a;
    r = u, n = i, e = $;
    continue r;
  } else return n;
}), _e = function(r) {
  return A(Ur, c(function(n, e) {
    return e + 1;
  }), 0, r);
}, Da = Qe, Aa = j(function(r, n, e) {
  r: for (; ; ) if (L(r, n) < 1) {
    var t = r, a = n - 1, u = o(N, n, e);
    r = t, n = a, e = u;
    continue r;
  } else return e;
}), wa = c(function(r, n) {
  return A(Aa, r, n, d);
}), ja = c(function(r, n) {
  return A(Da, r, o(wa, 0, _e(n) - 1), n);
}), An = tt, be = function(r) {
  var n = An(r);
  return 97 <= n && n <= 122;
}, pe = function(r) {
  var n = An(r);
  return n <= 90 && 65 <= n;
}, Sa = function(r) {
  return be(r) || pe(r);
}, Pa = function(r) {
  var n = An(r);
  return n <= 57 && 48 <= n;
}, Ea = function(r) {
  return be(r) || pe(r) || Pa(r);
}, or = function(r) {
  return A(Ur, N, d, r);
}, Ja = Xe, da = c(function(r, n) {
  return `

(` + (Lr(r + 1) + (") " + me(he(n))));
}), he = function(r) {
  return o(Va, r, d);
}, Va = c(function(r, n) {
  r: for (; ; ) switch (r.$) {
    case 0:
      var e = r.a, i = r.b, t = function() {
        var P = Ja(e);
        if (P.$ === 1) return false;
        var E = P.a, J = E.a, S = E.b;
        return Sa(J) && o(pa, Ea, S);
      }(), a = t ? "." + e : "['" + (e + "']"), f = i, v = o(N, a, n);
      r = f, n = v;
      continue r;
    case 1:
      var u = r.a, i = r.b, $ = "[" + (Lr(u) + "]"), f = i, v = o(N, $, n);
      r = f, n = v;
      continue r;
    case 2:
      var l = r.a;
      if (l.b) if (l.b.b) {
        var m = function() {
          return n.b ? "The Json.Decode.oneOf at json" + o(Pr, "", or(n)) : "Json.Decode.oneOf";
        }(), D = m + (" failed in the following " + (Lr(_e(l)) + " ways:"));
        return o(Pr, `

`, o(N, D, o(ja, da, l)));
      } else {
        var i = l.a, f = i, v = n;
        r = f, n = v;
        continue r;
      }
      else return "Ran into a Json.Decode.oneOf with no possibilities" + function() {
        return n.b ? " at json" + o(Pr, "", or(n)) : "!";
      }();
    default:
      var s = r.a, _ = r.b, D = function() {
        return n.b ? "Problem with the value at json" + (o(Pr, "", or(n)) + `:

    `) : `Problem with the given value:

`;
      }();
      return D + (me(o(ha, 4, _)) + (`

` + s));
  }
}), Y = 32, an = rr(function(r, n, e, t) {
  return { $: 0, a: r, b: n, c: e, d: t };
}), un = Ce, ge = ze, De = c(function(r, n) {
  return Fn(n) / Fn(r);
}), on = ge(o(De, 2, Y)), Fa = Z(an, 0, on, un, un), Ae = Re, Ba = function(r) {
  return { $: 1, a: r };
};
c(function(r, n) {
  return r(n);
});
c(function(r, n) {
  return n(r);
});
var Oa = Ge, In = He, Ta = c(function(r, n) {
  return L(r, n) > 0 ? r : n;
}), Ca = function(r) {
  return { $: 0, a: r };
}, we = Le, Ha = c(function(r, n) {
  r: for (; ; ) {
    var e = o(we, Y, r), t = e.a, a = e.b, u = o(N, Ca(t), n);
    if (a.b) {
      var i = a, $ = u;
      r = i, n = $;
      continue r;
    } else return or(u);
  }
}), Ra = c(function(r, n) {
  r: for (; ; ) {
    var e = ge(n / Y);
    if (e === 1) return o(we, Y, r).a;
    var t = o(Ha, r, d), a = e;
    r = t, n = a;
    continue r;
  }
}), La = c(function(r, n) {
  if (n.a) {
    var e = n.a * Y, t = Oa(o(De, Y, e - 1)), a = r ? or(n.d) : n.d, u = o(Ra, a, n.a);
    return Z(an, In(n.c) + e, o(Ta, 5, t * on), u, n.c);
  } else return Z(an, In(n.c), on, un, n.c);
}), Ma = sr(function(r, n, e, t, a) {
  r: for (; ; ) {
    if (n < 0) return o(La, false, { d: t, a: e / Y | 0, c: a });
    var u = Ba(A(Ae, Y, n, r)), i = r, $ = n - Y, f = e, v = o(N, u, t), l = a;
    r = i, n = $, e = f, t = v, a = l;
    continue r;
  }
}), qa = c(function(r, n) {
  if (r <= 0) return Fa;
  var e = r % Y, t = A(Ae, e, r - e, n), a = r - e - Y;
  return b(Ma, n, a, r, d, t);
}), z = function(r) {
  return !r.$;
}, q = ct, I = lt, Ia = st, gr = at, wn = function(r) {
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
}, jn = function(r) {
  return r;
}, Ua = jn, Un = qr(function(r, n, e, t, a, u) {
  return { ap: u, C: n, ay: t, aA: e, aD: r, aE: a };
}), Wa = Ne, Qa = Ye, je = Ke, Wr = c(function(r, n) {
  return r < 1 ? n : A(je, r, Qa(n), n);
}), Qr = rt, ur = function(r) {
  return r === "";
}, zr = c(function(r, n) {
  return r < 1 ? "" : A(je, 0, r, n);
}), za = et, Wn = sr(function(r, n, e, t, a) {
  if (ur(a) || o(Wa, "@", a)) return V;
  var u = o(Qr, ":", a);
  if (u.b) {
    if (u.b.b) return V;
    var i = u.a, $ = za(o(Wr, i + 1, a));
    if ($.$ === 1) return V;
    var f = $;
    return W(xr(Un, r, o(zr, i, a), f, n, e, t));
  } else return W(xr(Un, r, a, V, n, e, t));
}), Qn = rr(function(r, n, e, t) {
  if (ur(t)) return V;
  var a = o(Qr, "/", t);
  if (a.b) {
    var u = a.a;
    return b(Wn, r, o(Wr, u, t), n, e, o(zr, u, t));
  } else return b(Wn, r, "/", n, e, t);
}), zn = j(function(r, n, e) {
  if (ur(e)) return V;
  var t = o(Qr, "?", e);
  if (t.b) {
    var a = t.a;
    return Z(Qn, r, W(o(Wr, a + 1, e)), n, o(zr, a, e));
  } else return Z(Qn, r, V, n, e);
});
c(function(r, n) {
  if (ur(n)) return V;
  var e = o(Qr, "#", n);
  if (e.b) {
    var t = e.a;
    return A(zn, r, W(o(Wr, t + 1, n)), o(zr, t, n));
  } else return A(zn, r, V, n);
});
var Ga = xe, Sn = function(r) {
}, Dr = cr, Xa = Dr(0), Se = rr(function(r, n, e, t) {
  if (t.b) {
    var a = t.a, u = t.b;
    if (u.b) {
      var i = u.a, $ = u.b;
      if ($.b) {
        var f = $.a, v = $.b;
        if (v.b) {
          var l = v.a, m = v.b, s = e > 500 ? A(Ur, r, n, or(m)) : Z(Se, r, n, e + 1, m);
          return o(r, a, o(r, i, o(r, f, o(r, l, s))));
        } else return o(r, a, o(r, i, o(r, f, n)));
      } else return o(r, a, o(r, i, n));
    } else return o(r, a, n);
  } else return n;
}), Pn = j(function(r, n, e) {
  return Z(Se, r, n, 0, e);
}), Pe = c(function(r, n) {
  return A(Pn, c(function(e, t) {
    return o(N, r(e), t);
  }), d, n);
}), Mr = nn, En = c(function(r, n) {
  return o(Mr, function(e) {
    return Dr(r(e));
  }, n);
}), Ya = j(function(r, n, e) {
  return o(Mr, function(t) {
    return o(Mr, function(a) {
      return Dr(o(r, t, a));
    }, e);
  }, n);
}), Za = function(r) {
  return A(Pn, Ya(N), Dr(d), r);
}, ka = Vt, Ka = c(function(r, n) {
  var e = n;
  return xn(o(Mr, ka(r), e));
}), ya = j(function(r, n, e) {
  return o(En, function(t) {
    return 0;
  }, Za(o(Pe, Ka(r), n)));
}), Na = j(function(r, n, e) {
  return Dr(0);
}), xa = c(function(r, n) {
  var e = n;
  return o(En, r, e);
});
H.Task = Jt(Xa, ya, Na, xa);
var ru = _n("Task"), Gr = c(function(r, n) {
  return ru(o(En, r, n));
}), nu = ca, B = ft, Ee = it, eu = Lt("inbound", Ee), tu = function(r) {
  if (r.b) {
    var n = r.a;
    return r.b, W(n);
  } else return V;
}, tr = { $: -2 }, au = tr, uu = { P: 0, x: au }, iu = Ft, C = iu(d), ou = function(r) {
  return w({ aj: "", q: r.q, E: uu, F: tu(r.q), n: r.n, i: "Ready", _: r._, u: r.u }, C);
}, $u = $t, R = ot, fu = function(r) {
  return { $: 1, a: r };
}, cu = c(function(r, n) {
  return r(function(e) {
    return n(fu(e));
  });
}), vu = function(r) {
  return { $: 6, a: r };
}, Gn = Ct("outbound", jn), lu = j(function(r, n, e) {
  return { $: 0, a: r, b: n, c: e };
}), Je = vn, su = c(function(r, n) {
  var e = function(t) {
    if (t.$) {
      var $ = t.a;
      return r(X($));
    } else {
      var a = t.a, u = o(Je, n.Q, a);
      if (u.$) {
        var $ = u.a;
        return r(X(he($)));
      } else {
        var i = u.a;
        return r(U(i));
      }
    }
  };
  return A(lu, n.R, n.O, e);
}), de = function(r) {
  return A(Ur, c(function(n, e) {
    var t = n.a, a = n.b;
    return A(gt, t, a, e);
  }), ht(), r);
}, er = pt, mu = function(r) {
  return de(p([w("host", er(r.C)), w("title", er(r._)), w("link", er(r.W)), w("image", er(r.U)), w("extract", er(r.S)), w("owner_comment", er(r.X))]));
}, _u = function(r) {
  return { as: r };
}, bu = Ir(function(r, n, e, t, a, u, i) {
  return { S: a, D: r, U: t, W: e, X: u, Z: i, _: n };
}), pu = ut, hu = o(q, function(r) {
  return o(I, r, o(B, "timestamp", pu));
}, o(q, function(r) {
  return o(I, r, o(B, "owner_comment", R));
}, o(q, function(r) {
  return o(I, r, o(B, "extract", R));
}, o(q, function(r) {
  return o(I, r, o(B, "image", R));
}, o(q, function(r) {
  return o(I, r, o(B, "link", R));
}, o(q, function(r) {
  return o(I, r, o(B, "title", R));
}, o(q, function(r) {
  return o(I, r, o(B, "id", R));
}, gr(bu)))))))), gu = o(q, function(r) {
  return o(I, r, o(B, "item", hu));
}, gr(_u)), Du = function(r) {
  return { O: mu(r), Q: gu, R: "SubmitItem" };
}, Ve = Ie, Au = c(function(r, n) {
  r: for (; ; ) {
    if (n.$ === -2) return V;
    var e = n.b, t = n.c, a = n.d, u = n.e, i = o(Ve, r, e);
    switch (i) {
      case 0:
        var $ = r, f = a;
        r = $, n = f;
        continue r;
      case 1:
        return W(t);
      default:
        var $ = r, f = u;
        r = $, n = f;
        continue r;
    }
  }
}), g = sr(function(r, n, e, t, a) {
  return { $: -1, a: r, b: n, c: e, d: t, e: a };
}), br = sr(function(r, n, e, t, a) {
  if (a.$ === -1 && !a.a) {
    a.a;
    var u = a.b, i = a.c, $ = a.d, f = a.e;
    if (t.$ === -1 && !t.a) {
      t.a;
      var v = t.b, l = t.c, m = t.d, s = t.e;
      return b(g, 0, n, e, b(g, 1, v, l, m, s), b(g, 1, u, i, $, f));
    } else return b(g, r, u, i, b(g, 0, n, e, t, $), f);
  } else if (t.$ === -1 && !t.a && t.d.$ === -1 && !t.d.a) {
    t.a;
    var v = t.b, l = t.c, _ = t.d;
    _.a;
    var D = _.b, P = _.c, E = _.d, J = _.e, s = t.e;
    return b(g, 0, v, l, b(g, 1, D, P, E, J), b(g, 1, n, e, s, a));
  } else return b(g, r, n, e, t, a);
}), $n = j(function(r, n, e) {
  if (e.$ === -2) return b(g, 0, r, n, tr, tr);
  var t = e.a, a = e.b, u = e.c, i = e.d, $ = e.e, f = o(Ve, r, a);
  switch (f) {
    case 0:
      return b(br, t, a, u, A($n, r, n, i), $);
    case 1:
      return b(g, t, a, n, i, $);
    default:
      return b(br, t, a, u, i, A($n, r, n, $));
  }
}), wu = j(function(r, n, e) {
  var t = A($n, r, n, e);
  if (t.$ === -1 && !t.a) {
    t.a;
    var a = t.b, u = t.c, i = t.d, $ = t.e;
    return b(g, 1, a, u, i, $);
  } else {
    var f = t;
    return f;
  }
}), ju = mt, Su = vt, Pu = function(r) {
  return Su(p([o(I, W, r), gr(V)]));
}, Eu = function(r) {
  r: for (; ; ) if (r.$ === -1 && r.d.$ === -1) {
    var n = r.d, e = n;
    r = e;
    continue r;
  } else return r;
}, Fe = function(r) {
  if (r.$ === -1 && r.d.$ === -1 && r.e.$ === -1) if (r.e.d.$ === -1 && !r.e.d.a) {
    var n = r.a, e = r.b, t = r.c, a = r.d;
    a.a;
    var u = a.b, i = a.c, $ = a.d, f = a.e, v = r.e;
    v.a;
    var l = v.b, m = v.c, s = v.d;
    s.a;
    var _ = s.b, D = s.c, P = s.d, E = s.e, J = v.e;
    return b(g, 0, _, D, b(g, 1, e, t, b(g, 0, u, i, $, f), P), b(g, 1, l, m, E, J));
  } else {
    var n = r.a, e = r.b, t = r.c, S = r.d;
    S.a;
    var u = S.b, i = S.c, $ = S.d, f = S.e, F = r.e;
    F.a;
    var l = F.b, m = F.c, s = F.d, J = F.e;
    return b(g, 1, e, t, b(g, 0, u, i, $, f), b(g, 0, l, m, s, J));
  }
  else return r;
}, Xn = function(r) {
  if (r.$ === -1 && r.d.$ === -1 && r.e.$ === -1) if (r.d.d.$ === -1 && !r.d.d.a) {
    var n = r.a, e = r.b, t = r.c, a = r.d;
    a.a;
    var u = a.b, i = a.c, $ = a.d;
    $.a;
    var f = $.b, v = $.c, l = $.d, m = $.e, s = a.e, _ = r.e;
    _.a;
    var D = _.b, P = _.c, E = _.d, J = _.e;
    return b(g, 0, u, i, b(g, 1, f, v, l, m), b(g, 1, e, t, s, b(g, 0, D, P, E, J)));
  } else {
    var n = r.a, e = r.b, t = r.c, S = r.d;
    S.a;
    var u = S.b, i = S.c, F = S.d, s = S.e, Q = r.e;
    Q.a;
    var D = Q.b, P = Q.c, E = Q.d, J = Q.e;
    return b(g, 1, e, t, b(g, 0, u, i, F, s), b(g, 0, D, P, E, J));
  }
  else return r;
}, Ju = Ir(function(r, n, e, t, a, u, i) {
  if (u.$ === -1 && !u.a) {
    u.a;
    var $ = u.b, f = u.c, v = u.d, l = u.e;
    return b(g, e, $, f, v, b(g, 0, t, a, l, i));
  } else {
    r: for (; ; ) if (i.$ === -1 && i.a === 1) if (i.d.$ === -1) if (i.d.a === 1) {
      i.a;
      var m = i.d;
      return m.a, Xn(n);
    } else break r;
    else return i.a, i.d, Xn(n);
    else break r;
    return n;
  }
}), Or = function(r) {
  if (r.$ === -1 && r.d.$ === -1) {
    var n = r.a, e = r.b, t = r.c, a = r.d, u = a.a, i = a.d, $ = r.e;
    if (u === 1) {
      if (i.$ === -1 && !i.a) return i.a, b(g, n, e, t, Or(a), $);
      var f = Fe(r);
      if (f.$ === -1) {
        var v = f.a, l = f.b, m = f.c, s = f.d, _ = f.e;
        return b(br, v, l, m, Or(s), _);
      } else return tr;
    } else return b(g, n, e, t, Or(a), $);
  } else return tr;
}, Er = c(function(r, n) {
  if (n.$ === -2) return tr;
  var e = n.a, t = n.b, a = n.c, u = n.d, i = n.e;
  if (L(r, t) < 0) if (u.$ === -1 && u.a === 1) {
    u.a;
    var $ = u.d;
    if ($.$ === -1 && !$.a) return $.a, b(g, e, t, a, o(Er, r, u), i);
    var f = Fe(n);
    if (f.$ === -1) {
      var v = f.a, l = f.b, m = f.c, s = f.d, _ = f.e;
      return b(br, v, l, m, o(Er, r, s), _);
    } else return tr;
  } else return b(g, e, t, a, o(Er, r, u), i);
  else return o(du, r, Nn(Ju, r, n, e, t, a, u, i));
}), du = c(function(r, n) {
  if (n.$ === -1) {
    var e = n.a, t = n.b, a = n.c, u = n.d, i = n.e;
    if (Jr(r, t)) {
      var $ = Eu(i);
      if ($.$ === -1) {
        var f = $.b, v = $.c;
        return b(br, e, f, v, u, Or(i));
      } else return tr;
    } else return b(br, e, t, a, u, o(Er, r, i));
  } else return tr;
}), Vu = c(function(r, n) {
  var e = o(Er, r, n);
  if (e.$ === -1 && !e.a) {
    e.a;
    var t = e.b, a = e.c, u = e.d, i = e.e;
    return b(g, 1, t, a, u, i);
  } else {
    var $ = e;
    return $;
  }
}), Yn = j(function(r, n, e) {
  if (n.$) {
    var l = n.a, m = Z(ju, j(function(J, S, F) {
      return { O: S, ak: J, an: F };
    }), o(B, "correlationId", R), o(B, "body", Ee), Pu(o(B, "error", R))), s = o(Je, m, l);
    if (s.$) return w(e, C);
    var $ = s.a.ak, a = s.a.O, _ = s.a.an, D = o(Au, $, e.x);
    if (D.$) return w(e, C);
    var u = D.a, P = function() {
      if (_.$) return U(a);
      var Q = _.a;
      return X(Q);
    }(), E = o(Gr, jn, Dr(u(P)));
    return w(O(e, { x: o(Vu, $, e.x) }), E);
  } else {
    var t = n.a, a = n.b, u = n.c, i = e.P + 1, $ = Lr(i), f = A(wu, $, u, e.x), v = de(p([w("endpoint", er(t)), w("body", a), w("correlationId", er($))]));
    return w(O(e, { P: i, x: f }), r.a6(v));
  }
}), Fu = c(function(r, n) {
  if (n.$) return r;
  var e = n.a;
  return e;
}), Bu = c(function(r, n) {
  switch (r.$) {
    case 0:
      var e = r.a, t = A(Yn, { a6: Gn }, e, n.E), a = t.a, u = t.b;
      return w(O(n, { E: a }), u);
    case 1:
      if (ur(n._)) return w(O(n, { i: "Error: Title cannot be empty" }), C);
      if (ur(n.u)) return w(O(n, { i: "Error: URL cannot be empty" }), C);
      if (ur(n.n)) return w(O(n, { i: "Error: Selection (Extract) cannot be empty" }), C);
      if (Jr(n.F, V)) return w(O(n, { i: "Error: Please select an image" }), C);
      if (ur(n.aj)) return w(O(n, { i: "Error: Comment cannot be empty" }), C);
      var i = Du({ S: n.n, C: "extension", U: o(Fu, "", n.F), W: n.u, X: n.aj, _: n._ }), $ = o(su, vu, i), f = A(Yn, { a6: Gn }, $, n.E), a = f.a, u = f.b;
      return w(O(n, { E: a, i: "Submitting..." }), u);
    case 2:
      var v = r.a;
      return w(O(n, { _: v }), C);
    case 3:
      var v = r.a;
      return w(O(n, { n: v }), C);
    case 4:
      var v = r.a;
      return w(O(n, { F: W(v) }), C);
    case 5:
      var v = r.a;
      return w(O(n, { aj: v }), C);
    default:
      if (r.a.$) {
        var l = r.a.a;
        return w(O(n, { i: "Error: " + l }), C);
      } else return w(O(n, { i: "Success!" }), C);
  }
}), Ou = function(r) {
  return { $: 5, a: r };
}, Tu = function(r) {
  return { $: 3, a: r };
}, Cu = { $: 1 }, Hu = function(r) {
  return { $: 2, a: r };
}, Ru = ar("button"), k = ar("div"), Lu = ar("h3"), Mu = ar("input"), qu = function(r) {
  return !r.b;
}, Ar = ar("label"), Iu = function(r) {
  return { $: 0, a: r };
}, Be = ee, Uu = c(function(r, n) {
  return o(Be, r, Iu(n));
}), Oe = function(r) {
  return o(Uu, "click", gr(r));
}, Wu = function(r) {
  return w(r, true);
}, Qu = function(r) {
  return { $: 1, a: r };
}, zu = c(function(r, n) {
  return o(Be, r, Qu(n));
}), Gu = c(function(r, n) {
  return A(Pn, B, n, r);
}), Xu = o(Gu, p(["target", "value"]), R), yr = function(r) {
  return o(zu, "input", o(I, Wu, o(I, r, Xu)));
}, Jn = c(function(r, n) {
  return o(Qt, r, er(n));
}), Yu = Jn("placeholder"), Zu = Wt, h = Zu, ku = en, K = ku, Zn = ar("textarea"), Nr = Jn("value"), Ku = function(r) {
  return { $: 4, a: r };
}, yu = ar("img"), Nu = function(r) {
  return o(Jn, "src", Xt(r));
}, xu = c(function(r, n) {
  var e = Jr(r, W(n)), t = e ? "3px solid #007bff" : "1px solid #ddd";
  return o(yu, p([Nu(n), Oe(Ku(n)), o(h, "height", "80px"), o(h, "cursor", "pointer"), o(h, "border", t)]), d);
}), ri = function(r) {
  return o(k, p([o(h, "width", "100%"), o(h, "padding", "15px"), o(h, "font-family", "sans-serif")]), p([o(Lu, d, p([K("Horatio Writer")])), o(k, p([o(h, "margin-bottom", "10px")]), p([o(Ar, p([o(h, "display", "block"), o(h, "font-weight", "bold")]), p([K("Title")])), o(Mu, p([Nr(r._), yr(Hu), o(h, "width", "100%"), o(h, "padding", "5px")]), d)])), o(k, p([o(h, "margin-bottom", "10px")]), p([o(Ar, p([o(h, "display", "block"), o(h, "font-weight", "bold")]), p([K("URL")])), o(k, p([o(h, "padding", "5px"), o(h, "background", "#f0f0f0"), o(h, "word-break", "break-all"), o(h, "font-size", "0.9em")]), p([K(r.u)]))])), o(k, p([o(h, "margin-bottom", "10px")]), p([o(Ar, p([o(h, "display", "block"), o(h, "font-weight", "bold")]), p([K("Selection (Extract)")])), o(Zn, p([Nr(r.n), yr(Tu), o(h, "width", "100%"), o(h, "height", "80px"), o(h, "padding", "5px")]), d)])), o(k, p([o(h, "margin-bottom", "10px")]), p([o(Ar, p([o(h, "display", "block"), o(h, "font-weight", "bold")]), p([K("Comment")])), o(Zn, p([Nr(r.aj), yr(Ou), Yu("Add your thoughts..."), o(h, "width", "100%"), o(h, "height", "60px"), o(h, "padding", "5px")]), d)])), qu(r.q) ? o(k, p([o(h, "margin-bottom", "10px"), o(h, "color", "red")]), p([K("No images found on page")])) : o(k, p([o(h, "margin-bottom", "10px")]), p([o(Ar, p([o(h, "display", "block"), o(h, "font-weight", "bold")]), p([K("Select Image")])), o(k, p([o(h, "display", "flex"), o(h, "overflow-x", "auto"), o(h, "gap", "10px"), o(h, "padding", "5px 0")]), o(Pe, xu(r.F), r.q))])), o(Ru, p([Oe(Cu), o(h, "width", "100%"), o(h, "padding", "10px"), o(h, "background-color", "#007bff"), o(h, "color", "white"), o(h, "border", "none"), o(h, "cursor", "pointer"), o(h, "font-size", "16px")]), p([K("Submit")])), o(k, p([o(h, "margin-top", "10px"), o(h, "color", o(Ga, "Error", r.i) ? "red" : "green")]), p([K(r.i)]))]));
}, ni = nu({ a$: ou, ba: function(r) {
  return o(cu, eu, ma);
}, bc: Bu, bd: ri });
const ei = { Popup: { init: ni(o(q, function(r) {
  return o(q, function(n) {
    return o(q, function(e) {
      return o(q, function(t) {
        return gr({ q: t, n: e, _: n, u: r });
      }, o(B, "images", $u(R)));
    }, o(B, "selection", R));
  }, o(B, "title", R));
}, o(B, "url", R)))(0) } };
chrome.tabs.query({ active: true, currentWindow: true }, (r) => {
  const n = r[0];
  if (!n) {
    kn({ title: "", url: "", selection: "", images: [] });
    return;
  }
  chrome.scripting.executeScript({ target: { tabId: n.id }, func: () => {
    const e = window.getSelection().toString(), t = Array.from(document.images).map((a) => a.src).filter((a) => a.startsWith("http"));
    return { selection: e, images: t };
  } }, (e) => {
    let t = { title: n.title || "", url: n.url || "", selection: "", images: [] };
    e && e[0] && e[0].result && (t.selection = e[0].result.selection || "", t.images = e[0].result.images || []), kn(t);
  });
});
function kn(r) {
  const n = ei.Popup.init({ node: document.getElementById("app"), flags: r });
  ti(n);
}
function ti(r) {
  r.ports.outbound.subscribe(function(n) {
    console.log("Popup sending message:", n), chrome.runtime.sendMessage(n, function(e) {
      console.log("Popup received response:", e), chrome.runtime.lastError ? (console.error("Runtime error:", chrome.runtime.lastError), r.ports.inbound.send({ correlationId: n.correlationId, body: null, error: chrome.runtime.lastError.message })) : r.ports.inbound.send(e);
    });
  });
}
