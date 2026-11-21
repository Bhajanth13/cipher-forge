/* =========================================================
   Cipher Echo — device-range.js
   Long-range acoustics: a tilted range map with the beam for
   each mode, and four live spectra showing the noise cancelling.
   Ranges are estimates (line of sight, indoors).
   ========================================================= */
(function () {
  'use strict';

  const $ = function (id) { return document.getElementById(id); };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';

  /* ---------- Range map ---------- */
  const svg = $('range-svg');
  const OX = 70, OY = 220, PX = 27.2;          // origin, pixels per metre (25 m = 680 px)
  const MODES = {
    lr: { half: 22, range: 20, read: 'LONG-RANGE · 20.5–22.0 kHz · horns + 3-mic beamforming · up to ~20 m line of sight (estimate)' },
    q: { half: 65, range: 8, read: 'QUIET · 16.9–18.9 kHz · lower power · ~8 m (estimate) · phones running Send it by sound can join' }
  };
  const MARKS = [
    { m: 3, t: 'Phone, Send it by sound', s: '~3 m', mode: '' },
    { m: 8, t: 'Cipher Echo, quiet', s: '~8 m', mode: 'q' },
    { m: 20, t: 'Cipher Echo, long-range', s: '~20 m', mode: 'lr' }
  ];
  function wedge(half, r) {
    const a = half * Math.PI / 180;
    const x1 = OX + r * Math.cos(-a), y1 = OY + r * Math.sin(-a), x2 = OX + r * Math.cos(a), y2 = OY + r * Math.sin(a);
    return 'M' + OX + ' ' + OY + ' L' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' A' + r + ' ' + r + ' 0 0 1 ' + x2.toFixed(1) + ' ' + y2.toFixed(1) + ' Z';
  }
  let html = '<defs><radialGradient id="beamG" cx="' + OX + '" cy="' + OY + '" r="560" gradientUnits="userSpaceOnUse">' +
    '<stop offset="0" class="bg0"/><stop offset="1" class="bg1"/></radialGradient>' +
    '<clipPath id="beamClip"><path id="beamClipPath" d=""/></clipPath></defs>';
  for (let m = 5; m <= 25; m += 5) {
    const r = m * PX;
    html += '<path class="rg-ring" d="M' + OX + ' ' + (OY - r) + ' A' + r + ' ' + r + ' 0 0 1 ' + OX + ' ' + (OY + r) + '"/>' +
      '<text class="rg-m" x="' + (OX + r + 4) + '" y="' + (OY - 6) + '">' + m + ' m</text>';
  }
  html += '<line class="rg-axis" x1="' + OX + '" y1="' + OY + '" x2="' + (OX + 25 * PX) + '" y2="' + OY + '"/>' +
    '<path class="rg-beam" id="rg-beam" d=""/>' +
    '<g clip-path="url(#beamClip)"><circle class="rg-pulse" cx="' + OX + '" cy="' + OY + '" r="560" style="--i:0"/><circle class="rg-pulse" cx="' + OX + '" cy="' + OY + '" r="560" style="--i:1"/><circle class="rg-pulse" cx="' + OX + '" cy="' + OY + '" r="560" style="--i:2"/></g>' +
    '<g class="rg-dev"><rect x="' + (OX - 34) + '" y="' + (OY - 22) + '" width="30" height="44" rx="4"/><rect class="rg-horn" x="' + (OX - 6) + '" y="' + (OY - 14) + '" width="6" height="10"/><rect class="rg-horn" x="' + (OX - 6) + '" y="' + (OY + 4) + '" width="6" height="10"/></g>';
  MARKS.forEach(function (k, i) {
    const x = OX + k.m * PX, y = OY + (i === 0 ? 46 : i === 1 ? -70 : 70);
    const end = i === 2, tx = end ? x - 8 : x + 8, anchor = end ? ' text-anchor="end"' : '';
    const ty = y + (y > OY ? 18 : -24), sy = y > OY ? ty + 18 : ty + 18;
    html += '<g class="rg-mark" data-mode="' + k.mode + '"><line x1="' + x + '" y1="' + OY + '" x2="' + x + '" y2="' + y + '"/>' +
      '<circle cx="' + x + '" cy="' + OY + '" r="6"/><text x="' + tx + '" y="' + ty + '"' + anchor + '>' + k.t + '</text>' +
      '<text class="rg-s" x="' + tx + '" y="' + sy + '"' + anchor + '>' + k.s + '</text></g>';
  });
  svg.innerHTML = html;

  let mode = 'lr', shownR = 0, anim = 0;
  function setMode(m) {
    mode = m;
    const M = MODES[m];
    document.querySelectorAll('.rm').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === m)); });
    svg.querySelectorAll('.rg-mark').forEach(function (g) { g.classList.toggle('on', g.getAttribute('data-mode') === m); });
    $('range-read').textContent = M.read;
    // Grow the beam from where it is to the new range
    const from = shownR, to = M.range * PX, t0 = performance.now();
    cancelAnimationFrame(anim);
    (function step(now) {
      const k = reduce ? 1 : Math.min(1, (now - t0) / 900);
      const e = 1 - Math.pow(1 - k, 3);
      shownR = from + (to - from) * e;
      const half = (svg.dataset.half ? +svg.dataset.half : M.half) + (M.half - (svg.dataset.half ? +svg.dataset.half : M.half)) * e;
      const d = wedge(half, shownR);
      $('rg-beam').setAttribute('d', d);
      $('beamClipPath').setAttribute('d', d);
      if (k < 1) anim = requestAnimationFrame(step); else svg.dataset.half = M.half;
    })(t0);
  }
  document.querySelectorAll('.rm').forEach(function (b) { b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); }); });
  setMode('lr');

  /* ---------- Noise cancelling, four live spectra ---------- */
  const steps = Array.prototype.slice.call(document.querySelectorAll('.nc-step'));
  const BINS = 48, TONE = 21.2;                  // kHz; digit 7 in the long-range band
  const fx = function (f) { return 12 + f / 24 * 216; };
  function spectrum(stage) {
    const out = [];
    for (let b = 0; b < BINS; b++) {
      const f = (b + 0.5) * 24 / BINS;
      let floor = 16 + Math.random() * 7;
      let v = floor + 62 * Math.exp(-Math.pow(f - 2.5, 2) / 9) + 20 * Math.exp(-Math.pow(f - 7, 2) / 2) * Math.random();
      const tone = Math.abs(f - TONE) < 0.26;
      if (tone) v = floor + 34;
      if (stage >= 1 && f < 18) v = 3;            // high-pass
      if (stage >= 2 && !tone && f >= 18) v = floor * 0.66;   // beamforming lowers the noise...
      if (stage >= 2 && tone) v = floor * 0.66 + 40;           // ...and lifts the tone (+4.8 dB)
      out.push({ f: f, v: Math.min(100, v), tone: tone, cut: stage >= 1 && f < 18 });
    }
    return out;
  }
  function draw(li) {
    const s = +li.getAttribute('data-s');
    const data = spectrum(s);
    let h = '<line class="nc-base" x1="12" y1="110" x2="228" y2="110"/>';
    data.forEach(function (d) {
      const x = fx(d.f - 0.25);
      h += '<rect class="nc-bar' + (d.tone ? ' tone' : '') + (d.cut ? ' cut' : '') + '" x="' + x.toFixed(1) + '" y="' + (110 - d.v).toFixed(1) + '" width="3.6" height="' + d.v.toFixed(1) + '"/>';
    });
    if (s >= 1) h += '<line class="nc-cut" x1="' + fx(18) + '" y1="8" x2="' + fx(18) + '" y2="110"/>' + (s < 3 ? '<text class="nc-ax" x="' + (fx(18) - 3) + '" y="16" text-anchor="end">18 kHz</text>' : '');
    if (s === 3) {
      const thr = 110 - (19 * 0.66 + 14);
      h += '<line class="nc-thr" x1="' + fx(18) + '" y1="' + thr + '" x2="228" y2="' + thr + '"/>' +
        '<text class="nc-ok" x="' + (fx(18) - 4) + '" y="40" text-anchor="end">21.2 kHz → digit 7 ✓</text>';
    }
    h += '<text class="nc-ax" x="12" y="120">0</text><text class="nc-ax" x="120" y="120" text-anchor="middle">12</text><text class="nc-ax" x="228" y="120" text-anchor="end">24 kHz</text>';
    li.querySelector('svg').innerHTML = h;
  }
  steps.forEach(draw);
  let timer = 0;
  const nc = $('nc');
  if (!reduce && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      clearInterval(timer);
      if (es[0].isIntersecting) timer = setInterval(function () { steps.forEach(draw); }, 180);
    }, { threshold: 0.2 }).observe(nc);
  }
})();
