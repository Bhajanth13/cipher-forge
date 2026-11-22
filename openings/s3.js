/* Opening 3 · The forge
   HELLO flies through three glass blocks. Each block is a function and
   changes the letters as they pass: shift(3), then multiply(5), then
   mirror. All letters are worked out here from the real rules. */
(function () {
  'use strict';
  const O = OP, ctx = O.ctx, AZ = O.AZ, N = 26;
  const WORD = 'HELLO';
  const BLOCKS = [
    { name: 'f₁  shift(3)', rule: 'x + 3', f: function (x) { return O.mod(x + 3, N); } },
    { name: 'f₂  multiply(5)', rule: '5x mod 26', f: function (x) { return O.mod(5 * x, N); } },
    { name: 'f₃  mirror', rule: '25 − x', f: function (x) { return O.mod(25 - x, N); } }
  ];
  const GAP = 1100, SW = 330, SH = 220;            // slab half-width and half-height
  // stages[s] = the word after s blocks
  const stages = [WORD.split('').map(function (c) { return AZ.indexOf(c); })];
  BLOCKS.forEach(function (b, i) { stages.push(stages[i].map(b.f)); });
  const word = function (s) { return stages[s].map(function (v) { return AZ[v]; }).join(''); };

  O.captions([
    [0.12, 0.34, 'Block 1 · shift(3)', 'Every letter moves three places forward.', word(0) + ' → ' + word(1) + '  ·  f₁(x) = x + 3'],
    [0.34, 0.55, 'Block 2 · multiply(5)', 'K is position 10, and 5 × 10 = 50 ≡ 24 (mod 26), which is Y.', word(1) + ' → ' + word(2) + '  ·  f₂(x) = 5x mod 26'],
    [0.55, 0.74, 'Block 3 · mirror', 'Read the alphabet backwards: position x goes to 25 − x.', word(2) + ' → ' + word(3) + '  ·  f₃(x) = 25 − x'],
    [0.74, 0.85, 'One function, built from three', 'The cipher is the composition of the blocks. The block on the right runs first.', 'F = f₃ ∘ f₂ ∘ f₁ :  ' + word(0) + ' → ' + word(3)]
  ]);

  const sparks = [];
  for (let i = 0; i < 260; i++) sparks.push({ x: (O.rand() - 0.5) * 5200, y: (O.rand() - 0.5) * 2600, z: -2600 + O.rand() * 8600, s: 0.4 + O.rand() * 1.4 });

  function poly(pts, close) {
    let ok = true; const q = pts.map(function (P) { const r = O.project(P[0], P[1], P[2]); if (!r) ok = false; return r; });
    if (!ok) return null;
    ctx.beginPath(); ctx.moveTo(q[0].x, q[0].y); for (let i = 1; i < q.length; i++) ctx.lineTo(q[i].x, q[i].y); if (close) ctx.closePath();
    return q;
  }

  O.scene = {
    draw: function (p, t) {
      const cam = O.cam;
      const travel = O.span(p, 0.12, 0.74);
      const tz = -1200 + travel * (2 * GAP + 2400);              // where the word is
      const side = O.ease(O.span(p, 0.74, 0.9)), outro = O.ease(O.span(p, 0.88, 1));
      // chase cam behind the word, then swing out to see the whole pipeline from the side
      const chase = { x: 560, y: 300, z: tz - 1500 };
      const wide = { x: 2300, y: 1000, z: -1500 };
      const start = { x: 2100, y: 700, z: -2400 };
      const intro = O.ease(O.span(p, 0, 0.14));
      const from = { x: O.lerp(start.x, chase.x, intro), y: O.lerp(start.y, chase.y, intro), z: O.lerp(start.z, chase.z, intro) };
      cam.x = O.lerp(from.x, wide.x, side); cam.y = O.lerp(from.y, wide.y, side) + outro * 300; cam.z = O.lerp(from.z, wide.z, side) - outro * 900;
      const look = { x: O.lerp(0, 0, side), y: 0, z: O.lerp(Math.max(tz + 400, 0) * intro + GAP * (1 - intro), GAP, side) };
      O.lookAt(look.x, look.y, look.z);
      cam.roll = O.lerp(0.04, -0.03, p);
      cam.sx = 0.17 * (1 - O.ease(O.span(p, 0.02, 0.14)));
      cam.sy = -0.05 * O.span(p, 0.1, 0.2) * (1 - outro);
      const dim = 1 - 0.6 * outro;

      // sparks
      sparks.forEach(function (s) { const q = O.project(s.x, s.y, s.z); if (q) O.dot(q.x, q.y, s.s * Math.min(2, q.s * 3), '#BFE9FF', 0.45 * dim); });

      // floor grid
      ctx.strokeStyle = '#72E2FF'; ctx.lineWidth = 1;
      for (let gx = -2400; gx <= 2400; gx += 200) {
        const q = poly([[gx, -SH - 160, -2600], [gx, -SH - 160, 5200]]);
        if (q) { ctx.globalAlpha = 0.07 * dim; ctx.stroke(); }
      }
      for (let gz = -2600; gz <= 5200; gz += 200) {
        const q = poly([[-2400, -SH - 160, gz], [2400, -SH - 160, gz]]);
        if (q) { ctx.globalAlpha = 0.07 * dim; ctx.stroke(); }
      }

      // the energy beam the word rides on
      const bq = poly([[0, 0, -1600], [0, 0, 2 * GAP + 1600]]);
      if (bq) { ctx.globalAlpha = 0.25 * dim; ctx.strokeStyle = '#72E2FF'; ctx.lineWidth = 1.5; ctx.stroke(); }

      const drawSlab = function (i) {
        const z = i * GAP, near = Math.abs(tz - z), flash = Math.max(0, 1 - near / 260);
        const passed = tz > z;
        const c = [[-SW, -SH, z], [SW, -SH, z], [SW, SH, z], [-SW, SH, z]];
        // glass, 60 units thick
        const back = c.map(function (P) { return [P[0], P[1], P[2] + 60]; });
        let q = poly(back, true);
        if (q) { ctx.globalAlpha = (0.05 + 0.05 * flash) * dim; ctx.fillStyle = '#72E2FF'; ctx.fill(); ctx.globalAlpha = 0.35 * dim; ctx.strokeStyle = '#72E2FF'; ctx.lineWidth = 1; ctx.stroke(); }
        for (let k = 0; k < 4; k++) { if (poly([c[k], back[k]])) { ctx.globalAlpha = 0.4 * dim; ctx.stroke(); } }
        q = poly(c, true);
        if (q) {
          const g = ctx.createLinearGradient(q[0].x, q[0].y, q[2].x, q[2].y);
          g.addColorStop(0, 'rgba(114,226,255,' + (0.08 + 0.22 * flash).toFixed(3) + ')');
          g.addColorStop(1, 'rgba(217,174,92,' + (0.05 + 0.18 * flash).toFixed(3) + ')');
          ctx.globalAlpha = dim; ctx.fillStyle = g; ctx.fill();
          ctx.shadowColor = passed ? '#D9AE5C' : '#72E2FF'; ctx.shadowBlur = 10 + 30 * flash;
          ctx.globalAlpha = (0.75 + 0.25 * flash) * dim; ctx.strokeStyle = passed ? '#D9AE5C' : '#72E2FF'; ctx.lineWidth = 2 + 2 * flash; ctx.stroke();
          ctx.shadowBlur = 0;
          // scan lines across the glass
          for (let s = 1; s < 8; s++) {
            const yy = -SH + s * (2 * SH / 8);
            if (poly([[-SW, yy, z], [SW, yy, z]])) { ctx.globalAlpha = 0.08 * dim; ctx.strokeStyle = '#72E2FF'; ctx.lineWidth = 1; ctx.stroke(); }
          }
        }
        // labels
        const lt = O.project(-SW, SH + 70, z), lr = O.project(-SW, -SH - 80, z);
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        if (lt) { ctx.globalAlpha = 0.95 * dim; ctx.fillStyle = passed ? '#F2CD84' : '#CFEFFF'; ctx.font = '500 ' + Math.max(10, 44 * lt.s).toFixed(1) + 'px "IBM Plex Mono", monospace'; ctx.fillText(BLOCKS[i].name, lt.x, lt.y); }
        if (lr) { ctx.globalAlpha = 0.8 * dim; ctx.fillStyle = '#72E2FF'; ctx.font = '400 ' + Math.max(9, 36 * lr.s).toFixed(1) + 'px "IBM Plex Mono", monospace'; ctx.fillText('f(x) = ' + BLOCKS[i].rule, lr.x, lr.y); }
      };

      // tokens
      const drawTokens = function () {
        const stage = [0, 1, 2].filter(function (i) { return tz > i * GAP + 30; }).length;
        const letters = stages[stage];
        const items = letters.map(function (v, j) { return { v: v, x: (j - 2) * 120 }; });
        items.sort(function (a, b) { return Math.abs(b.x - cam.x) - Math.abs(a.x - cam.x); });
        items.forEach(function (it) {
          // trail
          for (let k = 1; k <= 7; k++) {
            const q = O.project(it.x, 0, tz - k * 55);
            if (q) O.dot(q.x, q.y, 14 * q.s * (1 - k / 9), '#72E2FF', 0.14 * dim);
          }
          const sz = 46;
          const q = poly([[it.x - sz, -sz, tz], [it.x + sz, -sz, tz], [it.x + sz, sz, tz], [it.x - sz, sz, tz]], true);
          if (!q) return;
          ctx.globalAlpha = 0.85 * dim; ctx.fillStyle = '#071521'; ctx.fill();
          ctx.shadowColor = stage === 3 ? '#D9AE5C' : '#72E2FF'; ctx.shadowBlur = 22;
          ctx.strokeStyle = stage === 3 ? '#D9AE5C' : '#72E2FF'; ctx.lineWidth = 2; ctx.globalAlpha = dim; ctx.stroke(); ctx.shadowBlur = 0;
          const c = O.project(it.x, 0, tz);
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = stage === 3 ? '#F2CD84' : '#E8F8FF';
          ctx.font = '500 ' + (64 * c.s).toFixed(1) + 'px "IBM Plex Mono", monospace';
          ctx.fillText(AZ[it.v], c.x, c.y + 2 * c.s);
        });
        return stage;
      };

      // painter's order: whatever is farther from the camera is drawn first
      const depth = function (x, y, z) { const q = O.project(x, y, z); return q ? q.z : -1; };
      const items = [0, 1, 2].map(function (i) { return { d: depth(0, 0, i * GAP), fn: function () { drawSlab(i); } }; });
      let stage = 0;
      items.push({ d: depth(0, 0, tz), fn: function () { stage = drawTokens(); } });
      items.sort(function (a, b) { return b.d - a.d; }).forEach(function (it) { it.fn(); });

      O.hud('hb', 'WORD <b>' + word(stage) + '</b>');
      O.hud('hd', stage + ' OF 3 BLOCKS');
    }
  };
  O.start();
})();
