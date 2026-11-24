/* =========================================================
   Cipher Forge — functions.js
   Syllabus: Module 3 — Functions, one-to-one (injective),
   onto (surjective), bijective, composition, inverse,
   pigeonhole principle.
   Module 2 — predicates and quantifiers used to state the
   properties.

   A function f : S → S on a symbol set S of size n is stored
   as an array of n numbers: f[x] is the position of the
   output for the input at position x.
   ========================================================= */
window.CF = window.CF || {};

CF.fn = (function () {
  'use strict';

  // x mod n that is never negative (JavaScript's % can be negative)
  function mod(x, n) { return ((x % n) + n) % n; }

  // The identity function: every x maps to itself
  function identity(n) {
    const f = [];
    for (let x = 0; x < n; x++) f.push(x);
    return f;
  }

  // Composition (g ∘ f)(x) = g(f(x)) : apply f first, then g
  function compose(g, f) {
    return f.map(function (y) { return g[y]; });
  }

  // Injective (one-to-one):
  //   ∀ x1, x2 ∈ S : f(x1) = f(x2) → x1 = x2
  // i.e. no output is used twice.
  function isInjective(f) {
    const seen = new Set();
    for (let x = 0; x < f.length; x++) {
      if (seen.has(f[x])) return false;
      seen.add(f[x]);
    }
    return true;
  }

  // Surjective (onto):
  //   ∀ y ∈ S ∃ x ∈ S : f(x) = y
  // i.e. every output is hit at least once.
  function isSurjective(f, n) {
    const hit = new Set(f);
    for (let y = 0; y < n; y++) if (!hit.has(y)) return false;
    return true;
  }

  // Bijective = injective ∧ surjective
  function isBijective(f, n) {
    return isInjective(f) && isSurjective(f, n);
  }

  // Inverse f⁻¹ exists only for a bijection: f⁻¹(f(x)) = x
  function inverse(f) {
    const n = f.length;
    if (!isBijective(f, n)) return null;
    const inv = new Array(n);
    for (let x = 0; x < n; x++) inv[f[x]] = x;
    return inv;
  }

  // Pigeonhole principle: N pigeons into k holes ⇒ some hole has ≥ ⌈N / k⌉
  function pigeonhole(pigeons, holes) {
    if (holes <= 0) return Infinity;
    return Math.ceil(pigeons / holes);
  }

  // Full report used by the Inspector
  function analyse(f, n) {
    const preimages = {};               // output → list of inputs
    for (let x = 0; x < f.length; x++) {
      (preimages[f[x]] = preimages[f[x]] || []).push(x);
    }
    const collisions = [];              // outputs reached by 2+ inputs
    const unused = [];                  // outputs reached by none
    for (let y = 0; y < n; y++) {
      const xs = preimages[y] || [];
      if (xs.length > 1) collisions.push({ y: y, xs: xs });
      if (xs.length === 0) unused.push(y);
    }
    const rangeSize = n - unused.length;
    const injective = collisions.length === 0;
    const surjective = unused.length === 0;
    return {
      n: n,
      injective: injective,
      surjective: surjective,
      bijective: injective && surjective,
      collisions: collisions,
      unused: unused,
      rangeSize: rangeSize,
      crowded: pigeonhole(n, rangeSize)   // pigeonhole bound on the range
    };
  }

  return {
    mod: mod,
    identity: identity,
    compose: compose,
    isInjective: isInjective,
    isSurjective: isSurjective,
    isBijective: isBijective,
    inverse: inverse,
    pigeonhole: pigeonhole,
    analyse: analyse
  };
})();
