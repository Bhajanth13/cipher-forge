/* =========================================================
   Cipher Forge — opening page options: the shared engine.
   A sticky full-screen canvas, scroll progress p from 0 to 1
   (smoothed), a simple 3D camera with perspective projection,
   and copy layers that fade in and out at set points of p.
   Each option supplies OP.scene = { init, draw }.
   ========================================================= */
window.OP = (function () {
  if (!document.getElementById('op-cv')) return null;
  'use strict';
  const cv = document.getElementById('op-cv'), ctx = cv.getContext('2d');
  const hero = document.getElementById('top');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  const lerp = function (a, b, t) { return a + (b - a) * t; };
  const ease = function (t) { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const span = function (p, a, b) { return clamp((p - a) / (b - a), 0, 1); };
  const AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const mod = function (x, n) { return ((x % n) + n) % n; };

  let W = 0, H = 0, F = 1, dpr = 1;
  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
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
  const layers = Array.prototype.slice.call(document.querySelectorAll('#top [data-in]')).map(function (el) {
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
    const box = document.getElementById('op-cap');
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

  function hud(id, text) { const el = document.getElementById('op-' + id); if (el && el.innerHTML !== text) el.innerHTML = text; }

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
    if (hero.getBoundingClientRect().bottom < 0) { requestAnimationFrame(frame); return; }
    readScroll();
    const k = reduce ? 1 : 0.12;
    p += (target - p) * k;
    if (Math.abs(target - p) < 0.0002) p = target;
    vel = lerp(vel, (p - last) * 60, 0.2); last = p;
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    if (api.scene) api.scene.draw(p, t / 1000);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    setLayers(); setCaption();
    const m = document.querySelector('#top .op-hud .meter span');
    if (m) m.style.top = (p * 100).toFixed(2) + '%';
    requestAnimationFrame(frame);
  }
  window.addEventListener('resize', function () { size(); if (api.scene && api.scene.resize) api.scene.resize(); });
  size();
  api.start = function () { if (api.scene && api.scene.init) api.scene.init(); requestAnimationFrame(frame); };
  return api;
})();

(function () {
  if (!window.OP) return;

  'use strict';
  const O = OP, ctx = O.ctx, AZ = O.AZ;
  const N = 26, G = 560, R = 440;
  const dust = [];
  for (let i = 0; i < 220; i++) {
    const a = O.rand() * 6.283, r = 520 + O.rand() * 900;
    dust.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, z: O.rand() * N * G, l: 30 + O.rand() * 140 });
  }
  function fog(z) { return O.clamp(1 - (z - 300) / 7600, 0, 1) * O.clamp((z - 40) / 380, 0, 1); }

  O.captions([
    [0.13, 0.36, 'Every ring is the alphabet', 'Each ring is the set S = {A, …, Z} laid around a circle: 26 symbols at positions 0 to 25.', '|S| = 26'],
    [0.36, 0.62, 'Ring k is shifted k places', 'The letter on top of ring k is A moved k places forward. Ring 3 shows D, ring 7 shows H.', 'f(x) = (x + k) mod 26'],
    [0.62, 0.85, 'After Z comes A again', 'Positions wrap around. That is why the alphabet is a ring and the arithmetic is mod 26.', 'Z + 1 = 25 + 1 = 26 ≡ 0 = A']
  ]);

  O.scene = {
    draw: function (p, t) {
      const cam = O.cam, lin = O.span(p, 0.04, 0.92), fly = 0.3 * O.ease(lin) + 0.7 * lin;
      cam.z = -1100 + fly * ((N - 1) * G - 400);
      cam.x = Math.sin(p * 5.2) * 70; cam.y = Math.cos(p * 4.1) * 40;
      cam.roll = -fly * 1.15 + (O.reduce ? 0 : Math.sin(t * 0.25) * 0.015);
      cam.yaw = 0; cam.pitch = 0;

      ctx.lineCap = 'round';
      // dust streaks
      const streak = 1 + Math.min(10, Math.abs(O.vel) * 260);
      ctx.strokeStyle = '#72E2FF';
      dust.forEach(function (d) {
        let z = ((d.z - cam.z) % (N * G) + N * G) % (N * G) + cam.z;
        const a = O.project(d.x, d.y, z), b = O.project(d.x, d.y, z + d.l * streak);
        if (!a || !b) return;
        O.glowLine(a.x, a.y, b.x, b.y, '#72E2FF', Math.max(0.6, a.s * 2.2), 0.35 * fog(a.z));
      });

      // rings, far to near
      let ahead = -1;
      for (let k = N - 1; k >= 0; k--) {
        const z = k * G;
        if (z - cam.z < 40) continue;
        const settle = O.ease(O.clamp((cam.z - (z - 3200)) / 2200, 0, 1));
        const spin = (1 - settle) * (k % 2 ? 1 : -1) * 2.4;
        const c = O.project(0, 0, z);
        if (!c) continue;
        const f = fog(c.z);
        if (f <= 0.01) continue;
        if (c.s * R < Math.max(O.W, O.H) * 0.62) ahead = k;   // nearest ring that fits on screen
        // ring band
        ctx.globalAlpha = 0.5 * f; ctx.strokeStyle = '#72E2FF'; ctx.lineWidth = Math.max(0.6, 3 * c.s);
        ctx.beginPath();
        for (let i = 0; i <= 72; i++) {
          const a = i / 72 * 6.2832, q = O.project(Math.cos(a) * (R + 46), Math.sin(a) * (R + 46), z);
          if (!q) continue; i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
        }
        ctx.stroke();
        ctx.globalAlpha = 0.18 * f; ctx.lineWidth = Math.max(0.5, 1.2 * c.s);
        ctx.beginPath();
        for (let i = 0; i <= 72; i++) {
          const a = i / 72 * 6.2832, q = O.project(Math.cos(a) * (R - 44), Math.sin(a) * (R - 44), z);
          if (!q) continue; i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
        }
        ctx.stroke();
        // letters
        const fs = 44 * c.s;
        ctx.font = '500 ' + fs.toFixed(1) + 'px "IBM Plex Mono", monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (let j = 0; j < N; j++) {
          const th = Math.PI / 2 + (j - k) * (6.2832 / N) + spin;
          const q = O.project(Math.cos(th) * R, Math.sin(th) * R, z);
          if (!q) continue;
          const top = j === k && settle > 0.97;
          // tick between letters
          const th2 = th + Math.PI / N, t1 = O.project(Math.cos(th2) * (R + 30), Math.sin(th2) * (R + 30), z), t2 = O.project(Math.cos(th2) * (R + 46), Math.sin(th2) * (R + 46), z);
          if (t1 && t2) O.glowLine(t1.x, t1.y, t2.x, t2.y, '#72E2FF', Math.max(0.5, 1.4 * c.s), 0.4 * f);
          ctx.save();
          ctx.translate(q.x, q.y); ctx.rotate(-(th - Math.PI / 2) - cam.roll);
          if (top) { ctx.shadowColor = '#D9AE5C'; ctx.shadowBlur = 24 * f; ctx.fillStyle = '#F2CD84'; ctx.globalAlpha = f; }
          else { ctx.fillStyle = '#A9C4D6'; ctx.globalAlpha = 0.62 * f; }
          ctx.fillText(AZ[j], 0, 0);
          ctx.restore();
        }
        // the top window: brass bracket around the shifted letter
        if (settle > 0.97) {
          const a1 = O.project(-40, R + 52, z), a2 = O.project(40, R + 52, z), b1 = O.project(-40, R - 52, z), b2 = O.project(40, R - 52, z);
          if (a1 && a2 && b1 && b2) {
            ctx.globalAlpha = 0.9 * f; ctx.strokeStyle = '#D9AE5C'; ctx.lineWidth = Math.max(0.8, 2.2 * c.s);
            ctx.beginPath(); ctx.moveTo(a1.x, a1.y); ctx.lineTo(a2.x, a2.y); ctx.lineTo(b2.x, b2.y); ctx.lineTo(b1.x, b1.y); ctx.closePath(); ctx.stroke();
            if (c.s * 44 > 9) {
              const lb = O.project(0, R + 92, z);
              if (lb) {
                ctx.save(); ctx.translate(lb.x, lb.y); ctx.rotate(-cam.roll);
                ctx.globalAlpha = 0.85 * f; ctx.fillStyle = '#D9AE5C'; ctx.font = '500 ' + (20 * c.s).toFixed(1) + 'px "IBM Plex Mono", monospace';
                ctx.fillText('k = ' + k, 0, 0); ctx.restore();
              }
            }
          }
        }
      }
      ctx.shadowBlur = 0;
      if (ahead < 0) ahead = N - 1;
      O.hud('hb', 'SHIFT k = <b>' + ahead + '</b>');
      O.hud('hd', 'TOP LETTER ' + AZ[ahead] + ' = A + ' + ahead);
    }
  };
  O.start();
})();

/* Drive through the tunnel at medium speed (about 10 s for the whole tunnel), then call done(). */
window.CFOpening = (function () {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = 0;
  function drive(done) {
    cancelAnimationFrame(raf);
    const hero = document.getElementById('top');
    const start = hero.offsetTop, end = hero.offsetTop + hero.offsetHeight - innerHeight;
    const from = Math.max(start, Math.min(scrollY, end)), dist = end - from;
    const dur = reduce ? 0 : Math.max(1200, 10000 * dist / Math.max(1, end - start));
    const t0 = performance.now();
    document.documentElement.style.scrollBehavior = 'auto';
    (function step(now) {
      const k = dur ? Math.min(1, (now - t0) / dur) : 1;
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      window.scrollTo(0, from + dist * e);
      if (k < 1) raf = requestAnimationFrame(step);
      else { raf = 0; document.documentElement.style.scrollBehavior = ''; if (done) done(); }
    })(t0);
  }
  function busy() { return raf !== 0; }
  function stop() { cancelAnimationFrame(raf); raf = 0; }
  const btn = document.getElementById('op-drive');
  if (btn) btn.addEventListener('click', function () {
    drive(function () {
      if (document.documentElement.classList.contains('deck') && window.CFDeck) window.CFDeck.go(1, 0);
      else { const a = document.getElementById('alphabet'); if (a) { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, a.offsetTop - 64); document.documentElement.style.scrollBehavior = ''; } }
    });
  });
  return { drive: drive, busy: busy, stop: stop };
})();
