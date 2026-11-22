/* =========================================================
   Cipher Forge — orbit.js
   Turn, move and zoom every 3D model by hand, like an STL viewer.

   Mouse:  drag to rotate · Shift-drag, right-drag or middle-drag to move
           Ctrl / ⌘ + scroll (or trackpad pinch) to zoom · double-click to reset
   Touch:  tap the hand button, then one finger rotates and two fingers
           move and pinch-zoom (the page scrolls normally until then)
   Keys:   the toolbar buttons reset and zoom; arrow keys rotate when the
           toolbar has focus, Shift + arrows move

   Each model's existing animation keeps running: the hand controls sit in a
   wrapper around it, so they add to whatever the page is already doing.
   ========================================================= */
(function () {
  'use strict';
  const STAGES = [
    // host (where you grab it)   3D root(s) to wrap              pivot
    ['.dv-hero-stage', '#hero-cam', '50% 50%'],
    ['#ex-stage', '#ex-cam', '50% 50%'],
    ['.bloom-stage', '#bloom-cam', '50% 50%'],
    ['#jr-stage', '#jr-cam', '50% 50%'],
    ['#lb-stage', '#lb-cam', '50% 50%'],
    ['.range-scene', '.range-plane', '50% 45%'],
    ['.dish-stage', '#dish-cam', '50% 58%', 'mini'],
    ['.stack-stage', '#stack', '50% 50%'],
    ['.rotor-stage', '#rig', '56% 50%'],
    ['#ring-stage', '#ring', '50% 50%']
  ];
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const INTERACTIVE = 'a, button, input, select, textarea, label, summary, [role="button"], [role="tab"], [contenteditable], .orbit-bar';
  const clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  const ICON = {
    reset: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8a5 5 0 1 0 1.6-3.7M3 2.5v2.8h2.8"/></svg>',
    minus: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8h9"/></svg>',
    plus: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8h9M8 3.5v9"/></svg>',
    hand: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 8.5V3.8a1 1 0 0 1 2 0V7.5m0-4.6a1 1 0 0 1 2 0V7.5m0-3.5a1 1 0 0 1 2 0v4.6m0-2.6a1 1 0 0 1 2 0v3.4c0 2.7-1.9 4.6-4.5 4.6-1.6 0-2.7-.6-3.6-1.8L3 9.4a1 1 0 0 1 1.5-1.2l1 1"/></svg>'
  };

  function setup(host, roots, pivot, mini) {
    if (!roots.length || host.dataset.orbit) return;
    host.dataset.orbit = '1';

    // keep screen readers' view of the page unchanged: hide the model, not the controls
    if (host.getAttribute('aria-hidden') === 'true') {
      host.removeAttribute('aria-hidden');
      Array.prototype.forEach.call(host.children, function (c) { c.setAttribute('aria-hidden', 'true'); });
    }
    // the wrapper sits between the perspective element and the model's own camera
    const wrap = document.createElement('div');
    wrap.className = 'orbit-wrap';
    wrap.style.transformOrigin = pivot;
    roots[0].parentNode.insertBefore(wrap, roots[0]);
    roots.forEach(function (r) { wrap.appendChild(r); });

    const v = { yaw: 0, pitch: 0, x: 0, y: 0, z: 1 };
    let raf = 0;
    function apply(animate) {
      wrap.classList.toggle('orbit-anim', !!animate && !reduce);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        wrap.style.transform = 'translate3d(' + v.x.toFixed(1) + 'px,' + v.y.toFixed(1) + 'px,0) rotateX(' + v.pitch.toFixed(2) + 'deg) rotateY(' + v.yaw.toFixed(2) + 'deg) scale(' + v.z.toFixed(3) + ')';
        host.classList.toggle('orbit-moved', v.yaw !== 0 || v.pitch !== 0 || v.x !== 0 || v.y !== 0 || v.z !== 1);
        // overlays pinned to the model (callouts, holograms) follow it
        window.dispatchEvent(new CustomEvent('orbitchange'));
        if (animate) { let n = 0; (function follow() { window.dispatchEvent(new CustomEvent('orbitchange')); if (++n < 40) requestAnimationFrame(follow); })(); }
      });
    }
    function reset() { v.yaw = 0; v.pitch = 0; v.x = 0; v.y = 0; v.z = 1; apply(true); }
    function zoomBy(f) { v.z = clamp(v.z * f, 0.4, 3.5); apply(true); }

    /* ---- toolbar ---- */
    const bar = document.createElement('div');
    bar.className = 'orbit-bar' + (mini ? ' mini' : '');
    const btn = function (cls, label, icon) { return '<button type="button" class="ob ' + cls + '" aria-label="' + label + '" title="' + label + '">' + icon + '</button>'; };
    bar.innerHTML =
      '<span class="orbit-hint mono">' + (coarse ? 'Tap the hand, then drag to rotate · two fingers move and zoom' : 'Drag to rotate · Shift-drag to move · Ctrl + scroll to zoom · double-click to reset') + '</span>' +
      (coarse ? btn('ob-hand', 'Rotate and move with your fingers', ICON.hand) : '') +
      (mini ? '' : btn('ob-out', 'Zoom out', ICON.minus) + btn('ob-in', 'Zoom in', ICON.plus)) +
      btn('ob-reset', 'Reset the view', ICON.reset);
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'View controls: arrow keys rotate, Shift and arrow keys move');
    host.appendChild(bar);
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    bar.querySelector('.ob-reset').addEventListener('click', reset);
    if (!mini) {
      bar.querySelector('.ob-in').addEventListener('click', function () { zoomBy(1.2); });
      bar.querySelector('.ob-out').addEventListener('click', function () { zoomBy(1 / 1.2); });
    }
    let hand = false;
    const handBtn = bar.querySelector('.ob-hand');
    if (handBtn) {
      handBtn.setAttribute('aria-pressed', 'false');
      handBtn.addEventListener('click', function () {
        hand = !hand;
        host.classList.toggle('orbit-hand', hand);
        handBtn.setAttribute('aria-pressed', String(hand));
      });
    }
    bar.addEventListener('keydown', function (e) {
      const step = e.shiftKey ? 12 : 8;
      const k = e.key;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(k) < 0) return;
      e.preventDefault();
      if (e.shiftKey) {
        if (k === 'ArrowLeft') v.x -= step; if (k === 'ArrowRight') v.x += step;
        if (k === 'ArrowUp') v.y -= step; if (k === 'ArrowDown') v.y += step;
      } else {
        if (k === 'ArrowLeft') v.yaw -= step; if (k === 'ArrowRight') v.yaw += step;
        if (k === 'ArrowUp') v.pitch = clamp(v.pitch + step, -85, 85); if (k === 'ArrowDown') v.pitch = clamp(v.pitch - step, -85, 85);
      }
      apply(true);
    });

    /* ---- pointers ---- */
    const pts = new Map();
    let mode = null, start = null, moved = false, pinch = null;
    host.addEventListener('pointerdown', function (e) {
      if (e.target.closest(INTERACTIVE)) return;
      if (e.pointerType === 'touch' && !hand) return;          // let the page scroll
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) {
        mode = (e.button === 1 || e.button === 2 || e.shiftKey) ? 'pan' : 'rot';
        start = { x: e.clientX, y: e.clientY, v: Object.assign({}, v) };
        moved = false;
      } else if (pts.size === 2) {
        const p = Array.from(pts.values());
        pinch = { d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), cx: (p[0].x + p[1].x) / 2, cy: (p[0].y + p[1].y) / 2, v: Object.assign({}, v) };
        mode = 'pinch';
      }
      try { host.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    host.addEventListener('pointermove', function (e) {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (mode === 'pinch' && pts.size >= 2) {
        const p = Array.from(pts.values());
        const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), cx = (p[0].x + p[1].x) / 2, cy = (p[0].y + p[1].y) / 2;
        v.z = clamp(pinch.v.z * d / Math.max(1, pinch.d), 0.4, 3.5);
        v.x = pinch.v.x + cx - pinch.cx; v.y = pinch.v.y + cy - pinch.cy;
        moved = true; apply(false); return;
      }
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (!moved && Math.hypot(dx, dy) < 4) return;
      if (!moved) { moved = true; host.classList.add('orbit-dragging'); }
      if (mode === 'pan') { v.x = start.v.x + dx; v.y = start.v.y + dy; }
      else { v.yaw = start.v.yaw + dx * 0.45; v.pitch = clamp(start.v.pitch - dy * 0.45, -85, 85); }
      apply(false);
    });
    const end = function (e) {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      if (pts.size === 1 && mode === 'pinch') {
        const p = Array.from(pts.values())[0];
        mode = 'rot'; start = { x: p.x, y: p.y, v: Object.assign({}, v) };
      }
      if (pts.size === 0) {
        host.classList.remove('orbit-dragging');
        if (moved) {
          // a drag is not a click on whatever is under the pointer
          const stop = function (ev) { ev.stopPropagation(); ev.preventDefault(); };
          host.addEventListener('click', stop, { capture: true, once: true });
          setTimeout(function () { host.removeEventListener('click', stop, { capture: true }); }, 0);
        }
        mode = null;
      }
    };
    host.addEventListener('pointerup', end);
    host.addEventListener('pointercancel', end);
    host.addEventListener('contextmenu', function (e) { if (!e.target.closest(INTERACTIVE)) e.preventDefault(); });
    host.addEventListener('dblclick', function (e) { if (!e.target.closest(INTERACTIVE)) reset(); });
    host.addEventListener('wheel', function (e) {
      if (!(e.ctrlKey || e.metaKey)) return;                  // plain scroll still scrolls the page
      e.preventDefault();
      v.z = clamp(v.z * Math.exp(-e.deltaY * 0.0022), 0.4, 3.5);
      apply(false);
    }, { passive: false });
  }

  function init() {
    STAGES.forEach(function (s) {
      document.querySelectorAll(s[0]).forEach(function (host) {
        const roots = Array.prototype.slice.call(host.querySelectorAll(s[1]));
        setup(host, roots, s[2], s[3] === 'mini');
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
