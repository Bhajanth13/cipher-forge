/* =========================================================
   Cipher Forge — relations.js
   Module 1 — Cartesian product S × S, used for real by a
   two-letter cipher.
   Module 3 — relations: a function is a relation R ⊆ S × S;
   the equivalence relation x ~ y ⇔ f(x) = f(y).
   Module 5 — Catalan numbers: the ways to bracket a chain
   of compositions.
   ========================================================= */
window.CF = window.CF || {};

CF.rel = (function () {
  'use strict';

  /* ---------- A function as a relation ---------- */

  // R = { (x, f(x)) | x ∈ S }  ⊆ S × S
  function asRelation(f) {
    return f.map(function (y, x) { return [x, y]; });
  }

  // R is a function when every x is related to exactly one y
  function isFunction(R, n) {
    const seen = new Array(n).fill(0);
    R.forEach(function (p) { seen[p[0]] += 1; });
    return seen.every(function (c) { return c === 1; });
  }

  /* ---------- The equivalence relation x ~ y ⇔ f(x) = f(y) ---------- */

  function sameOutput(f) { return function (x, y) { return f[x] === f[y]; }; }

  // Check the three properties directly over all pairs in S × S
  function checkEquivalence(f) {
    const n = f.length, rel = sameOutput(f);
    let reflexive = true, symmetric = true, transitive = true;
    for (let x = 0; x < n; x++) {
      if (!rel(x, x)) reflexive = false;
      for (let y = 0; y < n; y++) {
        if (rel(x, y) && !rel(y, x)) symmetric = false;
        if (!rel(x, y)) continue;
        for (let z = 0; z < n; z++) {
          if (rel(y, z) && !rel(x, z)) { transitive = false; }
        }
      }
    }
    return { reflexive: reflexive, symmetric: symmetric, transitive: transitive };
  }

  // The equivalence classes (a partition of S)
  function classes(f) {
    const byOut = {};
    f.forEach(function (y, x) { (byOut[y] = byOut[y] || []).push(x); });
    return Object.keys(byOut).map(function (k) { return byOut[k]; })
      .sort(function (a, b) { return a[0] - b[0]; });
  }

  /* ---------- A two-letter cipher on S × S ---------- */
  // A pair (x, y) is stored as the single number x · n + y.

  const PAIR_RULES = {
    add: {
      name: 'Add first to second',
      formula: '(x, y) ↦ (x, (x + y) mod n)',
      inverse: '(x, y) ↦ (x, (y − x) mod n)',
      map: function (x, y, n) { return [x, (x + y) % n]; }
    },
    swap: {
      name: 'Swap the pair',
      formula: '(x, y) ↦ (y, x)',
      inverse: '(x, y) ↦ (y, x)',
      map: function (x, y) { return [y, x]; }
    },
    sum: {
      name: 'Keep only the sum (broken)',
      formula: '(x, y) ↦ ((x + y) mod n, 0)',
      inverse: 'none: not a bijection',
      map: function (x, y, n) { return [(x + y) % n, 0]; }
    }
  };

  function pairMap(rule, n) {
    const f = [];
    for (let x = 0; x < n; x++) {
      for (let y = 0; y < n; y++) {
        const out = PAIR_RULES[rule].map(x, y, n);
        f.push(out[0] * n + out[1]);
      }
    }
    return f;
  }

  // Encrypt / decrypt text two symbols at a time
  function runPairs(text, set, rule, decrypt) {
    const n = set.length;
    let f = pairMap(rule, n);
    if (decrypt) {
      f = CF.fn.inverse(f);
      if (!f) return null;
    }
    const syms = text.toUpperCase().split('').filter(function (c) { return set.includes(c); });
    if (syms.length % 2 === 1) syms.push(set[set.length - 1]);  // pad to an even length
    const pairs = [];
    let out = '';
    for (let i = 0; i < syms.length; i += 2) {
      const p = set.indexOf(syms[i]) * n + set.indexOf(syms[i + 1]);
      const q = f[p];
      const a = set[Math.floor(q / n)], b = set[q % n];
      pairs.push([syms[i] + syms[i + 1], a + b]);
      out += a + b;
    }
    return { output: out, pairs: pairs };
  }

  /* ---------- Catalan numbers and bracketings ---------- */

  // Cₙ = C(2n, n) / (n + 1)
  function catalan(n) { return CF.count.combinations(2 * n, n) / BigInt(n + 1); }

  // Every full bracketing of a list of k items written left to right.
  // There are C(k − 1) of them.
  function bracketings(items) {
    if (items.length === 1) return [{ str: items[0].name, map: items[0].map }];
    const out = [];
    for (let i = 1; i < items.length; i++) {
      const left = bracketings(items.slice(0, i));
      const right = bracketings(items.slice(i));
      left.forEach(function (L) {
        right.forEach(function (R) {
          // L ∘ R : apply R first, then L
          out.push({ str: '(' + L.str + ' ∘ ' + R.str + ')', map: CF.fn.compose(L.map, R.map) });
        });
      });
    }
    return out;
  }

  function sameMap(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  return {
    asRelation: asRelation,
    isFunction: isFunction,
    checkEquivalence: checkEquivalence,
    classes: classes,
    PAIR_RULES: PAIR_RULES,
    pairMap: pairMap,
    runPairs: runPairs,
    catalan: catalan,
    bracketings: bracketings,
    sameMap: sameMap
  };
})();
