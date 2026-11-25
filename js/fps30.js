/* =========================================================
   Cipher Forge — fps30.js
   Caps every requestAnimationFrame loop on the page at 30 frames
   per second. Load it first, before any other script.
   All callbacks queued for a frame run together, so the canvases,
   3D camera moves and scroll effects stay in step with each other.
   Code that smooths per frame reads window.CF_FPS and scales its
   factors, so motion keeps the same speed at 30 fps as at 60.
   ========================================================= */
(function () {
  'use strict';
  if (window.CF_FPS || !window.requestAnimationFrame) return;
  var FPS = 30, STEP = 1000 / FPS;
  window.CF_FPS = FPS;
  // Per-frame smoothing written for 60 fps, converted for this rate: k60 -> k
  window.CF_K = function (k) { return 1 - Math.pow(1 - k, 60 / FPS); };

  var nativeRAF = window.requestAnimationFrame.bind(window);
  var nativeCAF = window.cancelAnimationFrame.bind(window);
  var queue = new Map(), nextId = 1, pumping = false, last = 0;

  function pump(now) {
    // 1 ms of slack so a 60 Hz screen fires on every second refresh
    if (last && now - last < STEP - 1) { nativeRAF(pump); return; }
    last = (last && now - last < STEP * 2) ? last + STEP : now;   // keep an even beat; resync after a stall
    var jobs = queue; queue = new Map(); pumping = false;
    jobs.forEach(function (cb) {
      try { cb(now); } catch (e) { setTimeout(function () { throw e; }); }
    });
    if (queue.size && !pumping) { pumping = true; nativeRAF(pump); }
  }

  window.requestAnimationFrame = function (cb) {
    var id = nextId++;
    queue.set(id, cb);
    if (!pumping) { pumping = true; nativeRAF(pump); }
    return id;
  };
  window.cancelAnimationFrame = function (id) { queue.delete(id); };
  // keep the native pair reachable for anything that truly needs every refresh
  window.CF_nativeRAF = nativeRAF; window.CF_nativeCAF = nativeCAF;
})();
