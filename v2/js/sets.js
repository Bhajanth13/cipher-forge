/* =========================================================
   Cipher Forge — sets.js
   Syllabus: Module 1 — Sets, set operations, set-builder
   notation, Cartesian product, cardinality.
   ========================================================= */
window.CF = window.CF || {};

CF.sets = (function () {
  'use strict';

  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const DIGITS = '0123456789'.split('');
  const VOWELS = ['A', 'E', 'I', 'O', 'U'];

  /* ---------- Set operations (order is kept, repeats removed) ---------- */

  // A ∪ B : everything in A or in B
  function union(a, b) {
    const out = a.slice();
    b.forEach(function (x) { if (!out.includes(x)) out.push(x); });
    return out;
  }

  // A ∩ B : everything in both A and B
  function intersection(a, b) {
    return a.filter(function (x) { return b.includes(x); });
  }

  // A − B : in A but not in B
  function difference(a, b) {
    return a.filter(function (x) { return !b.includes(x); });
  }

  // A Δ B : in exactly one of A, B
  function symmetricDifference(a, b) {
    return union(difference(a, b), difference(b, a));
  }

  // Complement of A inside a universal set U : U − A
  function complement(a, universe) {
    return difference(universe, a);
  }

  // A × B : all ordered pairs (x, y) with x ∈ A, y ∈ B
  function cartesian(a, b) {
    const out = [];
    a.forEach(function (x) { b.forEach(function (y) { out.push([x, y]); }); });
    return out;
  }

  // |A| : cardinality
  function cardinality(a) { return a.length; }

  /* ---------- Named sets used by the app ---------- */

  const NAMED = {
    A: { name: 'A', title: 'Letters', set: LETTERS },
    V: { name: 'V', title: 'Vowels', set: VOWELS },
    D: { name: 'D', title: 'Digits', set: DIGITS }
  };

  // The symbol sets a cipher can work on. Each shows its notation.
  const PRESETS = {
    letters: {
      title: 'Letters',
      set: LETTERS,
      roster: 'A = { A, B, C, …, Z }',
      builder: 'A = { x | x is a letter of the English alphabet }'
    },
    lettersDigits: {
      title: 'Letters ∪ Digits',
      set: union(LETTERS, DIGITS),
      roster: 'A ∪ D = { A, …, Z, 0, …, 9 }',
      builder: 'A ∪ D = { x | x ∈ A ∨ x ∈ D }'
    },
    consonants: {
      title: 'Consonants',
      set: difference(LETTERS, VOWELS),
      roster: 'A − V = { B, C, D, F, …, Z }',
      builder: 'A − V = { x | x ∈ A ∧ x ∉ V }'
    },
    digits: {
      title: 'Digits',
      set: DIGITS,
      roster: 'D = { 0, 1, 2, …, 9 }',
      builder: 'D = { x ∈ ℤ | 0 ≤ x ≤ 9 }'
    }
  };

  return {
    LETTERS: LETTERS,
    DIGITS: DIGITS,
    VOWELS: VOWELS,
    NAMED: NAMED,
    PRESETS: PRESETS,
    union: union,
    intersection: intersection,
    difference: difference,
    symmetricDifference: symmetricDifference,
    complement: complement,
    cartesian: cartesian,
    cardinality: cardinality
  };
})();
