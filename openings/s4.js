/* Opening 4 · Relation city
   The floor is S × S: a 26 × 26 grid, one cell for every ordered pair.
   The function f(x) = 5x + 8 mod 26 is the set of pairs (x, f(x)), drawn
   as glowing towers: exactly one in every row (a function) and exactly one
   in every column (a bijection). */
(function () {
  'use strict';
  const O = OP, ctx = O.ctx, AZ = O.AZ, N = 26, C = 70, HALF = N * C / 2, TH = 300;
  const f = function (x) { return O.mod(5 * x + 8, N); };
  // row i (input x) runs along z, column j (output) along x
  const cx = function (j) { return -HALF + (j + 0.5) * C; };
  const cz = function (i) { return -HALF + (i + 0.5) * C; };
  const dust = [];
  for (let i = 0; i < 300; i++) dust.push([(O.rand() - 0.5) * 7000, O.rand() * 3200 - 200, (O.rand() - 0.5) * 7000, 0.4 + O.rand()]);

  O.captions([
    [0.12, 0.34, 'The floor is S × S', 'Every cell is an ordered pair (x, y): an input row and an output column.', '|S × S| = 26 × 26 = 676'],
    [0.34, 0.58, 'One tower in every row', 'The cipher is the relation R = {(x, f(x))}. A function gives each input exactly one output, so each row has one tower.', 'f(x) = (5x + 8) mod 26   ·   |R| = 26'],
    [0.58, 0.85, 'And one in every column', 'No output is used twice, so each column has one tower too. That pattern is a permutation matrix: f is a bijection.', 'f⁻¹(y) = 21(y − 8) mod 26']
  ]);

  function quad(pts) {
    const q = []; for (let k = 0; k < pts.length; k++) { const r = O.project(pts[k][0], pts[k][1], pts[k][2]); if (!r) return null; q.push(r); }
    ctx.beginPath(); ctx.moveTo(q[0].x, q[0].y); for (let k = 1; k < q.length; k++) ctx.lineTo(q[k].x, q[k].y); ctx.closePath();
    return q;
  }
  function line(a, b, color, w, alpha) {
    const p = O.project(a[0], a[1], a[2]), q = O.project(b[0], b[1], b[2]);
    if (p && q) O.glowLine(p.x, p.y, q.x, q.y, color, w, alpha);
  }

  O.scene = {
    draw: function (p, t) {
      const cam = O.cam;
      const a1 = O.ease(O.span(p, 0.1, 0.32));      // rise to the top view
      const a2 = O.ease(O.span(p, 0.58, 0.82));     // dive to street level
      const outro = O.ease(O.span(p, 0.86, 1));
      const P0 = [1700, 1900, -2100], P1 = [0, 3300, -260], P2 = [-1500, 200, -1500];
      const P3 = [2600, 2600, -2600];
      let pos = [0, 1, 2].map(function (k) { return O.lerp(P0[k], P1[k], a1); });
      pos = [0, 1, 2].map(function (k) { return O.lerp(pos[k], P2[k], a2); });
      pos = [0, 1, 2].map(function (k) { return O.lerp(pos[k], P3[k], outro); });
      // street level: glide along the city while diving
      if (a2 > 0 && outro < 1) pos[2] += Math.sin(a2 * Math.PI) * 600;
      cam.x = pos[0]; cam.y = pos[1]; cam.z = pos[2];
      const look = [O.lerp(0, 200, a2), O.lerp(0, 140, a2), O.lerp(0, 300, a2)];
      O.lookAt(look[0], look[1], look[2]);
      cam.roll = O.lerp(-0.05, 0.03, p);
      cam.sx = 0.18 * (1 - O.ease(O.span(p, 0.02, 0.14)));
      cam.sy = -0.05 * O.span(p, 0.1, 0.2) * (1 - outro);
      const dim = 1 - 0.6 * outro;

      dust.forEach(function (d) { const q = O.project(d[0], d[1], d[2]); if (q) O.dot(q.x, q.y, d[3] * Math.min(2, q.s * 3), '#BFE9FF', 0.4 * dim); });

      // grid floor with a wave of light running across it
      const wave = (p * 3.2) % 1;
      for (let i = 0; i <= N; i++) {
        const v = -HALF + i * C;
        line([v, 0, -HALF], [v, 0, HALF], '#72E2FF', 1, 0.22 * dim);
        line([-HALF, 0, v], [HALF, 0, v], '#72E2FF', 1, 0.22 * dim);
      }
      line([-HALF, 0, -HALF], [HALF, 0, -HALF], '#72E2FF', 2, 0.6 * dim);
      line([-HALF, 0, HALF], [HALF, 0, HALF], '#72E2FF', 2, 0.6 * dim);
      line([-HALF, 0, -HALF], [-HALF, 0, HALF], '#72E2FF', 2, 0.6 * dim);
      line([HALF, 0, -HALF], [HALF, 0, HALF], '#72E2FF', 2, 0.6 * dim);
      // cells lighting up in a diagonal wave while the floor is introduced
      const cellsOn = O.span(p, 0.1, 0.34) * (1 - O.span(p, 0.36, 0.44));
      if (cellsOn > 0) {
        for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
          const w = Math.abs(((i + j) / (2 * N)) - wave);
          if (w > 0.06) continue;
          if (quad([[cx(j) - C / 2 + 4, 0, cz(i) - C / 2 + 4], [cx(j) + C / 2 - 4, 0, cz(i) - C / 2 + 4], [cx(j) + C / 2 - 4, 0, cz(i) + C / 2 - 4], [cx(j) - C / 2 + 4, 0, cz(i) + C / 2 - 4]])) {
            ctx.globalAlpha = (0.35 - w * 5) * cellsOn * dim; ctx.fillStyle = '#72E2FF'; ctx.fill();
          }
        }
      }

      // scanners: a row bar while towers rise, a column bar at street level
      const rise = O.span(p, 0.34, 0.56);
      const rowScan = rise > 0 && rise < 1 ? Math.min(N - 1, Math.floor(rise * N)) : -1;
      const colScan = p > 0.6 && p < 0.84 ? Math.min(N - 1, Math.floor(O.span(p, 0.6, 0.84) * N)) : -1;
      if (rowScan >= 0 && quad([[-HALF, 1, cz(rowScan) - C / 2], [HALF, 1, cz(rowScan) - C / 2], [HALF, 1, cz(rowScan) + C / 2], [-HALF, 1, cz(rowScan) + C / 2]])) {
        ctx.globalAlpha = 0.22 * dim; ctx.fillStyle = '#D9AE5C'; ctx.fill();
      }
      if (colScan >= 0 && quad([[cx(colScan) - C / 2, 1, -HALF], [cx(colScan) + C / 2, 1, -HALF], [cx(colScan) + C / 2, 1, HALF], [cx(colScan) - C / 2, 1, HALF]])) {
        ctx.globalAlpha = 0.22 * dim; ctx.fillStyle = '#7CF0B0'; ctx.fill();
      }

      // edge labels: inputs down one side, outputs across the far side
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let i = 0; i < N; i++) {
        const a = O.project(-HALF - 50, 0, cz(i)), b = O.project(cx(i), 0, HALF + 50);
        ctx.font = '500 ' + (a ? Math.max(8, 34 * a.s) : 10).toFixed(1) + 'px "IBM Plex Mono", monospace';
        if (a) { ctx.globalAlpha = (i === rowScan ? 1 : 0.7) * dim; ctx.fillStyle = i === rowScan ? '#F2CD84' : '#CFEFFF'; ctx.fillText(AZ[i], a.x, a.y); }
        if (b) { ctx.font = '500 ' + Math.max(8, 34 * b.s).toFixed(1) + 'px "IBM Plex Mono", monospace'; ctx.globalAlpha = (i === colScan ? 1 : 0.7) * dim; ctx.fillStyle = i === colScan ? '#7CF0B0' : '#F0D6A2'; ctx.fillText(AZ[i], b.x, b.y); }
      }
      const la = O.project(-HALF - 150, 0, -HALF - 70), lb = O.project(HALF + 40, 0, HALF + 150);
      ctx.font = '500 14px "IBM Plex Mono", monospace'; ctx.textAlign = 'left';
      if (la) { ctx.globalAlpha = 0.8 * dim; ctx.fillStyle = '#72E2FF'; ctx.fillText('inputs x', la.x, la.y); }
      if (lb) { ctx.globalAlpha = 0.8 * dim; ctx.fillStyle = '#D9AE5C'; ctx.fillText('outputs f(x)', lb.x, lb.y); }

      // towers, far to near
      const towers = [];
      for (let i = 0; i < N; i++) {
        // the towers stand on the first screen, sink while the floor is introduced, then rise row by row
        const preview = 1 - O.ease(O.span(p, 0.03, 0.13));
        const h = TH * Math.max(preview, O.ease(O.clamp(rise * 1.25 - i / N * 0.25, 0, 1)));
        if (h < 2) continue;
        const q = O.project(cx(f(i)), h / 2, cz(i));
        towers.push({ i: i, j: f(i), h: h, d: q ? q.z : -1 });
      }
      towers.sort(function (a, b) { return b.d - a.d; }).forEach(function (T) {
        const x0 = cx(T.j) - C * 0.36, x1 = cx(T.j) + C * 0.36, z0 = cz(T.i) - C * 0.36, z1 = cz(T.i) + C * 0.36, h = T.h;
        const hot = T.i === rowScan || T.j === colScan;
        const faces = [
          [[x0, 0, z0], [x1, 0, z0], [x1, h, z0], [x0, h, z0]],
          [[x1, 0, z0], [x1, 0, z1], [x1, h, z1], [x1, h, z0]],
          [[x1, 0, z1], [x0, 0, z1], [x0, h, z1], [x1, h, z1]],
          [[x0, 0, z1], [x0, 0, z0], [x0, h, z0], [x0, h, z1]]
        ].map(function (fc) {
          const m = fc.reduce(function (s, P) { return [s[0] + P[0] / 4, s[1] + P[1] / 4, s[2] + P[2] / 4]; }, [0, 0, 0]);
          const q = O.project(m[0], m[1], m[2]); return { fc: fc, d: q ? q.z : -1 };
        }).sort(function (a, b) { return b.d - a.d; });
        faces.forEach(function (F, k) {
          if (!quad(F.fc)) return;
          ctx.globalAlpha = (k < 2 ? 0.1 : 0.22) * dim; ctx.fillStyle = hot ? '#D9AE5C' : '#72E2FF'; ctx.fill();
          ctx.globalAlpha = 0.55 * dim; ctx.strokeStyle = hot ? '#F2CD84' : '#72E2FF'; ctx.lineWidth = 1; ctx.stroke();
        });
        if (quad([[x0, h, z0], [x1, h, z0], [x1, h, z1], [x0, h, z1]])) {
          ctx.shadowColor = hot ? '#F2CD84' : '#72E2FF'; ctx.shadowBlur = 22;
          ctx.globalAlpha = 0.9 * dim; ctx.fillStyle = hot ? '#F2CD84' : '#9EEBFF'; ctx.fill(); ctx.shadowBlur = 0;
        }
        // light beam from the top
        line([cx(T.j), h, cz(T.i)], [cx(T.j), h + 260 * (hot ? 1.6 : 1), cz(T.i)], hot ? '#F2CD84' : '#72E2FF', 2, (hot ? 0.7 : 0.25) * dim);
      });

      if (rowScan >= 0) { O.hud('hb', 'ROW <b>' + AZ[rowScan] + '</b> → ' + AZ[f(rowScan)]); O.hud('hd', 'TOWERS ' + towers.length + ' / 26'); }
      else if (colScan >= 0) { const x = [...Array(N).keys()].find(function (i) { return f(i) === colScan; }); O.hud('hb', 'COLUMN <b>' + AZ[colScan] + '</b> ← ' + AZ[x]); O.hud('hd', 'ONE PER COLUMN'); }
      else { O.hud('hb', 'f(x) = <b>5x + 8</b> mod 26'); O.hud('hd', towers.length ? 'R ⊆ S × S' : '676 CELLS'); }
    }
  };
  O.start();
})();
