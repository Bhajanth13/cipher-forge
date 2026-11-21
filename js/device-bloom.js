/* =========================================================
   Cipher Echo — device-bloom.js
   Far mode in 3D: a petal reflector that blooms out of the
   top edge. Units: 5 px = 1 mm, like the rest of the device.

   Geometry (design values, shown on the page):
   - dish diameter D = 100 mm, focal length F = 40 mm (f/D = 0.4)
   - paraboloid h(r) = r² / 4F, rim depth D² / 16F = 15.6 mm
   - eight petals from the hub (r = 4.2 mm) to the rim (r = 50 mm),
     each drawn as four flat segments that follow the curve, with
     one crease at mid-length so the petal folds in half
   - a feed pod (one tweeter, one mic) on a mast at the focus
   ========================================================= */
(function () {
  'use strict';
  const cam = document.getElementById('bloom-cam');
  if (!cam) return;
  const RANGE = window.CIPHER_ECHO_RANGE;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = function (id) { return document.getElementById(id); };

  const MM = 5;                       // px per mm
  const D = 100, F = 40, R0 = 4.2;    // mm (hub Ø 8.4 so the bud fits a Ø 8.8 mm bore)
  const RIM = D / 2;
  const h = function (r) { return r * r / (4 * F); };
  const NP = 8;

  /* ---------- Body: 78 × 56 × 13 mm, top edge at y = 0 ---------- */
  const W = 78 * MM, H = 56 * MM, T = 13 * MM;
  function body() {
    const ports = [52, 96, 290, 334].map(function (x) { return '<i class="bl-port" style="left:' + x + 'px"></i>'; }).join('') +
      '<i class="bl-mic" style="left:30px"></i><i class="bl-mic" style="left:354px"></i>' +
      '<i class="bl-slot"></i><i class="bl-door l"></i><i class="bl-door r"></i>';
    const screen = '<div class="bl-paper"><b>CIPHER ECHO</b><span class="bl-step">NORMAL</span><span class="bl-mode"></span><span class="bl-aim"></span><span class="bl-bar"><i></i></span></div>';
    return '<div class="slab bl-body" style="--x:' + (-W / 2) + 'px;--y:0px;--w:' + W + 'px;--h:' + H + 'px;--t:' + T + 'px;--z:' + (-T / 2) + 'px">' +
      '<div class="f bot"></div><div class="f e-n">' + ports + '</div><div class="f e-s"></div><div class="f e-w"></div><div class="f e-e"></div>' +
      '<div class="f top">' + screen + '</div></div>';
  }

  /* ---------- A short cylinder on the axis (discs stacked upward) ---------- */
  function column(cls, d, len, n, y0) {
    let s = '<div class="bl-col ' + cls + '" style="transform:translateY(' + y0 + 'px)">';
    for (let i = 0; i < n; i++) {
      s += '<i class="' + (i === n - 1 ? 'cap' : i === 0 ? 'base' : '') + '" style="width:' + d + 'px;height:' + d + 'px;left:' + (-d / 2) + 'px;top:' + (-d / 2) + 'px;transform:translateY(' + (-len * i / (n - 1)).toFixed(1) + 'px) rotateX(90deg)"></i>';
    }
    return s + '</div>';
  }
  // A thin rod: two crossed planes
  function rod(cls, w, len) {
    return '<div class="bl-rod ' + cls + '"><i style="width:' + w + 'px;height:' + len + 'px;left:' + (-w / 2) + 'px;top:' + (-len) + 'px"></i>' +
      '<i style="width:' + w + 'px;height:' + len + 'px;left:' + (-w / 2) + 'px;top:' + (-len) + 'px;transform:rotateY(90deg)"></i></div>';
  }

  /* ---------- Petals ---------- */
  const EDGES = [R0, 16, 27.4, 38.7, RIM];           // radii where the segments meet, mm (crease at 27.4)
  const OPEN = [], FOLD = [89, 0, 183, 0];            // segment angles, degrees (each relative to the last)
  const LEN = [], WIDTH = [];
  let prev = 0;
  for (let i = 0; i < 4; i++) {
    const dr = EDGES[i + 1] - EDGES[i], dh = h(EDGES[i + 1]) - h(EDGES[i]);
    const ang = Math.atan2(dh, dr) * 180 / Math.PI;
    OPEN.push(ang - prev); prev = ang;
    LEN.push(Math.hypot(dr, dh) * MM);
  }
  for (let i = 0; i <= 4; i++) WIDTH.push(2 * Math.PI * EDGES[i] / NP * 1.1 * MM);
  const FOLDW = 2 * Math.PI * (R0 + 1) / NP * MM;

  // Titanium leaf, drawn as a background image (clip-path would take the leaf out of
  // Chrome's 3D depth sorting). Brushed grain along the petal, a pressed spine, a rolled
  // rim on the last segment, a seam lip on one side, rivets at the root.
  function leafSVG(i, top, bot) {
    const pts = '0,' + top + ' 100,0 100,100 0,' + bot;
    let g = '';
    for (let y = 2; y < 100; y += 2.2) {
      const o = (0.035 + 0.05 * Math.abs(Math.sin(y * 12.9898 + i * 4.1))).toFixed(3);
      g += "<line x1='0' x2='100' y1='" + y.toFixed(1) + "' y2='" + y.toFixed(1) + "' stroke='" + (y % 4.4 < 2.2 ? '#fff' : '#000') + "' stroke-opacity='" + o + "' stroke-width='.5' vector-effect='non-scaling-stroke'/>";
    }
    let svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'>" +
      "<defs><linearGradient id='g' x1='0' x2='1'><stop offset='0' stop-color='#7C838A'/><stop offset='.38' stop-color='#C4C9CE'/><stop offset='.7' stop-color='#8E959C'/><stop offset='1' stop-color='#D3D7DB'/></linearGradient>" +
      "<linearGradient id='c' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#000' stop-opacity='.22'/><stop offset='.45' stop-color='#fff' stop-opacity='.10'/><stop offset='.5' stop-color='#fff' stop-opacity='.28'/><stop offset='.55' stop-color='#000' stop-opacity='.10'/><stop offset='1' stop-color='#000' stop-opacity='.25'/></linearGradient>" +
      "<clipPath id='k'><polygon points='" + pts + "'/></clipPath></defs>" +
      "<g clip-path='url(#k)'><rect width='100' height='100' fill='url(#g)'/><rect width='100' height='100' fill='url(#c)'/>" + g +
      "<rect x='0' y='48.6' width='100' height='1.4' fill='#fff' fill-opacity='.35'/><rect x='0' y='50' width='100' height='1.4' fill='#000' fill-opacity='.25'/>" +
      "<polygon points='0," + bot + " 100,100 100,96 0," + (bot - 3) + "' fill='#000' fill-opacity='.28'/>";
    if (i === 3) svg += "<rect x='95' y='0' width='5' height='100' fill='#E9ECEF'/><rect x='93.5' y='0' width='1.5' height='100' fill='#000' fill-opacity='.3'/>";
    if (i === 2) svg += "<rect x='0' y='0' width='1.6' height='100' fill='#000' fill-opacity='.35'/>";
    if (i === 0) svg += "<circle cx='14' cy='38' r='3.2' fill='#5E656C'/><circle cx='14' cy='38' r='1.6' fill='#D9DDE1'/><circle cx='14' cy='62' r='3.2' fill='#5E656C'/><circle cx='14' cy='62' r='1.6' fill='#D9DDE1'/>";
    svg += "</g><polyline points='0," + top + " 100,0' stroke='#F4F6F8' stroke-opacity='.8' stroke-width='1.2' fill='none' vector-effect='non-scaling-stroke'/></svg>";
    return 'url(&quot;data:image/svg+xml,' + encodeURIComponent(svg) + '&quot;)';
  }
  function petal(k) {
    const az = k * 360 / NP + 22.5;
    let inner = '';
    for (let i = 3; i >= 0; i--) {
      const wIn = WIDTH[i], wOut = WIDTH[i + 1], a = (wIn / wOut);
      const top = ((1 - a) / 2 * 100).toFixed(2), bot = ((1 + a) / 2 * 100).toFixed(2);
      inner = '<div class="bl-seg s' + i + '" style="--x:' + (i === 0 ? R0 * MM : LEN[i - 1]).toFixed(1) + 'px;--a1:' + OPEN[i].toFixed(2) + ';--a0:' + FOLD[i] + '">' +
        (i === 0 ? '<i class="bl-knuckle" style="transform:translateX(-7px) rotateX(90deg)"></i>' : '') +
        '<div class="bl-leaf" style="width:' + (LEN[i] + 1).toFixed(1) + 'px;height:' + wOut.toFixed(1) + 'px;top:' + (-wOut / 2).toFixed(1) + 'px;' +
        '--sf:' + (FOLDW / wOut).toFixed(3) + ';background-image:' + leafSVG(i, top, bot) + '"></div>' + inner + '</div>';
    }
    return '<div class="bl-petal" data-az="' + az + '" style="--pd:' + (k * 0.06).toFixed(2) + 's;transform:rotateY(' + az + 'deg) translateY(' + (-h(R0) * MM).toFixed(1) + 'px)">' + inner + '</div>';
  }

  /* ---------- Sound in the plane through the axis ---------- */
  const lam = RANGE.sound(20) / RANGE.MODES.far.f;    // m
  const WL = lam * 1000 * MM;                          // one wavelength, px
  const SX = 300, SY = 820;
  function rays() {
    const top = -SY + 30, rimY = -h(RIM) * MM;
    let p = '<defs><clipPath id="blBeam"><rect x="' + (-RIM * MM) + '" y="' + top + '" width="' + (D * MM) + '" height="' + (-rimY - top) + '"/></clipPath></defs>' +
      '<rect class="bl-beam" x="' + (-RIM * MM) + '" y="' + top + '" width="' + (D * MM) + '" height="' + (-rimY - top) + '"/>' +
      '<path class="bl-prof" d="M' + (-RIM * MM) + ' ' + rimY + ' Q0 ' + (-rimY) + ' ' + (RIM * MM) + ' ' + rimY + '"/>';
    // plane wavefronts above the dish, one wavelength apart
    let w = '';
    for (let y = rimY - WL; y > top - WL; y -= WL) w += '<line x1="' + (-RIM * MM) + '" x2="' + (RIM * MM) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '"/>';
    p += '<g class="bl-wave" clip-path="url(#blBeam)"><g class="bl-waves" style="--wl:' + (-WL).toFixed(1) + 'px">' + w + '</g></g>';
    [-46, -37, -28, -19, -11, 11, 19, 28, 37, 46].forEach(function (r) {
      const x = r * MM, y = -h(Math.abs(r)) * MM;
      p += '<path class="bl-ray" d="M0 ' + (-F * MM) + ' L' + x + ' ' + y.toFixed(1) + ' L' + x + ' ' + top + '"/>';
    });
    p += '<circle class="bl-focus" cx="0" cy="' + (-F * MM) + '" r="6"/>' +
      '<text class="bl-ft" x="14" y="' + (-F * MM + 4) + '">focus</text>' +
      '<text class="bl-wt" x="' + (-RIM * MM) + '" y="' + (top - 10) + '">wavefronts, 1 λ = ' + (lam * 100).toFixed(2) + ' cm apart</text>';
    return '<svg class="bl-rays" viewBox="' + (-SX) + ' ' + (-SY) + ' ' + (2 * SX) + ' ' + SY + '" style="left:' + (-SX) + 'px;top:' + (-SY) + 'px;width:' + (2 * SX) + 'px;height:' + SY + 'px">' + p + '</svg>';
  }

  /* ---------- Assemble ---------- */
  let petals = '';
  for (let k = 0; k < NP; k++) petals += petal(k);
  cam.innerHTML = '<div class="bl-rig" id="bl-rig">' + body() +
    '<div class="bl-bud">' +
      column('bl-hub', R0 * 2 * MM, 3 * MM, 5, 0) +
      rod('bl-mast1', 3 * MM, 22 * MM) +
      column('bl-collar', 4.4 * MM, 1.2 * MM, 2, -22 * MM) +
      '<div class="bl-mast2">' + rod('', 2.2 * MM, 20 * MM) + '</div>' +
      '<div class="bl-pod">' + column('bl-podc', 8.5 * MM, 7 * MM, 6, 0) + '<i class="bl-tw"></i></div>' +
      petals +
    '</div>' + rays() + '</div>';

  /* ---------- Figures, all from the same model as the calculator ---------- */
  const gain = RANGE.dish(D / 1000, RANGE.MODES.far.f, 20), bw = RANGE.BW(20);
  const row = function (k, v) { return '<tr><td>' + k + '</td><td>' + v + '</td></tr>'; };
  $('bloom-table').innerHTML =
    row('Dish diameter D', D / 10 + ' cm') +
    row('Focal length F', F + ' mm (f/D = ' + (F / D).toFixed(2) + ')') +
    row('Depth at the rim, D² ÷ 16F', (D * D / (16 * F)).toFixed(1) + ' mm') +
    row('Wavelength λ at 20 °C', (lam * 100).toFixed(2) + ' cm') +
    row('Gain each end, η = ' + RANGE.ETA + ' assumed', '+' + gain.toFixed(1) + ' dB') +
    row('Beam width, ≈ 1.2·λ/D', bw.toFixed(1) + '° (aim within ±' + (bw / 2).toFixed(1) + '°)') +
    row('Range, long-range → far', '~' + RANGE.fmt(RANGE.R.lr) + ' m → ~' + RANGE.fmt(RANGE.R.far) + ' m');
  const farLine = 'FAR · 21.2 kHz · ~' + RANGE.fmt(RANGE.R.far) + ' m';
  cam.querySelector('.bl-aim').textContent = 'AIM ±' + (bw / 2).toFixed(1) + '°';
  document.querySelectorAll('[data-r]').forEach(function (e) { e.textContent = RANGE.fmt(RANGE.R[e.getAttribute('data-r')]); });

  /* ---------- Where it fits: the space budget, from the same geometry ---------- */
  (function () {
    const plan = $('fit-plan');
    if (!plan) return;
    // folded petals: the outer half (r > crease) lies back over the inner half, so at any height
    // the sheet to wrap is 8 × (w(r) + w(2·crease − r)), the same at every height
    const crease = EDGES[2], wmm = function (r) { return 2 * Math.PI * r / NP * 1.1; };
    const sheet = NP * (wmm(10) + wmm(2 * crease - 10));
    const PITCH = 0.12, MAST = 3, BUD = 8.6, BORE = 8.8, TUBE = 9.2, ROOM = 9.6;
    const wrapA = sheet * PITCH, mastA = Math.PI * MAST * MAST / 4;
    const budMin = 2 * Math.sqrt((wrapA + mastA) / Math.PI);
    const inner = (LEN[0] + LEN[1]) / MM, outer = (LEN[2] + LEN[3]) / MM;
    const POD = 7, HUB = 3, budLen = POD + Math.max(inner, outer) + HUB;
    const boardCut = 19.2 * 38.6, boardArea = 74.8 * 52.8;
    const cellOld = 5 * 34 * 50 / 1000, cellNew = 2 * 5 * 25 * 38 / 1000;
    const strain = 0.1 / (2 * 2) * 100;
    const row = function (k, v) { return '<tr><td>' + k + '</td><td>' + v + '</td></tr>'; };
    const f1 = function (x) { return x.toFixed(1); };
    $('fit-table').innerHTML =
      row('Petals', NP + ' × 0.1 mm nitinol, one crease at r = ' + f1(crease) + ' mm') +
      row('Petal sheet to wrap at any height', 'Σ w(r) + w(' + f1(2 * crease) + ' − r) = ' + f1(sheet) + ' mm') +
      row('Wrapped at ' + PITCH + ' mm a layer, plus a Ø ' + MAST + ' mm mast', f1(wrapA) + ' + ' + f1(mastA) + ' mm² → bud at least Ø ' + f1(budMin) + ' mm; designed Ø ' + BUD) +
      row('Bud length: pod + folded petals + hub', POD + ' + ' + f1(Math.max(inner, outer)) + ' + ' + HUB + ' = ' + f1(budLen) + ' mm') +
      row('Pocket', 'tube Ø ' + BORE + ' inside, Ø ' + TUBE + ' outside, 38 mm deep') +
      row('Room inside the case at the pocket', ROOM + ' mm (e-paper to back) → ' + f1((ROOM - TUBE) / 2) + ' mm each side') +
      row('Bloom module footprint', '19.2 × 38.6 mm: tube, M2 lead screw, 6 mm gear motor') +
      row('Board area given up', f1(boardCut) + ' of ' + f1(boardArea) + ' mm² (' + f1(boardCut / boardArea * 100) + ' %)') +
      row('Battery volume', '1 × 34 × 50 mm = ' + f1(cellOld) + ' cm³ → 2 × 25 × 38 mm = ' + f1(cellNew) + ' cm³') +
      row('Bending strain at the crease, 2 mm radius', '0.1 ÷ (2 × 2) = ' + f1(strain) + ' % (nitinol recovers 5–6 %)');

    // floor plan, mm → px at 10 px/mm, origin at the top-left outer corner
    const S = 10, M = 30;
    const r = function (cls, x, y, w, hh, rx, n) {
      return '<rect class="' + cls + '" x="' + (M + x * S) + '" y="' + (M + y * S) + '" width="' + (w * S) + '" height="' + (hh * S) + '" rx="' + (rx || 0) * S + '"/>' +
        (n ? '<g class="fp-n"><circle cx="' + (M + (x + w / 2) * S) + '" cy="' + (M + (y + hh / 2) * S) + '" r="11"/><text x="' + (M + (x + w / 2) * S) + '" y="' + (M + (y + hh / 2) * S + 4) + '">' + n + '</text></g>' : '');
    };
    const c = function (cls, x, y, rr, n) {
      return '<circle class="' + cls + '" cx="' + (M + x * S) + '" cy="' + (M + y * S) + '" r="' + rr * S + '"/>' +
        (n ? '<g class="fp-n"><circle cx="' + (M + x * S) + '" cy="' + (M + y * S) + '" r="11"/><text x="' + (M + x * S) + '" y="' + (M + y * S + 4) + '">' + n + '</text></g>' : '');
    };
    let g = r('fp-case', 0, 0, 78, 56, 3) + r('fp-in', 1.2, 1.2, 75.6, 53.6, 2);
    g += r('fp-dash', 29.4, 1.2, 19.2, 37.4) + r('fp-dash mcu', 7.2, 8, 19.2, 14.4);
    g += r('fp-horn', 8, 1.2, 18.8, 14, 0.6, 3) + r('fp-horn', 55.6, 1.2, 18.8, 14, 0.6, 3);
    [10.2, 19, 57.8, 66.6].forEach(function (x) { g += r('fp-port', x, 0, 6, 1.2); });
    g += r('fp-cell', 2.4, 16, 25, 38, 0.8, 4) + r('fp-cell', 50.2, 16, 25, 38, 0.8, 4);
    g += r('fp-tube', 34.4, 0.4, TUBE, 37.2, 1.2) + r('fp-bud', 34.7, 1.4, BUD, budLen, 1.2, 1);
    g += r('fp-door', 34.4, 0, TUBE / 2, 1.2) + r('fp-door', 34.4 + TUBE / 2, 0, TUBE / 2, 1.2);
    g += r('fp-screw', 44.4, 1.2, 2.8, 36.4, 0.4, 2) + r('fp-motor', 28.4, 19.6, 5.6, 18, 1, 5) + r('fp-gear', 28.4, 37.6, 19.2, 1.6);
    g += c('fp-lra', 39, 44, 3.6, 6) + r('fp-usb', 26, 48.8, 9.2, 5.2, 0.6, 7);
    [[6.6, 3.6], [71.4, 3.6], [6.6, 51.6], [71.4, 51.6]].forEach(function (m) { g += c('fp-mic', m[0], m[1], 0.9); });
    // dimensions
    const dim = function (x1, y1, x2, y2, t, tx, ty, rot) {
      return '<path class="fp-dim" d="M' + (M + x1 * S) + ' ' + (M + y1 * S) + ' L' + (M + x2 * S) + ' ' + (M + y2 * S) + '"/>' +
        '<text class="fp-dt" x="' + (M + tx * S) + '" y="' + (M + ty * S) + '"' + (rot ? ' transform="rotate(-90 ' + (M + tx * S) + ' ' + (M + ty * S) + ')"' : '') + ' text-anchor="middle">' + t + '</text>';
    };
    g += dim(29.4, -1.4, 48.6, -1.4, 'pocket module 19.2 mm', 39, -2.1);
    g += dim(0, 57.6, 78, 57.6, '78 mm', 39, 59.6) + dim(79.4, 0, 79.4, 56, '56 mm', 80.9, 28, true);
    plan.setAttribute('viewBox', '0 0 ' + (2 * M + 84 * S) + ' ' + (2 * M + 62 * S));
    plan.innerHTML = g;
    const KEY = [
      ['Folded bud', 'Ø ' + BUD + ' × ' + f1(budLen) + ' mm in a Ø ' + TUBE + ' mm tube; doors at the top edge'],
      ['Lead screw', 'M2, 2 mm lead, 36 mm of travel'],
      ['Horn blocks', '4 piezo tweeters along the top edge'],
      ['Two cells', '25 × 38 × 5 mm each, 1000 mAh together (estimate)'],
      ['Gear motor', '6 mm, turns the screw through the gear plate'],
      ['Vibration motor', '8 mm LRA, moved below the pocket'],
      ['USB-C', 'unchanged']
    ];
    $('fit-key').innerHTML = KEY.map(function (k) { return '<li><b>' + k[0] + '</b><span>' + k[1] + '</span></li>'; }).join('');

    // thickness at the pocket, front to back, drawn at 40 px per mm
    const K = 40, X0 = 10;
    const seg = function (cls, a, b, t) {
      return '<rect class="' + cls + '" x="' + (X0 + a * K) + '" y="26" width="' + ((b - a) * K) + '" height="40"/>' +
        (t ? '<text class="fs-t" x="' + (X0 + (a + b) / 2 * K) + '" y="86" text-anchor="middle">' + t + '</text>' : '');
    };
    let st = seg('fs-glass', 0, 1.2, '') + seg('fs-paper', 1.2, 2.4, '') + seg('fs-room', 2.4, 12, '') + seg('fs-back', 12, 13, '');
    st += '<rect class="fs-tube" x="' + (X0 + 2.6 * K) + '" y="32" width="' + (TUBE * K) + '" height="28" rx="14"/>' +
      '<text class="fs-t" x="' + (X0 + 0.6 * K) + '" y="16" text-anchor="middle">glass</text>' +
      '<text class="fs-t" x="' + (X0 + 1.8 * K) + '" y="16" text-anchor="middle">e-paper</text>' +
      '<text class="fs-t" x="' + (X0 + 7.2 * K) + '" y="51" text-anchor="middle">tube Ø ' + TUBE + ' in ' + ROOM + ' mm of room</text>' +
      '<text class="fs-t" x="' + (X0 + 12.5 * K) + '" y="16" text-anchor="middle">back</text>' +
      '<path class="fp-dim" d="M' + X0 + ' 92 H' + (X0 + 13 * K) + '"/><text class="fp-dt" x="' + (X0 + 6.5 * K) + '" y="110" text-anchor="middle">13.0 mm, front to back</text>';
    $('fit-stack').setAttribute('viewBox', '0 0 ' + (2 * X0 + 13 * K) + ' 116');
    $('fit-stack').innerHTML = st;
  })();

  /* ---------- One press: bloom / fold, with the screen narrating ---------- */
  const rig = $('bl-rig'), btn = $('bloom-btn'), stepEl = cam.querySelector('.bl-step'), modeEl = cam.querySelector('.bl-mode');
  const OPEN_STEPS = [[0, 'RELEASING'], [350, 'BUD OUT'], [1000, 'MAST TO FOCUS'], [1450, 'BLOOMING'], [3300, 'FAR · LOCKED']];
  const FOLD_STEPS = [[0, 'FOLDING'], [1350, 'MAST DOWN'], [1950, 'STOWING'], [2900, 'NORMAL']];
  let open = false, timers = [];
  function narrate(steps) {
    timers.forEach(clearTimeout); timers = [];
    steps.forEach(function (s) { timers.push(setTimeout(function () { stepEl.textContent = s[1]; }, reduce ? 0 : s[0])); });
  }
  function set(o, quiet) {
    open = o;
    rig.classList.toggle('open', o);
    cam.closest('.bloom-stage').classList.toggle('open', o);
    btn.setAttribute('aria-pressed', String(o));
    $('bloom-btn-t').textContent = o ? 'Fold away, back to normal' : 'Switch to far mode';
    $('bloom-tag').textContent = o ? 'FAR · PETALS OPEN · FEED POD AT THE FOCUS' : 'NORMAL · PETALS FOLDED AWAY';
    modeEl.textContent = o ? farLine : 'LONG-RANGE · ~' + RANGE.fmt(RANGE.R.lr) + ' m';
    if (!quiet) narrate(o ? OPEN_STEPS : FOLD_STEPS);
  }
  btn.addEventListener('click', function () { set(!open); });
  set(false, true);

  const NOTE = {
    tx: 'Sending: the tweeter at the focus fires into the dish, and the curve turns the spreading sound into a narrow parallel beam. The lines across the beam are wavefronts, one wavelength apart.',
    rx: 'Listening: sound arriving straight on hits the whole dish and is reflected to one point, the focus, where the pod’s mic sits.'
  };
  document.querySelectorAll('.bloom-rays button').forEach(function (b) {
    b.addEventListener('click', function () {
      const m = b.getAttribute('data-ray');
      rig.classList.toggle('rx', m === 'rx');
      document.querySelectorAll('.bloom-rays button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      $('bloom-note').textContent = NOTE[m];
    });
  });

  /* ---------- Light: each petal is shaded by its angle to a fixed lamp as the unit turns ---------- */
  const petalEls = Array.prototype.slice.call(rig.querySelectorAll('.bl-petal'));
  const TH = 25 * Math.PI / 180, LX = -0.5, LY = -0.7, LZ = 0.5;     // lamp up, left, in front
  function shade(ry) {
    petalEls.forEach(function (p) {
      const A = (+p.getAttribute('data-az') + ry) * Math.PI / 180;
      // inner-surface normal of a petal tilted TH up from the horizontal, at angle A around the axis
      const nx = -Math.sin(TH) * Math.cos(A), ny = -Math.cos(TH), nz = Math.sin(TH) * Math.sin(A);
      const d = Math.max(0, (nx * LX + ny * LY + nz * LZ) / 0.99);
      p.style.setProperty('--lt', (0.5 + 0.62 * d).toFixed(3));
    });
  }
  shade(-32);
  if (!reduce) {
    let t0 = 0, run = false, raf = 0;
    const tick = function (now) {
      if (!t0) t0 = now;
      const ry = -32 + 14 * Math.sin((now - t0) / 4200);
      rig.style.setProperty('--ry', ry.toFixed(2) + 'deg');
      shade(ry);
      if (run) raf = requestAnimationFrame(tick);
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        run = es[0].isIntersecting;
        cancelAnimationFrame(raf);
        if (run) raf = requestAnimationFrame(tick);
      }).observe(cam);
    }
  }
})();
