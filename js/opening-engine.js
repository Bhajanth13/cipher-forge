/* =========================================================
   Cipher Forge — opening page options: the shared engine.
   A sticky full-screen canvas, scroll progress p from 0 to 1
   (smoothed), a simple 3D camera with perspective projection,
   and copy layers that fade in and out at set points of p.
   Each option supplies OP.scene = { init, draw }.
   ========================================================= */
window.OP = (function () {
  'use strict';
  const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  const hero = document.getElementById('hero');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  const lerp = function (a, b, t) { return a + (b - a) * t; };
  const ease = function (t) { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const span = function (p, a, b) { return clamp((p - a) / (b - a), 0, 1); };
  const AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const mod = function (x, n) { return ((x % n) + n) % n; };

  let W = 0, H = 0, F = 1, dpr = 1;
  function size() {
    dpr = Math.min(1.5, window.devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    F = Math.min(W, H) * 1.05;                 // focal length in px
  }

  /* ---------- camera: position, then yaw (around y), pitch (around x), roll ---------- */
  const cam = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, f: 1, sx: 0, sy: 0 };   // sx, sy: shift the picture on screen (fraction of width / height)
  // World: x right, y up, z forward (away from the viewer). Returns screen x, y, scale s and depth z.
  function project(x, y, z) {
    let dx = x - cam.x, dy = y - cam.y, dz = z - cam.z;
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
    let x1 = dx * cy - dz * sy, z1 = dx * sy + dz * cy;
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    let y1 = dy * cp - z1 * sp, z2 = dy * sp + z1 * cp;
    if (cam.roll) { const cr = Math.cos(cam.roll), sr = Math.sin(cam.roll); const t = x1 * cr - y1 * sr; y1 = x1 * sr + y1 * cr; x1 = t; }
    if (z2 < 12) return null;
    const s = F * cam.f / z2;
    return { x: W * (0.5 + cam.sx) + x1 * s, y: H * (0.5 + cam.sy) - y1 * s, s: s, z: z2 };
  }

  // Point the camera at a target
  function lookAt(tx, ty, tz) {
    const dx = tx - cam.x, dy = ty - cam.y, dz = tz - cam.z;
    cam.yaw = Math.atan2(dx, dz);
    cam.pitch = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));
  }

  /* ---------- scroll progress ---------- */
  let target = 0, p = 0, last = 0, vel = 0;
  function readScroll() {
    const r = hero.getBoundingClientRect();
    target = clamp(-r.top / Math.max(1, hero.offsetHeight - innerHeight), 0, 1);
  }

  /* ---------- copy layers ---------- */
  const layers = Array.prototype.slice.call(document.querySelectorAll('[data-in]')).map(function (el) {
    return { el: el, a: parseFloat(el.dataset.in), b: parseFloat(el.dataset.out), base: el.style.transform || getComputedStyle(el).transform };
  });
  function setLayers() {
    layers.forEach(function (L) {
      const fade = 0.05;
      const o = Math.min(span(p, L.a - fade, L.a), 1 - span(p, L.b - fade, L.b));
      const shown = L.a <= 0 ? 1 - span(p, L.b - fade, L.b) : o;
      L.el.style.opacity = shown.toFixed(3);
      L.el.style.visibility = shown < 0.01 ? 'hidden' : 'visible';
      L.el.style.filter = shown < 0.99 ? 'blur(' + ((1 - shown) * 8).toFixed(1) + 'px)' : 'none';
    });
  }

  /* ---------- captions that change with p ---------- */
  let caps = [], capIdx = -2;
  function setCaption() {
    const box = document.getElementById('cap');
    if (!box) return;
    let i = -1;
    caps.forEach(function (c, k) { if (p >= c[0] && p < c[1]) i = k; });
    if (i !== capIdx) {
      capIdx = i;
      box.getAnimations().forEach(function (a) { a.cancel(); });
      if (i < 0) { box.style.opacity = 0; return; }
      box.style.opacity = '';
      const c = caps[i];
      box.innerHTML = '<p class="cap-k">' + c[2] + '</p><p class="cap-t">' + c[3] + '</p>' + (c[4] ? '<p class="cap-m">' + c[4] + '</p>' : '');
      box.animate([{ opacity: 0, transform: 'translate(-50%, 14px)', filter: 'blur(6px)' }, { opacity: 1, transform: 'translate(-50%, 0)', filter: 'blur(0)' }], { duration: reduce ? 1 : 520, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' });
    }
  }

  function hud(id, text) { const el = document.getElementById(id); if (el && el.innerHTML !== text) el.innerHTML = text; }

  /* ---------- glow helpers ---------- */
  function glowLine(x1, y1, x2, y2, color, width, alpha) {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  function dot(x, y, r, color, alpha) {
    ctx.globalAlpha = alpha; ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, Math.max(0.3, r), 0, 6.2832); ctx.fill();
  }

  // Deterministic random numbers, so every visit looks the same
  let seed = 7;
  function rand() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }

  /* ---------- loop ---------- */
  const api = {
    ctx: ctx, cam: cam, project: project, lookAt: lookAt, clamp: clamp, lerp: lerp, ease: ease, span: span, AZ: AZ, mod: mod,
    glowLine: glowLine, dot: dot, rand: rand, hud: hud, reduce: reduce,
    get W() { return W; }, get H() { return H; }, get p() { return p; }, get vel() { return vel; },
    captions: function (list) { caps = list; },
    scene: null
  };
  function frame(t) {
    readScroll();
    const k = reduce ? 1 : (window.CF_K ? window.CF_K(0.12) : 0.12);   // 0.12 per frame at 60 fps
    p += (target - p) * k;
    if (Math.abs(target - p) < 0.0002) p = target;
    vel = lerp(vel, (p - last) * (window.CF_FPS || 60), (window.CF_K ? window.CF_K(0.2) : 0.2)); last = p;
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    if (api.scene) api.scene.draw(p, t / 1000);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    setLayers(); setCaption();
    const m = document.querySelector('.hud .meter span');
    if (m) m.style.top = (p * 100).toFixed(2) + '%';
    requestAnimationFrame(frame);
  }
  window.addEventListener('resize', function () { size(); if (api.scene && api.scene.resize) api.scene.resize(); });
  size();
  api.start = function () { if (api.scene && api.scene.init) api.scene.init(); requestAnimationFrame(frame); };
  return api;
})();
