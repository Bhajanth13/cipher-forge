/* =========================================================
   Cipher Forge — fx.js
   Light/dark switch, the 3D field of letters behind the page,
   headings that decrypt themselves, and gentle 3D tilt.
   ========================================================= */
(function () {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const root = document.documentElement;
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  /* ---------- Light / dark switch ---------- */
  const toggle = document.getElementById('theme-toggle');
  function theme() { return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }
  function label() {
    toggle.setAttribute('aria-label', theme() === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
    toggle.title = toggle.getAttribute('aria-label');
  }
  toggle.addEventListener('click', function () {
    const next = theme() === 'light' ? 'dark' : 'light';
    root.classList.add('theme-anim');
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('cf-theme', next); } catch (e) { /* storage may be blocked */ }
    label();
    setTimeout(function () { root.classList.remove('theme-anim'); }, 500);
  });
  label();

  /* ---------- A 3D field of letters that you fly through as you scroll ---------- */
  const field = document.getElementById('glyph-field');
  const glyphs = [];
  const DEPTH = 2400;
  if (!reduce) {
    const count = window.innerWidth < 700 ? 16 : 34;
    let seed = 7;
    const rand = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = 0; i < count; i++) {
      const g = document.createElement('span');
      g.textContent = LETTERS[Math.floor(rand() * 26)];
      // Keep letters out to the sides, away from the reading column
      const sideX = (i % 2 === 0 ? 1 : -1) * (620 + rand() * 900);
      const y = (rand() - 0.5) * 1600;
      const z = rand() * DEPTH;
      const size = 30 + rand() * 50;
      g.style.fontSize = size.toFixed(0) + 'px';
      field.appendChild(g);
      glyphs.push({ el: g, x: sideX, y: y, z: z });
    }
  }

  function moveField() {
    const sy = window.scrollY;
    glyphs.forEach(function (g) {
      // Each letter drifts toward you as you scroll, then wraps to the back
      const z = (g.z + sy * 0.9) % DEPTH;
      const depth = z - DEPTH + 250;               // from far away to just behind the screen
      const near = z / DEPTH;                       // 0 = far, 1 = near
      const fade = Math.min(1, near * 1.6) * (1 - Math.max(0, (near - 0.85) / 0.15));
      g.el.style.transform = 'translate3d(' + g.x.toFixed(0) + 'px,' + g.y.toFixed(0) + 'px,' + depth.toFixed(0) + 'px)';
      g.el.style.opacity = (Math.max(0, fade) * 0.32).toFixed(3);
    });
  }

  /* ---------- Headings that decrypt themselves the first time you see them ---------- */
  function decode(el) {
    const final = el.textContent;
    el.setAttribute('aria-label', final);
    const chars = final.split('');
    const total = 26;
    let frame = 0;
    function step() {
      frame += 1;
      const done = Math.floor((frame / total) * chars.length);
      el.textContent = chars.map(function (c, i) {
        if (i < done || !/[A-Za-z]/.test(c)) return c;      // solved, or not a letter
        const r = LETTERS[Math.floor(Math.random() * 26)];
        return c === c.toUpperCase() ? r : r.toLowerCase();
      }).join('');
      if (frame < total) requestAnimationFrame(step);
      else el.textContent = final;
    }
    requestAnimationFrame(step);
  }
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { decode(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.9 });
    document.querySelectorAll('.chapter h2').forEach(function (h) { io.observe(h); });
  }

  /* ---------- Gentle 3D tilt that follows the pointer ---------- */
  if (finePointer && !reduce) {
    const MAX = 5;
    document.addEventListener('pointermove', function (e) {
      const card = e.target.closest && e.target.closest('.tilt');
      document.querySelectorAll('.tilt.is-tilting').forEach(function (c) {
        if (c !== card) { c.classList.remove('is-tilting'); c.style.transform = ''; }
      });
      if (!card || e.target.closest('input, textarea, select')) return;
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.classList.add('is-tilting');
      card.style.transform = 'perspective(1100px) rotateX(' + (-py * MAX).toFixed(2) + 'deg) rotateY(' + (px * MAX).toFixed(2) + 'deg) translateZ(6px)';
      card.style.setProperty('--gx', ((px + 0.5) * 100).toFixed(1) + '%');
      card.style.setProperty('--gy', ((py + 0.5) * 100).toFixed(1) + '%');
    }, { passive: true });
    document.addEventListener('pointerleave', function () {
      document.querySelectorAll('.tilt.is-tilting').forEach(function (c) { c.classList.remove('is-tilting'); c.style.transform = ''; });
    });
    document.querySelectorAll('.panel, .check, .io-col, .fact').forEach(function (el) { el.classList.add('tilt'); });
  }

  /* ---------- The relation matrix lies flat as it scrolls into view ---------- */
  const matrix = document.querySelector('.matrix-stage svg');
  function tiltMatrix() {
    if (!matrix || reduce) return;
    const r = matrix.getBoundingClientRect(), vh = window.innerHeight;
    const t = Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.75)));
    const e = 1 - t;
    matrix.style.transform = 'rotateX(' + (e * 55).toFixed(1) + 'deg) rotateZ(' + (e * -18).toFixed(1) + 'deg) scale(' + (0.86 + 0.14 * t).toFixed(3) + ')';
  }

  let ticking = false;
  function frame() { ticking = false; moveField(); tiltMatrix(); }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }, { passive: true });
  frame();
})();
