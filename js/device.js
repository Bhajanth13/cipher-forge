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

  const CORNERS = [[20, 20], [300, 20], [20, 190], [300, 190]];

  // Eight layers, front to back (5 px = 1 mm; the case is 13 mm = 65 px).
  // z: where the layer sits when closed. ex: how far it travels when taken apart, in gap units.
  // pts: callouts [x, y, z, name, detail]. spec: the card's table.
  const LAYERS = [
    { name: 'Front shell', mm: '1.2 mm', cls: 'L-front', z: 59, ex: 3.7,
      html: function () {
        return slab('shell', 0, 0, 320, 210, 6, 0,
          '<span class="grille"></span><span class="pinhole"></span><span class="engrave e1">WHISPER</span><span class="engrave e2">CF-1</span>');
      },
      pts: [[100, 105, 6, 'Screen window', '32 × 32 mm aperture'], [284, 54, 6, 'Speaker grille', '30 holes, Ø 0.6 mm'],
        [247, 152, 6, 'Microphone port', 'Ø 0.8 mm, mesh-backed'], [160, 210, 3, 'Chamfered edge', '0.3 mm, hard-anodised']],
      text: 'The outer face. One window for the screen, a pinhole for the microphone, a grid of holes for the speaker. No logo and no lights, so nothing reflects or glows.',
      spec: [['Material', '6061-T6 aluminium'], ['Thickness', '1.2 mm'], ['Finish', 'Bead-blasted, hard-anodised matte black'], ['Job', 'Protects the stack; carries window, grille and mic port']] },
    { name: 'Cover glass and gasket', mm: '0.5 mm', cls: 'L-glass', z: 59, ex: 2.75,
      html: function () {
        return slab('gasket', 16, 19, 172, 172, 1.5, 0) + slab('glass3', 22, 25, 160, 160, 2.5, 1.5);
      },
      pts: [[60, 58, 4, 'Cover glass', '0.5 mm, strengthened, anti-glare'], [160, 165, 4, 'Optical adhesive', '0.15 mm, no air gap'],
        [17, 120, 1.5, 'Foam gasket', 'closed-cell, splash seal']],
      text: 'A thin sheet of strengthened glass bonded to the screen with clear adhesive, so there is no air gap to fog or reflect. A foam ring seals the window against dust and splashes.',
      spec: [['Material', 'Chemically strengthened glass, closed-cell foam'], ['Thickness', '0.5 mm glass + 0.15 mm adhesive'], ['Finish', 'Etched anti-glare'], ['Job', 'Protects the e-paper; seals the front']] },
    { name: 'E-paper display', mm: '1.4 mm', cls: 'L-disp', z: 52, ex: 1.85,
      html: function () {
        return slab('panel3', 22, 25, 160, 160, 7, 0, PAPER) + slab('cog', 84, 178, 36, 5, 2, 7) + slab('fpc', 82, 185, 40, 22, 1, 0);
      },
      pts: [[70, 90, 7, 'E-paper panel', '1.54″, 200 × 200 px, 184 ppi'], [102, 180, 9, 'Driver chip on glass', 'SSD1681 controller'],
        [102, 202, 1, 'Flex cable', '24 pins, 0.5 mm pitch']],
      text: 'A 1.54-inch e-paper panel. It keeps the last image with no power and gives off no light, so it can’t be seen glowing in a dark room, and stays readable in sunlight.',
      spec: [['Part', 'GDEY0154D67 (or similar)'], ['Resolution', '200 × 200 px, 184 ppi, black and white'], ['Power', '0 mW to hold an image; full refresh about 2 s'], ['Job', 'Shows the decrypted message, then clears it']] },
    { name: 'Mid-frame and thumb rotor', mm: '0.9 mm', cls: 'L-mid', z: 47.5, ex: 0.95,
      html: function () { return slab('frame', 0, 0, 320, 210, 4.5, 0) + cylinder('wheel', 286, 72, 66, 66, 9, 4, -2); },
      pts: [[22, 160, 4.5, 'Mid-frame', 'glass-filled nylon'], [182, 60, 4.5, 'Screen pocket', 'holds the panel square'],
        [338, 105, 7, 'Thumb rotor', 'Ø 13 mm, 26 detents, push to select']],
      text: 'A stiff frame that holds the screen and carries the thumb rotor on the right edge. Roll it to pick letters, like the lab’s rotors; press to select; hold for five seconds to wipe the keys.',
      spec: [['Material', 'PA66 nylon, 30% glass fibre'], ['Thickness', '0.9 mm'], ['Rotor', 'Side jog encoder with push switch (Panasonic EVQ-WK series)'], ['Job', 'Stiffens the case; holds screen and rotor']] },
    { name: 'Main board', mm: '2.0 mm with parts', cls: 'L-board', z: 37.5, ex: 0,
      html: function () {
        return slab('pcb', 8, 8, 304, 194, 5, 0, TRACES) +
          slab('chip big', 118, 78, 38, 38, 4.5, 5, 'RP2040') + slab('chip', 170, 80, 26, 20, 4, 5, 'W25Q16') +
          slab('chip key', 172, 114, 18, 18, 3, 5, '608B') + slab('chip can', 128, 124, 14, 9, 3.5, 5, '12M') +
          slab('chip', 232, 58, 16, 16, 4, 5, 'AMP') + slab('chip can', 238, 144, 18, 14, 5, 5, 'MIC') +
          slab('chip', 64, 136, 16, 16, 4, 5, 'HAP') + slab('chip', 40, 92, 14, 9, 4, 5, 'CHG') +
          slab('chip can', 130, 180, 50, 24, 8, 5, 'USB-C') + slab('chip under', 52, 40, 12, 8, 2, -2);
      },
      pts: [[137, 97, 9.5, 'RP2040', '2 × Cortex-M0+, 133 MHz, 264 KB RAM'], [181, 123, 8, 'ATECC608B', 'secure element, holds the key'],
        [247, 151, 10, 'ICS-43434', 'I²S MEMS mic, to 20 kHz'], [240, 66, 9, 'MAX98357A', 'I²S class-D amplifier'],
        [183, 90, 9, 'W25Q16', '2 MB flash, firmware only'], [155, 192, 13, 'USB-C', 'charging and key loading'],
        [47, 96, 9, 'MCP73831', 'LiPo charger, 500 mA'], [58, 44, -2, 'Light sensor (underside)', 'tamper alarm, faces the tray']],
      text: 'The brain, every part on one side of a 4-layer board. The processor listens with 16 tone detectors, rebuilds the bytes, checks the mod-256 checksum and applies F⁻¹ with the key from the secure chip. A DRV2605L drives the vibration motor.',
      spec: [['Board', '4-layer FR-4, 1.0 mm'], ['Finish', 'Matte solder mask, ENIG gold pads'], ['Parts', 'RP2040, ATECC608B, ICS-43434, MAX98357A, DRV2605L, MCP73831, W25Q16, USB-C'], ['Job', 'Listen, decode, decrypt, show']] },
    { name: 'Power and sound bay', mm: '5.0 mm', cls: 'L-bay', z: 0, ex: -1.15,
      html: function () {
        return slab('cell', 8, 20, 250, 170, 25, 9.5, '<span>LiPo · 503450</span><span><b>3.7 V · 1000 mAh</b><br>3.7 Wh</span>') +
          slab('pcm', 236, 70, 18, 70, 3, 34.5) +
          cylinder('spk', 262, 22, 45, 65, 15, 4, 9.5) + cylinder('mot', 265, 140, 40, 40, 12, 3, 9.5);
      },
      pts: [[120, 105, 34.5, 'LiPo cell', '503450, 3.7 V, 1000 mAh'], [245, 105, 37.5, 'Protection circuit', 'over-charge, over-drain, short'],
        [284, 54, 24.5, 'Micro speaker', '9 × 13 mm, response to 20 kHz'], [285, 160, 21.5, 'Vibration motor', '8 mm LRA, silent alerts']],
      text: 'A 1000 mAh lithium-polymer cell, a micro speaker and a coin vibration motor sit side by side, held by foam tape. The speaker sends the tones; the motor gives a silent buzz when a message arrives.',
      spec: [['Cell', 'LiPo 503450, 3.7 V, 1000 mAh (3.7 Wh)'], ['Protection', 'Built-in circuit: over-charge, over-discharge, short'], ['Sound', '9 × 13 mm micro speaker, 8 mm LRA motor'], ['Mount', 'Double-sided foam tape, 0.7 mm']] },
    { name: 'Back tray', mm: '1.2 mm walls', cls: 'L-back', z: 0, ex: -2.65,
      html: function () {
        const posts = CORNERS.map(function (c) { return cylinder('post', c[0] - 7, c[1] - 7, 14, 14, 22, 4, 6); }).join('');
        return slab('shell', 0, 0, 320, 210, 6, 0, '<span class="foam"></span><span class="stamp">CF-1 · WHISPER<br>SN 0417 · CONCEPT</span>') +
          slab('shell', 0, 0, 320, 6, 59, 0) + slab('shell', 0, 204, 320, 6, 59, 0) +
          slab('shell', 0, 6, 6, 198, 59, 0) + slab('shell', 314, 6, 6, 198, 59, 0) + posts +
          slab('port', 132, 207, 46, 4, 17, 34);
      },
      pts: [[20, 20, 28, 'Screw post', 'M1.4 thread, ×4'], [160, 3, 59, 'Side wall', '1.2 mm, CNC-machined'],
        [155, 210, 42, 'USB-C opening', '9.0 × 3.3 mm'], [160, 112, 6, 'Serial stamp', 'laser-etched inside']],
      text: 'One machined piece forms the back and all four sides. It is light-tight, so if the case is opened the light sensor under the board sees daylight and Whisper erases its keys.',
      spec: [['Material', '6061-T6 aluminium'], ['Walls', '1.2 mm, machined from solid'], ['Posts', '4 × M1.4 threaded'], ['Job', 'Forms the case; keeps the inside dark for the tamper sensor']] },
    { name: 'Fasteners and seal', mm: 'M1.4 × 4', cls: 'L-screws', z: 0, ex: -3.7,
      html: function () {
        return CORNERS.map(function (c) {
          return cylinder('shaft', c[0] - 3, c[1] - 3, 6, 6, 20, 6, 0) + cylinder('head', c[0] - 6, c[1] - 6, 12, 12, 3, 3, -3);
        }).join('') + slab('seal', 292, 182, 16, 16, 0.6, -3.8);
      },
      pts: [[20, 20, 18, 'Torx T3 screw', 'M1.4 × 4 mm stainless, ×4'], [300, 190, -3, 'Tamper label', 'void pattern shows if lifted']],
      text: 'Four tiny Torx screws close the case. A void label over one of them shows at a glance if anyone has opened it.',
      spec: [['Screws', '4 × M1.4 × 4 mm, Torx T3, stainless A2'], ['Thread-lock', 'Low-strength, removable'], ['Seal', 'Void label over screw 4'], ['Job', 'Holds the case shut; shows tampering']] }
  ];
  const NL = LAYERS.length;

  function build(el) {
    el.innerHTML = LAYERS.map(function (L, k) {
      const marks = (L.pts || []).map(function (p, i) {
        return '<i class="mk" data-k="' + k + '" data-i="' + i + '" style="transform:translate3d(' + p[0] + 'px,' + p[1] + 'px,' + p[2] + 'px)"></i>';
      }).join('');
      return '<div class="layer3 ' + L.cls + '">' + L.html() + marks + '</div>';
    }).join('') + CORNERS.map(function (c) {
      return '<div class="axis" style="left:' + c[0] + 'px;top:' + c[1] + 'px"></div>';
    }).join('');
    const layers = Array.prototype.slice.call(el.querySelectorAll('.layer3'));
    const axes = Array.prototype.slice.call(el.querySelectorAll('.axis'));
    return {
      el: el,
      layers: layers,
      wheel: el.querySelector('.wheel'),
      msg: el.querySelector('.paper-msg'),
      paper: el.querySelector('.panel3 > .top'),
      // sep 0 = closed, 1 = fully apart. active = index of the highlighted layer, or -1
      set: function (sep, active, gap) {
        const G = gap || 70;
        let zmin = 0, zmax = 65;
        layers.forEach(function (l, k) {
          const z = LAYERS[k].z + sep * LAYERS[k].ex * G + (k === active ? 22 : 0);
          l.style.transform = 'translateZ(' + z.toFixed(1) + 'px)';
          l.classList.toggle('is-active', k === active);
          if (k === 0) zmax = z + 6;
          if (k === NL - 1) zmin = z - 4;
        });
        axes.forEach(function (a) {
          a.style.height = (zmax - zmin).toFixed(1) + 'px';
          a.style.transform = 'translateZ(' + zmin.toFixed(1) + 'px) rotateX(90deg)';
          a.style.opacity = (sep * 0.9).toFixed(2);
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
    hero.set(1 - k, -1, 58);
    const az = -32 + (reduce ? 0 : Math.sin(t * 0.35) * 9);
    const ax = 56 + (reduce ? 0 : Math.sin(t * 0.5) * 3);
    const fl = reduce ? 0 : Math.sin(t * 0.9) * 8;
    heroCam.style.transform = 'translateY(' + fl.toFixed(1) + 'px) rotateX(' + ax.toFixed(2) + 'deg) rotateZ(' + az.toFixed(2) + 'deg) translateZ(-32px)';
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
  const exCam = $('ex-cam'), exSec = $('explode'), hint = $('ex-hint'), stage = $('ex-stage');
  const lines = $('ex-lines'), callouts = $('ex-callouts');

  // The index and the cards come from the same data as the 3D model
  $('ex-index').innerHTML = LAYERS.map(function (L, i) {
    return '<li><button type="button" data-i="' + i + '">' + L.name + '</button></li>';
  }).join('');
  $('ex-cards').innerHTML = LAYERS.map(function (L, i) {
    return '<article class="ex-card" data-layer="' + i + '">' +
      '<p class="ex-num mono">Layer ' + (i + 1) + ' of ' + NL + ' · ' + L.mm + '</p>' +
      '<div class="ex-bar"><span style="width:' + ((i + 1) / NL * 100) + '%"></span></div>' +
      '<h3>' + L.name + '</h3><p>' + L.text + '</p>' +
      '<dl class="ex-dl">' + L.spec.map(function (r) { return '<div><dt class="mono">' + r[0] + '</dt><dd>' + r[1] + '</dd></div>'; }).join('') + '</dl>' +
      '<ol class="ex-parts">' + L.pts.map(function (p) { return '<li><b>' + p[3] + '</b> <span class="mono">' + p[4] + '</span></li>'; }).join('') + '</ol>' +
      '</article>';
  }).join('');
  const items = Array.prototype.slice.call(document.querySelectorAll('#ex-index li'));
  const cards = Array.prototype.slice.call(document.querySelectorAll('.ex-card'));
  const P0 = 0.12;  // the first 12% of the section separates the layers

  // Click a layer name to glide to it
  document.querySelectorAll('#ex-index button').forEach(function (b) {
    b.addEventListener('click', function () {
      const i = +b.getAttribute('data-i');
      const p = P0 + (i + 0.5) / NL * (1 - P0);
      glideTo(exSec.offsetTop + p * (exSec.offsetHeight - innerHeight));
    });
  });

  // Callouts: find each marked point on screen, then lay the labels out in two columns
  let shown = -2;
  function drawCallouts(active) {
    if (active < 0 || innerWidth < 980) {
      if (shown !== -1) { lines.innerHTML = ''; callouts.innerHTML = ''; shown = -1; }
      return;
    }
    const L = LAYERS[active], sr = stage.getBoundingClientRect();
    const marks = Array.prototype.slice.call(ex.el.querySelectorAll('.mk[data-k="' + active + '"]'));
    const pts = marks.map(function (m, i) {
      const r = m.getBoundingClientRect();
      return { i: i, x: r.left + r.width / 2 - sr.left, y: r.top + r.height / 2 - sr.top, p: L.pts[i] };
    });
    if (shown !== active) {
      callouts.innerHTML = pts.map(function (q) {
        return '<div class="co" data-i="' + q.i + '"><span class="co-n mono">' + (q.i + 1) + '</span><span class="co-tx"><span class="co-t">' + q.p[3] + '</span><span class="co-d mono">' + q.p[4] + '</span></span></div>';
      }).join('');
      shown = active;
    }
    const W = sr.width, H = sr.height, COLW = Math.min(220, W * 0.24);
    const byX = pts.slice().sort(function (a, b) { return a.x - b.x; });
    const half = Math.ceil(byX.length / 2);
    const cols = [byX.slice(0, half), byX.slice(half)];
    let path = '';
    cols.forEach(function (col, side) {
      col.sort(function (a, b) { return a.y - b.y; });
      let last = 30;
      col.forEach(function (q) { q.ly = Math.max(q.y, last + 54); last = q.ly; });
      const over = last - (H - 70);
      if (over > 0) col.forEach(function (q) { q.ly = Math.max(40, q.ly - over); });
      col.forEach(function (q) {
        const el = callouts.querySelector('.co[data-i="' + q.i + '"]');
        const ex2 = side === 0 ? COLW : W - COLW;
        el.classList.toggle('left', side === 0);
        el.style.top = (q.ly - 16).toFixed(0) + 'px';
        if (side === 0) { el.style.left = '0px'; el.style.width = COLW + 'px'; el.style.right = ''; }
        else { el.style.left = (W - COLW) + 'px'; el.style.width = COLW + 'px'; }
        const elbow = side === 0 ? ex2 + 26 : ex2 - 26;
        path += '<path d="M' + q.x.toFixed(1) + ' ' + q.y.toFixed(1) + ' L' + elbow.toFixed(1) + ' ' + q.ly.toFixed(1) + ' H' + ex2.toFixed(1) + '"/>' +
          '<circle class="pin" cx="' + q.x.toFixed(1) + '" cy="' + q.y.toFixed(1) + '" r="3.2"/><circle class="ring" cx="' + q.x.toFixed(1) + '" cy="' + q.y.toFixed(1) + '" r="8"/>';
      });
    });
    lines.setAttribute('viewBox', '0 0 ' + W.toFixed(0) + ' ' + H.toFixed(0));
    lines.innerHTML = path;
  }

  let lastActive = null;
  function exFrame() {
    const r = exSec.getBoundingClientRect();
    const total = exSec.offsetHeight - innerHeight;
    const p = clamp(-r.top / total, 0, 1);
    const sep = ease(clamp(p / P0, 0, 1));
    const active = p < P0 ? -1 : Math.min(NL - 1, Math.floor((p - P0) / (1 - P0) * NL));
    const gap = innerWidth < 560 ? 44 : innerWidth < 980 ? 58 : 70;
    ex.set(sep, active, gap);
    const ax = 60 - 6 * p, az = -38 + 18 * p;
    exCam.style.transform = 'rotateX(' + ax.toFixed(2) + 'deg) rotateZ(' + az.toFixed(2) + 'deg) translateZ(-32px)';
    if (ex.wheel) ex.wheel.style.setProperty('--rot', (p * 720).toFixed(1) + 'deg');
    hint.style.opacity = p > 0.04 ? 0 : 1;
    $('exh-sep').textContent = 'SEPARATION ' + Math.round(sep * 100) + '%';
    if (active !== lastActive) {
      lastActive = active;
      const show = Math.max(0, active);
      items.forEach(function (li, i) { li.classList.toggle('is-active', i === active); });
      cards.forEach(function (c, i) { c.classList.toggle('is-active', i === show); });
      $('exh-layer').textContent = active < 0 ? 'ASSEMBLED' : 'LAYER ' + String(active + 1).padStart(2, '0') + ' / ' + String(NL).padStart(2, '0') + ' · ' + LAYERS[active].name.toUpperCase();
    }
    drawCallouts(active);
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
      { k: 'cell', cls: 'p-cell', d: 4, r: [[1.8, 6.1, 50, 5.0, 6]] },
      { k: 'bay', cls: 'p-spk', d: 5, r: [[52.6, 8.1, 9.4, 3.0, 3]] },
      { k: 'foam', cls: 'p-foam', d: 6, r: [[1.2, 11.1, 61.6, 0.7]] },
      { k: 'back', cls: 'p-shell', d: 7, r: [[0, 1.2, 1.2, 11.8], [62.8, 1.2, 1.2, 11.8], [1.2, 11.8, 61.6, 1.2]] }
    ];
    const TAGS = [
      { k: 'front', at: [63.4, 0.6], ly: 40, t: 'Front shell', s: 'aluminium · 1.2 mm' },
      { k: 'disp', at: [36.2, 1.9], ly: 88, t: 'E-paper and cover glass', s: '1.54″ panel · 1.4 mm' },
      { k: 'mid', at: [65.6, 3.05], ly: 136, t: 'Mid-frame and thumb rotor', s: '0.9 mm · rotor stands out 1.6 mm' },
      { k: 'board', at: [62, 5.0], ly: 184, t: 'Main board', s: '1.0 mm board · parts up to 1.0 mm' },
      { k: 'cell', at: [42, 6.6], ly: 236, t: 'LiPo cell', s: '3.7 V · 1000 mAh · 5.0 mm' },
      { k: 'bay', at: [60, 8.5], ly: 288, t: 'Micro speaker', s: '3.0 mm · the motor sits behind it' },
      { k: 'foam', at: [62.4, 11.45], ly: 340, t: 'Foam pad', s: '0.7 mm, holds the cell still' },
      { k: 'back', at: [63.4, 12.4], ly: 392, t: 'Back shell', s: 'aluminium tray · 1.2 mm' }
    ];
    const W = 1260, H = Y(13) + 74, LX = X(64) + 64;
    let html = '<defs>' +
      '<pattern id="hatch-shell" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" class="hs-bg"/><line x1="0" y1="0" x2="0" y2="7" class="hs-ln"/></pattern>' +
      '<pattern id="hatch-cell" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width="10" height="10" class="hc-bg"/><line x1="0" y1="0" x2="0" y2="10" class="hc-ln"/></pattern>' +
      '<pattern id="hatch-foam" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" class="hf-bg"/><circle cx="3" cy="3" r="1" class="hf-dot"/></pattern>' +
      '</defs>';
    PARTS.forEach(function (p) {
      html += '<g class="part ' + p.cls + '" data-k="' + p.k + '" style="--d:' + (p.d * 140 + 200) + 'ms">' + p.r.map(rect).join('') + '</g>';
    });
    // Dimensions
    const dy = Y(13) + 30;
    html += '<g class="dims" style="--d:1500ms">' +
      '<path class="dim" d="M' + (X0 - 24) + ' ' + Y0 + ' V' + Y(13) + ' M' + (X0 - 30) + ' ' + Y0 + ' H' + (X0 - 18) + ' M' + (X0 - 30) + ' ' + Y(13) + ' H' + (X0 - 18) + '"/>' +
      '<text class="dim-t" transform="translate(' + (X0 - 32) + ' ' + Y(6.5) + ') rotate(-90)" text-anchor="middle">13.0 mm</text>' +
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
    html += '<line class="scan" x1="' + X0 + '" y1="' + (Y0 - 14) + '" x2="' + X0 + '" y2="' + (Y(13) + 14) + '"/>';
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
    const CAP = 1000, LISTEN = 9.3, SLEEP = 0.3;
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
