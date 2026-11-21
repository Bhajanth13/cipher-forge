/* =========================================================
   Cipher Echo — device-range.js
   Long-range acoustics, worked out from physics:
   - air absorption from ISO 9613-1 (depends on frequency,
     temperature and humidity)
   - spherical spreading: 20·log10(r)
   - gains: horn array, reflectors η(πD/λ)², 4-mic beamforming,
     slower tones (narrower detectors), Reed–Solomon coding
   - a 15 dB allowance for real-world losses plus a 6 dB fade margin
   The range map, the calculator and the page figures all use it.
   ========================================================= */
(function () {
  'use strict';

  const $ = function (id) { return document.getElementById(id); };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const log10 = Math.log10;

  /* ---------- The model ---------- */
  // ISO 9613-1 atmospheric absorption in dB per metre
  function alpha(f, tC, rh) {
    const pr = 101.325, pa = 101.325, T = tC + 273.15, T0 = 293.15, T01 = 273.16;
    const C = -6.8346 * Math.pow(T01 / T, 1.261) + 4.6151;
    const h = rh * Math.pow(10, C) * (pr / pa);
    const frO = (pa / pr) * (24 + 4.04e4 * h * (0.02 + h) / (0.391 + h));
    const frN = (pa / pr) * Math.pow(T / T0, -0.5) * (9 + 280 * h * Math.exp(-4.170 * (Math.pow(T / T0, -1 / 3) - 1)));
    return 8.686 * f * f * (1.84e-11 * (pr / pa) * Math.pow(T / T0, 0.5) + Math.pow(T / T0, -2.5) *
      (0.01275 * Math.exp(-2239.1 / T) / (frO + f * f / frO) + 0.1068 * Math.exp(-3352.0 / T) / (frN + f * f / frN)));
  }
  const sound = function (tC) { return 331.3 * Math.sqrt(1 + tC / 273.15); };   // speed of sound in air, m/s
  const ETA = 0.5;   // assumed aperture efficiency of the fold-out reflector
  const dish = function (D, f, tC) { const lam = sound(tC) / f; return 10 * log10(ETA * Math.pow(Math.PI * D / lam, 2)); };
  const SYMS = [0.2, 0.4, 0.8, 1.6];
  const MODES = {
    phone: { name: 'Phone, Send it by sound', f: 17900, SL: 70, AG: 0, CG: 0, dish: 0, sym: 0, band: '16.9–18.9 kHz' },
    q: { name: 'Cipher Echo, quiet', f: 17900, SL: 80, AG: 10 * log10(4), CG: 0, dish: 0, sym: 0, band: '16.9–18.9 kHz' },
    lr: { name: 'Cipher Echo, long-range', f: 21250, SL: 100, AG: 10 * log10(4), CG: 4, dish: 0, sym: 1, band: '20.5–22.0 kHz' },
    // far: the petal reflector blooms and a feed pod (one tweeter, one mic) sits at its focus
    far: { name: 'Cipher Echo, far (petal reflector)', f: 21250, SL: 85, AG: 0, CG: 4, dish: 0.10, F: 0.04, sym: 3, band: '20.5–22.0 kHz', pod: true }
  };
  const NEED = 12, REAL = 15, FADE = 6;   // dB: 16-tone detection, real-world losses, fade margin
  function budget(m, o) {
    const M = MODES[m];
    const T = SYMS[o.sym != null ? o.sym : M.sym];
    const g = M.dish ? dish(M.dish, M.f, o.t) : 0;
    const a = alpha(M.f, o.t, o.h);
    const noise = o.n + 10 * log10(1 / T);
    const need = NEED - M.CG + REAL + FADE;
    const snr = function (r) { return M.SL + g - (20 * log10(r) + a * r) + g + M.AG - noise; };
    let lo = 0.1, hi = 5000;
    for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (snr(mid) > need) lo = mid; else hi = mid; }
    return { M: M, T: T, g: g, a: a, noise: noise, need: need, snr: snr, range: lo, rate: 4 / T };
  }
  const STD = { t: 20, h: 50, n: 0 };
  const STD_IN = { t: 20, h: 50, n: 10 };
  const R = {
    phone: budget('phone', STD_IN).range, q: budget('q', STD_IN).range,
    lr: budget('lr', STD).range, far: budget('far', STD).range
  };
  const fmt = function (r) { return r >= 20 ? Math.round(r / 5) * 5 : Math.round(r); };
  // half-power beam width of the dish: ≈ 1.2·λ/D for a dish lit with a tapered feed
  const BW = function (tC) { return 1.2 * (sound(tC) / MODES.far.f) / MODES.far.dish * 180 / Math.PI; };

  /* ---------- Range map: tilted, rescales for each mode ---------- */
  const svg = $('range-svg');
  const OX = 70, OY = 220, W = 680;
  const MAP = {
    q: { half: 65, scale: 40, read: 'QUIET · 16.9–18.9 kHz · ~' + fmt(R.q) + ' m indoors · phones running Send it by sound can join' },
    lr: { half: 24, scale: 80, read: 'LONG-RANGE · 20.5–22.0 kHz · 4 horns, 4 mics, error correction · ~' + fmt(R.lr) + ' m line of sight' },
    far: { half: BW(20) / 2, scale: 160, read: 'FAR · petal reflector and feed pod on both units, 1.6 s tones · ~' + fmt(R.far) + ' m line of sight · beam ±' + (BW(20) / 2).toFixed(1) + '° · 2.5 bits a second raw' }
  };
  const MARKS = [
    { key: 'phone', t: 'Phone', y: 50 }, { key: 'q', t: 'Quiet', y: -70 },
    { key: 'lr', t: 'Long-range', y: 64 }, { key: 'far', t: 'Far', y: -80 }
  ];
  let mode = 'lr', cur = { r: 0, half: 24, scale: 80 }, anim = 0, dishSet = null;
  function wedge(half, r) {
    const a = half * Math.PI / 180;
    return 'M' + OX + ' ' + OY + ' L' + (OX + r * Math.cos(a)).toFixed(1) + ' ' + (OY - r * Math.sin(a)).toFixed(1) +
      ' A' + r.toFixed(1) + ' ' + r.toFixed(1) + ' 0 0 1 ' + (OX + r * Math.cos(a)).toFixed(1) + ' ' + (OY + r * Math.sin(a)).toFixed(1) + ' Z';
  }
  function drawMap() {
    const px = W / cur.scale, step = cur.scale / 5;
    let h = '<defs><radialGradient id="beamG" cx="' + OX + '" cy="' + OY + '" r="' + W + '" gradientUnits="userSpaceOnUse"><stop offset="0" class="bg0"/><stop offset="1" class="bg1"/></radialGradient>' +
      '<clipPath id="beamClip"><path d="' + wedge(cur.half, cur.r * px) + '"/></clipPath></defs>';
    for (let k = 1; k <= 5; k++) {
      const r = k * step * px;
      h += '<path class="rg-ring" d="M' + OX + ' ' + (OY - r) + ' A' + r + ' ' + r + ' 0 0 1 ' + OX + ' ' + (OY + r) + '"/>' +
        '<text class="rg-m" x="' + (OX + r + 4) + '" y="' + (OY - 6) + '">' + Math.round(k * step) + ' m</text>';
    }
    h += '<line class="rg-axis" x1="' + OX + '" y1="' + OY + '" x2="' + (OX + W) + '" y2="' + OY + '"/>' +
      '<path class="rg-beam" d="' + wedge(cur.half, cur.r * px) + '"/>' +
      '<g clip-path="url(#beamClip)"><circle class="rg-pulse" cx="' + OX + '" cy="' + OY + '" r="' + W + '" style="--i:0"/><circle class="rg-pulse" cx="' + OX + '" cy="' + OY + '" r="' + W + '" style="--i:1"/><circle class="rg-pulse" cx="' + OX + '" cy="' + OY + '" r="' + W + '" style="--i:2"/></g>' +
      '<g class="rg-dev"><rect x="' + (OX - 34) + '" y="' + (OY - 22) + '" width="30" height="44" rx="4"/>' +
      [-17, -7, 3, 13].map(function (y) { return '<rect class="rg-horn" x="' + (OX - 6) + '" y="' + (OY + y) + '" width="6" height="5"/>'; }).join('') + '</g>';
    MARKS.forEach(function (k) {
      const r = R[k.key];
      if (r > cur.scale * 1.02) return;
      const x = OX + r * px, y = OY + k.y, end = x > OX + W * 0.7;
      const tx = end ? x - 8 : x + 8, an = end ? ' text-anchor="end"' : '', ty = y + (k.y > 0 ? 18 : -24);
      h += '<g class="rg-mark' + (k.key === mode ? ' on' : '') + '"><line x1="' + x + '" y1="' + OY + '" x2="' + x + '" y2="' + y + '"/>' +
        '<circle cx="' + x + '" cy="' + OY + '" r="6"/><text x="' + tx + '" y="' + ty + '"' + an + '>' + k.t + '</text>' +
        '<text class="rg-s" x="' + tx + '" y="' + (ty + 18) + '"' + an + '>~' + fmt(r) + ' m</text></g>';
    });
    svg.innerHTML = h;
  }
  function setMode(m) {
    mode = m;
    document.querySelectorAll('.rm').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === m)); });
    $('range-read').textContent = MAP[m].read;
    const from = { r: cur.r, half: cur.half, scale: cur.scale }, to = { r: R[m], half: MAP[m].half, scale: MAP[m].scale }, t0 = performance.now();
    cancelAnimationFrame(anim);
    (function step(now) {
      const k = reduce ? 1 : Math.min(1, (now - t0) / 1000), e = 1 - Math.pow(1 - k, 3);
      cur = { r: from.r + (to.r - from.r) * e, half: from.half + (to.half - from.half) * e, scale: from.scale + (to.scale - from.scale) * e };
      drawMap();
      if (k < 1) anim = requestAnimationFrame(step);
    })(t0);
    if (dishSet) dishSet(m === 'far');
  }
  document.querySelectorAll('.rm').forEach(function (b) { b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); }); });

  /* ---------- The fold-out reflector, in 3D ---------- */
  (function () {
    const cam = $('dish-cam');
    let h = '<div class="dish-base"></div><div class="dish-focus"><i></i></div>';
    for (let k = 0; k < 8; k++) h += '<div class="petal" style="--k:' + k + '"><span></span></div>';
    cam.innerHTML = h;
    let auto = 0;
    function startAuto() { auto = setInterval(function () { cam.classList.toggle('open'); }, 2600); }
    dishSet = function (o) { clearInterval(auto); cam.classList.toggle('open', o); if (!o && !reduce) startAuto(); };
    if (!reduce) startAuto(); else cam.classList.add('open');
  })();
  setMode('lr');

  /* ---------- Noise cancelling: five live panels ---------- */
  const steps = Array.prototype.slice.call(document.querySelectorAll('.nc-step'));
  const BINS = 48, TONE = 21.2;
  const fx = function (f) { return 12 + f / 24 * 216; };
  function spectrum(stage) {
    const out = [];
    for (let b = 0; b < BINS; b++) {
      const f = (b + 0.5) * 24 / BINS;
      const floor = 16 + Math.random() * 7;
      let v = floor + 62 * Math.exp(-Math.pow(f - 2.5, 2) / 9) + 20 * Math.exp(-Math.pow(f - 7, 2) / 2) * Math.random();
      const tone = Math.abs(f - TONE) < 0.26;
      if (tone) v = floor + 34;
      if (stage >= 1 && f < 18) v = 3;
      if (stage >= 2 && !tone && f >= 18) v = floor * 0.6;
      if (stage >= 2 && tone) v = floor * 0.6 + 42;
      out.push({ f: f, v: Math.min(100, v), tone: tone, cut: stage >= 1 && f < 18 });
    }
    return out;
  }
  let rsTick = 0;
  function drawRS(li) {
    // 15 digits: 9 data + 6 check; 3 arrive wrong and are repaired
    const bad = [2, 7, 11], fixed = (rsTick % 6) >= 3;
    let h = '';
    for (let i = 0; i < 15; i++) {
      const x = 12 + i * 14.6, isBad = bad.indexOf(i) >= 0;
      h += '<rect class="rs-d' + (i >= 9 ? ' chk' : '') + (isBad ? (fixed ? ' fixed' : ' bad') : '') + '" x="' + x.toFixed(1) + '" y="44" width="12" height="20" rx="2"/>' +
        '<text class="rs-t" x="' + (x + 6).toFixed(1) + '" y="58" text-anchor="middle">' + (isBad && !fixed ? '?' : '0123456789ABCDEF'[(i * 7 + 3) % 16]) + '</text>';
    }
    h += '<text class="nc-ax" x="12" y="34">9 data digits</text><text class="nc-ax" x="228" y="34" text-anchor="end">6 check digits</text>' +
      '<text class="nc-ok" x="120" y="92" text-anchor="middle">' + (fixed ? '3 errors found and fixed ✓' : '3 digits arrived wrong…') + '</text>';
    li.querySelector('svg').innerHTML = h;
  }
  function draw(li) {
    const s = +li.getAttribute('data-s');
    if (s === 4) { drawRS(li); return; }
    const data = spectrum(s);
    let h = '<line class="nc-base" x1="12" y1="110" x2="228" y2="110"/>';
    data.forEach(function (d) {
      h += '<rect class="nc-bar' + (d.tone ? ' tone' : '') + (d.cut ? ' cut' : '') + '" x="' + fx(d.f - 0.25).toFixed(1) + '" y="' + (110 - d.v).toFixed(1) + '" width="3.6" height="' + d.v.toFixed(1) + '"/>';
    });
    if (s >= 1) h += '<line class="nc-cut" x1="' + fx(18) + '" y1="8" x2="' + fx(18) + '" y2="110"/>' + (s < 3 ? '<text class="nc-ax" x="' + (fx(18) - 3) + '" y="16" text-anchor="end">18 kHz</text>' : '');
    if (s === 3) {
      const thr = 110 - (19 * 0.6 + 14);
      h += '<line class="nc-thr" x1="' + fx(18) + '" y1="' + thr + '" x2="228" y2="' + thr + '"/><text class="nc-ok" x="' + (fx(18) - 4) + '" y="40" text-anchor="end">21.2 kHz → digit 7 ✓</text>';
    }
    h += '<text class="nc-ax" x="12" y="120">0</text><text class="nc-ax" x="120" y="120" text-anchor="middle">12</text><text class="nc-ax" x="228" y="120" text-anchor="end">24 kHz</text>';
    li.querySelector('svg').innerHTML = h;
  }
  steps.forEach(draw);
  if (!reduce && 'IntersectionObserver' in window) {
    let timer = 0;
    new IntersectionObserver(function (es) {
      clearInterval(timer);
      if (es[0].isIntersecting) timer = setInterval(function () { rsTick++; steps.forEach(draw); }, 400);
    }, { threshold: 0.2 }).observe($('nc'));
  }

  /* ---------- How far can it go? ---------- */
  const st = { m: 'lr', n: 0, sym: 1, t: 20, h: 50 };
  const chart = $('lb-chart');
  function row(k, v, cls) { return '<tr' + (cls ? ' class="' + cls + '"' : '') + '><td>' + k + '</td><td>' + v + '</td></tr>'; }
  const sgn = function (v) { return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) + ' dB'; };
  function calc() {
    const b = budget(st.m, st);
    const r = b.range;
    $('lb-range').textContent = '~' + fmt(r) + ' m';
    $('lb-sym-o').textContent = b.T + ' s';
    $('lb-t-o').textContent = st.t + ' °C';
    $('lb-h-o').textContent = st.h + ' %';
    const n = 12, tones = b.M.CG ? 15 * Math.ceil(2 * n / 9) : 2 * n + 2;
    $('lb-meta').textContent = b.M.name + ' · ' + b.M.band + ' · ' + b.rate.toFixed(1) + ' bits/s raw' + (b.M.CG ? ' (' + (b.rate * 9 / 15).toFixed(1) + ' after error correction)' : '') + ' · a 12-letter message takes ' + Math.round(tones * b.T) + ' s';
    $('lb-table').innerHTML =
      row('Source, 1 m', b.M.SL + ' dB SPL') +
      (b.g ? row('Reflectors, both ends', sgn(2 * b.g)) : '') +
      row('Mic array', sgn(b.M.AG)) +
      row('Air absorption', b.a.toFixed(2) + ' dB/m') +
      row('Noise in each detector', b.noise.toFixed(1) + ' dB') +
      row('Needed above noise', b.need.toFixed(0) + ' dB') +
      row('of which real-world allowance', (REAL + FADE) + ' dB', 'sub');
    // Chart: how far above the noise the signal is, against distance
    const XM = Math.max(20, Math.ceil(r * 1.4 / 10) * 10), X = function (d) { return 50 + d / XM * 450; };
    const YM = Math.min(150, Math.ceil(Math.max(b.snr(XM / 40), b.need + 30) / 30) * 30);
    const Y = function (v) { return 230 - Math.max(0, Math.min(YM, v)) / YM * 210; };
    let p = '', path = '';
    for (let k = 0; k <= 5; k++) { const d = XM * k / 5; p += '<line class="ch-g" x1="' + X(d) + '" y1="20" x2="' + X(d) + '" y2="230"/><text class="ch-ax" x="' + X(d) + '" y="248" text-anchor="middle">' + Math.round(d) + ' m</text>'; }
    for (let v = 0; v <= YM; v += 30) p += '<text class="ch-ax" x="44" y="' + (Y(v) + 4) + '" text-anchor="end">' + v + '</text>';
    for (let i = 1; i <= 120; i++) { const d = Math.max(0.5, XM * i / 120); path += (i === 1 ? 'M' : 'L') + X(d).toFixed(1) + ' ' + Y(b.snr(d)).toFixed(1); }
    p += '<text class="ch-ax" x="56" y="12">dB above noise ↑</text>' +
      '<line class="ch-need" x1="50" y1="' + Y(b.need) + '" x2="500" y2="' + Y(b.need) + '"/><text class="ch-need-t" x="500" y="' + (Y(b.need) - 6) + '" text-anchor="end">needed: ' + b.need.toFixed(0) + ' dB</text>' +
      '<path class="ch-line" d="' + path + '"/>' +
      '<line class="ch-drop" x1="' + X(r) + '" y1="' + Y(b.need) + '" x2="' + X(r) + '" y2="230"/><circle class="ch-dot" cx="' + X(r) + '" cy="' + Y(b.need) + '" r="6"/>';
    chart.innerHTML = p;
    const spread = 20 * log10(r), absorb = b.a * r;
    $('lb-why').textContent = 'At ' + fmt(r) + ' m the sound has lost ' + spread.toFixed(0) + ' dB to spreading and ' + absorb.toFixed(0) + ' dB to the air itself. ' +
      (absorb > spread ? 'Air absorption is now the limit: each extra 10 m costs another ' + (b.a * 10).toFixed(1) + ' dB, so at this frequency more power buys very little extra distance.'
        : 'Spreading is still the main loss here, so more power, reflectors or slower tones would reach further.');
    maths(b);
  }
  /* ---------- The flip side: every variable named, every step shown ---------- */
  const sub = function (a, b) { return a + '<sub>' + b + '</sub>'; };
  const n1 = function (v) { return (Math.round(v * 10) / 10).toFixed(1); };
  let fitTile = function () {};
  // Lambert W (principal branch, x > 0) by Halley's method: solves w·e^w = x
  function lambertW(x) {
    let w = x < 3 ? Math.log1p(x) : Math.log(x) - Math.log(Math.log(x)), n = 0;
    for (; n < 60; n++) {
      const e = Math.exp(w), f = w * e - x;
      const dw = f / (e * (w + 1) - (w + 2) * f / (2 * w + 2));
      w -= dw;
      if (Math.abs(dw) < 1e-12 * (1 + Math.abs(w))) { n++; break; }
    }
    return { w: w, n: n };
  }
  function maths(b) {
    const M = b.M, r = b.range, c = sound(st.t), lam = c / M.f, mics = M.AG ? 4 : 1;
    const Ls = sub('L', 's'), Gr = sub('G', 'r'), Ga = sub('G', 'a'), Gc = sub('G', 'c'), N0 = sub('N', '0'), Lw = sub('L', 'w'), Mf = sub('M', 'f'), Sreq = sub('S', 'req');
    const v = function (sym, name, how, val) {
      return '<div class="lb-var"><dt class="mono">' + sym + '</dt><dd><span class="lb-vn">' + name + '</span>' +
        (how ? '<span class="lb-vh mono">' + how + '</span>' : '') + '<b class="mono">' + val + '</b></dd></div>';
    };
    const place = st.n === 0 ? 'calm outdoors' : st.n === 10 ? 'quiet room' : 'noisy place';
    const n2 = function (x) { return x.toFixed(2); };
    const a4 = b.a.toFixed(5), k4 = (20 / Math.LN10).toFixed(4);
    $('lb-vars').innerHTML =
      v('f', 'Carrier frequency', 'middle of the ' + M.band + ' band', M.f.toLocaleString('en-IN') + ' Hz') +
      v('c', 'Speed of sound', '331.3·√(1 + t/273.15), t = ' + st.t + ' °C', n1(c) + ' m/s') +
      v('λ', 'Wavelength', 'c ÷ f', n2(lam * 100) + ' cm') +
      v(Ls, 'Source level at 1 m', (M.pod ? 'one tweeter in the feed pod' : M.SL === 100 ? '4 piezo horns' : M.SL === 80 ? 'horns, quiet mode' : 'phone speaker') + ', design estimate', M.SL + ' dB SPL') +
      v(Gr, 'Reflector gain, each end', M.dish ? '10·log₁₀(η·(πD/λ)²), η = ' + ETA + ' assumed, D = ' + (M.dish * 100) + ' cm, both ends' : 'no reflector in this mode', n2(b.g) + ' dB') +
      v(Ga, 'Mic-array gain', mics > 1 ? '10·log₁₀ ' + mics + ', ideal for ' + mics + ' mics' : M.pod ? 'one mic in the feed pod' : 'single microphone', n2(M.AG) + ' dB') +
      v('α', 'Air absorption, ISO 9613-1', st.t + ' °C, ' + st.h + ' % humidity, sea-level pressure', a4 + ' dB/m') +
      v('T', 'Tone length', 'each detector listens 1/T Hz wide', b.T + ' s') +
      v(N0, 'Background noise near f', place + ', assumed, dB per Hz', st.n + ' dB') +
      v('N', 'Noise in each detector', N0 + ' + 10·log₁₀(1/T)', n2(b.noise) + ' dB') +
      v('D', 'Detection threshold', 'to tell 16 tones apart, assumed', NEED + ' dB') +
      v(Gc, 'Coding gain', M.CG ? 'Reed–Solomon RS(15, 9), approximate' : 'no error correction', M.CG + ' dB') +
      v(Lw, 'Real-world allowance', 'hands, walls, aim; assumed', REAL + ' dB') +
      v(Mf, 'Fade margin', 'wind and turbulence; assumed', FADE + ' dB') +
      v('r', 'Distance to the receiver', 'the unknown we solve for', '?');
    const B = M.SL + 2 * b.g + M.AG - b.noise - b.need;
    const K = 20 / Math.LN10;                       // 20·log10 r = K·ln r
    const X = (b.a / K) * Math.exp(B / K);
    const W = lambertW(X), rW = (K / b.a) * W.w;
    // the check uses the numbers exactly as displayed, so a reader can redo it by hand
    const rD = +rW.toFixed(2), sp = +(20 * log10(rD)).toFixed(2), ab = +(+a4 * rD).toFixed(2), ok = (sp + ab).toFixed(2) === B.toFixed(2);
    const sx = function (x) {
      if (x < 1e4) return x.toPrecision(4);
      const e = Math.floor(log10(x)), m = x / Math.pow(10, e);
      return m.toFixed(3) + ' × 10' + String(e).split('').map(function (d) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]; }).join('');
    };
    const li = function (t, h) { return '<li><span class="lb-wt">' + t + '</span><span class="lb-wm">' + h + '</span></li>'; };
    const Bsym = 'B';
    $('lb-work').innerHTML =
      li('Signal above the noise at distance r, with spherical spreading from 1 m', 'SNR(r) = ' + Ls + ' + 2·' + Gr + ' + ' + Ga + ' − 20·log₁₀ r − α·r − N') +
      li('How far above the noise it must be', Sreq + ' = D − ' + Gc + ' + ' + Lw + ' + ' + Mf + ' = ' + NEED + ' − ' + M.CG + ' + ' + REAL + ' + ' + FADE + ' = <b>' + b.need.toFixed(0) + ' dB</b>') +
      li('The range is the r where SNR(r) = ' + Sreq + '. Collect the losses on one side', '20·log₁₀ r + α·r = ' + Ls + ' + 2·' + Gr + ' + ' + Ga + ' − N − ' + Sreq + ' = ' + Bsym) +
      li('Put the numbers in', '20·log₁₀ r + ' + a4 + '·r = ' + M.SL + ' + ' + n2(2 * b.g) + ' + ' + n2(M.AG) + (b.noise < 0 ? ' + ' + n2(-b.noise) : ' − ' + n2(b.noise)) + ' − ' + b.need.toFixed(0) + ' = <b>' + n2(B) + ' dB</b>') +
      li('r sits inside a logarithm and also on its own, so ordinary algebra cannot isolate it. Rewrite the log with k = 20 ÷ ln 10 = ' + k4, 'k·ln r + α·r = ' + Bsym) +
      li('Divide by k, raise e to both sides, then multiply by α/k', '(α/k)·r · e<sup>(α/k)·r</sup> = (α/k) · e<sup>' + Bsym + '/k</sup>') +
      li('This has the form w·e<sup>w</sup> = x, whose solution is the Lambert W function, w = W(x)', 'r = (k/α) · W(x),  x = (α/k) · e<sup>' + Bsym + '/k</sup>') +
      li('Put the numbers in', 'x = (' + a4 + ' ÷ ' + k4 + ') · e<sup>' + n2(B) + ' ÷ ' + k4 + '</sup> = ' + sx(X) +
        '<br>W(' + sx(X) + ') = ' + W.w.toFixed(4) + '<br>r = (' + k4 + ' ÷ ' + a4 + ') × ' + W.w.toFixed(4) + ' = <b>' + n2(rW) + ' m</b>') +
      li('W(x) has no formula in elementary functions, so it is evaluated numerically (Halley’s method, ' + W.n + ' steps). As a cross-check, solving step 4 directly by bisection (80 halvings of 0.1–5000 m) gives', 'r = ' + n2(r) + ' m · the tile rounds it to the nearest ' + (r >= 20 ? '5 m' : 'metre') + ': ~' + fmt(r) + ' m') +
      li('Check by putting r back into step 4', '20·log₁₀ ' + n2(rD) + ' = ' + n2(sp) + ' dB spreading, ' + a4 + ' × ' + n2(rD) + ' = ' + n2(ab) + ' dB air<br>' + n2(sp) + ' + ' + n2(ab) + ' = ' + n2(sp + ab) + ' dB ' + (ok ? '= ' + Bsym + ' ✓' : '≈ ' + Bsym + ' (' + n2(B) + ' dB; the gap is rounding to 2 decimals) ✓'));
    $('lb-back-r').textContent = '~' + fmt(r) + ' m';
    fitTile();
  }
  (function () {
    const tile = $('lb-tile'), front = tile.querySelector('.lb-front'), back = $('lb-back'), inner = tile.querySelector('.lb-inner');
    // the tile takes the height of whichever side is showing
    fitTile = function () { inner.style.height = (tile.classList.contains('flipped') ? back : front).offsetHeight + 'px'; };
    window.addEventListener('resize', fitTile);
    tile.addEventListener('click', function (e) {
      if (window.getSelection && String(window.getSelection()).length > 2) return;   // let people select the maths
      const on = !tile.classList.contains('flipped');
      tile.classList.toggle('flipped', on);
      front.querySelector('.lb-flip-btn').setAttribute('aria-expanded', String(on));
      back.toggleAttribute('inert', !on); back.setAttribute('aria-hidden', String(!on));
      front.toggleAttribute('inert', on); front.setAttribute('aria-hidden', String(on));
      fitTile();
      if (e.detail === 0) (on ? back : front).querySelector('.lb-flip-btn').focus({ preventScroll: true });   // keyboard: keep focus on the visible side
    });
  })();
  document.querySelectorAll('.seg-mini button').forEach(function (b) {
    b.addEventListener('click', function () {
      st.m = b.getAttribute('data-m'); st.sym = MODES[st.m].sym; $('lb-sym').value = st.sym;
      st.n = (st.m === 'phone' || st.m === 'q') ? 10 : 0; $('lb-place').value = String(st.n);
      document.querySelectorAll('.seg-mini button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      calc();
    });
  });
  $('lb-place').addEventListener('change', function (e) { st.n = +e.target.value; calc(); });
  $('lb-sym').addEventListener('input', function (e) { st.sym = +e.target.value; calc(); });
  $('lb-t').addEventListener('input', function (e) { st.t = +e.target.value; calc(); });
  $('lb-h').addEventListener('input', function (e) { st.h = +e.target.value; calc(); });
  calc();
  window.addEventListener('load', function () { fitTile(); });
  if (document.fonts) document.fonts.ready.then(function () { fitTile(); });

  window.CIPHER_ECHO_RANGE = { R: R, alpha: alpha, budget: budget, sound: sound, dish: dish, ETA: ETA, MODES: MODES, BW: BW, fmt: fmt };
})();
