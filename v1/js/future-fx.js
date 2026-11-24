/* =========================================================
   Cipher Forge — future-fx.js
   The 3D and motion layer of the Future enhancements page:
   star field, the signal tunnel you fly through, the live
   waveform, the exploded 3D pipeline, and the beam and core
   that follow the real tones while a message is sent.
   ========================================================= */
(function () {
  'use strict';

  const $ = function (id) { return document.getElementById(id); };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  const ease = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const lerp = function (a, b, t) { return a + (b - a) * t; };
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  // Theme colours, read once and again whenever light/dark changes
  const cache = {};
  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    ['--star', '--signal'].forEach(function (n) { cache[n] = cs.getPropertyValue(n).trim(); });
  }
  readColors();
  new MutationObserver(function () { setTimeout(readColors, 60); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const css = function (name) { return cache[name]; };

  let seed = 11;
  const rand = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

  /* ---------- Stars ---------- */
  const stars = $('fx-stars');
  const sctx = stars.getContext('2d');
  const STAR = [];
  for (let i = 0; i < 170; i++) STAR.push({ x: rand(), y: rand(), r: 0.4 + rand() * 1.3, d: 0.05 + rand() * 0.35, ph: rand() * 6.28, sp: 0.5 + rand() * 1.5 });
  function sizeStars() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    stars.width = innerWidth * dpr; stars.height = innerHeight * dpr;
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function drawStars(t) {
    const w = innerWidth, h = innerHeight, sy = scrollY;
    sctx.clearRect(0, 0, w, h);
    const rgb = css('--star') || '228, 234, 241';
    STAR.forEach(function (s) {
      const y = ((s.y * h - sy * s.d) % h + h) % h;
      const a = 0.25 + 0.35 * (reduce ? 1 : (0.5 + 0.5 * Math.sin(t * 0.001 * s.sp + s.ph)));
      sctx.fillStyle = 'rgba(' + rgb + ',' + a.toFixed(3) + ')';
      sctx.beginPath(); sctx.arc(s.x * w, y, s.r, 0, 6.283); sctx.fill();
    });
  }

  /* ---------- The tunnel ---------- */
  const hero = $('top');
  const tunnel = $('tunnel');
  const RINGS = 22, GAP = 270, DEPTH = RINGS * GAP;
  const rings = [], glyphs = [];
  const D = Math.max(innerWidth, innerHeight) * 0.95;
  for (let i = 0; i < RINGS; i++) {
    const r = document.createElement('div');
    r.className = 'tring' + (i % 5 === 2 ? ' brass' : (i % 3 === 0 ? ' dash' : ''));
    const d = D * (0.85 + (i % 4) * 0.06);
    r.style.width = r.style.height = d + 'px';
    r.style.left = r.style.top = (-d / 2) + 'px';
    tunnel.appendChild(r);
    rings.push({ el: r, off: i * GAP, spin: (i % 2 ? 1 : -1) * (4 + (i % 5) * 2) });
  }
  for (let i = 0; i < 34; i++) {
    const g = document.createElement('span');
    g.className = 'tglyph';
    g.textContent = LETTERS[Math.floor(rand() * LETTERS.length)];
    tunnel.appendChild(g);
    const ang = rand() * Math.PI * 2, rad = D * (0.18 + rand() * 0.26);
    glyphs.push({ el: g, x: Math.cos(ang) * rad, y: Math.sin(ang) * rad, off: rand() * DEPTH });
  }

  function heroProgress() {
    const r = hero.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, hero.offsetHeight - innerHeight), 0, 1);
  }

  const copy = $('fx-hero-copy');
  function drawTunnel(t, p) {
    const cam = p * 3200 + (reduce ? 0 : t * 0.06);
    const roll = (reduce ? 0 : t * 0.004) + p * 40;
    tunnel.style.transform = 'rotateZ(' + roll.toFixed(2) + 'deg)';
    rings.forEach(function (r) {
      const z = ((r.off + cam) % DEPTH) - DEPTH + 420;          // far (−5520) to just past the viewer (420)
      const near = (z + DEPTH - 420) / DEPTH;                    // 0 far … 1 near
      const op = Math.min(1, near * 2.2) * (1 - clamp((z - 120) / 300, 0, 1));
      r.el.style.transform = 'translateZ(' + z.toFixed(0) + 'px) rotateZ(' + (t * 0.001 * r.spin).toFixed(2) + 'deg)';
      r.el.style.opacity = op.toFixed(3);
    });
    glyphs.forEach(function (g) {
      const z = ((g.off + cam * 1.15) % DEPTH) - DEPTH + 420;
      const near = (z + DEPTH - 420) / DEPTH;
      const op = Math.min(1, near * 1.8) * (1 - clamp((z - 60) / 300, 0, 1));
      g.el.style.transform = 'translate3d(' + g.x.toFixed(0) + 'px,' + g.y.toFixed(0) + 'px,' + z.toFixed(0) + 'px)';
      g.el.style.opacity = (op * 0.85).toFixed(3);
    });
    // The title flies past the viewer as you scroll in
    const e = ease(clamp(p * 1.6, 0, 1));
    copy.style.transform = 'translateY(' + (-e * 40).toFixed(1) + 'px) scale(' + (1 + e * 0.35).toFixed(3) + ')';
    copy.style.opacity = (1 - e).toFixed(3);
    copy.style.filter = e > 0.01 ? 'blur(' + (e * 10).toFixed(1) + 'px)' : 'none';
    copy.style.visibility = e > 0.98 ? 'hidden' : 'visible';
  }

  /* ---------- Live waveform under the title ---------- */
  const wave = $('fx-wave');
  const wctx = wave.getContext('2d');
  function sizeWave() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    wave.width = wave.clientWidth * dpr; wave.height = wave.clientHeight * dpr;
    wctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function drawWave(t, p) {
    const w = wave.clientWidth, h = wave.clientHeight;
    wctx.clearRect(0, 0, w, h);
    const col = css('--signal');
    wctx.globalAlpha = 1 - p;
    for (let k = 0; k < 3; k++) {
      wctx.beginPath();
      wctx.lineWidth = k === 0 ? 1.8 : 1;
      wctx.strokeStyle = col;
      wctx.globalAlpha = (1 - p) * (k === 0 ? 0.85 : 0.3);
      wctx.shadowColor = col; wctx.shadowBlur = k === 0 ? 14 : 0;
      const f = 0.012 + k * 0.007 + 0.004 * Math.sin(t * 0.0004 + k);
      for (let x = 0; x <= w; x += 3) {
        const env = Math.sin(Math.PI * x / w);
        const y = h / 2 + env * (h * 0.32) * Math.sin(x * f + t * 0.003 * (1 + k * 0.4)) * (0.6 + 0.4 * Math.sin(t * 0.0011 + k * 2));
        if (x === 0) wctx.moveTo(x, y); else wctx.lineTo(x, y);
      }
      wctx.stroke();
    }
    wctx.globalAlpha = 1; wctx.shadowBlur = 0;
  }

  /* ---------- HUD ---------- */
  const hudFreq = $('hud-freq'), hudKey = $('hud-key');
  function hudKeyText() { hudKey.textContent = CF.app.keyCode().toUpperCase(); }
  document.addEventListener('cf:change', hudKeyText);
  hudKeyText();

  /* ---------- Title decodes on arrival ---------- */
  (function decodeTitle() {
    const el = $('fx-title');
    const lines = ['Send it', 'by sound'];
    el.setAttribute('aria-label', 'Send it by sound');
    if (reduce) return;
    let f = 0; const total = 34;
    (function step() {
      f++;
      el.innerHTML = lines.map(function (line) {
        const done = Math.floor((f / total) * line.length);
        return line.split('').map(function (c, i) {
          if (i < done || c === ' ') return c;
          const r = LETTERS[Math.floor(Math.random() * 26)];
          return c === c.toUpperCase() ? r : r.toLowerCase();
        }).join('');
      }).join('<br>');
      if (f < total) requestAnimationFrame(step); else el.innerHTML = lines.join('<br>');
    })();
  })();

  /* ---------- Spec counters ---------- */
  function countUp(el) {
    const target = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0);
    if (reduce) { el.textContent = target.toFixed(dec); return; }
    const t0 = performance.now(), dur = 1300;
    (function tick(now) {
      const k = clamp((now - t0) / dur, 0, 1);
      el.textContent = (target * ease(k)).toFixed(dec);
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  }

  /* ---------- Journey: exploded stack ---------- */
  const journey = $('journey');
  const stack = $('stack');
  const layers = Array.prototype.slice.call(stack.querySelectorAll('.layer'));
  const steps = Array.prototype.slice.call(document.querySelectorAll('#journey-steps li'));
  const formula = document.querySelector('.journey-formula');
  let lastOn = -2;
  function drawJourney(t) {
    const r = journey.getBoundingClientRect();
    const q = clamp(-r.top / Math.max(1, journey.offsetHeight - innerHeight), 0, 1);
    const open = ease(clamp(q / 0.14, 0, 1));                    // assemble, then explode
    const small = innerWidth < 560;
    const gap = lerp(8, small ? 76 : 128, open);
    const rx = lerp(8, 58, open), rz = lerp(0, -38, open) + (q > 0.9 && !reduce ? (t * 0.004) % 360 : 0);
    stack.style.transform = 'rotateX(' + rx.toFixed(2) + 'deg) rotateZ(' + rz.toFixed(2) + 'deg)';
    let on = q < 0.12 ? -1 : Math.min(4, Math.floor((q - 0.12) / 0.78 * 5));
    if (q > 0.9) on = 5;
    layers.forEach(function (L, i) {
      // The active layer slides out sideways, so it never covers its neighbours
      const slide = i === on ? (small ? 34 : 78) : 0;
      const lift = i === on ? 14 : 0;
      L.style.transform = 'translate3d(' + slide + 'px,0px,' + ((2 - i) * gap + lift).toFixed(1) + 'px)';
    });
    if (on !== lastOn) {
      lastOn = on;
      layers.forEach(function (L, i) { L.classList.toggle('is-on', i === on || on === 5); });
      steps.forEach(function (s, i) { s.classList.toggle('is-on', i === on); });
      formula.classList.toggle('is-on', on === 5);
    }
  }

  /* ---------- Console: beam, core and lights follow the real tones ---------- */
  const grid = $('console-grid'), beam = $('beam'), bctx = beam.getContext('2d');
  const sender = $('sender'), receiver = $('receiver');
  const orb = $('core-orb'), coreFreq = $('core-freq'), coreDigit = $('core-digit');
  const txLed = $('tx-led'), rxLed = $('rx-led');
  let tx = null;                 // { freq, since }
  let particles = [];
  function sizeBeam() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    beam.width = grid.clientWidth * dpr; beam.height = grid.clientHeight * dpr;
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function label(id) { return id === 'S' ? 'start tone' : id === 'E' ? 'end tone' : id === 'R' ? 'repeat' : 'digit ' + id.toString(16).toUpperCase(); }

  document.addEventListener('cf:txstart', function () {
    sender.classList.add('is-live'); txLed.className = 'led on'; orb.classList.add('live');
  });
  document.addEventListener('cf:tx', function (e) {
    const d = e.detail;
    tx = { freq: d.freq, since: performance.now() };
    coreFreq.textContent = d.freq + ' Hz';
    coreDigit.textContent = label(d.id);
    hudFreq.textContent = d.freq;
    orb.classList.add('pulse'); setTimeout(function () { orb.classList.remove('pulse'); }, 90);
    particles.push({ x: 0, v: 0.012 + Math.random() * 0.006, a: 1 });
  });
  document.addEventListener('cf:txend', function () {
    tx = null; sender.classList.remove('is-live'); txLed.className = 'led'; orb.classList.remove('live');
    coreFreq.textContent = '— Hz'; coreDigit.textContent = 'idle';
  });
  document.addEventListener('cf:listen', function (e) { rxLed.className = e.detail.on ? 'led on' : 'led'; if (!e.detail.on) receiver.classList.remove('is-live'); });
  document.addEventListener('cf:rx', function () { receiver.classList.add('is-live'); });
  document.addEventListener('cf:rxdone', function (e) {
    receiver.classList.remove('is-live');
    rxLed.className = e.detail.ok ? 'led done' : 'led on';
    setTimeout(function () { if (rxLed.className === 'led done') rxLed.className = 'led on'; }, 2600);
  });

  function drawBeam(t) {
    if (beam.offsetParent === null) return;
    const w = grid.clientWidth, h = grid.clientHeight;
    bctx.clearRect(0, 0, w, h);
    const g = grid.getBoundingClientRect(), a = sender.getBoundingClientRect(), b = receiver.getBoundingClientRect();
    const x0 = a.right - g.left - 10, x1 = b.left - g.left + 10, y = (a.top + a.bottom) / 2 - g.top;
    const col = css('--signal');
    bctx.strokeStyle = col; bctx.fillStyle = col;
    if (!tx) {
      bctx.globalAlpha = 0.35; bctx.setLineDash([3, 7]); bctx.lineWidth = 1;
      bctx.beginPath(); bctx.moveTo(x0, y); bctx.lineTo(x1, y); bctx.stroke(); bctx.setLineDash([]);
    } else {
      const k = (tx.freq > 10000 ? tx.freq / 17000 * 0.22 : tx.freq / 1800 * 0.12), len = x1 - x0;
      for (let layer = 0; layer < 2; layer++) {
        bctx.globalAlpha = layer ? 0.35 : 0.95; bctx.lineWidth = layer ? 3 : 1.6;
        bctx.shadowColor = col; bctx.shadowBlur = layer ? 0 : 16;
        bctx.beginPath();
        for (let x = 0; x <= len; x += 2) {
          const env = Math.sin(Math.PI * x / len);
          const yy = y + env * 22 * Math.sin(x * k - t * 0.02 + layer);
          if (x === 0) bctx.moveTo(x0 + x, yy); else bctx.lineTo(x0 + x, yy);
        }
        bctx.stroke();
      }
      bctx.shadowBlur = 0;
    }
    particles = particles.filter(function (p) { return p.x <= 1; });
    particles.forEach(function (p) {
      p.x += p.v;
      bctx.globalAlpha = Math.sin(Math.PI * p.x);
      bctx.beginPath(); bctx.arc(x0 + (x1 - x0) * p.x, y, 3, 0, 6.283); bctx.fill();
    });
    bctx.globalAlpha = 1;
  }

  /* ---------- Phone receiver: QR code with the key ---------- */
  const qrCanvas = $('phone-qr'), phoneLink = $('phone-link');
  function receiverUrl() {
    // Keys only use letters, digits, "/" and "-", which are safe in a link
    const base = /^https?:$/.test(location.protocol)
      ? new URL('receive.html', location.href).href
      : 'https://bhajanth13.github.io/cipher-forge/receive.html';
    return base + '?key=' + CF.app.keyCode();
  }
  function updatePhone() {
    const url = receiverUrl();
    phoneLink.href = url;
    try { CF.qr.draw(qrCanvas, url, { size: innerWidth < 560 ? 170 : 190, dark: '#0A0F16', light: '#F4F7FA' }); } catch (e) { /* too long */ }
  }
  document.addEventListener('cf:change', updatePhone);
  updatePhone();

  /* ---------- Band readouts ---------- */
  const hudBand = $('hud-band'), bandNote = $('band-note');
  document.addEventListener('cf:band', function (e) {
    const silent = e.detail.band === 'silent';
    hudBand.textContent = silent ? 'SILENT' : 'AUDIBLE';
    bandNote.textContent = silent
      ? 'Silent: 16.9–18.9 kHz near-ultrasound, sent a little slower. Turn the volume up and keep the phone close. If nothing arrives, play the test tone: if the receiver’s Silent meter stays quiet, this speaker can’t do ultrasound, so use Audible.'
      : 'Audible: 1.4–4.65 kHz, works on almost every speaker.';
  });

  /* ---------- Cards flip in, numbers count up ---------- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        if (e.target.classList.contains('why-card')) e.target.classList.add('in-view');
        else if (e.target.dataset.count !== undefined) countUp(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.35 });
    document.querySelectorAll('.why-card').forEach(function (c, i) { c.style.transitionDelay = (i * 120) + 'ms'; io.observe(c); });
    document.querySelectorAll('[data-count]').forEach(function (n) { io.observe(n); });
  } else {
    document.querySelectorAll('.why-card').forEach(function (c) { c.classList.add('in-view'); });
  }

  /* ---------- Nav progress ---------- */
  const bar = $('progress');

  /* ---------- Slow, smooth glide for links within the page ---------- */
  // The browser's own smooth scroll is quick over long distances; this one
  // takes 1.7–3 s with a gentle ease, so the tunnel and layers fly past.
  let glide = 0;
  function glideTo(y) {
    cancelAnimationFrame(glide);
    const from = scrollY, dist = y - from;
    if (Math.abs(dist) < 2) return;
    if (reduce) { window.scrollTo(0, y); return; }
    const dur = clamp(1100 + Math.abs(dist) * 0.45, 1700, 3000);
    const t0 = performance.now();
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';                    // steer every frame ourselves
    function step(now) {
      const k = clamp((now - t0) / dur, 0, 1);
      window.scrollTo(0, from + dist * ease(k));
      if (k < 1) glide = requestAnimationFrame(step);
      else html.style.scrollBehavior = prev;
    }
    glide = requestAnimationFrame(step);
    // Any wheel, touch or key from the visitor takes over at once
    const stop = function () {
      cancelAnimationFrame(glide); html.style.scrollBehavior = prev;
      ['wheel', 'touchstart', 'keydown'].forEach(function (ev) { removeEventListener(ev, stop); });
    };
    ['wheel', 'touchstart', 'keydown'].forEach(function (ev) { addEventListener(ev, stop, { passive: true, once: true }); });
  }
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      const target = document.getElementById(a.getAttribute('href').slice(1));
      if (!target) return;
      e.preventDefault();
      glideTo(target.getBoundingClientRect().top + scrollY - (target.id === 'console' ? 70 : 0));
      history.replaceState(null, '', a.getAttribute('href'));
    });
  });

  /* ---------- One loop for everything ---------- */
  function visible(el) { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }
  function frame(t) {
    const p = heroProgress();
    drawStars(t);
    if (visible(hero)) { drawTunnel(t, p); drawWave(t, p); }
    if (visible(journey)) drawJourney(t);
    if (visible(grid)) drawBeam(t);
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = (max > 0 ? scrollY / max * 100 : 0) + '%';
    if (!reduce) requestAnimationFrame(frame);
  }
  function resize() { sizeStars(); sizeWave(); sizeBeam(); if (reduce) frame(0); }
  window.addEventListener('resize', resize);
  if (reduce) window.addEventListener('scroll', function () { requestAnimationFrame(frame); }, { passive: true });
  resize();
  requestAnimationFrame(frame);
})();
