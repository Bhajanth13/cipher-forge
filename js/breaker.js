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


  /* ---------- Stronger attacks ----------
     Every block chain in the lab that can be undone is a bijection
     S → S, so to an attacker it is just a substitution: one fixed
     replacement for each symbol. Three attacks, from fewest keys up:
       shift   f(x) = x + k        n keys            (brute force)
       affine  f(x) = ax + b       φ(n) · n keys     (brute force)
       any substitution            n! keys           (too many to try,
                                   so hill climbing on English trigrams)
     Candidates are scored by how English their three-letter sequences
     are, using counts from public-domain books (english-trigrams.js). */
  let TRI = null;
  function trigrams() {
    if (TRI) return TRI;
    const T = window.CF.TRIGRAMS, AL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    TRI = new Float64Array(T.q.length / 2);
    for (let i = 0; i < TRI.length; i++) TRI[i] = T.min + (AL.indexOf(T.q[2 * i]) * 64 + AL.indexOf(T.q[2 * i + 1])) / 4095 * (T.max - T.min);
    return TRI;
  }

  let WORDS = null;
  // Each word is stored as a number (letters in base 27) so checking one is fast
  function wordKey(w) { let k = 0; for (let i = 0; i < w.length; i++) k = k * 27 + (w.charCodeAt(i) - 64); return k; }
  function words() {
    if (!WORDS) { WORDS = new Set(); window.CF.WORDS.split(' ').forEach(function (w) { if (w.length <= 11) WORDS.add(wordKey(w)); }); }
    return WORDS;
  }
  const WORD_BONUS = 1.5;      // per letter of a decoded word found in the word list

  // A text in S as symbol positions; the score only reads letters A–Z.
  // Symbols outside S (spaces, punctuation) pass through a cipher unchanged,
  // so they show where the words are: out.words holds [start, end) of each.
  function toCodes(text, set) {
    const out = [], spans = [];
    let start = -1;
    text.toUpperCase().split('').forEach(function (c) {
      const i = set.indexOf(c);
      if (i >= 0) { if (start < 0) start = out.length; out.push(i); }
      else if (start >= 0) { spans.push([start, out.length]); start = -1; }
    });
    if (start >= 0) spans.push([start, out.length]);
    out.words = spans;
    return out;
  }
  // Score a decryption: plain[i] is the position in S of the i-th plain symbol.
  // A trigram that touches a non-letter gets the 'never seen' score.
  function scoreCodes(plain, letterOf) {
    const t = trigrams(), floor = window.CF.TRIGRAMS.min;
    let s = 0;
    for (let i = 0; i + 2 < plain.length; i++) {
      const a = letterOf[plain[i]], b = letterOf[plain[i + 1]], c = letterOf[plain[i + 2]];
      s += (a < 0 || b < 0 || c < 0) ? floor : t[a * 676 + b * 26 + c];
    }
    // Whole words help most: a decoded word found in the word list earns a bonus
    const spans = plain.words;
    if (spans && spans.length > 1) {
      const W = words();
      for (let w = 0; w < spans.length; w++) {
        const a = spans[w][0], b = spans[w][1];
        if (b - a > 11) continue;
        let key = 0;
        for (let i = a; i < b; i++) { const k = letterOf[plain[i]]; if (k < 0) { key = -1; break; } key = key * 27 + k + 1; }
        if (key > 0 && W.has(key)) s += WORD_BONUS * (b - a);
      }
    }
    return s;
  }
  function lettersOf(set) { return set.map(function (c) { const k = c.charCodeAt(0) - 65; return (k >= 0 && k < 26 && c.length === 1) ? k : -1; }); }
  function decodeWith(text, set, inv) {
    return text.toUpperCase().split('').map(function (c) { const i = set.indexOf(c); return i < 0 ? c : set[inv[i]]; }).join('');
  }
  function gcd(a, b) { while (b) { const t = a % b; a = b; b = t; } return a; }
  function invMod(a, n) { for (let x = 1; x < n; x++) if ((a * x) % n === 1) return x; return 0; }
  // Score per trigram, so long and short texts compare. English text sits near −2.9 to −3.4.
  function perTri(score, len) { return len > 2 ? score / (len - 2) : -99; }

  // Brute force over every affine key: f(x) = ax + b with gcd(a, n) = 1
  function affine(text, set) {
    const n = set.length, cipher = toCodes(text, set), L = lettersOf(set);
    let best = null, tried = 0;
    for (let a = 1; a < n; a++) {
      if (gcd(a, n) !== 1) continue;
      const ai = invMod(a, n);
      for (let b = 0; b < n; b++) {
        tried++;
        const inv = [];
        for (let y = 0; y < n; y++) inv.push(((ai * (y - b)) % n + n) % n);
        const plain = cipher.map(function (y) { return inv[y]; }); plain.words = cipher.words;
        const sc = scoreCodes(plain, L);
        if (!best || sc > best.score) best = { a: a, b: b, inv: inv, score: sc };
      }
    }
    return { tried: tried, a: best.a, b: best.b, inv: best.inv, text: decodeWith(text, set, best.inv),
             perTri: perTri(best.score, cipher.length) };
  }

  // Hill climbing over all n! substitutions. Starts from the letter counts
  // (most common cipher symbol ↦ E, and so on), then keeps swapping two
  // symbols of the guessed key whenever that makes the text more English.
  // Restarts several times and keeps the best key. It runs in slices
  // (step) so the page can show the guess improving as it climbs.
  function substitution(text, set, opts) {
    opts = opts || {};
    const n = set.length, cipher = toCodes(text, set), L = lettersOf(set);
    let seed = opts.seed || 20261124;
    const rnd = function () { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const engOrder = Object.keys(ENGLISH).sort(function (a, b) { return ENGLISH[b] - ENGLISH[a]; })
      .map(function (c) { return set.indexOf(c); }).filter(function (i) { return i >= 0; });
    set.forEach(function (c, i) { if (engOrder.indexOf(i) < 0) engOrder.push(i); });
    const counts = new Array(n).fill(0);
    cipher.forEach(function (y) { counts[y]++; });
    const byCount = set.map(function (c, i) { return i; }).sort(function (a, b) { return counts[b] - counts[a] || a - b; });
    const start = new Array(n);
    byCount.forEach(function (y, r) { start[y] = engOrder[r]; });
    const used = byCount.filter(function (y) { return counts[y] > 0; });
    const decode = function (inv) { const p = cipher.map(function (y) { return inv[y]; }); p.words = cipher.words; return p; };
    const restarts = opts.restarts || 12, rounds = opts.rounds || 1200;
    const st = { restart: 0, inv: start.slice(), score: 0, stale: 0, steps: 0, done: used.length < 2 };
    st.score = scoreCodes(decode(st.inv), L);
    let best = { inv: start.slice(), score: st.score };
    function nextRestart() {
      if (st.score > best.score) best = { inv: st.inv.slice(), score: st.score };
      st.restart++;
      if (st.restart >= restarts) { st.done = true; return; }
      // Every third restart begins again from the letter counts; the others shake the best key so far
      st.inv = st.restart % 3 === 0 ? start.slice() : best.inv.slice();
      for (let k = 0; k < 3 + (st.restart % 7) * 2; k++) {
        const i = used[Math.floor(rnd() * used.length)], j = Math.floor(rnd() * n);
        const t = st.inv[i]; st.inv[i] = st.inv[j]; st.inv[j] = t;
      }
      st.score = scoreCodes(decode(st.inv), L); st.stale = 0;
    }
    function step(maxSwaps) {
      let left = maxSwaps || Infinity;
      while (!st.done && left-- > 0) {
        if (st.stale >= rounds) { nextRestart(); continue; }
        const i = used[Math.floor(rnd() * used.length)], j = Math.floor(rnd() * n);
        if (i === j) continue;
        st.steps++;
        const inv = st.inv;
        let t = inv[i]; inv[i] = inv[j]; inv[j] = t;
        const sc = scoreCodes(decode(inv), L);
        if (sc > st.score) { st.score = sc; st.stale = 0; }
        else { t = inv[i]; inv[i] = inv[j]; inv[j] = t; st.stale++; }
      }
      const cur = st.score > best.score ? { inv: st.inv, score: st.score } : best;
      if (st.done && st.score > best.score) best = { inv: st.inv.slice(), score: st.score };
      return { done: st.done, steps: st.steps, restart: Math.min(st.restart + 1, restarts), restarts: restarts,
               inv: cur.inv.slice(), text: decodeWith(text, set, cur.inv) };
    }
    if (opts.sync) { let r; do { r = step(5000); } while (!r.done); return r; }
    return { step: step };
  }

  // How many of the message's words are in the word list
  function wordsFound(text) {
    const list = text.toUpperCase().match(/[A-Z]+/g) || [];
    const W = words();
    const hit = list.filter(function (w) { return w.length <= 11 && W.has(wordKey(w)); }).length;
    return { hit: hit, total: list.length };
  }

  // The same score for any candidate plaintext (used to compare the attacks)
  function englishness(text, set) {
    const codes = toCodes(text, set);
    return perTri(scoreCodes(codes, lettersOf(set)), codes.length);
  }

  return {
    ENGLISH: ENGLISH,
    affine: affine,
    substitution: substitution,
    englishness: englishness,
    wordsFound: wordsFound,
    gcd: gcd,
    multiset: multiset,
    chiSquared: chiSquared,
    unshift: unshift,
    bruteForce: bruteForce,
    profile: profile,
    englishProfile: englishProfile
  };
})();
