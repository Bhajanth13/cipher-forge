/* =========================================================
   Cipher Forge — counting.js
   Syllabus: Module 4 — rules of sum and product,
   permutations, permutations with repetition.
   Module 5 — combinations, combinations with repetition,
   the binomial theorem.
   BigInt is used so huge counts like 26! stay exact.
   ========================================================= */
window.CF = window.CF || {};

CF.count = (function () {
  'use strict';

  // n! = n × (n − 1) × … × 1
  function factorial(n) {
    let r = 1n;
    for (let i = 2n; i <= BigInt(n); i++) r *= i;
    return r;
  }

  // Product rule repeated r times: n^r (permutations with repetition)
  function power(n, r) { return BigInt(n) ** BigInt(r); }

  // Sum rule over disjoint groups: |A ∪ B ∪ …| = |A| + |B| + …
  function sumRule(sizes) { return sizes.reduce(function (a, b) { return a + b; }, 0); }

  // P(n, r) = n! / (n − r)!  (arrangements, no repeats)
  function permutations(n, r) {
    if (r > n) return 0n;
    let p = 1n;
    for (let i = 0; i < r; i++) p *= BigInt(n - i);
    return p;
  }

  // C(n, r) = n! / (r! (n − r)!)  (choices, order ignored)
  function combinations(n, r) {
    if (r < 0 || r > n) return 0n;
    return permutations(n, r) / factorial(r);
  }

  // Combinations with repetition: C(n + r − 1, r)
  function multichoose(n, r) { return combinations(n + r - 1, r); }

  // Binomial theorem with x = y = 1: Σ C(n, k) = 2^n
  function binomialRow(n) {
    const row = [];
    for (let k = 0; k <= n; k++) row.push(combinations(n, k));
    return row;
  }

  /* ---------- Formatting helpers ---------- */

  function withCommas(big) {
    return big.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // 4.03 × 10²⁶ style
  const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  function sup(s) { return String(s).split('').map(function (c) { return SUP[c] || c; }).join(''); }

  function scientific(big) {
    const s = big.toString();
    if (s.length <= 6) return withCommas(big);
    const lead = s[0] + '.' + s.slice(1, 3);
    return lead + ' × 10' + sup(s.length - 1);
  }

  // How long trying every key takes at `perSecond` guesses per second
  function bruteForceTime(big, perSecond) {
    const seconds = Number(big) / perSecond;
    const MIN = 60, HOUR = 3600, DAY = 86400, YEAR = 31557600;
    const UNIVERSE = 13.8e9 * YEAR;
    function fmt(v) { return v < 10 ? v.toFixed(1) : Math.round(v).toLocaleString('en-IN'); }
    if (seconds < 1) return 'instant';
    if (seconds < MIN) return fmt(seconds) + ' seconds';
    if (seconds < HOUR) return fmt(seconds / MIN) + ' minutes';
    if (seconds < DAY) return fmt(seconds / HOUR) + ' hours';
    if (seconds < YEAR) return fmt(seconds / DAY) + ' days';
    if (seconds < 1e6 * YEAR) return fmt(seconds / YEAR) + ' years';
    if (seconds < UNIVERSE) return (seconds / YEAR / 1e9 >= 0.1 ? (seconds / YEAR / 1e9).toFixed(1) + ' billion years' : (seconds / YEAR / 1e6).toFixed(1) + ' million years');
    const ages = seconds / UNIVERSE;
    if (ages < 1e6) return fmt(ages) + '× the age of the universe';
    return scientific(BigInt(Math.floor(ages))) + '× the age of the universe';
  }

  return {
    factorial: factorial,
    power: power,
    sumRule: sumRule,
    permutations: permutations,
    combinations: combinations,
    multichoose: multichoose,
    binomialRow: binomialRow,
    withCommas: withCommas,
    scientific: scientific,
    sup: sup,
    bruteForceTime: bruteForceTime
  };
})();
