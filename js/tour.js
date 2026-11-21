/* =========================================================
   Cipher Forge — tour.js
   Presentation mode: a guided walkthrough for the viva.
   Press "Present" (or P), then use the arrow keys.
   ========================================================= */
(function () {
  'use strict';

  const $ = function (id) { return document.getElementById(id); };

  const STEPS = [
    { sel: '#top .rotor-stage', title: 'A cipher is a rule that scrambles a message',
      text: 'The rotors shift every letter 3 places: HELLO becomes KHOOR. Scroll and they turn.',
      maths: 'f(x) = (x + 3) mod 26' },
    { sel: '#set-picker', title: 'Step 1: the symbols form a set S',
      text: 'Every cipher works on a set of symbols. Its cardinality decides how many keys exist.',
      maths: 'Module 1: |S| = 26, A ∪ D, A − V, S × S' },
    { sel: '#chain', title: 'Step 2: blocks are functions, chains are compositions',
      text: 'Shift, then swap, then mirror. The whole cipher is one function F built by composition.',
      maths: 'Module 3: F = f₃ ∘ f₂ ∘ f₁', before: function () { CF.app.loadPreset('Three blocks'); } },
    { sel: '#brackets-panel', title: 'The brackets don’t matter',
      text: 'Three blocks can be bracketed in C₂ = 2 ways, and both give the same cipher because composition is associative.',
      maths: 'Module 5: Cₙ = C(2n, n) / (n + 1)' },
    { sel: '#diagram', title: 'Step 3: only a bijection can be undone',
      text: 'Each arrow is one symbol. “Multiply by 2” sends A and N to the same place, so decryption is impossible.',
      maths: 'Module 3: injective ∧ surjective ⇔ bijective', before: function () { CF.app.loadPreset('Broken: multiply by 2'); } },
    { sel: '.checks', title: 'The checks, written in logic',
      text: 'One-to-one and onto are predicates with quantifiers. The pigeonhole principle proves a clash must exist.',
      maths: 'Module 2: ∀x₁, x₂ ∈ S : f(x₁) = f(x₂) → x₁ = x₂' },
    { sel: '#truth', title: 'Decryptable is a proposition',
      text: 'V ⇔ I ∧ O. The highlighted row is the current cipher.',
      maths: 'Module 2: truth tables and logical equivalence' },
    { sel: '#rel-matrix', title: 'Step 4: a function is a relation',
      text: 'One dot per row means a function; one dot per column means a bijection. Symbols with the same output form equivalence classes.',
      maths: 'Module 3: R ⊆ S × S, x ~ y ⇔ f(x) = f(y)' },
    { sel: '.pairs-panel', title: 'A cipher on pairs: S × S',
      text: 'This block encrypts two letters at a time, so it is a function on the Cartesian product, with 676 inputs.',
      maths: 'Module 1: |S × S| = 26 × 26 = 676' },
    { sel: '#encrypt .io', title: 'Step 5: encrypt, then undo in reverse order',
      text: 'Decryption applies each inverse block, last block first. Socks and shoes.',
      maths: 'Module 3: (g ∘ f)⁻¹ = f⁻¹ ∘ g⁻¹', before: function () { CF.app.loadPreset('Shift, then mirror'); } },
    { sel: '#pipe', title: 'Step 6: send it by sound',
      text: 'The ciphertext becomes character codes, then base-16 digits, then tones. The receiver applies the inverses in reverse order and decrypts with the shared key.',
      maths: 'Module 3: send = tones ∘ hex ∘ code ∘ F, receive = its inverse', before: function () { CF.app.loadPreset('Caesar'); } },
    { sel: '#send .send-split', title: 'Only the key holder can read it',
      text: 'Anyone can hear the tones, but without the key they only get ciphertext. A checksum (sum mod 256) shows whether every tone arrived.',
      maths: 'Module 4: 16 × 16 = 256 character codes from two tones' },
    { sel: '#ring-stage', title: 'Step 7: an eavesdropper tries brute force',
      text: 'A shift cipher has only 26 keys. The drum tries every one and stops on the one that reads as English.',
      maths: 'Module 4: try all n keys', before: function () { CF.app.loadPreset('Caesar'); CF.lab2.sampleCipher(); CF.lab2.crack(); } },
    { sel: '#bars-cipher', title: 'Frequency analysis',
      text: 'A substitution only relabels letters, so the letter counts keep the shape of English. Long messages must repeat letters.',
      maths: 'Module 1: multisets · Module 3: pigeonhole' },
    { sel: '#keys', title: 'Step 8: count the keys',
      text: 'Shift: 26 keys. Any substitution: 26! ≈ 4.03 × 10²⁶, about 12.8 billion years at a billion guesses a second.',
      maths: 'Module 4: n!, nʳ, P(n, r) · Module 5: C(n, r)' },
    { sel: '#syllabus .map', title: 'Every module has a job in the app',
      text: 'Sets, logic, relations and functions, counting, and combinations: all five modules are used.',
      maths: 'CS1812 Discrete Mathematics and Set Theory' }
  ];

  const box = $('tour');
  let i = -1, focused = null;

  function show(n) {
    i = Math.max(0, Math.min(STEPS.length - 1, n));
    const st = STEPS[i];
    if (st.before) st.before();
    if (focused) focused.classList.remove('tour-focus');
    focused = document.querySelector(st.sel);
    if (focused) {
      focused.classList.add('tour-focus');
      focused.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    $('tour-step').textContent = (i + 1) + ' / ' + STEPS.length;
    $('tour-title').textContent = st.title;
    $('tour-text').textContent = st.text;
    $('tour-maths').textContent = st.maths;
    $('tour-prev').disabled = i === 0;
    $('tour-next').textContent = i === STEPS.length - 1 ? 'Finish' : 'Next';
  }

  function start() {
    box.hidden = false;
    document.body.classList.add('touring');
    show(0);
    $('tour-next').focus();
  }
  function stop() {
    box.hidden = true;
    document.body.classList.remove('touring');
    if (focused) focused.classList.remove('tour-focus');
    focused = null;
    i = -1;
    $('tour-start').focus();
  }

  $('tour-start').addEventListener('click', start);
  $('tour-next').addEventListener('click', function () { i === STEPS.length - 1 ? stop() : show(i + 1); });
  $('tour-prev').addEventListener('click', function () { show(i - 1); });
  $('tour-close').addEventListener('click', stop);

  document.addEventListener('keydown', function (e) {
    const typing = e.target.closest && e.target.closest('input, textarea, select');
    if (box.hidden) {
      if (!typing && (e.key === 'p' || e.key === 'P') && !e.ctrlKey && !e.metaKey) start();
      return;
    }
    if (typing) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); i === STEPS.length - 1 ? stop() : show(i + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); show(i - 1); }
    else if (e.key === 'Escape') stop();
  });
})();
