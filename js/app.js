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
        } else if (prm.kind === 'expr') {
          params += '<label class="expr-label">' + prm.label + ' <input class="expr" type="text" maxlength="40" spellcheck="false" autocomplete="off" data-key="' + prm.key + '" value="' + v + '" aria-label="Formula for f(x), worked out mod n"> <span class="expr-mod">mod n</span></label>';
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
      const def = B.TYPES[blk.type], err = def.error ? def.error(blk.params) : null;
      card.querySelector('.block-formula').textContent = def.formula(blk.params);
      card.classList.toggle('is-error', !!err);
      if (err) {
        card.querySelector('.block-status').innerHTML = '<span class="bad">' + esc(err) + ' Until then this block leaves every symbol as it is.</span>';
        card.classList.remove('is-broken');
        return;
      }
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
  // Tab k shows the chain f₁, then f₂, … up to fₖ, drawn layer by layer:
  // the composition fₖ ∘ … ∘ f₁. "Whole cipher F" shows the collapsed map.
  function compName(k) {
    if (k === 1) return 'f₁';
    if (k <= 3) {
      const parts = [];
      for (let i = k; i >= 1; i--) parts.push('f' + subscript(i));
      return parts.join(' ∘ ');
    }
    return 'f' + subscript(k) + ' ∘ … ∘ f₁';
  }
  function tabLabel(i) {
    const k = i + 1, b = state.chain[i];
    if (k === 1) return 'f₁ ' + B.TYPES[b.type].short(b.params);
    return compName(k) + (k === state.chain.length ? ' = F' : '');
  }

  function currentTarget() {
    const s = set();
    if (state.target !== 'chain') {
      const k = state.chain.findIndex(function (b) { return b.id === state.target; }) + 1;
      if (k > 0) {
        const part = state.chain.slice(0, k);
        return {
          k: k,
          name: (k === 1 ? 'f₁ = ' : compName(k) + ' = ') + B.chainName(part),
          layers: part.map(function (b) { return B.mapOf(b, s); }),
          labels: part.map(function (b, i) { return 'f' + subscript(i + 1) + '  ' + B.TYPES[b.type].short(b.params); }),
          map: B.chainMap(part, s)
        };
      }
      state.target = 'chain';
    }
    const F = B.chainMap(state.chain, s);
    return { k: 0, name: 'F = ' + B.chainName(state.chain), layers: [F], labels: [], map: F };
  }

  function renderTabs() {
    const box = $('inspect-tabs');
    box.innerHTML = '';
    const items = [{ id: 'chain', label: 'Whole cipher F' }].concat(state.chain.map(function (b, i) {
      return { id: b.id, label: tabLabel(i) };
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
  let pinned = null;   // the symbol whose path is pinned in the arrow diagram: { row, v }
  function renderInspector(animate) {
    const s = set(), n = s.length;
    const tgt = currentTarget();
    const r = FN.analyse(tgt.map, n);
    const key = tgt.name + state.setKey;
    drawDiagram(s, tgt, r, animate || lastDiagramKey !== key);
    lastDiagramKey = key;
    renderStrip(s, tgt, r);

    const result = r.bijective ? 'every output is hit exactly once.' :
      r.collisions.length + ' output' + (r.collisions.length === 1 ? '' : 's') + ' hit more than once, ' + r.unused.length + ' never hit.';
    let cap;
    if (tgt.k === 0) {
      cap = tgt.name + '. ' + n + ' arrows from S to S; ' + result +
        (state.chain.length > 1 ? ' Pick ' + compName(state.chain.length) + ' to watch the chain build F step by step.' : '');
    } else if (tgt.k === 1) {
      cap = tgt.name + '. The first block on its own; ' + result;
    } else {
      const route = tgt.k === 2 ? 'f₁, then f₂' : tgt.k === 3 ? 'f₁, then f₂, then f₃' : 'f₁, then f₂, and so on to f' + subscript(tgt.k);
      cap = tgt.name + '. Each symbol goes through ' + route + '; ' + result +
        (tgt.k === state.chain.length ? ' This is the whole cipher F.' : '');
    }
    $('diagram-cap').textContent = cap;

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

  /* The same function as a table: every input above its output. Outputs
     hit more than once are red; symbols never produced are listed. */
  function renderStrip(s, tgt, r) {
    const box = $('map-strip');
    if (!box) return;
    const n = s.length, cnt = new Array(n).fill(0);
    tgt.map.forEach(function (y) { cnt[y]++; });
    const fname = tgt.k === 0 ? 'F(x)' : tgt.k === 1 ? 'f₁(x)' : '(' + compName(tgt.k) + ')(x)';
    let top = '<span class="ms-h">x</span>', bot = '<span class="ms-h">' + esc(fname) + '</span>';
    for (let i = 0; i < n; i++) {
      const y = tgt.map[i], bad = cnt[y] > 1;
      top += '<button type="button" class="ms-c" data-v="' + i + '" title="' + esc(s[i]) + ' is position ' + i + '">' + esc(s[i]) + '<small>' + i + '</small></button>';
      bot += '<span class="ms-c out' + (bad ? ' clash' : '') + '" data-v="' + i + '">' + esc(s[y]) + '<small>' + y + '</small></span>';
    }
    const unused = [];
    for (let y = 0; y < n; y++) if (!cnt[y]) unused.push(s[y]);
    box.style.setProperty('--n', n);
    box.innerHTML = '<div class="ms-row">' + top + '</div><div class="ms-row">' + bot + '</div>' +
      '<p class="ms-note">' + (r.bijective ? 'Every symbol appears exactly once in the bottom row, so the bottom row is just S rearranged: a bijection.'
        : '<b class="bad">Red</b> outputs come from more than one input. Never produced: <b>' + esc(unused.length ? listSymbols(unused, 10) : 'none') + '</b>.') + '</p>';
    box.querySelectorAll('button.ms-c').forEach(function (b) {
      b.addEventListener('click', function () { pin(+b.dataset.v); });
    });
  }

  // Pin one input's path in the arrow diagram (same as tapping it there)
  function pin(v) {
    const g = document.querySelector('#diagram .hit[data-row="0"][data-v="' + v + '"]');
    if (g) g.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.querySelectorAll('#map-strip .ms-c').forEach(function (c) { c.classList.toggle('now', +c.dataset.v === v && !!document.querySelector('#diagram .hit.picked')); });
  }

  // Walk the arrows: pin A, then B, then C … so the class can follow one arrow at a time
  let walkTimer = null, walkAt = 0;
  function walkStop() {
    clearInterval(walkTimer); walkTimer = null;
    const b = $('walk-btn'); if (b) b.textContent = 'Walk the arrows one by one';
    document.querySelectorAll('#map-strip .ms-c.now').forEach(function (c) { c.classList.remove('now'); });
    if (document.querySelector('#diagram .hit.picked')) document.querySelector('#diagram').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }
  function walkStart(ms) {
    walkStop();
    const n = set().length;
    walkAt = 0;
    const b = $('walk-btn'); if (b) b.textContent = 'Stop walking';
    const tick = function () {
      if (walkAt >= n) { walkStop(); return; }
      pin(walkAt); walkAt++;
    };
    tick();
    walkTimer = setInterval(tick, ms || 900);
  }

  function setCheck(id, good, state_, detail) {
    const el = $(id);
    el.querySelector('.check-state').innerHTML = '<span class="' + (good ? 'ok' : 'bad') + '">' + state_ + '</span>';
    el.querySelector('.check-detail').innerHTML = detail;
  }

  function drawDiagram(s, tgt, r, animate) {
    const svg = $('diagram');
    const layers = tgt.layers, L = layers.length, n = s.length;
    const W = 1000, PAD = 26, Y0 = 58;
    const G = L === 1 ? 238 : Math.max(120, 200 - (L - 2) * 25);
    const H = Y0 + L * G + 44;
    const step = (W - 2 * PAD) / Math.max(1, n - 1);
    const rad = Math.max(8, Math.min(14, step / 2 - 1.5));
    const x = function (i) { return n === 1 ? W / 2 : PAD + i * step; };
    const rowY = function (j) { return Y0 + j * G; };
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.classList.toggle('is-chain', tgt.k > 1);

    // Follow every input through the layers: paths[x][j] = value after j blocks
    const paths = [];
    for (let i = 0; i < n; i++) {
      const p = [i];
      for (let j = 0; j < L; j++) p.push(layers[j][p[j]]);
      paths.push(p);
    }
    // Which nodes are reached in each row, and by how many arrows
    const reach = [], incoming = [];
    for (let j = 0; j <= L; j++) { reach.push(new Set()); incoming.push(new Array(n).fill(0)); }
    paths.forEach(function (p) { for (let j = 0; j <= L; j++) reach[j].add(p[j]); });
    for (let j = 1; j <= L; j++) reach[j - 1].forEach(function (v) { incoming[j][layers[j - 1][v]]++; });

    const outLabel = tgt.k === 0 ? 'outputs F(x)' : tgt.k === 1 ? 'outputs f₁(x)' : 'outputs (' + compName(tgt.k) + ')(x)';
    let html = '<text class="row-lbl" x="' + PAD + '" y="20">inputs x</text>' +
      '<text class="row-lbl" x="' + PAD + '" y="' + (H - 6) + '">' + esc(outLabel) + '</text>';

    // Arrows, layer by layer; earlier layers dimmer, the newest block bright
    for (let j = 1; j <= L; j++) {
      const ya = rowY(j - 1), yb = rowY(j), c = G * 0.5;
      const past = L > 1 && j < L ? ' past' : '';
      const fresh = L > 1 && j === L ? ' newest' : '';
      Array.from(reach[j - 1]).sort(function (a, b) { return a - b; }).forEach(function (v, idx) {
        const w = layers[j - 1][v];
        const x1 = x(v), x2 = x(w);
        const d = 'M' + x1.toFixed(1) + ' ' + (ya + rad) + ' C' + x1.toFixed(1) + ' ' + (ya + c) + ' ' + x2.toFixed(1) + ' ' + (yb - c) + ' ' + x2.toFixed(1) + ' ' + (yb - rad);
        html += '<path class="arrow' + past + fresh + (incoming[j][w] > 1 ? ' clash' : '') + (animate ? ' draw' : '') +
          '" data-k="' + j + ':' + v + '" d="' + d + '" style="--d:' + ((j - 1) * 520 + idx * 12) + 'ms"/>';
      });
      if (L > 1) {
        html += '<text class="layer-lbl' + (j === L ? ' newest' : '') + '" x="' + (W - PAD) + '" y="' + (ya + G / 2) + '">' + esc(tgt.labels[j - 1]) + '</text>';
      }
    }
    // Nodes
    for (let j = 0; j <= L; j++) {
      for (let i = 0; i < n; i++) {
        const unused = j > 0 && !reach[j].has(i);
        const cls = unused ? ' unused' : (j > 0 && incoming[j][i] > 1 ? ' hit2' : '');
        html += '<g class="hit" data-row="' + j + '" data-v="' + i + '"' + (j === 0 ? ' tabindex="0" role="button" aria-label="' + esc(s[i]) + ' maps to ' + esc(s[tgt.map[i]]) + '"' : '') + '>' +
          '<circle class="node' + cls + (j > 0 && j < L ? ' mid' : '') + '" cx="' + x(i) + '" cy="' + rowY(j) + '" r="' + rad + '"/>' +
          '<text class="lbl' + (unused ? ' unused' : '') + '" x="' + x(i) + '" y="' + rowY(j) + '">' + esc(s[i]) + '</text></g>';
      }
    }
    svg.innerHTML = html;

    if (animate) {
      svg.querySelectorAll('.arrow.draw').forEach(function (p) {
        p.style.setProperty('--len', Math.ceil(p.getTotalLength()));
      });
    }

    // Tap a symbol to pin its path (tap again, or tap empty space, to clear); hover previews another
    const pathEl = $('diagram-path');
    function keysFor(row, v) {
      const arrows = new Set(), nodes = new Set(), routes = [];
      paths.forEach(function (p) {
        if (p[row] !== v) return;
        for (let j = 1; j <= L; j++) arrows.add(j + ':' + p[j - 1]);
        for (let j = 0; j <= L; j++) nodes.add(j + ':' + p[j]);
        routes.push(p);
      });
      return { arrows: arrows, nodes: nodes, routes: routes };
    }
    function show(row, v) {
      const k = keysFor(row, v);
      svg.classList.add('has-focus');
      svg.querySelectorAll('.arrow').forEach(function (a) { a.classList.toggle('focus', k.arrows.has(a.getAttribute('data-k'))); });
      svg.querySelectorAll('.hit').forEach(function (g) {
        const key = g.getAttribute('data-row') + ':' + g.getAttribute('data-v');
        g.classList.toggle('on', k.nodes.has(key));
        g.classList.toggle('picked', +g.getAttribute('data-row') === row && +g.getAttribute('data-v') === v);
      });
      return k;
    }
    function clearAll() {
      svg.classList.remove('has-focus');
      svg.querySelectorAll('.arrow.focus').forEach(function (a) { a.classList.remove('focus'); });
      svg.querySelectorAll('.hit.on, .hit.picked').forEach(function (g) { g.classList.remove('on', 'picked'); });
    }
    function describe(k, row) {
      const names = L === 1 ? [tgt.k === 0 ? 'F' : 'f₁'] : tgt.labels;
      const lines = k.routes.map(function (p) {
        let t = s[p[0]];
        for (let j = 1; j <= L; j++) t += ' —' + names[j - 1] + '→ ' + s[p[j]];
        return t;
      });
      if (!lines.length) return row === 0 ? '' : s[pinned.v] + ' is never reached in this row.';
      return lines.join('   ·   ');
    }
    function restore() {
      if (pinned && pinned.row <= L && pinned.v < n) {
        const k = show(pinned.row, pinned.v);
        pathEl.textContent = 'Pinned: ' + describe(k, pinned.row) + '. Tap it again to clear.';
      } else {
        pinned = null;
        clearAll();
        pathEl.textContent = 'Tap a symbol to pin its path.';
      }
      svg.querySelectorAll('.hit[data-row="0"]').forEach(function (g) {
        g.setAttribute('aria-pressed', String(!!pinned && pinned.row === 0 && +g.getAttribute('data-v') === pinned.v));
      });
    }
    function toggle(row, v) {
      pinned = pinned && pinned.row === row && pinned.v === v ? null : { row: row, v: v };
      restore();
    }
    svg.querySelectorAll('.hit').forEach(function (g) {
      const row = +g.getAttribute('data-row'), v = +g.getAttribute('data-v');
      g.addEventListener('click', function (e) { e.stopPropagation(); toggle(row, v); });
      g.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(row, v); }
      });
      g.addEventListener('mouseenter', function () { if (!pinned) show(row, v); });
      g.addEventListener('mouseleave', function () { if (!pinned) clearAll(); });
    });
    svg.onclick = function () { if (pinned) { pinned = null; restore(); } };
    restore();
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
      if (tabs[i + 1]) tabs[i + 1].textContent = tabLabel(i);
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
  if ($('walk-btn')) $('walk-btn').addEventListener('click', function () { if (walkTimer) walkStop(); else walkStart(); });
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
    // Used by the presenter deck (deck.js)
    setChain: function (blocks) {
      state.chain = blocks.map(function (b) { const blk = B.create(b[0], b[1]); blk.fresh = true; return blk; });
      state.target = 'chain';
      state.decEdited = false;
      refreshAll(true);
    },
    addBlock: function (type, params) {
      const blk = B.create(type, params); blk.fresh = true;
      state.chain.push(blk); state.target = 'chain';
      refreshAll(true);
      return blk;
    },
    setSet: function (key) {
      if (!S.PRESETS[key]) return;
      state.setKey = key;
      renderSetPicker();
      refreshAll(true);
    },
    analyse: function () { return FN.analyse(B.chainMap(state.chain, set()), set().length); },
    pin: pin,
    walk: walkStart,
    walkStop: walkStop,
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
