/* Opening 5 · Keyspace warp
   Warp through the space of keys while a giant odometer of 27 digit drums
   rolls to the exact value of 26!, the number of substitution keys.
   The number is computed with BigInt; the time uses 365.25-day years. */
(function () {
  'use strict';
  const O = OP, ctx = O.ctx;
  let F = 1n; for (let i = 1n; i <= 26n; i++) F *= i;
  const DIG = F.toString().split('').map(Number);          // 27 digits
  const ND = DIG.length;
  const YEARS = Number(F) / 1e9 / 31557600;                // at 10⁹ guesses a second
  const commas = function (s) { return s.replace(/\B(?=(\d{3})+(?!\d))/g, ','); };

  O.captions([
    [0.12, 0.36, 'Every key is a rearrangement', 'A substitution cipher may send the 26 letters to any permutation of themselves.', '26 × 25 × 24 × … × 2 × 1 = 26!'],
    [0.36, 0.6, 'Count them exactly', 'The product rule gives the number of keys, digit for digit.', '26! = ' + commas(F.toString())],
    [0.6, 0.85, 'Try them all?', 'At a billion guesses a second that takes about ' + (YEARS / 1e9).toFixed(1) + ' billion years. The universe is about 13.8 billion years old.', '4.03 × 10²⁶ keys ÷ 10⁹ per second ≈ 1.28 × 10¹⁰ years']
  ]);

  const GL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const parts = [];
  for (let i = 0; i < 520; i++) {
    const a = O.rand() * 6.283, r = 260 + Math.pow(O.rand(), 0.6) * 2800;
    parts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, z: O.rand() * 9000, g: O.rand() < 0.18 ? GL[Math.floor(O.rand() * GL.length)] : null, w: 0.5 + O.rand() });
  }
  // drums on a gentle arc, with a gap between groups of three
  const DW = 104, GAPW = 40, RAD = 50, ZC = 2150, ARC = 5200;
  const drums = [];
  let x = 0;
  for (let k = 0; k < ND; k++) { if (k && (ND - k) % 3 === 0) x += GAPW; drums.push({ x: x, d: DIG[k], spins: 1 + Math.floor((k / ND) * 5) }); x += DW; }
  const total = x - DW;
  drums.forEach(function (d) { d.x -= total / 2; const a = d.x / ARC; d.wx = Math.sin(a) * ARC; d.wz = ZC - (1 - Math.cos(a)) * ARC; });

  let flow = 0, lastT = 0;
  O.scene = {
    draw: function (p, t) {
      const cam = O.cam;
      const dt = Math.min(0.05, t - lastT || 0); lastT = t;
      const warp = 0.25 + Math.min(4, Math.abs(O.vel) * 90) + 1.6 * O.span(p, 0.1, 0.55) * (1 - O.span(p, 0.6, 0.8));
      flow += dt * 900 * (O.reduce ? 0 : warp);
      const outro = O.ease(O.span(p, 0.86, 1));
      cam.x = Math.sin(p * 4) * 60; cam.y = Math.cos(p * 3) * 40 + outro * 80; cam.z = -500 - outro * 1600 + O.ease(O.span(p, 0, 0.15)) * 200;
      cam.yaw = Math.sin(p * 2.4) * 0.05; cam.pitch = 0; cam.roll = Math.sin(p * 3.1) * 0.06;
      cam.sx = 0.16 * (1 - O.ease(O.span(p, 0.02, 0.14)));
      cam.sy = 0.12 * (1 - O.ease(O.span(p, 0.02, 0.14))) - 0.04 * O.span(p, 0.14, 0.2) * (1 - outro);
      const dim = 1 - 0.6 * outro;

      // warp streaks and drifting glyphs
      ctx.lineCap = 'round';
      parts.forEach(function (q) {
        const z = ((q.z - flow) % 9000 + 9000) % 9000 + cam.z + 60;
        const a = O.project(q.x, q.y, z);
        if (!a) return;
        const fade = O.clamp(1 - a.z / 9000, 0, 1) * O.clamp(a.z / 400, 0, 1);
        if (q.g && a.z < 4200) {
          ctx.globalAlpha = 0.5 * fade * dim; ctx.fillStyle = '#9EEBFF';
          ctx.font = '500 ' + (60 * a.s).toFixed(1) + 'px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(q.g, a.x, a.y);
        } else {
          const b = O.project(q.x, q.y, z + 80 + 160 * warp);
          if (b) O.glowLine(a.x, a.y, b.x, b.y, '#72E2FF', Math.max(0.5, q.w * a.s * 3), 0.55 * fade * dim);
        }
      });

      // the odometer
      const roll = O.span(p, 0.2, 0.58), show = O.ease(O.span(p, 0.07, 0.16)) * dim;
      drums.forEach(function (d) {
        const k = drums.indexOf(d);
        // each drum turns d.spins whole turns plus its digit; the right-hand drums settle last
        const local = O.ease(O.clamp(roll * 1.35 - (1 - k / ND) * 0.35, 0, 1));
        const pos = local * (d.spins * 10 + d.d);
        const settled = local >= 1;
        const fr = [[-DW / 2 + 6, RAD + 16], [DW / 2 - 6, RAD + 16], [DW / 2 - 6, -RAD - 16], [-DW / 2 + 6, -RAD - 16]].map(function (P) { return O.project(d.wx + P[0], P[1], d.wz - 30); });
        if (!fr.every(Boolean)) return;
        const frame = function () { ctx.beginPath(); ctx.moveTo(fr[0].x, fr[0].y); fr.slice(1).forEach(function (q) { ctx.lineTo(q.x, q.y); }); ctx.closePath(); };
        frame(); ctx.globalAlpha = 0.9 * show; ctx.fillStyle = '#061320'; ctx.fill();
        // digits are clipped to the window, so only the neighbours' edges peek out, like a real odometer
        ctx.save(); frame(); ctx.clip();
        for (let v = 0; v < 10; v++) {
          let th = (v - pos) * (Math.PI / 5);           // 36° per digit
          th = Math.atan2(Math.sin(th), Math.cos(th));
          const c = Math.cos(th);
          if (c < 0.2) continue;
          const q = O.project(d.wx, Math.sin(-th) * RAD * 1.7, d.wz - c * RAD);
          if (!q) continue;
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(-cam.roll); ctx.scale(1, c);
          ctx.globalAlpha = Math.pow(c, 4) * show;
          ctx.fillStyle = settled && v === d.d ? '#F2CD84' : '#9EEBFF';
          if (settled && v === d.d) { ctx.shadowColor = '#D9AE5C'; ctx.shadowBlur = 16; }
          ctx.font = '500 ' + (80 * q.s).toFixed(1) + 'px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(String(v), 0, 0);
          ctx.restore();
        }
        // shading at the top and bottom of the window gives the drum its curve
        const g = ctx.createLinearGradient(0, fr[0].y, 0, fr[3].y);
        g.addColorStop(0, 'rgba(6,19,32,.95)'); g.addColorStop(0.3, 'rgba(6,19,32,0)'); g.addColorStop(0.7, 'rgba(6,19,32,0)'); g.addColorStop(1, 'rgba(6,19,32,.95)');
        ctx.globalAlpha = show; ctx.fillStyle = g; ctx.fillRect(Math.min(fr[0].x, fr[3].x) - 2, Math.min(fr[0].y, fr[1].y) - 2, Math.abs(fr[1].x - fr[0].x) + 4, Math.abs(fr[3].y - fr[0].y) + 4);
        ctx.restore();
        frame(); ctx.globalAlpha = (settled ? 0.95 : 0.55) * show; ctx.strokeStyle = settled ? '#D9AE5C' : '#72E2FF'; ctx.lineWidth = 1.4; ctx.stroke();
      });
      // label under the odometer
      const lb = O.project(0, -RAD - 110, ZC);
      if (lb && show > 0.01) {
        ctx.globalAlpha = 0.85 * show; ctx.fillStyle = '#D9AE5C'; ctx.textAlign = 'center';
        ctx.font = '500 ' + Math.max(11, 40 * lb.s).toFixed(1) + 'px "IBM Plex Mono", monospace';
        ctx.fillText(roll >= 1 ? '26!  substitution keys' : 'counting keys …', lb.x, lb.y);
      }

      const shown = O.clamp(roll, 0, 1);
      O.hud('hb', 'KEYS <b>' + (shown >= 1 ? '26!' : '…') + '</b>');
      const yrs = O.span(p, 0.6, 0.8) * YEARS;
      O.hud('hd', p < 0.6 ? 'AT 10⁹ GUESSES / S' : (yrs / 1e9).toFixed(1) + ' OF ' + (YEARS / 1e9).toFixed(1) + ' BN YEARS');
    }
  };
  O.start();
})();
