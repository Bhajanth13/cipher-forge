/* =========================================================
   Cipher Forge — breaker.js
   Breaking ciphers.
   Module 1 — multisets: the letter counts of a message.
   Module 4 — counting: brute force tries every one of the
   n shift keys.
   Module 3 — pigeonhole: any message longer than |S| must
   repeat a symbol, and repeats are what give a cipher away.
   ========================================================= */
window.CF = window.CF || {};

CF.breaker = (function () {
  'use strict';

  // How often each letter appears in ordinary English text (percent)
  const ENGLISH = {
    A: 8.17, B: 1.49, C: 2.78, D: 4.25, E: 12.70, F: 2.23, G: 2.02, H: 6.09, I: 6.97,
    J: 0.15, K: 0.77, L: 4.03, M: 2.41, N: 6.75, O: 7.51, P: 1.93, Q: 0.10, R: 5.99,
    S: 6.33, T: 9.06, U: 2.76, V: 0.98, W: 2.36, X: 0.15, Y: 1.97, Z: 0.07
  };

  // The multiset of symbols in a message: each symbol with its multiplicity
  function multiset(text, set) {
    const counts = {};
    set.forEach(function (c) { counts[c] = 0; });
    let total = 0;
    text.toUpperCase().split('').forEach(function (c) {
      if (c in counts) { counts[c] += 1; total += 1; }
    });
    return { counts: counts, total: total };
  }

  // Chi-squared distance from English letter frequencies (smaller = more English)
  function chiSquared(text) {
    const m = multiset(text, Object.keys(ENGLISH));
    if (!m.total) return Infinity;
    let chi = 0;
    Object.keys(ENGLISH).forEach(function (c) {
      const expected = m.total * ENGLISH[c] / 100;
      const diff = m.counts[c] - expected;
      chi += diff * diff / expected;
    });
    return chi;
  }

  // Undo a shift of k on the symbol set
  function unshift(text, k, set) {
    const n = set.length;
    return text.toUpperCase().split('').map(function (c) {
      const i = set.indexOf(c);
      return i < 0 ? c : set[((i - k) % n + n) % n];
    }).join('');
  }

  // Brute force: try all n shift keys, score each candidate
  function bruteForce(text, set) {
    const out = [];
    for (let k = 0; k < set.length; k++) {
      const plain = unshift(text, k, set);
      out.push({ k: k, text: plain, score: chiSquared(plain) });
    }
    let best = out[0];
    out.forEach(function (c) { if (c.score < best.score) best = c; });
    // Normalise by length so the verdict works for short and long texts
    const letters = multiset(text, Object.keys(ENGLISH)).total || 1;
    return { candidates: out, best: best, perLetter: best.score / letters, letters: letters };
  }

  // Sorted multiplicities: a substitution only relabels letters, so this
  // "shape" survives any bijection unchanged.
  function profile(text, set) {
    const m = multiset(text, set);
    return set.map(function (c) { return { c: c, n: m.counts[c] }; })
      .sort(function (a, b) { return b.n - a.n || (a.c < b.c ? -1 : 1); });
  }

  function englishProfile() {
    return Object.keys(ENGLISH).map(function (c) { return { c: c, p: ENGLISH[c] }; })
      .sort(function (a, b) { return b.p - a.p; });
  }

  return {
    ENGLISH: ENGLISH,
    multiset: multiset,
    chiSquared: chiSquared,
    unshift: unshift,
    bruteForce: bruteForce,
    profile: profile,
    englishProfile: englishProfile
  };
})();
