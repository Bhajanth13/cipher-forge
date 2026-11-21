/* =========================================================
   Cipher Forge — app.js
   Connects the maths (sets.js, functions.js, blocks.js,
   counting.js) to the page.
   ========================================================= */
(function () {
  'use strict';

  const $ = function (id) { return document.getElementById(id); };
  const S = CF.sets, FN = CF.fn, B = CF.blocks, C = CF.count;
  const SVGNS = 'http://www.w3.org/2000/svg';

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function listSymbols(arr, max) {
    max = max || 6;
    const shown = arr.slice(0, max).join(', ');
    return arr.length > max ? shown + ', …' : shown;
  }

  /* ---------- State ---------- */
  const state = {
    setKey: 'letters',
    chain: [B.create('shift', { k: 3 })],
    target: 'chain',          // 'chain' or a block id
    traceDir: 'enc',
    decEdited: false
  };
  const set = function () { return S.PRESETS[state.setKey].set; };

  /* =========================================================
     Step 1: Symbols (Module 1)
     ========================================================= */
  function renderSetPicker() {
    const box = $('set-picker');
    box.innerHTML = '';
    Object.keys(S.PRESETS).forEach(function (key) {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(key === state.setKey));
      b.textContent = S.PRESETS[key].title;
      b.addEventListener('click', function () {
        state.setKey = key;
        renderSetPicker();
        refreshAll(true);
      });
      box.appendChild(b);
    });
  }

  function renderSet() {
    const p = S.PRESETS[state.setKey], s = p.set, n = s.length;
    $('set-roster').textContent = p.roster;
    $('set-builder').textContent = p.builder;
    $('set-card').textContent = '|S| = ' + n;
    $('set-tiles').innerHTML = s.map(function (c, i) {
      return '<span class="tile" title="position ' + i + '">' + esc(c) + '<small>' + i + '</small></span>';
    }).join('');
    $('fact-pairs').textContent = n + ' × ' + n + ' = ' + C.withCommas(BigInt(n * n));
    $('fact-subsets').textContent = '2' + C.sup(n) + ' = ' + C.withCommas(C.power(2, n));
  }

  function renderOps() {
    const a = S.NAMED[$('op-a').value], b = S.NAMED[$('op-b').value], op = $('op-op').value;
    const fns = { union: [S.union, '∪'], intersection: [S.intersection, '∩'], difference: [S.difference, '−'], symmetric: [S.symmetricDifference, 'Δ'] };
    const res = fns[op][0](a.set, b.set);
    const expr = a.name + ' ' + fns[op][1] + ' ' + b.name;
    $('op-result').textContent = expr + ' = { ' + (res.length ? listSymbols(res, 12) : '') + ' }    |' + expr + '| = ' + res.length;
  }

  /* =========================================================
     Step 2: Build (composition)
     ========================================================= */
  function renderToolbar() {
    const pal = $('palette');
    Object.keys(B.TYPES).forEach(function (type) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn';
      b.innerHTML = '<span class="btn-plus" aria-hidden="true">+</span>' + B.TYPES[type].name;
      b.setAttribute('aria-label', 'Add ' + B.TYPES[type].name + ' block');
      b.addEventListener('click', function () {
        const blk = B.create(type, type === 'compress' ? { m: compressDefault() } : null);
        blk.fresh = true;
        state.chain.push(blk);
        refreshAll(true);
      });
      pal.appendChild(b);
    });

    presets.forEach(function (p) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn ghost';
      b.textContent = p[0];
      b.addEventListener('click', function () { loadPreset(p[0]); });
      $('presets').appendChild(b);
    });
  }

  const presets = [
      ['Caesar', function () { return [B.create('shift', { k: 3 })]; }],
      ['Shift, then mirror', function () { return [B.create('shift', { k: 3 }), B.create('mirror')]; }],
      ['Keyword', function () { return [B.create('keyword', { word: 'FORGE' })]; }],
      ['Broken: multiply by 2', function () { return [B.create('multiply', { a: 2 })]; }],
      ['Compress', function () { return [B.create('compress', { m: compressDefault() })]; }],
      ['Three blocks', function () { return [B.create('shift', { k: 3 }), B.create('swap'), B.create('mirror')]; }]
    ];

  function loadPreset(name) {
    const p = presets.find(function (x) { return x[0] === name; });
    if (!p) return;
    state.chain = p[1]();
    state.chain.forEach(function (blk) { blk.fresh = true; });
    state.target = 'chain';
    state.decEdited = false;
    refreshAll(true);
  }

  function compressDefault() { return Math.max(1, Math.ceil(set().length * 0.75)); }

  function blockReport(blk) {
    return FN.analyse(B.mapOf(blk, set()), set().length);
  }

  function renderChain() {
    const ol = $('chain');
    ol.innerHTML = '';
    if (!state.chain.length) {
      const li = document.createElement('li');
      li.className = 'chain-empty';
      li.textContent = 'No blocks yet. Add one above. With no blocks the cipher is the identity function: every symbol maps to itself.';
      ol.appendChild(li);
      return;
    }
    state.chain.forEach(function (blk, idx) {
      const def = B.TYPES[blk.type];
      const li = document.createElement('li');
      li.className = 'link';

      if (idx > 0) {
        const arrow = document.createElement('span');
        arrow.className = 'link-arrow';
        arrow.setAttribute('aria-hidden', 'true');
        li.appendChild(arrow);
      }

      const card = document.createElement('div');
      card.className = 'block' + (blk.fresh ? ' is-new' : '');
      card.dataset.id = blk.id;
      blk.fresh = false;

      let params = '';
      def.params.forEach(function (prm) {
        const v = esc(blk.params[prm.key]);
        if (prm.kind === 'number') {
          params += '<label>' + prm.label + ' <input type="number" inputmode="numeric" data-key="' + prm.key + '" min="' + prm.min + '" max="' + prm.max + '" value="' + v + '"></label>';
        } else if (prm.kind === 'symbol') {
          params += '<label>' + prm.label + ' <input class="sym" type="text" maxlength="1" data-key="' + prm.key + '" value="' + v + '"></label>';
        } else {
          params += '<label>' + prm.label + ' <input type="text" maxlength="12" data-key="' + prm.key + '" value="' + v + '"></label>';
        }
      });

      card.innerHTML =
        '<div class="block-top"><span class="block-name">' + def.name + '</span><span class="block-index">f' + subscript(idx + 1) + '</span></div>' +
        '<p class="block-blurb">' + def.blurb + '</p>' +
        (params ? '<div class="block-params">' + params + '</div>' : '') +
        '<p class="block-formula"></p>' +
        '<p class="block-status"></p>' +
        '<div class="block-actions">' +
          '<button type="button" class="icon-btn" data-act="left" aria-label="Move ' + def.name + ' earlier"' + (idx === 0 ? ' disabled' : '') + '>‹</button>' +
          '<button type="button" class="icon-btn" data-act="right" aria-label="Move ' + def.name + ' later"' + (idx === state.chain.length - 1 ? ' disabled' : '') + '>›</button>' +
          '<button type="button" class="icon-btn" data-act="remove" aria-label="Remove ' + def.name + '">×</button>' +
        '</div>';

      card.querySelectorAll('input').forEach(function (inp) {
        inp.addEventListener('input', function () {
          blk.params[inp.dataset.key] = inp.value;
          refreshDerived();
        });
      });
      card.querySelectorAll('[data-act]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const i = state.chain.indexOf(blk);
          const act = btn.dataset.act;
          if (act === 'remove') {
            state.chain.splice(i, 1);
            if (state.target === blk.id) state.target = 'chain';
          } else {
            const j = act === 'left' ? i - 1 : i + 1;
            const tmp = state.chain[j]; state.chain[j] = blk; state.chain[i] = tmp;
          }
          refreshAll(false);
        });
      });

      li.appendChild(card);
      ol.appendChild(li);
    });
  }

  function subscript(n) {
    return String(n).split('').map(function (d) { return '₀₁₂₃₄₅₆₇₈₉'[+d]; }).join('');
  }

  function updateBlockCards() {
    state.chain.forEach(function (blk) {
      const card = document.querySelector('.block[data-id="' + blk.id + '"]');
      if (!card) return;
      const r = blockReport(blk);
      card.querySelector('.block-formula').textContent = B.TYPES[blk.type].formula(blk.params);
      card.querySelector('.block-status').innerHTML = r.bijective
        ? '<span class="ok">Bijection, can be undone</span>'
        : '<span class="bad">Not a bijection</span>';
      card.classList.toggle('is-broken', !r.bijective);
    });
  }

  function renderFormula() {
    const r = FN.analyse(B.chainMap(state.chain, set()), set().length);
    $('chain-formula').textContent = 'F = ' + B.chainName(state.chain);
    $('chain-verdict').innerHTML = r.bijective
      ? '<span class="ok">Decryptable</span>'
      : '<span class="bad">Cannot be decrypted</span>';
  }

  /* =========================================================
     Step 3: Check (bijections, predicates, pigeonhole)
     ========================================================= */
  function currentTarget() {
    if (state.target !== 'chain') {
      const blk = state.chain.find(function (b) { return b.id === state.target; });
      if (blk) return { name: 'f = ' + B.TYPES[blk.type].short(blk.params), map: B.mapOf(blk, set()) };
      state.target = 'chain';
    }
    return { name: 'F = ' + B.chainName(state.chain), map: B.chainMap(state.chain, set()) };
  }

  function renderTabs() {
    const box = $('inspect-tabs');
    box.innerHTML = '';
    const items = [{ id: 'chain', label: 'Whole cipher F' }].concat(state.chain.map(function (b, i) {
      return { id: b.id, label: 'f' + subscript(i + 1) + ' ' + B.TYPES[b.type].short(b.params) };
    }));
    items.forEach(function (it) {
      const t = document.createElement('button');
      t.type = 'button';
      t.className = 'tab';
      t.setAttribute('role', 'tab');
      t.setAttribute('aria-selected', String(it.id === state.target));
      t.textContent = it.label;
      t.addEventListener('click', function () {
        state.target = it.id;
        renderTabs();
        renderInspector(true);
      });
      box.appendChild(t);
    });
  }

  let lastDiagramKey = '';
  function renderInspector(animate) {
    const s = set(), n = s.length;
    const tgt = currentTarget();
    const r = FN.analyse(tgt.map, n);
    drawDiagram(s, tgt.map, r, animate || lastDiagramKey !== tgt.name + state.setKey);
    lastDiagramKey = tgt.name + state.setKey;

    $('diagram-cap').textContent = tgt.name + '. ' + n + ' arrows from S to S; ' +
      (r.bijective ? 'every output is hit exactly once.' :
        r.collisions.length + ' output' + (r.collisions.length === 1 ? '' : 's') + ' hit more than once, ' + r.unused.length + ' never hit.');

    // One-to-one
    setCheck('chk-inj', r.injective, r.injective ? 'Holds' : 'Fails',
      r.injective ? 'No two symbols share an output.'
        : (function () {
          const c = r.collisions[0];
          const more = r.collisions.length - 1;
          return '<b>' + c.xs.map(function (i) { return esc(s[i]); }).join('</b> and <b>') + '</b> ' + (c.xs.length === 2 ? 'both go' : 'all go') + ' to <b>' + esc(s[c.y]) + '</b>' +
            (more > 0 ? ', plus ' + more + ' more clash' + (more === 1 ? '' : 'es') : '') + '.';
        })());

    // Onto
    setCheck('chk-sur', r.surjective, r.surjective ? 'Holds' : 'Fails',
      r.surjective ? 'Every symbol of S is produced by some input.'
        : '<b>' + esc(listSymbols(r.unused.map(function (i) { return s[i]; }), 5)) + '</b> never appear. Only ' + r.rangeSize + ' of ' + n + ' outputs are used.');

    // Pigeonhole
    $('pig-logic').textContent = n + ' inputs into ' + r.rangeSize + ' outputs: ⌈' + n + ' / ' + r.rangeSize + '⌉ = ' + r.crowded;
    setCheck('chk-pig', r.crowded <= 1, r.crowded <= 1 ? 'No crowding' : 'Clash guaranteed',
      r.crowded <= 1 ? 'Each output can hold one input, so nothing is forced to collide.'
        : 'Some output must receive at least ' + r.crowded + ' inputs, so the receiver can’t tell them apart.');

    // Truth table for V ⇔ I ∧ O
    const rows = [[true, true], [true, false], [false, true], [false, false]];
    const T = function (v) { return v ? 'T' : 'F'; };
    $('truth').querySelector('tbody').innerHTML = rows.map(function (row) {
      const now = row[0] === r.injective && row[1] === r.surjective;
      const v = row[0] && row[1];
      return '<tr' + (now ? ' class="is-now"' : '') + '><td>' + T(row[0]) + '</td><td>' + T(row[1]) + '</td><td>' + T(v) + '</td><td>' + (v ? 'yes' : 'no') + '</td></tr>';
    }).join('');
  }

  function setCheck(id, good, state_, detail) {
    const el = $(id);
    el.querySelector('.check-state').innerHTML = '<span class="' + (good ? 'ok' : 'bad') + '">' + state_ + '</span>';
    el.querySelector('.check-detail').innerHTML = detail;
  }

  function drawDiagram(s, f, r, animate) {
    const svg = $('diagram');
    const n = s.length, W = 1000, PAD = 26, Y1 = 58, Y2 = 296, H = 340;
    const step = (W - 2 * PAD) / Math.max(1, n - 1);
    const rad = Math.max(8, Math.min(14, step / 2 - 1.5));
    const x = function (i) { return n === 1 ? W / 2 : PAD + i * step; };
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

    const clashOut = new Set(r.collisions.map(function (c) { return c.y; }));
    const unused = new Set(r.unused);

    let html = '<text class="row-lbl" x="' + PAD + '" y="20">inputs x</text>' +
      '<text class="row-lbl" x="' + PAD + '" y="' + (H - 6) + '">outputs f(x)</text>';
    for (let i = 0; i < n; i++) {
      const y = f[i];
      const x1 = x(i), x2 = x(y);
      const d = 'M' + x1.toFixed(1) + ' ' + (Y1 + rad) + ' C' + x1.toFixed(1) + ' ' + (Y1 + 120) + ' ' + x2.toFixed(1) + ' ' + (Y2 - 120) + ' ' + x2.toFixed(1) + ' ' + (Y2 - rad);
      html += '<path class="arrow' + (clashOut.has(y) ? ' clash' : '') + (animate ? ' draw' : '') + '" data-from="' + i + '" data-to="' + y + '" d="' + d + '" style="--d:' + (i * 14) + 'ms"/>';
    }
    for (let i = 0; i < n; i++) {
      html += '<g class="hit" data-from="' + i + '" tabindex="0" role="button" aria-label="' + esc(s[i]) + ' maps to ' + esc(s[f[i]]) + '">' +
        '<circle class="node" cx="' + x(i) + '" cy="' + Y1 + '" r="' + rad + '"/>' +
        '<text class="lbl" x="' + x(i) + '" y="' + Y1 + '">' + esc(s[i]) + '</text></g>';
      const cls = unused.has(i) ? ' unused' : (clashOut.has(i) ? ' hit2' : '');
      html += '<g class="hit" data-to="' + i + '">' +
        '<circle class="node' + cls + '" cx="' + x(i) + '" cy="' + Y2 + '" r="' + rad + '"/>' +
        '<text class="lbl' + (unused.has(i) ? ' unused' : '') + '" x="' + x(i) + '" y="' + Y2 + '">' + esc(s[i]) + '</text></g>';
    }
    svg.innerHTML = html;

    if (animate) {
      svg.querySelectorAll('.arrow.draw').forEach(function (p) {
        p.style.setProperty('--len', Math.ceil(p.getTotalLength()));
      });
    }

    function focusOn(attr, val) {
      svg.classList.add('has-focus');
      svg.querySelectorAll('.arrow').forEach(function (p) {
        p.classList.toggle('focus', p.getAttribute(attr) === val);
      });
    }
    function clear() {
      svg.classList.remove('has-focus');
      svg.querySelectorAll('.arrow.focus').forEach(function (p) { p.classList.remove('focus'); });
    }
    svg.querySelectorAll('.hit').forEach(function (g) {
      const attr = g.hasAttribute('data-from') ? 'data-from' : 'data-to';
      const val = g.getAttribute(attr);
      g.addEventListener('mouseenter', function () { focusOn(attr, val); });
      g.addEventListener('focus', function () { focusOn(attr, val); });
      g.addEventListener('mouseleave', clear);
      g.addEventListener('blur', clear);
    });
  }

  /* =========================================================
     Step 4: Encrypt and decrypt (inverse of a composition)
     ========================================================= */
  function firstBrokenBlock() {
    for (let i = 0; i < state.chain.length; i++) {
      const r = blockReport(state.chain[i]);
      if (!r.bijective) return { idx: i, blk: state.chain[i], r: r };
    }
    return null;
  }

  function renderCrypto() {
    const s = set();
    const enc = B.run($('msg-in').value, state.chain, s, false);
    $('msg-out').textContent = enc.output;
    if (!state.decEdited) $('dec-in').value = enc.output;

    const broken = firstBrokenBlock();
    const out = $('dec-out');
    if (broken) {
      const c = broken.r.collisions[0];
      out.classList.add('is-blocked');
      out.innerHTML = 'Decryption is impossible. Block f' + subscript(broken.idx + 1) + ', ' + esc(B.TYPES[broken.blk.type].short(broken.blk.params)) +
        ', is not a bijection: ' + (c ? '<b>' + c.xs.slice(0, 2).map(function (i) { return esc(s[i]); }).join('</b> and <b>') + '</b> both become <b>' + esc(s[c.y]) + '</b>' : 'it has no inverse') + ', so the inverse function does not exist.';
      $('dec-formula').textContent = '';
    } else {
      const dec = B.run($('dec-in').value, state.chain, s, true);
      out.classList.remove('is-blocked');
      out.textContent = dec.output;
      $('dec-formula').textContent = 'F⁻¹ = ' + B.inverseName(state.chain);
    }
    renderTrace();
  }

  function renderTrace() {
    const s = set();
    const dec = state.traceDir === 'dec';
    const table = $('trace');
    if (dec && firstBrokenBlock()) {
      table.innerHTML = '<tr><td style="text-align:left;padding:16px">No decryption trace: the cipher has no inverse.</td></tr>';
      return;
    }
    const text = (dec ? $('dec-in').value : $('msg-in').value).slice(0, 18);
    const run = B.run(text, state.chain, s, dec);
    if (!text.length) { table.innerHTML = '<tr><td style="text-align:left;padding:16px">Type a message to see each step.</td></tr>'; return; }
    let html = '';
    run.steps.forEach(function (row, i) {
      const label = i === 0 ? (dec ? 'ciphertext' : 'message') : 'after ' + run.names[i - 1];
      html += '<tr><th scope="row">' + esc(label) + '</th>';
      row.forEach(function (ch, j) {
        const prev = i > 0 ? run.steps[i - 1][j] : null;
        const cls = i === 0 ? '' : (ch !== prev ? 'changed' : 'same');
        html += '<td class="' + cls + '">' + (ch === ' ' ? '·' : esc(ch)) + '</td>';
      });
      html += '</tr>';
    });
    table.innerHTML = html;
  }

  /* =========================================================
     Step 5: Attack (counting)
     ========================================================= */
  function renderAttack() {
    const n = set().length;
    const sizes = Array.prototype.slice.call(document.querySelectorAll('.groups input'))
      .filter(function (i) { return i.checked; })
      .map(function (i) { return +i.dataset.size; });
    const N = C.sumRule(sizes);
    const r = +$('len').value;
    const speed = +$('speed').value;
    $('len-val').textContent = r;
    $('sum-line').textContent = N
      ? 'N = ' + sizes.join(' + ') + ' = ' + N + ' symbols per position. Sum rule: the groups share no symbols.'
      : 'Tick at least one group of password symbols.';

    const rows = [
      ['Shift cipher on S', 'one of n shifts', 'n = ' + n, BigInt(n), true],
      ['Any substitution of S', 'arrange all n symbols', n + '!', C.factorial(n), true],
      ['One swap', 'choose 2 symbols, order ignored', 'C(' + n + ', 2)', C.combinations(n, 2), true],
      ['Password, repeats allowed', 'product rule over r places', N + C.sup(r), C.power(N, r), true],
      ['Password, no repeats', 'permutations without repetition', 'P(' + N + ', ' + r + ')', C.permutations(N, r), true],
      ['Letter-count profiles', 'combinations with repetition: what frequency analysis sees in an r-symbol message', 'C(' + (n + r - 1) + ', ' + r + ')', C.multichoose(n, r), false]
    ];
    $('keys').querySelector('tbody').innerHTML = rows.map(function (row) {
      const big = row[3];
      const exact = big.toString().length > 6 ? '<span class="exact">' + C.withCommas(big) + '</span>' : '';
      const time = row[4] ? (big > 0n ? C.bruteForceTime(big, speed) : 'nothing to try') : 'not a key count';
      return '<tr><td><span class="kname">' + row[0] + '</span><span class="kwhy">' + row[1] + '</span></td>' +
        '<td>' + row[2] + '</td><td>' + C.scientific(big) + exact + '</td><td>' + time + '</td></tr>';
    }).join('');
  }

  /* =========================================================
     Refresh
     ========================================================= */
  function refreshDerived() {
    updateBlockCards();
    renderFormula();
    renderTabsLabelsOnly();
    renderInspector(false);
    renderCrypto();
    announce();
  }

  // Let the other modules (lab2.js, tour.js) know the cipher changed
  function announce() {
    try { localStorage.setItem('cf-key', B.keyCode(state.setKey, state.chain)); } catch (e) { /* storage may be blocked */ }
    document.dispatchEvent(new CustomEvent('cf:change'));
  }

  function renderTabsLabelsOnly() {
    const tabs = $('inspect-tabs').querySelectorAll('.tab');
    state.chain.forEach(function (b, i) {
      if (tabs[i + 1]) tabs[i + 1].textContent = 'f' + subscript(i + 1) + ' ' + B.TYPES[b.type].short(b.params);
    });
  }

  function refreshAll(animate) {
    renderSet();
    renderChain();
    updateBlockCards();
    renderFormula();
    renderTabs();
    renderInspector(animate);
    renderCrypto();
    renderAttack();
    announce();
  }

  /* ---------- Wire up controls ---------- */
  ['op-a', 'op-b', 'op-op'].forEach(function (id) { $(id).addEventListener('change', renderOps); });
  $('msg-in').addEventListener('input', function () { renderCrypto(); });
  $('dec-in').addEventListener('input', function () { state.decEdited = $('dec-in').value.length > 0; renderCrypto(); });
  $('trace-dir').querySelectorAll('button').forEach(function (b) {
    b.addEventListener('click', function () {
      state.traceDir = b.dataset.dir;
      $('trace-dir').querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); });
      renderTrace();
    });
  });
  document.querySelectorAll('.groups input').forEach(function (i) { i.addEventListener('change', renderAttack); });
  $('len').addEventListener('input', renderAttack);
  $('speed').addEventListener('change', renderAttack);

  // Shared with lab2.js and tour.js
  CF.app = {
    state: state,
    set: set,
    chainMap: function () { return B.chainMap(state.chain, set()); },
    loadPreset: loadPreset,
    ciphertext: function () { return $('msg-out').textContent; },
    encrypt: function (text) { return B.run(text, state.chain, set(), false).output; },
    decrypt: function (text) {
      const r = B.run(text, state.chain, set(), true);
      return r ? r.output : null;
    },
    keyCode: function () { return B.keyCode(state.setKey, state.chain); },
    loadKey: function (code) {
      const k = B.parseKey(code);
      if (!k) return false;
      state.setKey = k.setKey;
      state.chain = k.chain;
      state.chain.forEach(function (blk) { blk.fresh = true; });
      state.target = 'chain';
      state.decEdited = false;
      renderSetPicker();
      refreshAll(true);
      return true;
    }
  };

  renderSetPicker();
  renderToolbar();
  renderOps();
  refreshAll(false);

  // Draw the arrows the first time the diagram scrolls into view
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { renderInspector(true); io.disconnect(); }
    }, { threshold: 0.35 });
    io.observe($('diagram'));
  }
})();
