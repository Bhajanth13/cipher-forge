/* =========================================================
   Cipher Forge — blocks.js
   The cipher blocks. Each block builds a function
   f : S → S (an array, see functions.js). A chain of blocks
   is their composition.
   ========================================================= */
window.CF = window.CF || {};

CF.blocks = (function () {
  'use strict';

  const mod = CF.fn.mod;

  function build(n, rule) {
    const f = [];
    for (let x = 0; x < n; x++) f.push(rule(x));
    return f;
  }

  function clampInt(v, lo, hi, fallback) {
    v = parseInt(v, 10);
    if (isNaN(v)) v = fallback;
    return Math.max(lo, Math.min(hi, v));
  }


  /* ---------- Your own function: f(x) written as a formula ----------
     A small, safe reader for formulas such as 3x + 7, x^5, 25 - x or
     (x + 4)(x + 1). It understands numbers, x, n (the size of S), + - *,
     ^ with a whole-number power, brackets, and writing 3x for 3 · x.
     Nothing is passed to eval. The answer is always taken mod n, and
     every step is reduced mod n with BigInt, so powers never overflow. */
  function normalise(src) {
    let t = String(src || '').trim();
    t = t.replace(/^\s*[a-z]\s*\(\s*x\s*\)\s*=\s*/i, '');             // drop a leading "f(x) ="
    t = t.replace(/\s*\(?\s*mod\s*(n|\d+)\s*\)?\s*$/i, '');           // drop a trailing "mod 26" / "mod n"
    t = t.replace(/[−–—]/g, '-').replace(/[·×]/g, '*').replace(/²/g, '^2').replace(/³/g, '^3').replace(/X/g, 'x').replace(/N/g, 'n');
    return t.replace(/\s+/g, '');
  }

  function parseFormula(src) {
    const t = normalise(src);
    if (!t) return { error: 'Type a formula in x, such as 3x + 7.' };
    if (t.length > 40) return { error: 'Keep the formula under 40 characters.' };
    let i = 0;
    function peek() { return t[i]; }
    function fail(msg) { throw new Error(msg); }
    function number() { const m = /^\d+/.exec(t.slice(i)); i += m[0].length; return m[0]; }
    function atom() {
      const c = peek();
      if (c === undefined) fail('The formula ends too early.');
      if (/\d/.test(c)) { const v = number(); return { k: 'num', v: BigInt(v) }; }
      if (c === 'x') { i++; return { k: 'x' }; }
      if (c === 'n') { i++; return { k: 'n' }; }
      if (c === '(') { i++; const e = expr(); if (peek() !== ')') fail('A bracket is not closed.'); i++; return e; }
      if (c === '/') fail('Division is not allowed: it is not defined for every x mod n.');
      fail('I can’t read “' + c + '”. Use numbers, x, n, + − × ^ and brackets.');
    }
    function power() {
      const a = atom();
      if (peek() === '^') {
        i++;
        if (!/\d/.test(peek() || '')) fail('After ^ write a whole number, such as x^5.');
        const e = parseInt(number(), 10);
        if (e > 99) fail('Keep powers at 99 or below.');
        return { k: 'pow', a: a, e: e };
      }
      return a;
    }
    function unary() {
      if (peek() === '-') { i++; return { k: 'neg', a: unary() }; }
      if (peek() === '+') { i++; return unary(); }
      return power();
    }
    function term() {
      let a = unary();
      for (;;) {
        const c = peek();
        if (c === '*') { i++; a = { k: 'mul', a: a, b: unary() }; }
        else if (c !== undefined && /[\dxn(]/.test(c)) a = { k: 'mul', a: a, b: unary() };   // 3x, x(x+1)
        else return a;
      }
    }
    function expr() {
      let a = term();
      for (;;) {
        const c = peek();
        if (c === '+') { i++; a = { k: 'add', a: a, b: term() }; }
        else if (c === '-') { i++; a = { k: 'sub', a: a, b: term() }; }
        else return a;
      }
    }
    try {
      const tree = expr();
      if (i < t.length) fail(t[i] === ')' ? 'There is an extra closing bracket.' : t[i] === '/' ? 'Division is not allowed: it is not defined for every x mod n.' : 'I can’t read “' + t[i] + '”. Use numbers, x, n, + − × ^ and brackets.');
      return { tree: tree, text: t };
    } catch (err) { return { error: err.message }; }
  }

  function evalTree(node, x, n) {
    const N = BigInt(n);
    const m = function (v) { return ((v % N) + N) % N; };
    switch (node.k) {
      case 'num': return m(node.v);
      case 'x': return m(BigInt(x));
      case 'n': return 0n;                                   // n ≡ 0 (mod n)
      case 'neg': return m(-evalTree(node.a, x, n));
      case 'add': return m(evalTree(node.a, x, n) + evalTree(node.b, x, n));
      case 'sub': return m(evalTree(node.a, x, n) - evalTree(node.b, x, n));
      case 'mul': return m(evalTree(node.a, x, n) * evalTree(node.b, x, n));
      case 'pow': { const b = evalTree(node.a, x, n); let r = m(1n); for (let k = 0; k < node.e; k++) r = m(r * b); return r; }
    }
    return 0n;
  }

  // Pretty form for display: 3x+7 → 3x + 7, x^5 → x⁵
  function pretty(t) {
    const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
    return t.replace(/\^(\d+)/g, function (_, d) { return d.split('').map(function (c) { return SUP[+c]; }).join(''); })
      .replace(/\*/g, '·').replace(/([+\-])/g, ' $1 ').replace(/^ - /, '−').replace(/ - /g, ' − ').replace(/\( − /g, '(−').trim();
  }

  const TYPES = {
    shift: {
      name: 'Shift',
      blurb: 'Move every symbol k places forward, wrapping around.',
      params: [{ key: 'k', label: 'k', kind: 'number', min: 0, max: 35, value: 3 }],
      make: function (set, p) {
        const n = set.length, k = clampInt(p.k, 0, 99, 0);
        return build(n, function (x) { return mod(x + k, n); });
      },
      formula: function (p) { return 'f(x) = (x + ' + p.k + ') mod n'; },
      short: function (p) { return 'shift(' + p.k + ')'; }
    },

    multiply: {
      name: 'Multiply',
      blurb: 'Multiply each position by a. Some values of a break the cipher.',
      params: [{ key: 'a', label: 'a', kind: 'number', min: 0, max: 35, value: 3 }],
      make: function (set, p) {
        const n = set.length, a = clampInt(p.a, 0, 99, 1);
        return build(n, function (x) { return mod(a * x, n); });
      },
      formula: function (p) { return 'f(x) = (' + p.a + ' · x) mod n'; },
      short: function (p) { return 'multiply(' + p.a + ')'; }
    },

    mirror: {
      name: 'Mirror',
      blurb: 'Read the alphabet backwards: first ↔ last. It undoes itself.',
      params: [],
      make: function (set) {
        const n = set.length;
        return build(n, function (x) { return n - 1 - x; });
      },
      formula: function () { return 'f(x) = (n − 1) − x'; },
      short: function () { return 'mirror'; }
    },

    keyword: {
      name: 'Keyword',
      blurb: 'Write the keyword first (no repeats), then the rest in order.',
      params: [{ key: 'word', label: 'word', kind: 'text', value: 'FORGE' }],
      make: function (set, p) {
        const seq = [];
        String(p.word || '').toUpperCase().split('').forEach(function (c) {
          if (set.includes(c) && !seq.includes(c)) seq.push(c);
        });
        set.forEach(function (c) { if (!seq.includes(c)) seq.push(c); });
        return seq.map(function (c) { return set.indexOf(c); });
      },
      formula: function (p) { return 'x ↦ x-th symbol of "' + String(p.word || '').toUpperCase() + '…"'; },
      short: function (p) { return 'keyword(' + String(p.word || '').toUpperCase() + ')'; }
    },

    swap: {
      name: 'Swap',
      blurb: 'Exchange two symbols; everything else stays put.',
      params: [
        { key: 'p', label: 'p', kind: 'symbol', value: 'A' },
        { key: 'q', label: 'q', kind: 'symbol', value: 'Z' }
      ],
      make: function (set, p) {
        const n = set.length;
        const i = set.indexOf(String(p.p || '').toUpperCase());
        const j = set.indexOf(String(p.q || '').toUpperCase());
        return build(n, function (x) {
          if (i < 0 || j < 0) return x;
          if (x === i) return j;
          if (x === j) return i;
          return x;
        });
      },
      formula: function (p) { return String(p.p).toUpperCase() + ' ↔ ' + String(p.q).toUpperCase(); },
      short: function (p) { return 'swap(' + String(p.p).toUpperCase() + ',' + String(p.q).toUpperCase() + ')'; }
    },

    compress: {
      name: 'Compress',
      blurb: 'Squeeze n symbols into only m. The pigeonhole principle forbids it.',
      params: [{ key: 'm', label: 'm', kind: 'number', min: 1, max: 36, value: 20 }],
      make: function (set, p) {
        const n = set.length, m = clampInt(p.m, 1, n, n);
        return build(n, function (x) { return x % m; });
      },
      formula: function (p) { return 'f(x) = x mod ' + p.m; },
      short: function (p) { return 'compress(' + p.m + ')'; }
    },

    custom: {
      name: 'Your own f(x)',
      blurb: 'Write any formula in x. It is worked out mod n for every symbol.',
      params: [{ key: 'expr', label: 'f(x) =', kind: 'expr', value: '5x + 8' }],
      make: function (set, p) {
        const n = set.length, r = parseFormula(p.expr);
        if (r.error) return build(n, function (x) { return x; });
        return build(n, function (x) { return Number(evalTree(r.tree, x, n)); });
      },
      error: function (p) { return parseFormula(p.expr).error || null; },
      formula: function (p) {
        const r = parseFormula(p.expr);
        return r.error ? 'f(x) = ?' : 'f(x) = (' + pretty(r.text) + ') mod n';
      },
      short: function (p) {
        const r = parseFormula(p.expr);
        return r.error ? 'f(?)' : '(' + pretty(r.text) + ')';
      }
    }
  };

  let uid = 0;
  function create(type, overrides) {
    const def = TYPES[type];
    const params = {};
    def.params.forEach(function (prm) { params[prm.key] = prm.value; });
    Object.assign(params, overrides || {});
    uid += 1;
    return { id: 'b' + uid, type: type, params: params };
  }

  function mapOf(block, set) { return TYPES[block.type].make(set, block.params); }

  // The whole chain as one function: F = fk ∘ … ∘ f2 ∘ f1
  function chainMap(chain, set) {
    let F = CF.fn.identity(set.length);
    chain.forEach(function (b) { F = CF.fn.compose(mapOf(b, set), F); });
    return F;
  }

  // "fk ∘ … ∘ f1" written with the blocks' short names
  function chainName(chain) {
    if (!chain.length) return 'identity';
    return chain.slice().reverse().map(function (b) { return TYPES[b.type].short(b.params); }).join(' ∘ ');
  }

  // Inverse chain (fk ∘ … ∘ f1)⁻¹ = f1⁻¹ ∘ … ∘ fk⁻¹
  function inverseName(chain) {
    if (!chain.length) return 'identity';
    return chain.map(function (b) { return TYPES[b.type].short(b.params) + '⁻¹'; }).join(' ∘ ');
  }

  // Encrypt or decrypt text, recording every step for the trace table
  function run(text, chain, set, decrypt) {
    const maps = chain.map(function (b) {
      const f = mapOf(b, set);
      return decrypt ? CF.fn.inverse(f) : f;
    });
    if (maps.some(function (m) { return m === null; })) return null;
    const order = decrypt ? maps.slice().reverse() : maps;
    const names = (decrypt ? chain.slice().reverse() : chain).map(function (b) {
      return TYPES[b.type].short(b.params) + (decrypt ? '⁻¹' : '');
    });

    const chars = text.toUpperCase().split('');
    const steps = [chars.slice()];
    let cur = chars.slice();
    order.forEach(function (f) {
      cur = cur.map(function (c) {
        const i = set.indexOf(c);
        return i < 0 ? c : set[f[i]];      // symbols outside S pass through
      });
      steps.push(cur.slice());
    });
    return { output: cur.join(''), steps: steps, names: names };
  }

  /* ---------- Key codes: the whole cipher as one short line ----------
     e.g. "letters/shift-3/mirror/keyword-FORGE". Sender and receiver
     must share this key; it is never sent with the message. */
  function clean(v) { return String(v).replace(/[^A-Za-z0-9]/g, ''); }
  const ENC = { '+': 'P', '-': 'M', '*': 'T', '^': 'E', '(': 'L', ')': 'R' };
  function encodeExpr(v) { return normalise(v).split('').map(function (c) { return ENC[c] || (/[0-9xn]/.test(c) ? c : ''); }).join(''); }
  function decodeExpr(v) {
    const DEC = {}; Object.keys(ENC).forEach(function (k) { DEC[ENC[k]] = k; });
    return String(v).split('').map(function (c) { return DEC[c] || c; }).join('');
  }

  function keyCode(setKey, chain) {
    return [setKey].concat(chain.map(function (b) {
      return [b.type].concat(TYPES[b.type].params.map(function (p) { return p.kind === 'expr' ? encodeExpr(b.params[p.key]) : clean(b.params[p.key]); })).join('-');
    })).join('/');
  }

  // Returns { setKey, chain } or null if the code is not valid
  function parseKey(code) {
    const parts = String(code || '').trim().split('/').filter(Boolean);
    if (!parts.length || !CF.sets.PRESETS[parts[0]]) return null;
    const chain = [];
    for (let i = 1; i < parts.length; i++) {
      const bits = parts[i].split('-');
      const def = TYPES[bits[0]];
      if (!def || bits.length - 1 !== def.params.length) return null;
      const params = {};
      def.params.forEach(function (p, j) { params[p.key] = p.kind === 'number' ? parseInt(bits[j + 1], 10) || 0 : p.kind === 'expr' ? decodeExpr(bits[j + 1]) : bits[j + 1]; });
      chain.push(create(bits[0], params));
    }
    return { setKey: parts[0], chain: chain };
  }

  return {
    parseFormula: parseFormula,
    pretty: pretty,
    keyCode: keyCode,
    parseKey: parseKey,
    TYPES: TYPES,
    create: create,
    mapOf: mapOf,
    chainMap: chainMap,
    chainName: chainName,
    inverseName: inverseName,
    run: run
  };
})();
