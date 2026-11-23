/* =========================================================
   Cipher Forge v2 — deck.js
   The live website, presented like a slide deck.
   Each section of the lab is one scene. Each scene has beats:
     Explain  say what the idea is
     Show     the lab does something while you talk
     Test     ask the class to predict, then reveal
     Build    hands-on: the class chooses, you type it in
   The presenter card tells you what to say and gives the buttons.
   Keys: → or Space next beat · ← back · 1–9 scenes · N notes ·
         R reveal · F full screen · W website view
   ========================================================= */
(function () {
  'use strict';

  const $ = function (id) { return document.getElementById(id); };
  const html = document.documentElement;
  const A = CF.app, B = CF.blocks, FN = CF.fn;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function commas(b) { return b.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function setOf() { return A.set(); }
  function clickRadio(boxId, text) {
    const b = Array.prototype.find.call($(boxId).querySelectorAll('button'), function (x) { return x.textContent.trim() === text; });
    if (b) b.click();
  }
  function setSelect(id, v) { const el = $(id); el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); }

  // What the current cipher does to one input, as a sentence of positions
  function collisionSentence() {
    const s = setOf(), r = A.analyse();
    if (r.bijective) return 'Every output is hit exactly once, so it is a bijection and can be undone.';
    const c = r.collisions[0], F = A.chainMap();
    const who = c.xs.slice(0, 2).map(function (i) { return s[i] + ' (' + i + ')'; }).join(' and ');
    return who + ' both go to ' + s[c.y] + ' (' + F[c.xs[0]] + '). ' + r.unused.length + ' of ' + s.length + ' symbols are never produced, so it cannot be undone.';
  }

  // Follow A through each block of the current chain, with the arithmetic
  function traceA() {
    const s = setOf(), n = s.length, chain = A.state.chain;
    let x = 0, out = s[0] + ' (0)';
    chain.forEach(function (b) {
      const y = B.mapOf(b, s)[x];
      out += ' → ' + B.TYPES[b.type].short(b.params) + ' → ' + s[y] + ' (' + y + ')';
      x = y;
    });
    return { text: out, letter: s[x], n: n };
  }

  /* ---------- the scenes ---------- */
  const SCENES = [
    { id: 'top', title: 'Cipher Forge', beats: [
      { kind: 'Explain', title: 'What we built',
        say: 'Cipher Forge is a lab where every idea from CS1812 is something you can click. A cipher is nothing more than a function on letters, so discrete maths decides whether it works.' },
      { kind: 'Show', title: 'A cipher is a rule', target: '#top .rotor-stage',
        noScroll: true,
        say: 'Watch the rotors. Every letter moves three places forward: HELLO becomes KHOOR. Written as maths, that rule is f(x) = (x + 3) mod 26.',
        enter: function () { const h = $('top'); glide(h.offsetTop + h.offsetHeight - innerHeight); } }
    ] },

    { id: 'alphabet', title: 'Choose the symbols', module: 'Module 1: sets', beats: [
      { kind: 'Explain', title: 'The set S', target: '#alphabet .split > .panel:first-child',
        enter: function () { A.setSet('letters'); },
        say: 'Every cipher works on a set S of symbols. Read the roster form and the set-builder form. Its size, the cardinality |S| = 26, decides everything after this: the arithmetic is mod 26.' },
      { kind: 'Show', title: 'Change S and everything changes', target: '#alphabet .split > .panel:first-child',
        enter: function () { A.setSet('lettersDigits'); },
        say: 'Now S is letters ∪ digits, so |S| = 36 and positions run from 0 to 35. Every block now works mod 36.',
        buttons: [{ label: 'Back to letters', fn: function () { A.setSet('letters'); } }] },
      { kind: 'Test', title: 'Set operations', target: '#alphabet .split > .panel:nth-child(2)',
        enter: function () { A.setSet('letters'); },
        ask: 'A = letters, V = vowels, D = digits. What is |A ∪ D|? What is |V ∩ D|?',
        reveal: function () {
          setSelect('op-a', 'A'); setSelect('op-op', 'union'); setSelect('op-b', 'D');
          return '|A ∪ D| = 36 and |V ∩ D| = 0. A and D share nothing, so the union just adds: 26 + 10 = 36.';
        },
        buttons: [{ label: 'Show V ∩ D', fn: function () { setSelect('op-a', 'V'); setSelect('op-op', 'intersection'); setSelect('op-b', 'D'); } }] },
      { kind: 'Build', title: 'Your turn: pick two sets', target: '#alphabet .split > .panel:nth-child(2)',
        say: 'Ask someone to choose two sets and an operation. Set the three menus and read the answer together. The two cards below give |S × S| and the number of subsets, 2ⁿ.' }
    ] },

    { id: 'forge', title: 'Build a cipher from blocks', module: 'Module 3: functions and composition', beats: [
      { kind: 'Explain', title: 'Blocks are functions', target: '#chain',
        enter: function () { A.setSet('letters'); A.setChain([['shift', { k: 3 }], ['mirror']]); },
        say: 'Each block is a function f : S → S. Blocks run left to right, so shift(3) then mirror is the composition mirror ∘ shift(3): the function on the right runs first.' },
      { kind: 'Test', title: 'Predict the output', target: '.formula-bar',
        ask: 'With shift(3) then mirror, what does A become?',
        reveal: function () { const t = traceA(); return t.text + '. Mirror sends position x to 25 − x, so 3 becomes 22, which is ' + t.letter + '.'; } },
      { kind: 'Build', title: 'Write your own function', target: '#chain', formula: true,
        say: 'Ask the class for any formula in x, such as 3x + 7 or x². Type it below. The lab works it out mod 26 for every letter and says at once whether it can be undone.' },
      { kind: 'Explain', title: 'Do the brackets matter?', target: '#brackets-panel',
        enter: function () { A.setChain([['shift', { k: 3 }], ['swap', { p: 'A', q: 'Z' }], ['mirror']]); },
        say: 'Three blocks can be bracketed in C₂ = 2 ways. Both give the same cipher because composition is associative. The count of bracketings is the Catalan number.' }
    ] },

    { id: 'inspect', title: 'Check that it can be undone', module: 'Modules 2 and 3: logic, bijections, pigeonhole', beats: [
      { kind: 'Show', title: 'Read the arrows', target: '.diagram-wrap',
        enter: function () { A.setChain([['shift', { k: 3 }]]); },
        say: 'Each arrow takes one input letter to its output. The table under the arrows says the same thing: input on top, output below. Walk the arrows one at a time so everyone can follow.',
        buttons: [{ label: 'Walk the arrows', fn: function () { A.walk(800); } }, { label: 'Stop', fn: function () { A.walkStop(); } }] },
      { kind: 'Test', title: 'Is multiply by 2 safe?', target: '.diagram-wrap',
        ask: 'f(x) = 2x mod 26. Can we always decrypt it?',
        reveal: function () { A.setChain([['multiply', { a: 2 }]]); return 'No. ' + collisionSentence() + ' The reason: 2 × 13 = 26 ≡ 0, and gcd(2, 26) = 2.'; } },
      { kind: 'Test', title: 'Squares and fifth powers', target: '.diagram-wrap',
        ask: 'f(x) = x² mod 26: bijection or not? And f(x) = x⁵?',
        reveal: function () {
          A.setChain([['custom', { expr: 'x^2' }]]);
          const sq = collisionSentence();
          return 'x²: ' + sq + ' Now press “Try x⁵”.';
        },
        buttons: [{ label: 'Try x⁵', fn: function () { A.setChain([['custom', { expr: 'x^5' }]]); note('x⁵: ' + collisionSentence() + ' A formula that looks complicated can still be a bijection: check the arrows, not the looks.'); } }] },
      { kind: 'Explain', title: 'The checks in logic', target: '.checks',
        say: 'One-to-one and onto are predicates with ∀ and ∃. The pigeonhole check: n inputs into fewer outputs forces a clash, so some output gets at least ⌈n / outputs⌉ inputs.' },
      { kind: 'Explain', title: 'Decryptable is a proposition', target: '.truth',
        say: 'Let I = one-to-one, O = onto, V = decryptable. Then V ⇔ I ∧ O. The highlighted row is the function on screen.' }
    ] },

    { id: 'relations', title: 'See the cipher as a relation', module: 'Modules 1 and 3: Cartesian product and relations', beats: [
      { kind: 'Explain', title: 'A function is a relation', target: '#relations .split > .panel:first-child',
        enter: function () { A.setChain([['shift', { k: 3 }], ['mirror']]); },
        say: 'F is the set of pairs (x, F(x)) inside S × S. One dot in every row means a function; one dot in every column as well means a bijection, a permutation matrix.' },
      { kind: 'Show', title: 'Letters the cipher can’t tell apart', target: '#relations .split > .panel:nth-child(2)',
        enter: function () { A.setChain([['multiply', { a: 2 }]]); },
        say: 'With multiply by 2, x ~ y when f(x) = f(y). It is reflexive, symmetric and transitive, so it is an equivalence relation; its classes are pairs like {A, N}.' },
      { kind: 'Build', title: 'A cipher on pairs', target: '.pairs-panel',
        enter: function () { setTimeout(function () { $('pair-in').focus({ preventScroll: true }); $('pair-in').select(); }, 400); },
        say: 'This block encrypts two letters at a time, so its domain is S × S with 26 × 26 = 676 inputs. Ask someone for a short message and type it in.' }
    ] },

    { id: 'encrypt', title: 'Encrypt, then undo it', module: 'Module 3: inverse of a composition', beats: [
      { kind: 'Build', title: 'Encrypt a message from the class', target: '#encrypt .io',
        enter: function () { A.setChain([['shift', { k: 3 }], ['mirror']]); setTimeout(function () { $('msg-in').focus({ preventScroll: true }); $('msg-in').select(); }, 400); },
        say: 'Ask someone for a message and type it. The ciphertext appears at once, and the right side decrypts it back.' },
      { kind: 'Test', title: 'Which inverse runs first?', target: '#encrypt .io',
        ask: 'We did shift(3), then mirror. To undo it, which inverse runs first?',
        reveal: function () { return 'Mirror⁻¹ first, then shift(3)⁻¹, because (g ∘ f)⁻¹ = f⁻¹ ∘ g⁻¹. You take your shoes off before your socks. ' + ($('dec-formula').textContent || ''); } },
      { kind: 'Show', title: 'Every step, in a table', target: '#encrypt .trace',
        enter: function () { const b = document.querySelector('#trace-dir [data-dir="dec"]'); if (b) b.click(); },
        say: 'The trace shows each letter after each inverse block, in reverse order.' }
    ] },

    { id: 'break', title: 'Break it', module: 'Modules 1, 3 and 4: multisets, pigeonhole, brute force', beats: [
      { kind: 'Show', title: 'Brute force', target: '#break .ring-panel',
        enter: function () { A.setChain([['shift', { k: 7 }]]); CF.lab2.sampleCipher(); setTimeout(CF.lab2.crack, 500); },
        say: 'An attacker sees only ciphertext. A shift cipher has just 26 keys, so the drum tries every one and stops on the one that reads as English.' },
      { kind: 'Test', title: 'Too many keys to try?', target: '#break .break-grid > .panel:nth-child(2)',
        enter: function () { A.setChain([['keyword', { word: 'FORGE' }]]); CF.lab2.sampleCipher(); },
        ask: 'A keyword cipher is a substitution with 26! possible keys. Far too many to try. How else can we break it?',
        reveal: function () { CF.lab2.crack(); return 'Count the letters. A substitution only relabels letters, so the most common ciphertext letter very likely stands for E. ' + ($('freq-guess').textContent || ''); } }
    ] },

    { id: 'attack', title: 'Count the keys an attacker must try', module: 'Modules 4 and 5: counting', beats: [
      { kind: 'Explain', title: 'How many keys?', target: '#attack .keys-scroll',
        say: 'The sum rule, the product rule, permutations and combinations give every row of this table. Counts are exact, worked out with BigInt.' },
      { kind: 'Test', title: 'Double the length', target: '#attack .attack-controls',
        ask: 'A password uses A–Z and 0–9, so 36 symbols. If we double the length from 4 to 8, do we get twice as many passwords?',
        reveal: function () {
          const four = 36n ** 4n, eight = 36n ** 8n;
          const len = $('len'); len.value = 8; len.dispatchEvent(new Event('input', { bubbles: true }));
          return 'No. 36⁴ = ' + commas(four) + ' but 36⁸ = ' + commas(eight) + ', which is 36⁴ times as many, not twice. Length is an exponent.';
        } },
      { kind: 'Build', title: 'Your turn: design a password rule', target: '#attack .attack-controls',
        say: 'Let the class tick symbol groups, choose the length and the attacker’s speed. Read the time to try them all.' }
    ] },

    { id: 'syllabus', title: 'Where each topic lives', module: 'CS1812 Discrete Mathematics and Set Theory', beats: [
      { kind: 'Explain', title: 'All five modules', target: '#syllabus .map-scroll',
        say: 'Every module of the syllabus has a job in the lab: sets, logic, relations and functions, counting, and combinations.' },
      { kind: 'Explain', title: 'Thank you',
        say: 'Thank you. Questions? Anyone can try their own function now: switch to Website view or press W.' }
    ] }
  ];

  /* ---------- chrome: top bar, presenter card, shutter, spotlight ---------- */
  const bar = document.createElement('div');
  bar.className = 'deck-bar';
  bar.innerHTML =
    '<a class="deck-brand" href="#top"><span class="brand-mark" aria-hidden="true"></span>Cipher Forge <span class="deck-v">v2</span></a>' +
    '<div class="deck-where"><p class="deck-count mono" id="deck-count"></p><p class="deck-title" id="deck-title"></p></div>' +
    '<ol class="deck-beats" id="deck-beats" aria-label="Beats in this scene"></ol>' +
    '<div class="deck-tools">' +
      '<button type="button" class="deck-tool" id="deck-prev" aria-label="Back (←)">‹</button>' +
      '<button type="button" class="deck-tool" id="deck-next" aria-label="Next (→)">›</button>' +
      '<button type="button" class="deck-tool wide" id="deck-notes" title="Show or hide the presenter card (N)">Notes</button>' +
      '<button type="button" class="deck-tool wide" id="deck-full" title="Full screen (F)">Full screen</button>' +
      '<button type="button" class="deck-tool wide" id="deck-web" title="Leave the deck and use the website normally (W)">Website view</button>' +
    '</div>';
  document.body.appendChild(bar);

  const card = document.createElement('aside');
  card.className = 'deck-card';
  card.setAttribute('aria-live', 'polite');
  card.innerHTML =
    '<div class="dc-top"><span class="dc-kind" id="dc-kind"></span><span class="dc-step mono" id="dc-step"></span><button type="button" class="dc-min" id="dc-min" aria-label="Hide the card (N)">–</button></div>' +
    '<h3 class="dc-title" id="dc-title"></h3>' +
    '<p class="dc-say" id="dc-say"></p>' +
    '<div class="dc-ask" id="dc-ask"><p class="dc-label">Ask the class</p><p class="dc-q" id="dc-q"></p><button type="button" class="btn primary dc-reveal" id="dc-reveal">Reveal the answer (R)</button><p class="dc-a" id="dc-a"></p></div>' +
    '<form class="dc-formula" id="dc-formula" autocomplete="off">' +
      '<label class="dc-label" for="dc-expr">f(x) =</label>' +
      '<div class="dc-expr-row"><input id="dc-expr" class="mono" type="text" maxlength="40" spellcheck="false" value="3x + 7"><span class="mono dc-mod">mod 26</span></div>' +
      '<div class="dc-chips" id="dc-chips"></div>' +
      '<div class="dc-go"><button type="submit" class="btn primary">Use it as the cipher</button><button type="button" class="btn ghost" id="dc-add">Add to the chain</button></div>' +
      '<p class="dc-a" id="dc-verdict"></p>' +
    '</form>' +
    '<div class="dc-btns" id="dc-btns"></div>' +
    '<p class="dc-note" id="dc-note"></p>' +
    '<p class="dc-keys">→ next · ← back · R reveal · N hide · Esc leaves a text box</p>';
  document.body.appendChild(card);

  const shutter = document.createElement('div');
  shutter.className = 'deck-shutter';
  shutter.setAttribute('aria-hidden', 'true');
  shutter.innerHTML = '<p class="ds-num mono" id="ds-num"></p><p class="ds-title" id="ds-title"></p><p class="ds-mod mono" id="ds-mod"></p>';
  document.body.appendChild(shutter);

  const spot = document.createElement('div');
  spot.className = 'deck-spot';
  spot.setAttribute('aria-hidden', 'true');
  document.body.appendChild(spot);

  ['3x + 7', '2x + 1', 'x^2', 'x^5', '25 - x', '(x + 4)(x + 1)', '7x + 3'].forEach(function (e) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'dc-chip mono'; b.textContent = B.pretty(B.parseFormula(e).text);
    b.addEventListener('click', function () { $('dc-expr').value = e; useFormula(false); });
    $('dc-chips').appendChild(b);
  });

  /* ---------- state ---------- */
  let sc = 0, bt = 0, target = null, spotRaf = 0;

  function note(t) { $('dc-note').textContent = t || ''; }

  function useFormula(add) {
    const expr = $('dc-expr').value, r = B.parseFormula(expr), out = $('dc-verdict');
    if (r.error) { out.innerHTML = '<span class="bad">' + esc(r.error) + '</span>'; return; }
    if (add) A.addBlock('custom', { expr: expr }); else A.setChain([['custom', { expr: expr }]]);
    const s = setOf(), n = s.length, f = B.mapOf(B.create('custom', { expr: expr }), s), an = FN.analyse(f, n);
    const ex = [0, 1, 2].map(function (x) { return s[x] + ' → ' + s[f[x]]; }).join(', ');
    out.innerHTML = 'f(x) = (' + esc(B.pretty(r.text)) + ') mod ' + n + ': ' + esc(ex) + ' … ' +
      (an.bijective ? '<span class="ok">a bijection, so it can be undone.</span>'
        : '<span class="bad">not a bijection.</span> ' + esc(an.collisions[0].xs.slice(0, 2).map(function (i) { return s[i]; }).join(' and ')) + ' both go to ' + esc(s[an.collisions[0].y]) + '.') +
      (add ? ' Added as the last block.' : '') + ' Press → to see its arrows.';
  }
  $('dc-formula').addEventListener('submit', function (e) { e.preventDefault(); useFormula(false); });
  $('dc-add').addEventListener('click', function () { useFormula(true); });

  /* ---------- moving the page ---------- */
  let glideRaf = 0;
  function glide(y) {
    cancelAnimationFrame(glideRaf);
    y = Math.max(0, Math.min(y, document.documentElement.scrollHeight - innerHeight));
    const from = scrollY, dist = y - from;
    if (Math.abs(dist) < 2) return;
    if (reduce) { window.scrollTo(0, y); return; }
    const dur = Math.min(1400, 500 + Math.abs(dist) * 0.5), t0 = performance.now();
    html.style.scrollBehavior = 'auto';
    (function step(now) {
      const k = Math.min(1, (now - t0) / dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      window.scrollTo(0, from + dist * e);
      if (k < 1) glideRaf = requestAnimationFrame(step); else { glideRaf = 0; html.style.scrollBehavior = ''; }
    })(t0);
  }
  function yFor(el) {
    const r = el.getBoundingClientRect(), top = r.top + scrollY, room = innerHeight - 76;
    // centre it below the deck bar if it fits; otherwise start it just under the bar
    return r.height < room - 40 ? top - 76 - (room - r.height) / 2 : top - 90;
  }
  function jumpTo(y) { html.style.scrollBehavior = 'auto'; window.scrollTo(0, Math.max(0, y)); html.style.scrollBehavior = ''; }

  function trackSpot() {
    cancelAnimationFrame(spotRaf);
    if (!target || !html.classList.contains('deck')) { spot.classList.remove('on'); return; }
    const r = target.getBoundingClientRect();
    spot.style.transform = 'translate(' + (r.left - 10).toFixed(1) + 'px,' + (r.top - 10).toFixed(1) + 'px)';
    spot.style.width = (r.width + 20).toFixed(1) + 'px';
    spot.style.height = (r.height + 20).toFixed(1) + 'px';
    spot.classList.add('on');
    spotRaf = requestAnimationFrame(trackSpot);
  }

  /* ---------- show a beat ---------- */
  function scene(i) { return SCENES[i]; }
  function beat(i, j) { return SCENES[i].beats[j]; }

  function renderBar() {
    const S = scene(sc);
    $('deck-count').textContent = String(sc + 1).padStart(2, '0') + ' / ' + String(SCENES.length).padStart(2, '0');
    $('deck-title').textContent = S.title;
    $('deck-beats').innerHTML = S.beats.map(function (b, j) {
      return '<li><button type="button" class="db k-' + b.kind.toLowerCase() + (j === bt ? ' now' : '') + (j < bt ? ' done' : '') + '" data-j="' + j + '" title="Step ' + (j + 1) + ': ' + esc(b.title) + '" aria-label="Step ' + (j + 1) + ', ' + b.kind + ': ' + esc(b.title) + '"><span class="db-n">' + (j + 1) + '</span>' + b.kind + '</button></li>';
    }).join('');
    $('deck-beats').querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { go(sc, +b.dataset.j); }); });
    $('deck-prev').disabled = sc === 0 && bt === 0;
    $('deck-next').disabled = sc === SCENES.length - 1 && bt === scene(sc).beats.length - 1;
  }

  function renderCard(b) {
    const S = scene(sc);
    $('dc-kind').textContent = b.kind;
    $('dc-kind').className = 'dc-kind k-' + b.kind.toLowerCase();
    $('dc-step').textContent = (bt + 1) + ' of ' + S.beats.length;
    $('dc-title').textContent = b.title;
    $('dc-say').textContent = b.say || '';
    $('dc-say').hidden = !b.say;
    $('dc-ask').hidden = !b.ask;
    $('dc-q').textContent = b.ask || '';
    $('dc-a').textContent = '';
    $('dc-reveal').hidden = !b.reveal;
    $('dc-formula').hidden = !b.formula;
    $('dc-verdict').textContent = '';
    note('');
    const btns = $('dc-btns');
    btns.innerHTML = '';
    (b.buttons || []).forEach(function (x) {
      const el = document.createElement('button');
      el.type = 'button'; el.className = 'btn ghost'; el.textContent = x.label;
      el.addEventListener('click', x.fn);
      btns.appendChild(el);
    });
    btns.hidden = !(b.buttons && b.buttons.length);
  }

  function reveal() {
    const b = beat(sc, bt);
    if (!b.reveal) return;
    $('dc-a').textContent = b.reveal();
    $('dc-reveal').hidden = true;
  }
  $('dc-reveal').addEventListener('click', reveal);

  function playShutter(S, i) {
    if (reduce) return;
    $('ds-num').textContent = String(i + 1).padStart(2, '0');
    $('ds-title').textContent = S.title;
    $('ds-mod').textContent = S.module || 'CS1812 · Discrete Mathematics and Set Theory';
    shutter.classList.remove('play'); void shutter.offsetWidth; shutter.classList.add('play');
    const sec = $(S.id);
    void sec.offsetWidth; sec.classList.add('deck-in');
  }

  function go(i, j, opts) {
    i = Math.max(0, Math.min(SCENES.length - 1, i));
    j = Math.max(0, Math.min(SCENES[i].beats.length - 1, j));
    const newScene = i !== sc || (opts && opts.first);
    if (A.walkStop) A.walkStop();
    sc = i; bt = j;
    const S = scene(i), b = beat(i, j);
    target = b.target ? document.querySelector(b.target) : null;
    if (b.enter) b.enter();
    renderBar();
    renderCard(b);
    if (newScene) {
      // jump while the shutter covers the screen, then the scene turns in
      $(S.id).classList.remove('deck-in');
      jumpTo(target && !b.noScroll ? yFor(target) : $(S.id).offsetTop);
      playShutter(S, i);
    } else if (!b.noScroll) {
      setTimeout(function () { glide(target ? yFor(target) : $(S.id).offsetTop); }, 30);
    }
    trackSpot();
    try { history.replaceState(null, '', '#' + S.id); } catch (e) { /* file:// */ }
  }
  function next() {
    if (bt < scene(sc).beats.length - 1) go(sc, bt + 1);
    else if (sc < SCENES.length - 1) go(sc + 1, 0);
  }
  function prev() {
    if (bt > 0) go(sc, bt - 1);
    else if (sc > 0) go(sc - 1, scene(sc - 1).beats.length - 1);
  }

  /* ---------- deck on and off ---------- */
  function setDeck(on) {
    html.classList.toggle('deck', on);
    try { localStorage.setItem('cf-view', on ? 'deck' : 'web'); } catch (e) { /* private mode */ }
    if (on) { fit(); go(sc, bt, { first: true }); }
    else { target = null; trackSpot(); if (A.walkStop) A.walkStop(); }
  }
  function toggleFull() {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (html.requestFullscreen) html.requestFullscreen().catch(function () {});
  }
  function fit() {
    // In the deck the lab is zoomed so it reads from the back of the room
    // On a wide screen the presenter card gets its own column on the right
    const side = innerWidth >= 1500 ? 450 : 0;
    html.classList.toggle('deck-side', side > 0);
    const z = Math.max(1, Math.min(1.5, (innerWidth - side - 120) / 1180, (innerHeight - 70) / 620));
    html.style.setProperty('--dz', z.toFixed(3));
  }

  $('deck-next').addEventListener('click', next);
  $('deck-prev').addEventListener('click', prev);
  $('deck-notes').addEventListener('click', function () { html.classList.toggle('deck-nonotes'); });
  $('dc-min').addEventListener('click', function () { html.classList.add('deck-nonotes'); });
  $('deck-full').addEventListener('click', toggleFull);
  $('deck-web').addEventListener('click', function () { setDeck(false); });
  if ($('tour-start')) $('tour-start').addEventListener('click', function () { setDeck(true); });
  window.addEventListener('resize', function () { if (html.classList.contains('deck')) fit(); });

  // If the presenter scrolls by hand, the bar follows the scene on screen
  let lastSeen = -1;
  window.addEventListener('scroll', function () {
    if (!html.classList.contains('deck') || glideRaf) return;
    const mid = innerHeight * 0.45;
    let seen = 0;
    SCENES.forEach(function (S, i) { if ($(S.id).getBoundingClientRect().top < mid) seen = i; });
    if (seen !== sc) {
      lastSeen = seen;
      const r = target ? target.getBoundingClientRect() : null;
      if (!r || r.bottom < 0 || r.top > innerHeight) { sc = seen; bt = 0; target = null; renderBar(); renderCard(beat(sc, 0)); }
    }
  }, { passive: true });

  document.addEventListener('keydown', function (e) {
    if (!html.classList.contains('deck')) {
      if ((e.key === 'p' || e.key === 'P') && !(e.target.closest && e.target.closest('input, textarea, select')) && !e.ctrlKey && !e.metaKey) setDeck(true);
      return;
    }
    if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) {
      if (e.key === 'Escape') e.target.blur();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (k === 'ArrowRight' || k === ' ' || k === 'PageDown' || k === 'Enter') { e.preventDefault(); next(); }
    else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'Backspace') { e.preventDefault(); prev(); }
    else if (k === 'Home') { e.preventDefault(); go(0, 0); }
    else if (k === 'End') { e.preventDefault(); go(SCENES.length - 1, 0); }
    else if (/^[1-9]$/.test(k)) go(+k - 1, 0);
    else if (k === 'n' || k === 'N') html.classList.toggle('deck-nonotes');
    else if (k === 'r' || k === 'R') reveal();
    else if (k === 'f' || k === 'F') toggleFull();
    else if (k === 'w' || k === 'W') setDeck(false);
  });

  // Open in the deck unless the presenter last chose the website view
  let start = 'deck';
  try { if (/[?&]web\b/.test(location.search) || localStorage.getItem('cf-view') === 'web') start = 'web'; } catch (e) { /* */ }
  if (/[?&]deck\b/.test(location.search)) start = 'deck';
  const fromHash = SCENES.findIndex(function (S) { return '#' + S.id === location.hash; });
  if (fromHash > 0) sc = fromHash;
  if (start === 'deck') requestAnimationFrame(function () { setDeck(true); });
})();
