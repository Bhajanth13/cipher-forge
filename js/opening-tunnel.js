/* Opening 1 · Rotor tunnel
   Fly down a tunnel of 26 alphabet rings. Ring k is the alphabet shifted
   k places, so its top letter is A + k. Far rings spin loose and click into
   place as you reach them. */
(function () {
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
