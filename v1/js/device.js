/* =========================================================
   Cipher Forge — device.js
   Future enhancement 02: Cipher Echo, an acoustic cipher communicator.
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
  // A slab is a box with a top, a bottom and four edges. "lite" slabs (tiny parts) only
  // draw the three faces the camera can see.
  function slab(cls, x, y, w, h, t, z, inner, lite) {
    const faces = lite ? '<div class="f e-s"></div><div class="f e-e"></div>'
      : '<div class="f bot"></div><div class="f e-n"></div><div class="f e-s"></div><div class="f e-w"></div><div class="f e-e"></div>';
    return '<div class="slab ' + cls + '" style="--x:' + x + 'px;--y:' + y + 'px;--w:' + w + 'px;--h:' + h + 'px;--t:' + t + 'px;--z:' + (z || 0) + 'px">' +
      faces + '<div class="f top">' + (inner || '') + '</div></div>';
  }
  function cylinder(cls, x, y, w, h, t, n, z) {
    let html = '<div class="' + cls + '" style="left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;transform:translateZ(' + (z || 0) + 'px)">';
    for (let i = 0; i < n; i++) {
      html += '<div class="disc' + (i === n - 1 ? ' cap' : '') + '" style="transform:translateZ(' + (t * i / (n - 1)).toFixed(1) + 'px)"></div>';
    }
    return html + '</div>';
  }

  /* The unit: 78 × 56 × 13 mm, drawn at 5 px per mm (390 × 280 × 65 px) */
  const DW = 390, DH = 280;
  const CORNERS = [[16, 16], [374, 16], [16, 264], [374, 264]];

  // On-screen keyboard, drawn on the e-paper
  const ROWS = ['QWERTYUIOP'.split(''), 'ASDFGHJKL⌫'.split(''), ['⇧', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '.', '↵'], ['SYM', 'SPACE', 'SEND']];
  const OSK = '<div class="osk">' + ROWS.map(function (row) {
    return '<div class="osk-row">' + row.map(function (k) {
      return '<span class="osk-k' + (k.length > 1 ? ' w-' + k.toLowerCase() : '') + '" data-key="' + k + '">' + (k === 'SPACE' ? '' : k) + '</span>';
    }).join('') + '</div>';
  }).join('') + '</div>';

  const PAPER = '<div class="paper">' +
    '<div class="paper-bar"><span>CIPHER ECHO · TO K</span><span>KEY ● LR 21.2 kHz · ▮▮▮▯</span></div>' +
    '<p class="paper-lbl">PLAINTEXT</p><p class="paper-msg"><span class="pm-text">MEET AT NOON</span><span class="caret"></span></p>' +
    '<p class="paper-lbl">CIPHERTEXT · F = shift(3)</p><p class="paper-cip">PHHW DW QRRQ</p>' +
    '<div class="paper-foot"><span class="pf-state">READY</span><span class="pf-bar"><i></i></span></div>' + OSK +
    '<span class="tap"></span></div>';

  // Dense board artwork: traces, vias, pads, silkscreen
  const TRACES = (function () {
    let p = '<svg class="traces" viewBox="0 0 374 264" aria-hidden="true">';
    const paths = ['M178 104 V150 H192', 'M150 104 V160', 'M210 104 V130 H250', 'M218 60 H232 V66', 'M218 76 H232 V95',
      'M122 70 H70 V112', 'M122 84 H60 V168', 'M122 96 H40 V160', 'M226 40 V20 H292 V32', 'M218 50 H300', 'M226 96 H300 V192',
      'M160 160 V200 H70', 'M200 160 V236 H160', 'M240 160 H330 V174', 'M260 128 V116 H300', 'M30 30 H120 M30 234 H120 M254 234 H344',
      'M96 112 V60 H120', 'M300 70 H344 V160', 'M120 150 H40', 'M190 30 V12', 'M196 236 V246'];
    paths.forEach(function (d) { p += '<path d="' + d + '"/>'; });
    for (let i = 0; i < 46; i++) {
      const x = 20 + ((i * 73) % 330), y = 20 + ((i * 41) % 220);
      p += '<circle class="via" cx="' + x + '" cy="' + y + '" r="1.6"/>';
    }
    [[24, 248], [36, 248], [48, 248], [340, 20], [352, 20]].forEach(function (c) { p += '<circle class="tp" cx="' + c[0] + '" cy="' + c[1] + '" r="3"/>'; });
    CORNERS.forEach(function (c) { p += '<circle class="hole" cx="' + (c[0] - 8) + '" cy="' + (c[1] - 8) + '" r="5"/>'; });
    [['U1', 124, 36], ['U2', 236, 52], ['U3', 236, 82], ['U4', 146, 166], ['J1', 116, 120], ['J2', 256, 120], ['J3', 196, 146], ['BT1', 56, 116], ['MK1', 182, 8], ['MK2', 192, 246]].forEach(function (l) {
      p += '<text x="' + l[1] + '" y="' + l[2] + '">' + l[0] + '</text>';
    });
    return p + '</svg>';
  })();

  // Tiny resistors and capacitors around the chips
  function passives() {
    let h = '';
    const clusters = [[40, 118, 1, 6], [262, 112, 2, 3], [96, 214, 3, 3], [282, 64, 2, 1], [276, 176, 3, 2], [30, 196, 3, 3], [262, 92, 1, 3], [14, 130, 3, 2], [330, 112, 2, 4]];
    clusters.forEach(function (c, ci) {
      for (let r = 0; r < c[2]; r++) for (let q = 0; q < c[3]; q++) {
        const cap = (r + q + ci) % 3 !== 0;
        h += slab('pas ' + (cap ? 'capc' : 'res'), c[0] + q * 9, c[1] + r * 7, 6, 3, cap ? 2.4 : 1.6, 5, '', true);
      }
    });
    return h;
  }

  // Ten layers, front to back. z: where the layer sits when closed (px). ex: how far it travels apart (gap units).
  // pts: callouts [x, y, z, name, detail]. spec: the card's table.
  const LAYERS = [
    { name: 'Titanium bezel', mm: '1.0 mm', cls: 'L-front', z: 60, ex: 3.7,
      html: function () {
        return slab('bezel', 0, 0, DW, DH, 5, 0, '<span class="pinhole" style="left:193px;top:263px"></span><span class="engrave e1">CIPHER</span><span class="engrave e2">ECHO</span>');
      },
      pts: [[195, 137, 5, 'Screen window', '70 × 46 mm, edge to edge'], [195, 10, 5, 'Top edge', 'horns and mics face this way'],
        [195, 266, 5, 'Bottom mic port', 'Ø 0.8 mm, mesh-backed'], [3, 140, 5, 'Slim bezel', '2 mm titanium sides']],
      text: 'A thin titanium frame around a screen that fills the face. No logo, no lights.',
      spec: [['Material', 'Grade 5 titanium'], ['Thickness', '1.0 mm, 2 mm sides'], ['Finish', 'Bead-blasted, PVD graphite'], ['Job', 'Holds the glass; the face of the unit']] },
    { name: 'Sapphire glass and touch layer', mm: '0.7 + 0.2 mm', cls: 'L-glass', z: 53, ex: 2.8,
      html: function () {
        return slab('touch', 16, 18, 358, 238, 1, 0) + slab('tfpc', 250, 252, 64, 18, 0.6, 0, '<span class="tchip"></span>') +
          slab('glass3', 16, 18, 358, 238, 4, 1.2);
      },
      pts: [[70, 50, 5.2, 'Sapphire cover glass', '0.7 mm, full face, anti-glare'], [320, 200, 1, 'Capacitive touch film', 'ITO grid, 10-point, works with gloves'],
        [292, 262, 1, 'Touch controller', 'on its own flex tail']],
      text: 'Sapphire over a capacitive touch film that covers the whole screen. Every tap on the on-screen keyboard is read here.',
      spec: [['Glass', 'Sapphire crystal, 0.7 mm'], ['Touch', 'Capacitive ITO film, 10-point'], ['Bond', 'Optically clear adhesive, no air gap'], ['Job', 'Protects the screen; reads every tap']] },
    { name: 'Full-face touch e-paper', mm: '1.2 mm', cls: 'L-disp', z: 47, ex: 1.9,
      html: function () {
        return slab('panel3 p-osk', 10, 14, 370, 248, 6, 0, PAPER) + slab('cog', 150, 256, 90, 5, 1.6, 6) + slab('fpc', 160, 262, 70, 16, 0.8, 0);
      },
      pts: [[120, 60, 6, 'E-paper panel', '3.3″, 360 × 240 px, 130 ppi'], [195, 205, 6, 'On-screen keyboard', 'QWERTY; layout can be scrambled'],
        [195, 258, 7.6, 'Driver chip on glass', 'e-paper controller'], [195, 272, 0.8, 'Display flex', 'to the board']],
      text: 'The whole face is one e-paper screen. The keyboard is drawn on it, so there are no keys to wear out, click or give away what you typed.',
      spec: [['Panel', '3.3″, 360 × 240 px, black and white'], ['Keyboard', 'On-screen QWERTY, optional scrambled layout'], ['Power', '0 mW to hold; partial refresh 0.3 s'], ['Job', 'Type, read and confirm on one surface']] },
    { name: 'Titanium mid-frame', mm: '55 × 1.2 mm walls', cls: 'L-mid', z: 5, ex: 0.55,
      html: function () {
        const posts = CORNERS.map(function (c) { return cylinder('post', c[0] - 6, c[1] - 6, 12, 12, 28, 4, 0); }).join('');
        return slab('frame cutout', 6, 6, 378, 268, 4, 38, '<span class="ribs"></span>') +
          slab('port', 52, -2, 30, 4, 12, 22) + slab('port', 96, -2, 30, 4, 12, 22) + slab('port', 290, -2, 30, 4, 12, 22) + slab('port', 334, -2, 30, 4, 12, 22) +
          slab('port', 30, -2, 6, 4, 4, 36) + slab('port', 354, -2, 6, 4, 4, 36) + slab('port', 30, 278, 6, 4, 4, 36) + slab('port', 354, 278, 6, 4, 4, 36) +
          slab('wall', 0, 0, 172, 6, 55, 0) + slab('wall', 218, 0, 172, 6, 55, 0) + slab('wall', 172, 0, 46, 6, 4, 0) + slab('wall', 172, 0, 46, 6, 4, 51) +
          slab('door', 172, -1, 23, 4, 46, 4.5) + slab('door', 195, -1, 23, 4, 46, 4.5) + slab('wall', 0, 274, DW, 6, 55, 0) +
          slab('wall', 0, 6, 6, 268, 55, 0) + slab('wall', 384, 6, 6, 268, 55, 0) + posts +
          cylinder('wheel', 362, 64, 48, 48, 8, 4, 30) +
          slab('fp p-fp', 388, 176, 6, 46, 10, 26, '<span class="fp-ring"></span>') +
          slab('kill', -3, 60, 4, 36, 8, 28) + slab('nub', -6, 64, 4, 12, 6, 29) +
          slab('port', 172, 273, 46, 8, 16, 22);
      },
      pts: [[327, -2, 30, 'Horn ports', 'ultrasound leaves the top edge'], [195, -1, 30, 'Petal doors', 'two sliding doors over the Ø 9.2 mm bloom slot'], [386, 88, 34, 'Thumb rotor', 'Ø 9.6 mm, 26 detents'], [392, 199, 31, 'Fingerprint power key', 'unlocks the key store'],
        [-5, 70, 32, 'Mic kill switch', 'cuts all four mics in hardware'], [195, 276, 30, 'USB-C port', 'charge and load keys'],
        [70, 160, 42, 'Inner shelf', 'stiffening ribs, 0.8 mm, cut out for the petal pocket']],
      text: 'The skeleton: titanium walls, an inner shelf cut away for the petal pocket, and every control on the sides. Two doors in the top edge open for the bloom.',
      spec: [['Material', 'Grade 5 titanium, CNC-machined'], ['Walls', '1.2 mm, inner shelf 0.8 mm'], ['Controls', 'Rotor, fingerprint key, mic kill switch'], ['Job', 'Strength; carries all side controls']] },
    { name: 'Main board', mm: '1.0 mm, 8 layers', cls: 'L-board', z: 33, ex: -0.75,
      html: function () {
        return slab('pcb cutout', 8, 8, 374, 264, 5, 0, TRACES) +
          slab('pcb-edge', 147, 8, 2, 185, 5, 0, '', true) + slab('pcb-edge', 241, 8, 2, 185, 5, 0, '', true) + slab('pcb-edge', 147, 191, 96, 2, 5, 0, '', true) +
          slab('chip can shield p-mcu', 36, 40, 96, 72, 6, 5, '<span class="perf"></span><i>STM32U585</i>') +
          slab('chip key p-se', 262, 64, 20, 20, 3, 5, 'SE050') + slab('chip p-flash', 290, 84, 26, 18, 4, 5, 'W25Q128') +
          slab('chip', 156, 206, 18, 18, 3, 5, 'PMIC') + slab('chip', 60, 200, 12, 10, 2.5, 5, 'FG', true) +
          slab('chip', 40, 170, 14, 12, 3, 5, 'CHG', true) + slab('chip p-amp', 298, 38, 20, 20, 4, 5, 'HV') + slab('chip can', 322, 40, 16, 16, 6, 5, 'L1', true) +
          slab('chip', 300, 200, 16, 16, 4, 5, 'HAP') + slab('chip can p-mic', 24, 12, 18, 12, 5, 5, 'MIC') + slab('chip can p-mic', 348, 12, 18, 12, 5, 5, 'MIC') +
          slab('chip can p-mic', 24, 252, 18, 12, 5, 5, 'MIC') + slab('chip can p-mic', 348, 252, 18, 12, 5, 5, 'MIC') + slab('chip can', 300, 118, 14, 8, 3.5, 5, '', true) +
          slab('chip p-mdrv', 252, 160, 16, 12, 3, 5, 'MD', true) +
          slab('conn', 40, 126, 60, 10, 5, 5) + slab('conn', 260, 136, 34, 10, 5, 5) + slab('conn', 190, 206, 44, 10, 5, 5) +
          slab('conn', 340, 170, 26, 10, 5, 5) + slab('jst', 70, 150, 22, 12, 6, 5) + slab('jst', 300, 150, 22, 12, 6, 5) +
          slab('chip can', 130, 244, 46, 26, 14, 5, 'USB-C') + slab('chip under', 40, 40, 12, 8, 2, -2) + passives();
      },
      pts: [[84, 76, 11, 'STM32U585 under shield', 'Cortex-M33, 160 MHz, AES in hardware'], [272, 74, 8, 'NXP SE050', 'secure element, holds the key'],
        [303, 93, 9, 'W25Q128', '16 MB flash, firmware only'], [165, 215, 8, 'Power IC', 'regulators for every rail'],
        [195, 100, 5, 'Cut-out, 19 × 38.5 mm', 'the petal pocket passes through the board'], [260, 166, 8, 'Motor driver', 'runs the bloom gear motor'],
        [33, 18, 10, 'SPH0641 × 4', 'one per corner, to 80 kHz, beamformed'], [308, 48, 9, 'DRV2700', 'boosts to ~100 V for the horns'],
        [153, 257, 19, 'USB-C', 'charge, load keys; data off when locked'], [46, 44, -2, 'Light sensor (underside)', 'tamper alarm']],
      text: 'Eight layers, parts on one side, the processor under a metal shield. The board is U-shaped: a 19 × 38.5 mm cut-out at the top lets the petal pocket pass through.',
      spec: [['Board', '8-layer HDI, 1.0 mm, U-shaped'], ['Brain', 'STM32U585, TrustZone, hardware AES'], ['Key store', 'NXP SE050, certified secure element'], ['Also', 'BQ25180 charger, MAX17048 gauge, DRV2605L haptics']] },
    { name: 'Power and sound', mm: '5.0 mm', cls: 'L-bay', z: 0, ex: -1.9,
      html: function () {
        const cellTop = function (n) { return '<span>LiPo · LP502535 · ' + n + '</span><span><b>3.7 V · 400 mAh</b><br>1.48 Wh</span>'; };
        return slab('cell', 12, 80, 125, 190, 25, 7, cellTop('A')) + slab('cell', 251, 80, 125, 190, 25, 7, cellTop('B')) +
          slab('pcm', 30, 84, 60, 10, 3, 32) + slab('pcm', 268, 84, 60, 10, 3, 32) +
          slab('tab', 54, 246, 40, 24, 0.6, 32) + slab('tab', 293, 246, 40, 24, 0.6, 32) +
          slab('horns p-spk', 40, 6, 94, 70, 15, 8, '<span class="horn h1"></span><span class="horn h2"></span>') +
          slab('horns p-spk', 278, 6, 94, 70, 15, 8, '<span class="horn h1"></span><span class="horn h2"></span>') +
          cylinder('piezo', 51, 42, 28, 28, 3, 2, 23) + cylinder('piezo', 95, 42, 28, 28, 3, 2, 23) +
          cylinder('piezo', 289, 42, 28, 28, 3, 2, 23) + cylinder('piezo', 333, 42, 28, 28, 3, 2, 23) +
          slab('pocket p-pocket', 172, 2, 46, 190, 46, 2, '<span class="bud-ghost"></span>') +
          slab('gmotor', 142, 98, 28, 90, 28, 8, '<span>6 mm</span>') + slab('screw', 222, 6, 14, 184, 14, 16) +
          slab('gearplate', 142, 188, 96, 8, 30, 6) +
          cylinder('mot', 177, 204, 36, 36, 12, 3, 8) +
          slab('boot', 194, 266, 22, 8, 4, 40, '', true);
      },
      pts: [[74, 175, 32, 'Two LiPo cells', 'LP502535 × 2, 400 mAh each, in parallel'], [60, 89, 35, 'Protection circuit', 'one per cell'],
        [195, 120, 48, 'Petal pocket', 'Ø 9.2 mm tube, 38 mm deep, folded bud inside'], [156, 140, 36, 'Gear motor', '6 mm, drives the lead screw'],
        [229, 60, 30, 'Lead screw', 'M2, 2 mm lead, 36 mm of travel'],
        [87, 16, 23, 'Piezo horn array', '4 horn-loaded tweeters along the top edge'], [347, 56, 26, 'Piezo disc', '100 dB at 1 m with all four (design requirement)'], [195, 222, 20, 'Vibration motor', '8 mm LRA'],
        [74, 258, 33, 'Pull tabs', 'remove each cell without tools']],
      text: 'Two cells either side of the petal pocket (800 mAh together), four horn-loaded piezo tweeters, the bloom motor and lead screw, and a motor for silent alerts.',
      spec: [['Cells', '2 × LiPo LP502535, 400 mAh each (datasheet), 800 mAh together'], ['Bloom', 'Ø 9.2 × 38 mm pocket, 6 mm gear motor, M2 lead screw'], ['Transmit', '4 horn-loaded piezo tweeters, 18–24 kHz'], ['Haptics', '8 mm LRA']] },
    { name: 'Ceramic back', mm: '1.0 mm', cls: 'L-back', z: 0, ex: -3.2,
      html: function () {
        const sinks = CORNERS.map(function (c) { return '<span class="sink" style="left:' + (c[0] - 7) + 'px;top:' + (c[1] - 7) + 'px"></span>'; }).join('');
        return slab('ceramic', 0, 0, DW, DH, 5, 0, '<span class="graphite"></span><span class="foam2"></span>' + sinks + '<span class="stamp">CIPHER ECHO · ZrO₂<br>SN 0417 · CONCEPT</span>');
      },
      pts: [[195, 140, 5, 'Graphite sheet', 'spreads heat while charging'], [16, 16, 5, 'Countersunk hole', 'for the M1.4 screws'],
        [330, 230, 5, 'Zirconia ceramic', 'scratch-proof, light-tight']],
      text: 'Zirconia ceramic: hard, cool to the touch, and completely dark inside for the tamper sensor.',
      spec: [['Material', 'Zirconia ceramic (ZrO₂)'], ['Thickness', '1.0 mm'], ['Inside', 'Graphite heat sheet, foam pads'], ['Job', 'Closes the unit; keeps it dark inside']] },
    { name: 'Fasteners and seal', mm: 'M1.4 × 4', cls: 'L-screws', z: 0, ex: -4.3,
      html: function () {
        return CORNERS.map(function (c) {
          return cylinder('shaft', c[0] - 3, c[1] - 3, 6, 6, 20, 6, 0) + cylinder('head', c[0] - 6, c[1] - 6, 12, 12, 3, 3, -3);
        }).join('') + slab('seal', 366, 256, 16, 16, 0.6, -3.8);
      },
      pts: [[16, 16, 18, 'Torx T3 screw', 'M1.4 × 4 mm titanium, ×4'], [374, 264, -3, 'Tamper label', 'void pattern if lifted']],
      text: 'Four titanium screws close the unit. A void label over one shows if anyone opened it.',
      spec: [['Screws', '4 × M1.4 × 4 mm, Torx T3, titanium'], ['Thread-lock', 'Low-strength, removable'], ['Seal', 'Void label over screw 4'], ['Job', 'Closes the unit; shows tampering']] }
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
      text: el.querySelector('.pm-text'),
      cip: el.querySelector('.paper-cip'),
      state: el.querySelector('.pf-state'),
      bar: el.querySelector('.pf-bar i'),
      key: function (k) { return el.querySelector('.osk-k[data-key="' + k + '"]'); },
      tap: el.querySelector('.tap'),
      // sep 0 = closed, 1 = fully apart. active = index of the highlighted layer, or -1
      set: function (sep, active, gap) {
        const G = gap || 56;
        let zmin = 0, zmax = 65;
        const act = Array.isArray(active) ? active : [active];
        layers.forEach(function (l, k) {
          const on = act.indexOf(k) >= 0;
          const z = LAYERS[k].z + sep * LAYERS[k].ex * G + (on ? 18 : 0);
          l.style.transform = 'translateZ(' + z.toFixed(1) + 'px)';
          l.classList.toggle('is-active', on);
          if (k === 0) zmax = z + 5;
          if (k === NL - 1) zmin = z - 4;
        });
        axes.forEach(function (a) {
          a.style.height = (zmax - zmin).toFixed(1) + 'px';
          a.style.transform = 'translateZ(' + zmin.toFixed(1) + 'px) rotateX(90deg)';
          a.style.opacity = (sep * 0.9).toFixed(2);
        });
        el.classList.toggle('is-exploded', act.some(function (a) { return a >= 0; }));
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
    // Two lines (Cipher / Echo); each line settles left to right
    const el = $('dv-title'), lines = ['Cipher', 'Echo'];
    el.setAttribute('aria-label', lines.join(' '));
    if (reduce) return;
    const start = performance.now(), DUR = 900;
    (function step(now) {
      const k = Math.min(1, ((now || start) - start) / DUR);
      el.innerHTML = lines.map(function (line) {
        const done = Math.floor(k * line.length);
        return line.split('').map(function (c, i) {
          if (i < done) return c;
          const r = LETTERS[Math.floor(Math.random() * 26)];
          return c === c.toUpperCase() ? r : r.toLowerCase();
        }).join('');
      }).join('<br>');
      if (k < 1) requestAnimationFrame(step); else el.innerHTML = lines.join('<br>');
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
    hero.set(1 - k, -1, 46);
    const az = -32 + (reduce ? 0 : Math.sin(t * 0.35) * 9);
    const ax = 56 + (reduce ? 0 : Math.sin(t * 0.5) * 3);
    const fl = reduce ? 0 : Math.sin(t * 0.9) * 8;
    heroCam.style.transform = 'translateY(' + fl.toFixed(1) + 'px) rotateX(' + ax.toFixed(2) + 'deg) rotateZ(' + az.toFixed(2) + 'deg) translateZ(-32px)';
    if (hero.wheel) hero.wheel.style.setProperty('--rot', (t * 20).toFixed(1) + 'deg');
    if (!reduce || t < 0.1) requestAnimationFrame(heroFrame);
  }
  requestAnimationFrame(heroFrame);

  // Typing demo: keys press as the message is typed, then it is encrypted with
  // shift(3) and sent as tones
  (function () {
    const MSGS = ['MEET AT NOON', 'PACKAGE AT GATE 4', 'GO DARK AT 0400', 'TRUST NO ONE'];
    const shift3 = function (t) {
      return t.replace(/[A-Z]/g, function (c) { return LETTERS[(LETTERS.indexOf(c) + 3) % 26]; });
    };
    const wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    // A tap inverts the key on the e-paper and leaves a small touch ring
    function press(k) {
      const key = hero.key(k);
      if (!key) return;
      key.classList.add('hit');
      const t = hero.tap;
      t.style.left = (key.offsetLeft + key.offsetWidth / 2) + 'px';
      t.style.top = (key.offsetTop + key.offsetHeight / 2) + 'px';
      t.classList.remove('go'); void t.offsetWidth; t.classList.add('go');
      setTimeout(function () { key.classList.remove('hit'); }, 140);
    }
    if (reduce) return;
    async function loop() {
      let m = 0;
      for (;;) {
        const msg = MSGS[m % MSGS.length]; m++;
        hero.text.textContent = ''; hero.cip.textContent = '—'; hero.state.textContent = 'TYPING'; hero.bar.style.width = '0%';
        for (const ch of msg) {
          press(ch === ' ' ? 'SPACE' : ch);
          hero.text.textContent += ch;
          await wait(ch === ' ' ? 170 : 120 + Math.random() * 90);
        }
        await wait(500);
        press('SEND');
        hero.state.textContent = 'ENCRYPTING';
        const target = shift3(msg);
        for (let f = 1; f <= 14; f++) {
          const done = Math.floor(f / 14 * target.length);
          hero.cip.textContent = target.split('').map(function (c, i) {
            return i < done || c === ' ' ? c : LETTERS[Math.floor(Math.random() * 26)];
          }).join('');
          await wait(45);
        }
        hero.state.textContent = 'SENDING · 21 kHz';
        for (let i = 0; i <= 20; i++) { hero.bar.style.width = (i * 5) + '%'; await wait(70); }
        hero.state.textContent = 'SENT ✓';
        await wait(1600);
      }
    }
    setTimeout(loop, 2000);
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
  const P0 = 0.1;  // the first 12% of the section separates the layers

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

  // The camera follows the active layer: it glides to it and zooms in
  const devEl = $('ex-device');
  const cam = { z: 32, s: 0.64, ax: 58, az: -36 }, tgt = { z: 32, s: 0.64 };
  let lastActive = null, camRun = false;
  function baseScale() { return innerWidth < 560 ? 0.42 : innerWidth < 980 ? 0.5 : 0.62; }
  function applyCam() {
    devEl.style.transform = 'translateY(6px) scale3d(' + cam.s.toFixed(3) + ',' + cam.s.toFixed(3) + ',' + cam.s.toFixed(3) + ')';
    exCam.style.transform = 'rotateX(' + cam.ax.toFixed(2) + 'deg) rotateZ(' + cam.az.toFixed(2) + 'deg) translateZ(' + (-cam.z * cam.s).toFixed(1) + 'px)';
    drawCallouts(lastActive);
  }
  function camTick() {
    const k = reduce ? 1 : 0.12;
    cam.z += (tgt.z - cam.z) * k; cam.s += (tgt.s - cam.s) * k;
    applyCam();
    if (Math.abs(tgt.z - cam.z) > 0.3 || Math.abs(tgt.s - cam.s) > 0.002) requestAnimationFrame(camTick);
    else { cam.z = tgt.z; cam.s = tgt.s; applyCam(); camRun = false; }
  }
  function exFrame() {
    const r = exSec.getBoundingClientRect();
    const total = exSec.offsetHeight - innerHeight;
    const p = clamp(-r.top / total, 0, 1);
    const sep = ease(clamp(p / P0, 0, 1));
    const active = p < P0 ? -1 : Math.min(NL - 1, Math.floor((p - P0) / (1 - P0) * NL));
    const gap = innerWidth < 560 ? 52 : innerWidth < 980 ? 64 : 84;
    ex.set(sep, active, gap);
    cam.ax = 58 - 6 * p; cam.az = -36 + 16 * p;
    if (active >= 0) {
      const L = LAYERS[active];
      tgt.z = L.z + L.ex * gap + 18 + (active === 3 ? 30 : 8);
      tgt.s = baseScale() * 1.65;
    } else {
      tgt.z = 32 + sep * 0.2 * gap; tgt.s = baseScale();
    }
    if (ex.wheel) ex.wheel.style.setProperty('--rot', (p * 720).toFixed(1) + 'deg');
    hint.style.opacity = p > 0.04 ? 0 : 1;
    $('exh-sep').textContent = 'SEPARATION ' + Math.round(sep * 100) + '%  ·  ZOOM ' + (tgt.s / baseScale() * 100).toFixed(0) + '%';
    if (active !== lastActive) {
      lastActive = active;
      const show = Math.max(0, active);
      items.forEach(function (li, i) { li.classList.toggle('is-active', i === active); });
      cards.forEach(function (c, i) { c.classList.toggle('is-active', i === show); });
      $('exh-layer').textContent = active < 0 ? 'ASSEMBLED' : 'LAYER ' + String(active + 1).padStart(2, '0') + ' / ' + String(NL).padStart(2, '0') + ' · ' + LAYERS[active].name.toUpperCase();
    }
    if (!camRun) { camRun = true; requestAnimationFrame(camTick); }
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
    const SX = 16, SY = 28, X0 = 50, Y0 = 40;
    const X = function (mm) { return X0 + mm * SX; }, Y = function (mm) { return Y0 + mm * SY; };
    const rect = function (r) { return '<rect x="' + X(r[0]).toFixed(1) + '" y="' + Y(r[1]).toFixed(1) + '" width="' + (r[2] * SX).toFixed(1) + '" height="' + (r[3] * SY).toFixed(1) + '" rx="' + (r[4] || 0) + '"/>'; };
    // Slice along the short side: 0 mm = top edge (horn ports), 56 mm = bottom edge
    // 0 mm = top edge (petal doors), 56 mm = bottom edge. The slice runs through the petal pocket;
    // the two cells and the horns sit either side of it.
    const PARTS = [
      { k: 'front', cls: 'p-shell', d: 0, r: [[0, 0, 1.6, 1.0, 1], [2.6, 0, 1.8, 1.0], [50.4, 0, 5.6, 1.0, 1]] },
      { k: 'glass', cls: 'p-glass', d: 1, r: [[4.4, 0.3, 46, 0.7]] },
      { k: 'glass', cls: 'p-touch', d: 1, r: [[4.4, 1.0, 46, 0.2]] },
      { k: 'disp', cls: 'p-paper', d: 2, r: [[3.2, 1.2, 49.6, 1.2]] },
      { k: 'mid', cls: 'p-frame', d: 4, r: [[38.6, 2.6, 16.2, 0.8]] },
      { k: 'board', cls: 'p-chip', d: 5, r: [[41.2, 3.8, 3.6, 0.6], [45.2, 3.6, 4.4, 0.8], [49.4, 3.5, 4.4, 0.9]] },
      { k: 'board', cls: 'p-pcb', d: 5, r: [[38.6, 4.4, 16.2, 1.0]] },
      { k: 'pocket', cls: 'p-pocket', d: 6, r: [[1.2, 2.6, 37, 9.2, 4]] },
      { k: 'bud', cls: 'p-bud', d: 6, r: [[9.6, 3.0, 25.1, 8.4, 3]] },
      { k: 'bud', cls: 'p-pod', d: 6, r: [[2.2, 3.05, 7, 8.3, 3], [34.8, 3.2, 3, 8.0, 1]] },
      { k: 'drive', cls: 'p-gear', d: 6, r: [[38.4, 5.6, 1.6, 6.0]] },
      { k: 'drive', cls: 'p-mot', d: 6, r: [[40.8, 8.8, 7.2, 2.4, 1]] },
      { k: 'doors', cls: 'p-door', d: 7, r: [[0, 2.6, 1.2, 9.2]] },
      { k: 'foam', cls: 'p-foam', d: 7, r: [[38.6, 11.2, 16.2, 0.8]] },
      { k: 'back', cls: 'p-shell', d: 8, r: [[0, 1.0, 1.2, 1.6], [0, 11.8, 1.2, 0.2], [54.8, 1.0, 1.2, 11.0]] },
      { k: 'back', cls: 'p-ceramic', d: 8, r: [[0, 12.0, 56, 1.0, 2]] }
    ];
    const TAGS = [
      { k: 'front', at: [55.4, 0.5], ly: 30, t: 'Titanium bezel', s: '1.0 mm · windows for screen and keys' },
      { k: 'glass', at: [50.2, 0.6], ly: 72, t: 'Sapphire glass and touch film', s: '0.7 mm + 0.2 mm, full face' },
      { k: 'disp', at: [52.6, 1.8], ly: 114, t: 'Full-face touch e-paper', s: '3.3″ panel · 1.2 mm' },
      { k: 'mid', at: [54.4, 3.0], ly: 156, t: 'Mid-frame shelf', s: 'titanium · 0.8 mm · stops at the pocket' },
      { k: 'board', at: [54, 4.9], ly: 198, t: 'Main board (U-shaped)', s: '1.0 mm · cut out where the pocket passes' },
      { k: 'pocket', at: [37.6, 2.8], ly: 240, t: 'Petal pocket', s: 'Ø 9.2 mm tube in 9.6 mm of room' },
      { k: 'bud', at: [22, 7.2], ly: 282, t: 'Folded bud', s: 'Ø 8.6 × 35 mm: pod, petals, hub' },
      { k: 'drive', at: [44.4, 10.0], ly: 324, t: 'Gear plate and vibration motor', s: 'drive for the lead screw · 8 mm LRA' },
      { k: 'doors', at: [0.6, 7.2], ly: 366, t: 'Petal doors', s: 'slide apart for the bloom' },
      { k: 'foam', at: [54.6, 11.6], ly: 408, t: 'Foam and graphite sheet', s: '0.8 mm · cut out over the pocket' },
      { k: 'back', at: [55.6, 12.5], ly: 446, t: 'Zirconia ceramic back', s: '1.0 mm' }
    ];
    const W = 1300, H = Math.max(Y(13) + 90, 486), LX = X(56) + 64;
    let html = '<defs>' +
      '<pattern id="hatch-shell" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" class="hs-bg"/><line x1="0" y1="0" x2="0" y2="7" class="hs-ln"/></pattern>' +
      '<pattern id="hatch-cell" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width="10" height="10" class="hc-bg"/><line x1="0" y1="0" x2="0" y2="10" class="hc-ln"/></pattern>' +
      '<pattern id="hatch-foam" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" class="hf-bg"/><circle cx="3" cy="3" r="1" class="hf-dot"/></pattern>' +
      '<pattern id="hatch-bud" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="#8C949C"/><line x1="0" y1="0" x2="5" y2="0" stroke="#D5DBE0" stroke-width="1.4"/></pattern>' +
      '</defs>';
    PARTS.forEach(function (p) {
      html += '<g class="part ' + p.cls + '" data-k="' + p.k + '" style="--d:' + (p.d * 140 + 200) + 'ms">' + p.r.map(rect).join('') + '</g>';
    });
    // Dimensions
    const dy = Y(13) + 34;
    html += '<g class="dims" style="--d:1500ms">' +
      '<path class="dim" d="M' + (X0 - 24) + ' ' + Y(0) + ' V' + Y(13) + ' M' + (X0 - 30) + ' ' + Y0 + ' H' + (X0 - 18) + ' M' + (X0 - 30) + ' ' + Y(13) + ' H' + (X0 - 18) + '"/>' +
      '<text class="dim-t" transform="translate(' + (X0 - 32) + ' ' + Y(6.5) + ') rotate(-90)" text-anchor="middle">13.0 mm</text>' +
      '<path class="dim" d="M' + X0 + ' ' + dy + ' H' + X(56) + ' M' + X0 + ' ' + (dy - 6) + ' V' + (dy + 6) + ' M' + X(56) + ' ' + (dy - 6) + ' V' + (dy + 6) + '"/>' +
      '<text class="dim-t" x="' + X(28) + '" y="' + (dy + 22) + '" text-anchor="middle">56 mm · top edge to bottom edge</text></g>';
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
    const CAP = 800, LISTEN = 6.544, SLEEP = 0.03295;   // mAh and mA, from the datasheets listed on the page
    const input = $('duty');
    function calc() {
      const on = +input.value, off = 24 - on;
      const hs = function (v) { return (Math.round(v * 10) / 10).toString(); };
      const avg = (on * LISTEN + off * SLEEP) / 24;
      const hours = CAP / avg;
      $('duty-out').textContent = hs(on) + ' h / 24 h';
      input.setAttribute('aria-valuetext', hs(on) + ' hours a day');
      $('duty-formula').textContent = 'average = (' + hs(on) + ' h × ' + LISTEN + ' mA + ' + hs(off) + ' h × ' + SLEEP + ' mA) ÷ 24 h = ' + avg.toFixed(4) + ' mA · ' +
        CAP + ' mAh ÷ ' + avg.toFixed(4) + ' mA = ' + hours.toFixed(1) + ' h';
      $('life-out').textContent = hours < 72 ? hours.toFixed(1) + ' hours' : (hours / 24).toFixed(1) + ' days';
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
  // Shared with device-steps.js
  window.CIPHER_ECHO = { build: build, slab: slab, PAPER: PAPER, LAYERS: LAYERS, LETTERS: LETTERS, ease: ease, clamp: clamp, reduce: reduce, glideTo: glideTo };
})();
