/* =========================================================
   Cipher Forge — device.js
   Future enhancement 02: Whisper, the pocket cipher pager.
   Builds the device out of real 3D slabs, assembles it in the
   hero, takes it apart layer by layer as you scroll, draws the
   cross-section, and runs the battery-life calculator.
   ========================================================= */
(function () {
  'use strict';

  const $ = function (id) { return document.getElementById(id); };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  const ease = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  document.documentElement.classList.add('js');

  /* =========================================================
     The device, built from slabs (units: px, 5 px = 1 mm)
     ========================================================= */
  function slab(cls, x, y, w, h, t, z, inner) {
    return '<div class="slab ' + cls + '" style="--x:' + x + 'px;--y:' + y + 'px;--w:' + w + 'px;--h:' + h + 'px;--t:' + t + 'px;--z:' + (z || 0) + 'px">' +
      '<div class="f bot"></div><div class="f e-n"></div><div class="f e-s"></div><div class="f e-w"></div><div class="f e-e"></div>' +
      '<div class="f top">' + (inner || '') + '</div></div>';
  }
  function cylinder(cls, x, y, w, h, t, n, z) {
    let html = '<div class="' + cls + '" style="left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;transform:translateZ(' + (z || 0) + 'px)">';
    for (let i = 0; i < n; i++) {
      html += '<div class="disc' + (i === n - 1 ? ' cap' : '') + '" style="transform:translateZ(' + (t * i / (n - 1)).toFixed(1) + 'px)"></div>';
    }
    return html + '</div>';
  }

  const PAPER = '<div class="paper"><div class="paper-bar"><span>WHISPER</span><span>17.6 kHz ▮▮▮</span></div>' +
    '<div class="paper-from">FROM K · MSG 03 · 04:12</div><div class="paper-msg">MEET AT\nNOON</div>' +
    '<div class="paper-foot"><span>KEY OK</span><span>F⁻¹ APPLIED</span></div></div>';

  const TRACES = '<svg class="traces" viewBox="0 0 304 194" aria-hidden="true">' +
    '<path d="M148 90 H180 V82"/><path d="M148 96 H170 V116"/><path d="M110 92 H60 V130"/><path d="M110 100 H44 V88"/>' +
    '<path d="M148 104 H200 V150 H230"/><path d="M148 84 V40 H232 V52"/><path d="M128 108 V120"/><path d="M140 108 V170 H130"/>' +
    '<path d="M60 150 V176 H120"/><path d="M36 88 V30 H110 V70"/><path d="M200 74 H260 V130"/><path d="M20 20 H280 M20 174 H90"/>' +
    '<circle cx="180" cy="82" r="2"/><circle cx="60" cy="130" r="2"/><circle cx="232" cy="52" r="2"/><circle cx="260" cy="130" r="2"/><circle cx="44" cy="88" r="2"/><circle cx="110" cy="70" r="2"/></svg>';

  // Six layers, front to back. z is where each sits when the case is closed.
  const LAYERS = [
    { cls: 'L-front', z: 53, html: function () {
      return slab('shell', 0, 0, 320, 210, 6, 0,
        '<span class="grille"></span><span class="pinhole"></span><span class="engrave e1">WHISPER</span><span class="engrave e2">CF-1</span>') +
        '<div class="glass"></div>';
    } },
    { cls: 'L-disp', z: 45.5, html: function () {
      return slab('panel3', 22, 25, 160, 160, 7, 0, PAPER) + slab('fpc', 82, 185, 40, 22, 1, 0);
    } },
    { cls: 'L-mid', z: 41, html: function () {
      return slab('frame', 0, 0, 320, 210, 4.5, 0) + cylinder('wheel', 286, 72, 66, 66, 9, 4, -2);
    } },
    { cls: 'L-board', z: 28, html: function () {
      return slab('pcb', 8, 8, 304, 194, 5, 0, TRACES) +
        slab('chip big', 118, 78, 38, 38, 4.5, 5, 'RP2040') +
        slab('chip', 170, 80, 26, 20, 4, 5, 'W25Q16') +
        slab('chip key', 172, 114, 18, 18, 3, 5, '608B') +
        slab('chip can', 128, 124, 14, 9, 3.5, 5, '12M') +
        slab('chip', 232, 58, 16, 16, 4, 5, 'AMP') +
        slab('chip can', 238, 144, 18, 14, 5, 5, 'MIC') +
        slab('chip', 64, 136, 16, 16, 4, 5, 'HAP') +
        slab('chip', 40, 92, 14, 9, 4, 5, 'CHG') +
        slab('chip can', 130, 180, 50, 24, 8, 5, 'USB-C');
    } },
    { cls: 'L-bay', z: 6, html: function () {
      return slab('cell', 20, 8, 150, 194, 21, 0, '<span>LiPo · 403040</span><span><b>3.7 V</b><br>~500 mAh</span>') +
        cylinder('spk', 198, 32, 80, 58, 15, 4, 0) +
        cylinder('mot', 226, 132, 40, 40, 12, 3, 0);
    } },
    { cls: 'L-back', z: 0, html: function () {
      const bosses = [[12, 12], [292, 12], [12, 182], [292, 182]].map(function (p) {
        return '<span class="boss" style="left:' + p[0] + 'px;top:' + p[1] + 'px"></span>';
      }).join('');
      return slab('shell', 0, 0, 320, 210, 6, 0, bosses + '<span class="foam"></span><span class="stamp">CF-1 · WHISPER<br>SN 0417 · CONCEPT</span>') +
        slab('shell', 0, 0, 320, 6, 53, 0) + slab('shell', 0, 204, 320, 6, 53, 0) +
        slab('shell', 0, 6, 6, 198, 53, 0) + slab('shell', 314, 6, 6, 198, 53, 0);
    } }
  ];

  function build(el) {
    el.innerHTML = LAYERS.map(function (L) { return '<div class="layer3 ' + L.cls + '">' + L.html() + '</div>'; }).join('');
    const layers = Array.prototype.slice.call(el.querySelectorAll('.layer3'));
    return {
      el: el,
      layers: layers,
      wheel: el.querySelector('.wheel'),
      msg: el.querySelector('.paper-msg'),
      paper: el.querySelector('.panel3 > .top'),
      // sep 0 = closed, 1 = fully apart. active = index of the highlighted layer, or -1
      set: function (sep, active, gap) {
        const G = gap || 70;
        layers.forEach(function (l, k) {
          const lift = k === active ? 26 : 0;
          const z = LAYERS[k].z + sep * ((2.5 - k) * G - (k === 5 ? G * 0.6 : 0)) + lift;  // the tray's tall walls need extra room
          l.style.transform = 'translateZ(' + z.toFixed(1) + 'px)';
          l.classList.toggle('is-active', k === active);
        });
        el.classList.toggle('is-exploded', active >= 0);
      }
    };
  }

  /* ---------- Stars ---------- */
  (function () {
    const stars = $('fx-stars'), g = stars.getContext('2d');
    let seed = 41;
    const rand = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const STAR = [];
    for (let i = 0; i < 170; i++) STAR.push({ x: rand(), y: rand(), r: 0.4 + rand() * 1.3, d: 0.05 + rand() * 0.35, ph: rand() * 6.28, sp: 0.5 + rand() * 1.5 });
    let rgb = '228, 234, 241';
    function readColors() { rgb = getComputedStyle(document.documentElement).getPropertyValue('--star').trim() || rgb; }
    new MutationObserver(function () { setTimeout(readColors, 60); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    readColors();
    function size() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      stars.width = innerWidth * dpr; stars.height = innerHeight * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function draw(t) {
      const w = innerWidth, h = innerHeight, sy = scrollY;
      g.clearRect(0, 0, w, h);
      STAR.forEach(function (s) {
        const y = ((s.y * h - sy * s.d) % h + h) % h;
        const a = 0.22 + 0.33 * (reduce ? 1 : 0.5 + 0.5 * Math.sin(t * 0.001 * s.sp + s.ph));
        g.fillStyle = 'rgba(' + rgb + ',' + a.toFixed(3) + ')';
        g.beginPath(); g.arc(s.x * w, y, s.r, 0, 6.283); g.fill();
      });
      if (!reduce) requestAnimationFrame(draw);
    }
    addEventListener('resize', function () { size(); if (reduce) draw(0); });
    if (reduce) addEventListener('scroll', function () { requestAnimationFrame(draw); }, { passive: true });
    size(); requestAnimationFrame(draw);
  })();

  /* ---------- Title decodes itself ---------- */
  (function () {
    const el = $('dv-title'), word = el.textContent;
    el.setAttribute('aria-label', word);
    if (reduce) return;
    let f = 0; const total = 34;
    (function step() {
      f++;
      const done = Math.floor((f / total) * word.length);
      el.textContent = word.split('').map(function (c, i) {
        if (i < done) return c;
        const r = LETTERS[Math.floor(Math.random() * 26)];
        return c === c.toUpperCase() ? r : r.toLowerCase();
      }).join('');
      if (f < total) requestAnimationFrame(step); else el.textContent = word;
    })();
  })();

  /* =========================================================
     Hero: the device snaps together, then floats in its frame
     ========================================================= */
  const hero = build($('hero-device'));
  const heroCam = $('hero-cam');
  const t0 = performance.now();
  function heroFrame(now) {
    const t = (now - t0) / 1000;
    const k = reduce ? 1 : ease(clamp((t - 0.3) / 1.8, 0, 1));
    hero.set(1 - k, -1, 64);
    const az = -32 + (reduce ? 0 : Math.sin(t * 0.35) * 9);
    const ax = 56 + (reduce ? 0 : Math.sin(t * 0.5) * 3);
    const fl = reduce ? 0 : Math.sin(t * 0.9) * 8;
    heroCam.style.transform = 'translateY(' + fl.toFixed(1) + 'px) rotateX(' + ax.toFixed(2) + 'deg) rotateZ(' + az.toFixed(2) + 'deg) translateZ(-30px)';
    if (hero.wheel) hero.wheel.style.setProperty('--rot', (t * 20).toFixed(1) + 'deg');
    if (!reduce || t < 0.1) requestAnimationFrame(heroFrame);
  }
  requestAnimationFrame(heroFrame);

  // The screen receives a new message every few seconds, with an e-paper flash
  (function () {
    const MSGS = ['MEET AT\nNOON', 'PACKAGE AT\nGATE 4', 'GO DARK\nAT 0400', 'TRUST\nNO ONE'];
    let i = 0;
    function show(text) {
      const el = hero.msg, paper = hero.paper;
      if (reduce) { el.textContent = text; return; }
      paper.classList.add('flash');
      setTimeout(function () { paper.classList.remove('flash'); }, 160);
      let f = 0; const total = 22;
      (function step() {
        f++;
        const done = Math.floor((f / total) * text.length);
        el.textContent = text.split('').map(function (c, j) {
          if (j < done || c === ' ' || c === '\n') return c;
          return LETTERS[Math.floor(Math.random() * 26)];
        }).join('');
        if (f < total) setTimeout(step, 40); else el.textContent = text;
      })();
    }
    setTimeout(function () { show(MSGS[0]); }, 1900);
    setInterval(function () { i = (i + 1) % MSGS.length; show(MSGS[i]); }, 5200);
  })();

  /* =========================================================
     Exploded view, driven by scroll
     ========================================================= */
  const ex = build($('ex-device'));
  const exCam = $('ex-cam'), exSec = $('explode'), hint = $('ex-hint');
  const items = Array.prototype.slice.call(document.querySelectorAll('#ex-index li'));
  const cards = Array.prototype.slice.call(document.querySelectorAll('.ex-card'));
  let lastActive = null;
  function exFrame() {
    const r = exSec.getBoundingClientRect();
    const total = exSec.offsetHeight - innerHeight;
    const p = clamp(-r.top / total, 0, 1);
    const sep = ease(clamp(p / 0.14, 0, 1));
    const active = p < 0.14 ? -1 : Math.min(5, Math.floor((p - 0.14) / 0.86 * 6));
    const gap = innerWidth < 560 ? 62 : innerWidth < 980 ? 80 : 86;
    ex.set(sep, active, gap);
    const ax = 60 - 8 * p, az = -38 + 22 * p;
    exCam.style.transform = 'rotateX(' + ax.toFixed(2) + 'deg) rotateZ(' + az.toFixed(2) + 'deg) translateZ(-30px)';
    if (ex.wheel) ex.wheel.style.setProperty('--rot', (p * 720).toFixed(1) + 'deg');
    hint.style.opacity = p > 0.04 ? 0 : 1;
    if (active !== lastActive) {
      lastActive = active;
      const show = Math.max(0, active);
      items.forEach(function (li, i) { li.classList.toggle('is-active', i === active); });
      cards.forEach(function (c, i) { c.classList.toggle('is-active', i === show); });
    }
  }

  /* ---------- Nav progress ---------- */
  const prog = $('progress');
  function progress() {
    const max = document.documentElement.scrollHeight - innerHeight;
    prog.style.width = (max > 0 ? scrollY / max * 100 : 0) + '%';
  }
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; exFrame(); progress(); });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  exFrame(); progress();

  /* =========================================================
     Cross-section (mm → px: 14 across, 28 down, so heights ×2)
     ========================================================= */
  (function () {
    const svg = $('xsec');
    const SX = 14, SY = 28, X0 = 50, Y0 = 34;
    const X = function (mm) { return X0 + mm * SX; }, Y = function (mm) { return Y0 + mm * SY; };
    const rect = function (r) { return '<rect x="' + X(r[0]).toFixed(1) + '" y="' + Y(r[1]).toFixed(1) + '" width="' + (r[2] * SX).toFixed(1) + '" height="' + (r[3] * SY).toFixed(1) + '" rx="' + (r[4] || 0) + '"/>'; };
    const PARTS = [
      { k: 'front', cls: 'p-shell', d: 0, r: [[0, 0, 4.4, 1.2, 2], [36.4, 0, 27.6, 1.2, 2]] },
      { k: 'disp', cls: 'p-glass', d: 1, r: [[4.4, 0.35, 32, 0.85]] },
      { k: 'disp', cls: 'p-paper', d: 1, r: [[4.6, 1.2, 31.6, 1.4]] },
      { k: 'mid', cls: 'p-frame', d: 2, r: [[1.2, 2.6, 61.6, 0.9]] },
      { k: 'mid', cls: 'p-wheel', d: 2, r: [[57, 2.35, 8.6, 1.4, 4]] },
      { k: 'board', cls: 'p-chip', d: 3, r: [[20, 3.6, 7, 0.9], [29, 3.7, 4, 0.8], [44, 3.7, 3, 0.8], [52, 3.5, 3.5, 1.0], [40, 5.5, 2, 0.5]] },
      { k: 'board', cls: 'p-chip key', d: 3, r: [[34.5, 3.9, 2, 0.6]] },
      { k: 'board', cls: 'p-usb', d: 3, r: [[1.2, 3.7, 7.3, 2.4, 2]] },
      { k: 'board', cls: 'p-pcb', d: 3, r: [[1.2, 4.5, 61.6, 1.0]] },
      { k: 'cell', cls: 'p-cell', d: 4, r: [[3, 6.1, 30, 4.2, 6]] },
      { k: 'bay', cls: 'p-spk', d: 5, r: [[38, 7.3, 15, 3.0, 4]] },
      { k: 'bay', cls: 'p-mot', d: 5, r: [[55, 7.8, 6.5, 2.5, 6]] },
      { k: 'foam', cls: 'p-foam', d: 6, r: [[1.2, 10.3, 61.6, 0.5]] },
      { k: 'back', cls: 'p-shell', d: 7, r: [[0, 1.2, 1.2, 10.8], [62.8, 1.2, 1.2, 10.8], [1.2, 10.8, 61.6, 1.2]] }
    ];
    const TAGS = [
      { k: 'front', at: [63.4, 0.6], ly: 40, t: 'Front shell', s: 'aluminium · 1.2 mm' },
      { k: 'disp', at: [36.2, 1.9], ly: 88, t: 'E-paper and cover glass', s: '1.54″ panel · 1.4 mm' },
      { k: 'mid', at: [65.6, 3.05], ly: 136, t: 'Mid-frame and thumb rotor', s: '0.9 mm · rotor stands out 1.6 mm' },
      { k: 'board', at: [62, 5.0], ly: 184, t: 'Main board', s: '1.0 mm board · parts up to 1.0 mm' },
      { k: 'cell', at: [32.6, 6.6], ly: 232, t: 'LiPo cell', s: '3.7 V · ~500 mAh · 4.2 mm' },
      { k: 'bay', at: [53, 7.6], ly: 280, t: 'Speaker and vibration motor', s: 'beside the cell, 3.0 mm' },
      { k: 'foam', at: [62.4, 10.55], ly: 328, t: 'Foam pad', s: '0.5 mm, holds the cell still' },
      { k: 'back', at: [63.4, 11.4], ly: 376, t: 'Back shell', s: 'aluminium tray · 1.2 mm' }
    ];
    const W = 1260, H = Y(12) + 74, LX = X(64) + 64;
    let html = '<defs>' +
      '<pattern id="hatch-shell" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" class="hs-bg"/><line x1="0" y1="0" x2="0" y2="7" class="hs-ln"/></pattern>' +
      '<pattern id="hatch-cell" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width="10" height="10" class="hc-bg"/><line x1="0" y1="0" x2="0" y2="10" class="hc-ln"/></pattern>' +
      '<pattern id="hatch-foam" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" class="hf-bg"/><circle cx="3" cy="3" r="1" class="hf-dot"/></pattern>' +
      '</defs>';
    PARTS.forEach(function (p) {
      html += '<g class="part ' + p.cls + '" data-k="' + p.k + '" style="--d:' + (p.d * 140 + 200) + 'ms">' + p.r.map(rect).join('') + '</g>';
    });
    // Dimensions
    const dy = Y(12) + 30;
    html += '<g class="dims" style="--d:1500ms">' +
      '<path class="dim" d="M' + (X0 - 24) + ' ' + Y0 + ' V' + Y(12) + ' M' + (X0 - 30) + ' ' + Y0 + ' H' + (X0 - 18) + ' M' + (X0 - 30) + ' ' + Y(12) + ' H' + (X0 - 18) + '"/>' +
      '<text class="dim-t" transform="translate(' + (X0 - 32) + ' ' + Y(6) + ') rotate(-90)" text-anchor="middle">12.0 mm</text>' +
      '<path class="dim" d="M' + X0 + ' ' + dy + ' H' + X(64) + ' M' + X0 + ' ' + (dy - 6) + ' V' + (dy + 6) + ' M' + X(64) + ' ' + (dy - 6) + ' V' + (dy + 6) + '"/>' +
      '<text class="dim-t" x="' + X(32) + '" y="' + (dy + 22) + '" text-anchor="middle">64 mm</text></g>';
    // Labels with leader lines
    TAGS.forEach(function (t, i) {
      const tx = X(t.at[0]), ty = Y(t.at[1]);
      html += '<g class="tag" data-k="' + t.k + '" style="--d:' + (1300 + i * 90) + 'ms" tabindex="0">' +
        '<path class="lead" d="M' + tx.toFixed(1) + ' ' + ty.toFixed(1) + ' H' + (LX - 28) + ' L' + (LX - 8) + ' ' + t.ly + '"/>' +
        '<circle class="dot" cx="' + tx.toFixed(1) + '" cy="' + ty.toFixed(1) + '" r="2.6"/>' +
        '<text class="lbl" x="' + LX + '" y="' + (t.ly + 1) + '">' + t.t + '</text>' +
        '<text class="lbl-sub" x="' + LX + '" y="' + (t.ly + 17) + '">' + t.s + '</text></g>';
    });
    html += '<line class="scan" x1="' + X0 + '" y1="' + (Y0 - 14) + '" x2="' + X0 + '" y2="' + (Y(12) + 14) + '"/>';
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.innerHTML = html;

    function hl(k) {
      svg.classList.toggle('has-hl', !!k);
      svg.querySelectorAll('.part, .tag').forEach(function (g) { g.classList.toggle('hl', g.getAttribute('data-k') === k); });
    }
    svg.querySelectorAll('.tag, .part').forEach(function (g) {
      const k = g.getAttribute('data-k');
      g.addEventListener('mouseenter', function () { hl(k); });
      g.addEventListener('focus', function () { hl(k); });
      g.addEventListener('mouseleave', function () { hl(null); });
      g.addEventListener('blur', function () { hl(null); });
    });

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { svg.classList.add('in-view'); io.disconnect(); }
      }, { threshold: 0.3 });
      io.observe(svg);
    } else svg.classList.add('in-view');
  })();

  /* ---------- Cards reveal ---------- */
  (function () {
    const cardsEls = document.querySelectorAll('.why-card');
    if (!('IntersectionObserver' in window) || reduce) { cardsEls.forEach(function (c) { c.classList.add('in-view'); }); return; }
    const io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); } });
    }, { threshold: 0.2 });
    cardsEls.forEach(function (c, i) { c.style.transitionDelay = (i % 3) * 90 + 'ms'; io.observe(c); });
  })();

  /* ---------- Battery life ---------- */
  (function () {
    const CAP = 500, LISTEN = 9.3, SLEEP = 0.3;
    const input = $('duty');
    function calc() {
      const d = input.value / 100;
      const avg = d * LISTEN + (1 - d) * SLEEP;
      const hours = CAP / avg;
      $('duty-out').textContent = input.value + '%';
      $('duty-formula').textContent = CAP + ' mAh ÷ (' + d.toFixed(2) + ' × ' + LISTEN + ' + ' + (1 - d).toFixed(2) + ' × ' + SLEEP + ') mA = ' +
        CAP + ' ÷ ' + avg.toFixed(2) + ' ≈ ' + Math.round(hours) + ' h';
      $('life-out').textContent = hours < 72 ? Math.round(hours) + ' hours' : Math.round(hours / 24) + ' days';
    }
    input.addEventListener('input', calc);
    calc();
  })();

  /* ---------- Slow glide for links within the page ---------- */
  let glide = 0;
  function glideTo(y) {
    cancelAnimationFrame(glide);
    const from = scrollY, dist = y - from;
    if (Math.abs(dist) < 2) return;
    if (reduce) { scrollTo(0, y); return; }
    const dur = clamp(1100 + Math.abs(dist) * 0.25, 1500, 3000), start = performance.now();
    const html = document.documentElement, prev = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    function stop() {
      cancelAnimationFrame(glide); html.style.scrollBehavior = prev;
      ['wheel', 'touchstart', 'keydown'].forEach(function (ev) { removeEventListener(ev, stop); });
    }
    function step(now) {
      const k = clamp((now - start) / dur, 0, 1);
      scrollTo(0, from + dist * ease(k));
      if (k < 1) glide = requestAnimationFrame(step); else stop();
    }
    glide = requestAnimationFrame(step);
    ['wheel', 'touchstart', 'keydown'].forEach(function (ev) { addEventListener(ev, stop, { passive: true, once: true }); });
  }
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      const id = a.getAttribute('href').slice(1), target = document.getElementById(id);
      if (!target || a.classList.contains('skip')) return;
      e.preventDefault();
      glideTo(id === 'top' ? 0 : target.getBoundingClientRect().top + scrollY - 70);
      history.replaceState(null, '', '#' + id);
    });
  });
})();
