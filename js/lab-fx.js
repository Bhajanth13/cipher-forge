/* =========================================================
   Cipher Forge — lab-fx.js
   The lab page's signal-chamber touches: star field, a title
   that decodes itself, HUD readouts, the Present button in
   the hero, and a slow glide for links within the page.
   ========================================================= */
(function () {
  'use strict';

  const $ = function (id) { return document.getElementById(id); };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  const ease = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  /* ---------- Stars ---------- */
  const stars = $('fx-stars');
  const g = stars.getContext('2d');
  let seed = 23;
  const rand = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const STAR = [];
  for (let i = 0; i < 160; i++) STAR.push({ x: rand(), y: rand(), r: 0.4 + rand() * 1.3, d: 0.05 + rand() * 0.35, ph: rand() * 6.28, sp: 0.5 + rand() * 1.5 });
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
  window.addEventListener('resize', function () { size(); if (reduce) draw(0); });
  if (reduce) window.addEventListener('scroll', function () { requestAnimationFrame(draw); }, { passive: true });
  size();
  requestAnimationFrame(draw);

  /* ---------- The title decodes itself on arrival ---------- */
  (function () {
    const el = $('hero-title');
    if (!el) return;
    const lines = ['Cipher', 'Forge'];
    el.setAttribute('aria-label', 'Cipher Forge');
    if (reduce) return;
    let f = 0; const total = 36;
    (function step() {
      f++;
      el.innerHTML = lines.map(function (line) {
        const done = Math.floor((f / total) * line.length);
        return line.split('').map(function (c, i) {
          if (i < done) return c;
          const r = LETTERS[Math.floor(Math.random() * 26)];
          return c === c.toUpperCase() ? r : r.toLowerCase();
        }).join('');
      }).join('<br>');
      if (f < total) requestAnimationFrame(step); else el.innerHTML = lines.join('<br>');
    })();
  })();

  /* ---------- HUD readouts ---------- */
  const hudKey = $('hud-key'), hudK = $('hud-k'), heroK = $('hero-k');
  function key() { if (CF.app && hudKey) hudKey.textContent = CF.app.keyCode().toUpperCase(); }
  document.addEventListener('cf:change', key);
  key();
  if (heroK && hudK) new MutationObserver(function () { hudK.textContent = heroK.textContent; }).observe(heroK, { childList: true, characterData: true, subtree: true });

  /* ---------- Present from the hero ---------- */
  if ($('hero-present')) $('hero-present').addEventListener('click', function () { $('tour-start').click(); });

  /* ---------- Slow glide for links within the page ---------- */
  let glide = 0;
  function glideTo(y) {
    cancelAnimationFrame(glide);
    const from = scrollY, dist = y - from;
    if (Math.abs(dist) < 2) return;
    if (reduce) { window.scrollTo(0, y); return; }
    const dur = clamp(1100 + Math.abs(dist) * 0.25, 1500, 3000);
    const t0 = performance.now();
    const html = document.documentElement, prev = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    function stop() {
      cancelAnimationFrame(glide); html.style.scrollBehavior = prev;
      ['wheel', 'touchstart', 'keydown'].forEach(function (ev) { removeEventListener(ev, stop); });
    }
    function step(now) {
      const k = clamp((now - t0) / dur, 0, 1);
      window.scrollTo(0, from + dist * ease(k));
      if (k < 1) glide = requestAnimationFrame(step); else stop();
    }
    glide = requestAnimationFrame(step);
    ['wheel', 'touchstart', 'keydown'].forEach(function (ev) { addEventListener(ev, stop, { passive: true, once: true }); });
  }
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      const id = a.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target || a.classList.contains('skip')) return;
      e.preventDefault();
      const top = id === 'top' ? 0 : target.getBoundingClientRect().top + scrollY - 64;
      glideTo(top);
      history.replaceState(null, '', '#' + id);
    });
  });
})();
