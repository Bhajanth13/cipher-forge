/* Opening 2 · Arrow constellation
   Two rings of 26 letters face each other in space: inputs and outputs.
   Beams of light are the arrows of a function. First f(x) = 2x mod 26,
   where pairs of letters crash into one output; then the beams swing to
   f(x) = 5x + 8 mod 26 and every output is lit exactly once. */
(function () {
  'use strict';
  const O = OP, ctx = O.ctx, AZ = O.AZ, N = 26, R = 430, Z = 300;
  const f1 = function (x) { return O.mod(2 * x, N); };
  const f2 = function (x) { return O.mod(5 * x + 8, N); };
  const ang = function (i) { return Math.PI / 2 - i * 6.2832 / N; };
  const stars = [];
  for (let i = 0; i < 420; i++) {
    const u = O.rand() * 2 - 1, a = O.rand() * 6.283, r = 2600 + O.rand() * 2600, s = Math.sqrt(1 - u * u);
    stars.push([r * s * Math.cos(a), r * u, r * s * Math.sin(a), 0.5 + O.rand() * 1.4]);
  }
  const hits1 = new Array(N).fill(0); for (let x = 0; x < N; x++) hits1[f1(x)]++;

  O.captions([
    [0.13, 0.46, 'A function is a set of arrows', 'Each beam takes one input letter to its output. Here f(x) = 2x mod 26: A and N both land on A, B and O both land on C.', 'f(0) = 0 = f(13)  →  not one-to-one'],
    [0.46, 0.62, 'Change the rule', 'Swing every beam to a new rule: multiply by 5, then add 8.', 'f(x) = (5x + 8) mod 26'],
    [0.62, 0.85, 'Now it is a bijection', 'Every output is lit exactly once, so each ciphertext letter points back to one message letter.', 'f⁻¹(y) = 21(y − 8) mod 26,  since 5 × 21 = 105 ≡ 1']
  ]);

  function ringPoint(i, z, r) { const a = ang(i); return [Math.cos(a) * (r || R), Math.sin(a) * (r || R), z]; }
  function bez(a, b, c, t) { const u = 1 - t; return [u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1], u * u * a[2] + 2 * u * t * b[2] + t * t * c[2]]; }
  function mix(a, b, t) { return a + (b - a) * t; }
  function rgb(t) { // red to cyan
    const r = Math.round(mix(255, 114, t)), g = Math.round(mix(122, 226, t)), b = Math.round(mix(102, 255, t));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  O.scene = {
    draw: function (p, t) {
      const cam = O.cam;
      const intro = 0.55 + 0.45 * O.ease(O.span(p, 0, 0.14)), outro = O.ease(O.span(p, 0.86, 1));
      const phi = mix(mix(1.25, 0.42, O.ease(O.span(p, 0.08, 0.8))), -0.25, outro) + (O.reduce ? 0 : Math.sin(t * 0.15) * 0.02);
      const D = mix(mix(2100, 1600, O.ease(O.span(p, 0.05, 0.6))), 2500, outro);
      const h = mix(260, 120, O.span(p, 0, 0.8));
      cam.x = D * Math.sin(phi); cam.z = -D * Math.cos(phi); cam.y = h;
      cam.sx = 0.2 * (1 - O.ease(O.span(p, 0.02, 0.16)));
      cam.sy = -0.07 * O.span(p, 0.1, 0.2) * (1 - outro);
      cam.yaw = -phi; cam.pitch = -Math.atan2(h, D); cam.roll = mix(-0.08, 0.05, p);

      // stars
      stars.forEach(function (s) {
        const q = O.project(s[0], s[1], s[2]);
        if (q) O.dot(q.x, q.y, s[3] * Math.min(1.6, q.s * 2.4), '#BFE9FF', 0.5);
      });

      const grow = O.span(p, 0.1, 0.36), morph = O.ease(O.span(p, 0.47, 0.62)), dim = 1 - 0.65 * outro;
      const hits = morph > 0.5 ? null : hits1;

      // faint ring guides
      [-Z, Z].forEach(function (z, side) {
        ctx.globalAlpha = 0.28 * intro * dim; ctx.strokeStyle = side ? '#D9AE5C' : '#72E2FF'; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i <= 90; i++) { const a = i / 90 * 6.2832, q = O.project(Math.cos(a) * R, Math.sin(a) * R, z); if (q) i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }
        ctx.stroke();
      });

      // beams
      ctx.lineCap = 'round';
      const lit = new Array(N).fill(0);
      for (let x = 0; x < N; x++) {
        const local = O.clamp((grow * 1.6 - x / N * 0.6), 0, 1);
        if (local <= 0) continue;
        const ya = f1(x), yb = f2(x);
        // swing the target around the output ring
        let da = yb - ya; if (da > 13) da -= 26; if (da < -13) da += 26;
        const yt = ya + da * morph;
        const a = ringPoint(x, -Z), c = ringPoint(yt, Z);
        const mid = [(a[0] + c[0]) * 0.5 * 0.35, (a[1] + c[1]) * 0.5 * 0.35, 0];
        const clash = (1 - morph);
        ctx.strokeStyle = rgb(morph);
        const steps = 26, upto = Math.max(1, Math.round(steps * local));
        let prev = O.project(a[0], a[1], a[2]);
        for (let k = 1; k <= upto; k++) {
          const P = bez(a, mid, c, k / steps), q = O.project(P[0], P[1], P[2]);
          if (prev && q) {
            ctx.globalAlpha = (0.32 + 0.4 * clash * 0.6) * dim; ctx.lineWidth = Math.max(0.8, 2.6 * q.s);
            ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
          prev = q;
        }
        // travelling pulse
        if (local >= 1) {
          lit[O.mod(Math.round(yt), N)] += 1;
          const u = O.reduce ? 0.5 : ((t * 0.32 + x / N) % 1), P = bez(a, mid, c, u), q = O.project(P[0], P[1], P[2]);
          if (q) { ctx.shadowColor = rgb(morph); ctx.shadowBlur = 14; O.dot(q.x, q.y, 5 * q.s, '#FFFFFF', 0.9 * dim); ctx.shadowBlur = 0; }
        }
      }

      // nodes and labels
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let side = 0; side < 2; side++) {
        for (let i = 0; i < N; i++) {
          const P = ringPoint(i, side ? Z : -Z), q = O.project(P[0], P[1], P[2]);
          if (!q) continue;
          let color = '#72E2FF', alpha = intro * dim, r = 12 * q.s;
          if (side) {
            const n = lit[i];
            const reached = morph > 0.5 ? n > 0 : hits1[i] > 0;
            if (grow < 1 && morph === 0) { color = '#D9AE5C'; }
            else if (morph < 0.5) { color = hits1[i] > 1 ? '#FF7A66' : '#56606C'; alpha *= reached ? 1 : 0.45; }
            else { color = n === 1 ? '#7CF0B0' : '#D9AE5C'; }
          }
          ctx.shadowColor = color; ctx.shadowBlur = side && morph > 0.9 ? 18 : 8;
          O.dot(q.x, q.y, r, color, alpha);
          ctx.shadowBlur = 0;
          const L = ringPoint(i, side ? Z : -Z, R + 44), ql = O.project(L[0], L[1], L[2]);
          if (ql) {
            ctx.globalAlpha = alpha * 0.95; ctx.fillStyle = side ? '#F0D6A2' : '#CFEFFF';
            ctx.font = '500 ' + (26 * ql.s).toFixed(1) + 'px "IBM Plex Mono", monospace';
            ctx.fillText(AZ[i], ql.x, ql.y);
          }
        }
      }
      // ring titles
      [['inputs x', -Z, '#72E2FF'], ['outputs f(x)', Z, '#D9AE5C']].forEach(function (L) {
        const q = O.project(0, R + 110, L[1]);
        if (!q) return;
        ctx.globalAlpha = 0.8 * intro * dim; ctx.fillStyle = L[2];
        ctx.font = '500 ' + Math.max(10, 24 * q.s).toFixed(1) + 'px "IBM Plex Mono", monospace';
        ctx.fillText(L[0], q.x, q.y);
      });

      if (morph < 0.5) { O.hud('hb', 'f(x) = <b>2x</b> mod 26'); O.hud('hd', '13 CLASHES · 13 UNUSED'); }
      else { O.hud('hb', 'f(x) = <b>5x + 8</b> mod 26'); O.hud('hd', 'BIJECTION · 26 / 26'); }
    }
  };
  O.start();
})();
