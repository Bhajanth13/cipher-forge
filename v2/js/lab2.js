/* =========================================================
   Cipher Forge — lab2.js
   The second half of the lab: bracketings (Catalan numbers),
   relations and equivalence classes, the two-letter cipher
   on S × S, and breaking ciphers.
   ========================================================= */
(function () {
  'use strict';

  const $ = function (id) { return document.getElementById(id); };
  const B = CF.blocks, FN = CF.fn, R = CF.rel, BR = CF.breaker, C = CF.count;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function sub(n) { return String(n).split('').map(function (d) { return '₀₁₂₃₄₅₆₇₈₉'[+d]; }).join(''); }
  function tick(ok, text) {
    return '<li class="' + (ok ? 'is-ok' : 'is-bad') + '"><span class="' + (ok ? 'ok' : 'bad') + '">' + (ok ? 'Yes' : 'No') + '</span>' + text + '</li>';
  }

  const SAMPLE = 'It was the best of times and the worst of times for the small team in the lab. ' +
    'Every evening they met to test a new idea, write down what failed, and try again the next morning. ' +
    'Patience, they learned, is the quiet engine behind every result worth keeping.';

  /* =========================================================
     Bracketings (Module 5: Catalan numbers)
     ========================================================= */
  let lastBracketKey = '';
  function renderBrackets() {
    const chain = CF.app.state.chain, s = CF.app.set();
    const k = chain.length;
    const grid = $('bracket-grid');
    if (k === 0) {
      $('brackets-count').textContent = 'No blocks yet';
      grid.innerHTML = '';
      return;
    }
    // Written order is fk ∘ … ∘ f1 (f1 acts first)
    const items = chain.map(function (b, i) {
      return { name: 'f' + sub(i + 1), map: B.mapOf(b, s) };
    }).reverse();
    const count = R.catalan(k - 1);
    $('brackets-count').textContent = k + ' block' + (k === 1 ? '' : 's') + ': C' + sub(k - 1) + ' = ' + count + ' bracketing' + (count === 1n ? '' : 's');

    const key = chain.map(function (b) { return b.id; }).join(',');
    const animate = key !== lastBracketKey && !reduce;
    lastBracketKey = key;

    if (k > 6) {
      grid.innerHTML = '<p class="muted">Too many to list: ' + C.withCommas(count) + ' bracketings. All of them give the same cipher, because composition is associative.</p>';
      return;
    }
    const F = CF.app.chainMap();
    const all = R.bracketings(items);
    grid.innerHTML = all.map(function (b, i) {
      let str = b.str;
      if (str.charAt(0) === '(') str = str.slice(1, -1);   // drop the outermost pair
      const same = R.sameMap(b.map, F);
      return '<div class="bracket' + (animate ? ' flip' : '') + '" style="--i:' + i + '">' +
        '<p class="mono">' + esc(str) + '</p>' +
        '<p class="' + (same ? 'ok' : 'bad') + '">' + (same ? 'Same cipher as F' : 'Different') + '</p></div>';
    }).join('');
  }

  /* =========================================================
     Relation matrix and equivalence classes (Module 3)
     ========================================================= */
  function renderRelation() {
    const s = CF.app.set(), n = s.length, F = CF.app.chainMap();
    const svg = $('rel-matrix');
    const cell = 16, pad = 28, size = pad + n * cell + 2;
    svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
    const rel = R.asRelation(F);
    const colCount = new Array(n).fill(0);
    rel.forEach(function (p) { colCount[p[1]] += 1; });

    let html = '';
    for (let i = 0; i < n; i++) {
      html += '<text class="mlbl" x="' + (pad - 7) + '" y="' + (pad + i * cell + cell / 2) + '" text-anchor="end">' + esc(s[i]) + '</text>';
      html += '<text class="mlbl" x="' + (pad + i * cell + cell / 2) + '" y="' + (pad - 7) + '" text-anchor="middle">' + esc(s[i]) + '</text>';
    }
    html += '<rect class="mgrid" x="' + pad + '" y="' + pad + '" width="' + (n * cell) + '" height="' + (n * cell) + '"/>';
    for (let i = 1; i < n; i++) {
      html += '<line class="mline" x1="' + pad + '" x2="' + (pad + n * cell) + '" y1="' + (pad + i * cell) + '" y2="' + (pad + i * cell) + '"/>';
      html += '<line class="mline" y1="' + pad + '" y2="' + (pad + n * cell) + '" x1="' + (pad + i * cell) + '" x2="' + (pad + i * cell) + '"/>';
    }
    rel.forEach(function (p, i) {
      const clash = colCount[p[1]] > 1;
      html += '<circle class="mdot' + (clash ? ' clash' : '') + '" style="--i:' + i + '" cx="' + (pad + p[1] * cell + cell / 2) + '" cy="' + (pad + p[0] * cell + cell / 2) + '" r="' + (cell * 0.3) + '"><title>(' + esc(s[p[0]]) + ', ' + esc(s[p[1]]) + ')</title></circle>';
    });
    svg.innerHTML = html;

    const emptyCols = colCount.filter(function (c) { return c === 0; }).length;
    $('rel-cap').textContent = 'Rows are inputs x, columns are outputs f(x). |R| = ' + rel.length + ' of the |S × S| = ' + (n * n) + ' possible pairs.';
    $('rel-ticks').innerHTML =
      tick(R.isFunction(rel, n), 'One dot in every row, so R is a function.') +
      tick(emptyCols === 0 && colCount.every(function (c) { return c === 1; }),
        emptyCols === 0 && colCount.every(function (c) { return c === 1; })
          ? 'One dot in every column, so the function is a bijection.'
          : 'Not one dot per column: ' + emptyCols + ' empty, ' + colCount.filter(function (c) { return c > 1; }).length + ' crowded.');

    // Equivalence relation x ~ y ⇔ f(x) = f(y)
    const props = R.checkEquivalence(F);
    $('eq-props').innerHTML =
      tick(props.reflexive, 'Reflexive: x ~ x for every x') +
      tick(props.symmetric, 'Symmetric: x ~ y implies y ~ x') +
      tick(props.transitive, 'Transitive: x ~ y and y ~ z imply x ~ z');
    const cls = R.classes(F);
    $('eq-count').textContent = cls.length + ' classes for |S| = ' + n + ' symbols' + (cls.length === n ? ': every symbol stands alone.' : ': some symbols are merged.');
    $('eq-classes').innerHTML = cls.map(function (c) {
      return '<span class="cls' + (c.length > 1 ? ' merged' : '') + '">{ ' + c.map(function (i) { return esc(s[i]); }).join(', ') + ' }</span>';
    }).join('');
  }

  /* =========================================================
     Two-letter cipher on S × S (Module 1: Cartesian product)
     ========================================================= */
  let pairRule = 'add';
  function renderPairPicker() {
    const box = $('pair-rule');
    box.innerHTML = '';
    Object.keys(R.PAIR_RULES).forEach(function (key) {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(key === pairRule));
      b.textContent = R.PAIR_RULES[key].name;
      b.addEventListener('click', function () { pairRule = key; renderPairPicker(); renderPairs(); });
      box.appendChild(b);
    });
  }

  function renderPairs() {
    const s = CF.app.set(), n = s.length, rule = R.PAIR_RULES[pairRule];
    $('pair-formula').textContent = 'f : S × S → S × S,  ' + rule.formula;
    const enc = R.runPairs($('pair-in').value, s, pairRule, false);
    const dec = R.runPairs(enc.output, s, pairRule, true);
    $('pair-list').innerHTML = enc.pairs.length
      ? enc.pairs.map(function (p) { return '<span>(' + esc(p[0][0]) + ', ' + esc(p[0][1]) + ') ↦ (' + esc(p[1][0]) + ', ' + esc(p[1][1]) + ')</span>'; }).join('')
      : '<span class="muted">Type symbols from S</span>';
    $('pair-out').innerHTML = esc(enc.output) + '  →  ' + (dec ? esc(dec.output) : '<span class="bad">cannot decrypt</span>');

    const r = FN.analyse(R.pairMap(pairRule, n), n * n);
    const N = n * n;
    $('pair-checks').innerHTML =
      '<div class="stat"><p class="mono stat-num">' + n + ' × ' + n + ' = ' + N + '</p><p class="muted">pairs in S × S, by the product rule</p></div>' +
      '<ul class="ticks">' +
      tick(r.injective, r.injective ? 'One-to-one on all ' + N + ' pairs' : 'Not one-to-one: ' + r.collisions.length + ' outputs are shared') +
      tick(r.surjective, r.surjective ? 'Onto: every pair is produced' : 'Not onto: only ' + r.rangeSize + ' of ' + N + ' pairs are produced') +
      '</ul>' +
      '<p class="mono pair-inv">Inverse: ' + esc(rule.inverse) + '</p>' +
      (r.bijective ? '' : '<p class="muted">Pigeonhole: ' + N + ' pairs into ' + r.rangeSize + ' outputs, so some output holds at least ⌈' + N + ' / ' + r.rangeSize + '⌉ = ' + r.crowded + ' pairs.</p>');
  }

  /* =========================================================
     Break it (multisets, brute force, pigeonhole)
     ========================================================= */
  let ringBuilt = 0, ringAngle = 0;
  const FACE_H = 46;

  function buildRing(cands) {
    const ring = $('ring'), n = cands.length;
    const step = 360 / n;
    const radius = (FACE_H / 2) / Math.tan(Math.PI / n);
    ring.innerHTML = cands.map(function (c, i) {
      return '<div class="ring-face" style="transform:rotateX(' + (-i * step) + 'deg) translateZ(' + radius.toFixed(1) + 'px)">' +
        '<span class="rk">k = ' + c.k + '</span><span class="rt">' + esc(c.text.slice(0, 34)) + '</span></div>';
    }).join('');
    ringBuilt = n;
    $('ring-n').textContent = n;
  }

  function crack() {
    const s = CF.app.set(), text = $('brk-in').value;
    if (!text.trim()) { $('brk-verdict').textContent = 'Paste or generate some ciphertext first.'; return; }
    const res = BR.bruteForce(text, s);
    buildRing(res.candidates);
    const n = res.candidates.length, step = 360 / n;
    const ring = $('ring');
    const spins = reduce ? 0 : 2;
    const goal = res.best.k * step;
    const offset = ((goal - ringAngle) % 360 + 360) % 360;
    const target = ringAngle + offset + 360 * spins;
    ring.style.transition = 'none';
    ring.style.transform = 'rotateX(' + ringAngle + 'deg)';
    void ring.offsetWidth;
    ringAngle = target;
    ring.style.transition = reduce ? 'none' : 'transform 2.6s cubic-bezier(.15,.75,.15,1)';
    ring.style.transform = 'rotateX(' + target + 'deg)';
    ring.querySelectorAll('.ring-face').forEach(function (f, i) { f.classList.toggle('is-best', i === res.best.k); });

    const english = res.perLetter < 1.2 && res.letters >= 8;
    const verdict = $('brk-verdict');
    verdict.innerHTML = '<span class="muted">Spinning through ' + n + ' keys…</span>';
    setTimeout(function () {
      verdict.innerHTML = english
        ? '<span class="ok">Cracked</span> Shift k = ' + res.best.k + ' reads as English after trying all ' + n + ' keys. ' +
          '<span class="mono small-mono">' + esc(res.best.text.slice(0, 80)) + (res.best.text.length > 80 ? '…' : '') + '</span>'
        : '<span class="bad">No shift works</span> None of the ' + n + ' shifts reads as English, so this is not a simple shift. Brute force over all ' + s.length + '! substitutions is impossible, but frequency analysis still leaks the pattern.';
    }, reduce ? 0 : 2400);

    renderFrequency(text);
  }

  function bars(list, max, key, label) {
    return list.map(function (d) {
      const h = max ? Math.max(2, (d[key] / max) * 100) : 2;
      return '<div class="bar" title="' + esc(d.c) + ': ' + label(d) + '"><span style="height:' + h.toFixed(1) + '%"></span><b>' + esc(d.c) + '</b></div>';
    }).join('');
  }

  function renderFrequency(text) {
    const s = CF.app.set();
    const letters = BR.ENGLISH;
    const prof = BR.profile(text, s).filter(function (d) { return d.c in letters; });
    const ms = BR.multiset(text, s);
    const top = prof.filter(function (d) { return d.n > 0; });
    $('multiset').textContent = top.length
      ? 'M = { ' + top.slice(0, 10).map(function (d) { return d.c + C.sup(d.n); }).join(', ') + (top.length > 10 ? ', …' : '') + ' },  |M| = ' + ms.total
      : 'M = { }';
    $('bars-cipher').innerHTML = bars(prof, prof.length ? prof[0].n : 0, 'n', function (d) { return d.n; });
    const eng = BR.englishProfile();
    $('bars-english').innerHTML = bars(eng, eng[0].p, 'p', function (d) { return d.p + '%'; });

    const guess = $('freq-guess');
    if (!top.length || !('E' in letters) || s.indexOf('E') < 0) { guess.textContent = ''; return; }
    const most = top[0].c;
    const k = ((s.indexOf(most) - s.indexOf('E')) % s.length + s.length) % s.length;
    const plain = BR.unshift(text, k, s);
    const longer = ms.total > s.length;
    guess.innerHTML = 'Most common ciphertext letter: <b>' + esc(most) + '</b>. In English that is usually <b>E</b>, which suggests shift k = <b>' + k + '</b>: ' +
      '<span class="mono small-mono">' + esc(plain.slice(0, 60)) + '…</span>' +
      (longer ? '<br><span class="muted">The message has ' + ms.total + ' symbols but S has only ' + s.length + ', so by the pigeonhole principle some symbol must repeat. Those repeats are what frequency analysis feeds on.</span>' : '');
  }

  function sampleCipher() {
    const st = CF.app.state;
    const r = B.run(SAMPLE, st.chain, CF.app.set(), false);
    $('brk-in').value = r.output;
  }

  /* ---------- Wire up ---------- */
  $('pair-in').addEventListener('input', renderPairs);
  $('brk-sample').addEventListener('click', function () { sampleCipher(); crack(); });
  $('brk-mine').addEventListener('click', function () { $('brk-in').value = CF.app.ciphertext(); crack(); });
  $('brk-run').addEventListener('click', crack);

  function refresh() {
    renderBrackets();
    renderRelation();
    renderPairs();
  }
  document.addEventListener('cf:change', refresh);

  renderPairPicker();
  refresh();
  sampleCipher();
  const first = BR.bruteForce($('brk-in').value, CF.app.set());
  buildRing(first.candidates);
  renderFrequency($('brk-in').value);

  // Crack automatically the first time the section comes into view
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (e) {
      if (e[0].isIntersecting) { crack(); io.disconnect(); }
    }, { threshold: 0.45 });
    io.observe($('ring-stage'));
  }

  CF.lab2 = { crack: crack, sampleCipher: sampleCipher };
})();
