/* =========================================================
   Cipher Echo — device-bloom.js
   Far mode: the petal reflector, simulated from a physical model
   and drawn on a canvas (units: millimetres, y up, dish axis = +y).

   The model
   - Dish: paraboloid h(r) = r² / 4F, D = 100 mm, F = 40 mm.
   - 8 petals of 0.05 mm superelastic NiTi, hinged on a Ø 4.4 mm hub,
     each 1.1 × 45° wide so neighbours overlap.
   - A petal is an inextensible sheet: every point keeps its distance
     along the petal (s) and across it (u) in every state.
   - Across the width the sheet lies on a circle around the axis at the
     distance of its centre line, so as a petal stands up it wraps
     (furls) around the mast; successive layers spiral outward by one
     sheet pitch (0.07 mm), so no two petals ever pass through each other.
   - Mid-length crease: a tape-spring hinge (curved across, like a steel
     tape measure). Folded, it bends at R = 0.7 mm, then closes back into
     a hairpin so the outer half lies against the inner half.
   - Motion: the lead screw moves the bud at constant speed with short
     ramps; the mast and the petals are spring-driven with rotary
     dampers, so they follow a critically damped response (no overshoot).
     Folding, a collar at the mouth tilts the petals up, flattening each
     tape-spring crease until it snaps folded, then the screw draws the
     bud in.
   ========================================================= */
(function () {
  'use strict';
  const canvas = document.getElementById('bloom-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const RANGE = window.CIPHER_ECHO_RANGE;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = function (id) { return document.getElementById(id); };
  const stage = canvas.closest('.bloom-stage');

  /* ---------- Design values (mm) ---------- */
  const D = 100, RIM = D / 2, F = 40, R0 = 2.2, NP = 8, OVER = 1.1;
  const T = 0.05, GAP = 0.02, PITCH = T + GAP, RC = 0.7, BETA = Math.PI / 3;
  const DPSI = 2 * Math.PI / NP * OVER;
  const KSP = NP * PITCH / (2 * Math.PI);          // spiral growth per radian of wrap
  const HUB_H = 3, POD_R = 4.25, POD_H = 7, MAST1 = 22, MAST2 = 20;
  const TRAVEL = 36;                               // lead-screw travel of the bud
  const h = function (r) { return r * r / (4 * F); };

  /* ---------- Meridian of the deployed dish, sampled by arc length ---------- */
  const MS = 0.05, MER = [];                       // {s, r, th}
  (function () {
    let r = R0, s = 0;
    while (r < RIM) {
      MER.push({ s: s, r: r, th: Math.atan(r / (2 * F)) });
      const dr = MS / Math.sqrt(1 + Math.pow(r / (2 * F), 2));
      r = Math.min(RIM, r + dr); s += MS;
    }
    MER.push({ s: s, r: RIM, th: Math.atan(RIM / (2 * F)) });
  })();
  const L = MER[MER.length - 1].s;                 // petal length along the curve
  const SC = L / 2;                                // crease at mid-length
  const at = function (s) {
    const i = Math.max(0, Math.min(MER.length - 2, Math.floor(s / MS))), k = (s - MER[i].s) / MS;
    return { r: MER[i].r + (MER[i + 1].r - MER[i].r) * k, th: MER[i].th + (MER[i + 1].th - MER[i].th) * k };
  };
  // the hairpin: bend −(π+β) at RC, then back +β at RC2, chosen so the legs end one pitch apart
  const L1 = (Math.PI + BETA) * RC;
  let RC2 = 1;
  function legOffset(rc2) {
    let th = Math.PI / 2, x = 0;
    const n1 = 400, n2 = 400, l2 = BETA * rc2;
    for (let i = 0; i < n1; i++) { th -= (Math.PI + BETA) / n1; x += Math.cos(th) * L1 / n1; }
    for (let i = 0; i < n2; i++) { th += BETA / n2; x += Math.cos(th) * l2 / n2; }
    return x;
  }
  (function () { let lo = 0.05, hi = 20; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (legOffset(m) > 2 * PITCH) lo = m; else hi = m; } RC2 = (lo + hi) / 2; })();
  const L2 = BETA * RC2, CZ0 = SC - (L1 + L2) / 2, CZ1 = CZ0 + L1, CZ2 = CZ1 + L2;

  /* ---------- Petal centre line in its meridional plane ---------- */
  // a: 0 standing up (stowed) → 1 deployed;  c: 0 crease folded → 1 straight
  const NSI = 260;
  function centreline(a, c) {
    const pts = new Array(NSI + 1);
    let x = R0, y = h(R0), extra = 0, prevS = 0;
    pts[0] = { x: x, y: y };
    for (let i = 1; i <= NSI; i++) {
      const s = L * i / NSI, ds = s - prevS, sm = prevS + ds / 2;
      // curvature added by the crease (scaled by how folded it is), integrated exactly over each step
      const ov = function (z0, z1) { return Math.max(0, Math.min(s, z1) - Math.max(prevS, z0)); };
      const before = extra;
      extra += (1 - c) * (-ov(CZ0, CZ1) / RC + ov(CZ1, CZ2) / RC2);
      const th = a * at(sm).th + (1 - a) * Math.PI / 2 + (before + extra) / 2;
      x += Math.cos(th) * ds; y += Math.sin(th) * ds;
      pts[i] = { x: x, y: y };
      prevS = s;
    }
    return pts;
  }
  // surface point: index along the centre line, v ∈ [−1, 1] across the width
  function surf(cl, i, v, phi) {
    const s = L * i / NSI, Wd = at(s).r * DPSI;          // material width at s (deployed arc)
    const x = Math.max(cl[i].x, R0 * 0.98), u = v * Wd / 2;
    const psi = phi + u / x, rel = (u + Wd / 2) / x;     // angle round the axis; wrap from the leading edge
    const R = x + KSP * rel;
    return [R * Math.cos(psi), cl[i].y, R * Math.sin(psi)];
  }

  /* ---------- State, timeline and physical motion profiles ---------- */
  const S = { doors: 0, rise: 0, mast: 0, a: 0, c: 0, cam: 0, sound: 0 };
  const smooth = function (k) { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
  // lead screw: constant speed with short accel / decel ramps (trapezoidal velocity)
  const screw = function (k) {
    k = Math.max(0, Math.min(1, k)); const r = 0.18, vmax = 1 / (1 - r);
    if (k < r) return 0.5 * vmax / r * k * k;
    if (k > 1 - r) { const q = 1 - k; return 1 - 0.5 * vmax / r * q * q; }
    return vmax * (k - r / 2);
  };
  // spring + rotary damper, critically damped: 1 − (1 + ωt)e^(−ωt)
  const damped = function (t, w) { return t <= 0 ? 0 : 1 - (1 + w * t) * Math.exp(-w * t); };
  const OPEN = {
    doors: { t0: 0, t1: 0.25, f: smooth }, rise: { t0: 0.2, t1: 1.0, f: screw },
    mast: { t0: 1.05, w: 11 }, a: { t0: 1.35, w: 4.2 }, c: { t0: 1.75, w: 6 },
    cam: { t0: 0, t1: 1.8, f: smooth }, sound: { t0: 2.9, t1: 3.4, f: smooth }
  };
  const CLOSE = {
    sound: { t0: 0, t1: 0.2, f: smooth }, mast: { t0: 0, t1: 0.45, f: smooth },
    a: { t0: 0.35, t1: 1.15, f: smooth }, c: { t0: 1.0, t1: 1.18, f: smooth },  // tape spring snaps folded
    rise: { t0: 1.3, t1: 2.1, f: screw }, doors: { t0: 2.1, t1: 2.35, f: smooth }, cam: { t0: 2.1, t1: 3.3, f: smooth }
  };
  const OPEN_STEPS = [[0, 'RELEASING'], [0.2, 'BUD OUT'], [1.05, 'MAST TO FOCUS'], [1.35, 'BLOOMING'], [3.0, 'FAR · LOCKED']];
  const CLOSE_STEPS = [[0, 'MAST DOWN'], [0.35, 'CLOSING'], [1.3, 'STOWING'], [2.4, 'NORMAL']];
  let seq = null, open = false, t0 = 0, from = null, rx = false, stepText = 'NORMAL';
  function profile(p, t) {
    if (p.w) return damped(t - p.t0, p.w);
    return p.f((t - p.t0) / (p.t1 - p.t0));
  }
  function advance(now) {
    if (!seq) return;
    const t = (now - t0) / 1000, tgt = open ? 1 : 0;
    let busy = false;
    Object.keys(seq).forEach(function (k) {
      const v = profile(seq[k], t);
      S[k] = from[k] + (tgt - from[k]) * v;
      if (v < 0.999) busy = true;
    });
    (open ? OPEN_STEPS : CLOSE_STEPS).forEach(function (st) { if (t >= st[0]) stepText = st[1]; });
    if (!busy) { Object.keys(seq).forEach(function (k) { S[k] = tgt; }); seq = null; }
  }

  /* ---------- Camera and projection ---------- */
  let W = 0, H = 0, DPR = 1, yaw = -0.56;
  function resize() {
    const r = canvas.getBoundingClientRect();
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
  }
  let cam = null;
  function setCam() {
    const k = S.cam;
    const ty = -27 + 72 * k, dist = 240 + 150 * k, p = 0.42 + 0.04 * k;
    const fpx = Math.min(W * 1.5, H * 1.55) * (1 + 0.05 * k);
    cam = { ty: ty, dist: dist, f: fpx, cy: Math.cos(yaw), sy: Math.sin(yaw), cp: Math.cos(p), sp: Math.sin(p) };
  }
  function proj(p) {
    const x0 = p[0], y0 = p[1] - cam.ty, z0 = p[2];
    const x1 = x0 * cam.cy + z0 * cam.sy, z1 = -x0 * cam.sy + z0 * cam.cy;
    const y2 = y0 * cam.cp - z1 * cam.sp, z2 = y0 * cam.sp + z1 * cam.cp;
    const zc = cam.dist - z2;
    return [W / 2 + cam.f * x1 / zc, H / 2 - cam.f * y2 / zc, z2];
  }
  function norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  const LIGHT = norm([-0.45, 0.75, 0.55]);
  function toCam(v) {
    const x1 = v[0] * cam.cy + v[2] * cam.sy, z1 = -v[0] * cam.sy + v[2] * cam.cy;
    return [x1, v[1] * cam.cp - z1 * cam.sp, v[1] * cam.sp + z1 * cam.cp];
  }
  // metal shading: Lambert + Blinn-Phong highlight, two-sided; the lamp is fixed in the room
  function shade(n, base, spec, gloss) {
    let nc = toCam(n);
    if (nc[2] < 0) nc = [-nc[0], -nc[1], -nc[2]];
    const lc = toCam(LIGHT);
    const d = Math.max(0, nc[0] * lc[0] + nc[1] * lc[1] + nc[2] * lc[2]);
    const hv = norm([lc[0], lc[1], lc[2] + 1]);
    const sp = Math.pow(Math.max(0, nc[0] * hv[0] + nc[1] * hv[1] + nc[2] * hv[2]), gloss) * spec;
    const k = 0.42 + 0.62 * d;
    return 'rgb(' + Math.min(255, base[0] * k + 255 * sp | 0) + ',' + Math.min(255, base[1] * k + 255 * sp | 0) + ',' + Math.min(255, base[2] * k + 255 * sp | 0) + ')';
  }
  function faceNormal(p) {
    const a = [p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]];
    const q = p[3] || p[2];
    const b = [q[0] - p[1][0], q[1] - p[1][1], q[2] - p[1][2]];
    return norm([a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]);
  }
  // keep only the part of a polygon above the top edge (y ≥ 0): below it is inside the case
  function clipY0(polyPts) {
    const out = [];
    for (let i = 0; i < polyPts.length; i++) {
      const A = polyPts[i], B = polyPts[(i + 1) % polyPts.length], ia = A[1] >= 0, ib = B[1] >= 0;
      if (ia) out.push(A);
      if (ia !== ib) { const k = A[1] / (A[1] - B[1]); out.push([A[0] + (B[0] - A[0]) * k, 0, A[2] + (B[2] - A[2]) * k]); }
    }
    return out;
  }

  /* ---------- Scene: polygons and lines, depth sorted ---------- */
  const TI = [150, 157, 165], TI_IN = [176, 182, 189];
  let items = [];
  function poly(pts, color, opt) {
    opt = opt || {};
    if (opt.clip) { pts = clipY0(pts); if (pts.length < 3) return; }
    const pr = pts.map(proj);
    let z = 0; pr.forEach(function (q) { z += q[2]; }); z /= pr.length;
    items.push({ g: opt.g == null ? 1 : opt.g, z: z + (opt.bias || 0), pr: pr, fill: color, stroke: opt.stroke, alpha: opt.alpha, draw: opt.draw });
  }
  function line(a, b, color, lw, opt) {
    opt = opt || {};
    if (a[1] < 0 && b[1] < 0) return;
    const pa = proj(a), pb = proj(b);
    items.push({ g: 1, z: (pa[2] + pb[2]) / 2 + (opt.bias || 0), line: [pa, pb], stroke: color, lw: lw, alpha: opt.alpha, dash: opt.dash, off: opt.off });
  }
  function cylinder(r, y0, y1, n, base, opt) {
    opt = opt || {};
    if (y1 <= y0) return;
    for (let i = 0; i < n; i++) {
      const a0 = 2 * Math.PI * i / n, a1 = 2 * Math.PI * (i + 1) / n, am = (a0 + a1) / 2;
      const q = [[r * Math.cos(a0), y0, r * Math.sin(a0)], [r * Math.cos(a1), y0, r * Math.sin(a1)], [r * Math.cos(a1), y1, r * Math.sin(a1)], [r * Math.cos(a0), y1, r * Math.sin(a0)]];
      poly(q, shade([Math.cos(am), 0, Math.sin(am)], base, 0.35, 30), { clip: true, stroke: true });
    }
    [[y1, 1, opt.over], [y0, -1, opt.under]].forEach(function (cp) {
      if (cp[0] < 0) return;
      const pts = []; for (let i = 0; i < n; i++) { const a = 2 * Math.PI * i / n; pts.push([r * Math.cos(a), cp[0], r * Math.sin(a)]); }
      poly(pts, shade([0, cp[1], 0], base, 0.3, 30), { stroke: true, draw: cp[2] });
    });
  }
  // the case: 78 × 56 × 13, top edge at y = 0, screen facing +z
  const BX = 39, BY = -56, BZ = 6.5;
  function boxFace(c, color, nu, nv, draw) {
    // split into a grid so depth sorting stays right next to the petals
    const P = function (u, v) {
      const a = [c[0][0] + (c[1][0] - c[0][0]) * u, c[0][1] + (c[1][1] - c[0][1]) * u, c[0][2] + (c[1][2] - c[0][2]) * u];
      const b = [c[3][0] + (c[2][0] - c[3][0]) * u, c[3][1] + (c[2][1] - c[3][1]) * u, c[3][2] + (c[2][2] - c[3][2]) * u];
      return [a[0] + (b[0] - a[0]) * v, a[1] + (b[1] - a[1]) * v, a[2] + (b[2] - a[2]) * v];
    };
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      poly([P(i / nu, j / nv), P((i + 1) / nu, j / nv), P((i + 1) / nu, (j + 1) / nv), P(i / nu, (j + 1) / nv)], color, { stroke: true, g: 0 });
    }
    if (draw) { const pr = c.map(proj); items.push({ g: 0, z: Math.max.apply(null, pr.map(function (q) { return q[2]; })) + 0.01, pr: pr, overlay: draw }); }
  }
  function facing(n) { return toCam(n)[2] > 0; }

  function buildScene(time) {
    items = [];
    // ---- case ----
    if (facing([0, 0, 1])) boxFace([[-BX, 0, BZ], [BX, 0, BZ], [BX, BY, BZ], [-BX, BY, BZ]], shade([0, 0, 1], TI, 0.2, 20), 6, 4, drawScreen);
    if (facing([0, 0, -1])) boxFace([[BX, 0, -BZ], [-BX, 0, -BZ], [-BX, BY, -BZ], [BX, BY, -BZ]], shade([0, 0, -1], [228, 230, 233], 0.2, 20), 6, 4);
    if (facing([1, 0, 0])) boxFace([[BX, 0, BZ], [BX, 0, -BZ], [BX, BY, -BZ], [BX, BY, BZ]], shade([1, 0, 0], TI, 0.25, 20), 2, 4);
    if (facing([-1, 0, 0])) boxFace([[-BX, 0, -BZ], [-BX, 0, BZ], [-BX, BY, BZ], [-BX, BY, -BZ]], shade([-1, 0, 0], TI, 0.25, 20), 2, 4);
    if (facing([0, 1, 0])) boxFace([[-BX, 0, -BZ], [BX, 0, -BZ], [BX, 0, BZ], [-BX, 0, BZ]], shade([0, 1, 0], TI, 0.3, 20), 8, 2, drawTopEdge);

    // ---- the bud: hub, mast, pod, petals (below y = 0 is inside the case, so it is clipped) ----
    const lift = -TRAVEL * (1 - S.rise);
    const hubTop = lift;
    cylinder(R0, hubTop - HUB_H, hubTop, 16, [120, 128, 137]);
    const stowPod = hubTop + h(R0) + SC + 1.5;               // pod rests on top of the folded bud
    const podBottom = stowPod + (F - stowPod) * S.mast;      // and rises to the focus
    cylinder(1.5, hubTop, Math.min(podBottom, hubTop + MAST1), 10, [190, 196, 202]);
    cylinder(1.1, Math.max(hubTop, podBottom - MAST2), podBottom, 10, [206, 211, 216]);
    cylinder(POD_R, podBottom, podBottom + POD_H, 18, [98, 106, 115], { under: drawGrille });
    const cl = centreline(S.a, S.c);
    cl.forEach(function (p) { p.y += lift; });
    const NV = 12, rows = [];
    const cz0 = Math.floor(CZ0 / L * NSI) - 2, cz2 = Math.ceil(CZ2 / L * NSI) + 2;
    for (let i = 0; i <= NSI; i += (i >= cz0 && i < cz2 ? 2 : 10)) rows.push(i);
    if (rows[rows.length - 1] !== NSI) rows.push(NSI);
    for (let k = 0; k < NP; k++) {
      const phi = 2 * Math.PI * k / NP + Math.PI / NP;
      let prev = null;
      rows.forEach(function (i) {
        const row = [];
        for (let j = 0; j <= NV; j++) row.push(surf(cl, i, -1 + 2 * j / NV, phi));
        if (prev) {
          for (let j = 0; j < NV; j++) {
            const q = [prev[j], prev[j + 1], row[j + 1], row[j]];
            const n = faceNormal(q);
            const grain = 1 + 0.035 * Math.sin(j * 2.7 + k * 1.3);
            const base = (n[1] > 0.2 ? TI_IN : TI).map(function (cv) { return cv * grain; });
            poly(q, shade(n, base, 0.55, 46), { clip: true, stroke: true });
          }
          if (i === NSI) for (let j = 0; j < NV; j++) line(row[j], row[j + 1], 'rgba(240,244,248,.9)', 1.2);
          line(prev[0], row[0], 'rgba(240,244,248,.8)', 1);
          line(prev[NV], row[NV], 'rgba(30,36,44,.55)', 1);
        }
        prev = row;
      });
    }
    if (S.sound > 0.01) buildSound(time);
  }

  /* ---------- Sound in the plane through the axis ---------- */
  const LAM = RANGE.sound(20) / RANGE.MODES.far.f * 1000;   // mm
  let signal = '#72E2FF', monoFont = 'monospace';
  function buildSound(time) {
    const al = S.sound, top = 150, rimY = h(RIM), dir = rx ? -1 : 1;
    for (let y = rimY; y < top; y += 12) poly([[-RIM, y, 0], [RIM, y, 0], [RIM, Math.min(top, y + 12), 0], [-RIM, Math.min(top, y + 12), 0]], signal, { alpha: 0.07 * al, bias: -0.5 });
    const ph = (time / 1100) % 1;
    [-46, -37, -28, -19, -11, 11, 19, 28, 37, 46].forEach(function (x) {
      const P = [x, h(Math.abs(x)), 0], Fp = [0, F, 0], Q = [x, top, 0];
      const seg = function (A, B, n) {
        for (let i = 0; i < n; i++) {
          const a = i / n, b = (i + 1) / n;
          line([A[0] + (B[0] - A[0]) * a, A[1] + (B[1] - A[1]) * a, 0], [A[0] + (B[0] - A[0]) * b, A[1] + (B[1] - A[1]) * b, 0], signal, 1.6, { alpha: al, dash: [5, 6], off: -dir * ph * 22 });
        }
      };
      seg(Fp, P, 6); seg(P, Q, 10);
    });
    const shift = ((time / 1000) * 0.5 % 1) * LAM * dir;
    for (let y = rimY + LAM; y < top + LAM; y += LAM) {
      const yy = y + shift; if (yy < rimY + 2 || yy > top) continue;
      for (let i = 0; i < 4; i++) line([-RIM + i * D / 4, yy, 0], [-RIM + (i + 1) * D / 4, yy, 0], signal, 1, { alpha: 0.5 * al });
    }
    const fp = proj([0, F, 0]), tp = proj([-RIM, top + 4, 0]);
    items.push({ g: 1, z: fp[2] + 1, overlay: function () {
      ctx.globalAlpha = al; ctx.fillStyle = signal; ctx.beginPath(); ctx.arc(fp[0], fp[1], 3.2, 0, 7); ctx.fill();
      ctx.font = '11px ' + monoFont; ctx.fillText('focus', fp[0] + 8, fp[1] - 6);
      ctx.fillText('wavefronts, 1 λ = ' + (LAM / 10).toFixed(2) + ' cm apart', tp[0], tp[1]);
      ctx.globalAlpha = 1;
    } });
  }

  /* ---------- Painted details: screen, top edge, pod grille ---------- */
  function quadMap(c3, w, hgt) {
    // affine map from a w × hgt rectangle onto the projected face (corner 0 → 1 along x, 0 → 3 along y)
    const p0 = c3[0], p1 = c3[1], p3 = c3[3];
    ctx.setTransform(DPR * (p1[0] - p0[0]) / w, DPR * (p1[1] - p0[1]) / w, DPR * (p3[0] - p0[0]) / hgt, DPR * (p3[1] - p0[1]) / hgt, DPR * p0[0], DPR * p0[1]);
  }
  function drawScreen(pr) {
    ctx.save();
    quadMap(pr, 78, 56);
    ctx.fillStyle = '#D3D5CD'; ctx.fillRect(4, 4.4, 70, 47.2);
    ctx.fillStyle = '#16191C'; ctx.font = '600 3.2px ' + monoFont;
    ctx.fillText('CIPHER ECHO', 7.5, 11);
    ctx.fillRect(7.5, 12.6, 63, 0.5);
    ctx.font = '600 3.6px ' + monoFont; ctx.fillText(stepText, 7.5, 19);
    ctx.font = '3px ' + monoFont;
    ctx.fillText(open ? 'FAR · 21.2 kHz · ~' + RANGE.fmt(RANGE.R.far) + ' m' : 'LONG-RANGE · ~' + RANGE.fmt(RANGE.R.lr) + ' m', 7.5, 25);
    ctx.fillStyle = '#666B67'; ctx.fillText('AIM ±' + (RANGE.BW(20) / 2).toFixed(1) + '°', 7.5, 30);
    ctx.strokeStyle = '#16191C'; ctx.lineWidth = 0.5; ctx.strokeRect(7.5, 43, 63, 3.2);
    ctx.fillStyle = '#16191C'; ctx.fillRect(7.5, 43, 63 * (0.08 + 0.92 * S.rise), 3.2);
    ctx.restore();
  }
  function drawTopEdge(pr) {
    ctx.save();
    quadMap(pr, 78, 13);
    ctx.fillStyle = '#05070A';
    [10.2, 19, 57.8, 66.6].forEach(function (x) { ctx.fillRect(x, 3.7, 6, 5.6); });
    ctx.beginPath(); ctx.arc(6, 6.5, 0.6, 0, 7); ctx.arc(72, 6.5, 0.6, 0, 7); ctx.fill();
    // slot Ø 9.2 and the two sliding doors
    ctx.beginPath(); ctx.arc(39, 6.5, 4.6, 0, 7); ctx.fillStyle = '#020304'; ctx.fill();
    ctx.lineWidth = 0.3; ctx.strokeStyle = '#6A737C'; ctx.stroke();
    const dx = 4.8 * S.doors;
    ctx.fillStyle = '#8D959E';
    ctx.beginPath(); ctx.arc(39 - dx, 6.5, 4.6, Math.PI / 2, Math.PI * 1.5); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(39 + dx, 6.5, 4.6, -Math.PI / 2, Math.PI / 2); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawGrille(pr) {
    let cx = 0, cy = 0; pr.forEach(function (q) { cx += q[0]; cy += q[1]; }); cx /= pr.length; cy /= pr.length;
    const rr = Math.max.apply(null, pr.map(function (q) { return Math.abs(q[0] - cx); })) * 0.7;
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.75 * S.sound;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, signal); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 7); ctx.fill();
    ctx.restore();
  }

  /* ---------- Draw ---------- */
  function render(now) {
    if (!W) return;
    setCam();
    buildScene(now);
    // the camera is always above the bud and everything in the bud is above the top edge,
    // so the case can never hide any of it: draw the case first, then depth-sort the rest
    items.sort(function (p, q) { return (p.g - q.g) || (p.z - q.z); });
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineJoin = 'round';
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.overlay) { ctx.setTransform(DPR, 0, 0, DPR, 0, 0); it.overlay(it.pr); continue; }
      ctx.globalAlpha = it.alpha == null ? 1 : it.alpha;
      if (it.line) {
        ctx.beginPath(); ctx.moveTo(it.line[0][0], it.line[0][1]); ctx.lineTo(it.line[1][0], it.line[1][1]);
        ctx.strokeStyle = it.stroke; ctx.lineWidth = it.lw;
        if (it.dash) { ctx.setLineDash(it.dash); ctx.lineDashOffset = it.off || 0; }
        ctx.stroke(); if (it.dash) ctx.setLineDash([]);
        continue;
      }
      ctx.beginPath(); ctx.moveTo(it.pr[0][0], it.pr[0][1]);
      for (let j = 1; j < it.pr.length; j++) ctx.lineTo(it.pr[j][0], it.pr[j][1]);
      ctx.closePath();
      ctx.fillStyle = it.fill; ctx.fill();
      if (it.stroke) { ctx.strokeStyle = it.fill; ctx.lineWidth = 0.6; ctx.stroke(); }
      if (it.draw) { ctx.globalAlpha = 1; it.draw(it.pr); }
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- Loop: animate while moving or on screen ---------- */
  let visible = false, raf = 0, swayT0 = 0;
  function frame(now) {
    advance(now);
    if (!reduce) { if (!swayT0) swayT0 = now; yaw = -0.56 + 0.24 * Math.sin((now - swayT0) / 4200); }
    render(now);
    raf = (visible || seq) ? requestAnimationFrame(frame) : 0;
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting && !reduce; kick(); }).observe(canvas);
  }
  window.addEventListener('resize', function () { resize(); kick(); });
  function readTheme() {
    const cs = getComputedStyle(stage);
    signal = cs.getPropertyValue('--signal').trim() || signal;
    monoFont = cs.getPropertyValue('--mono').trim() || monoFont;
  }
  new MutationObserver(function () { readTheme(); kick(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------- UI ---------- */
  const btn = $('bloom-btn');
  function set(o) {
    open = o;
    from = Object.assign({}, S);
    seq = o ? OPEN : CLOSE; t0 = performance.now();
    if (reduce) { Object.keys(S).forEach(function (k) { S[k] = o ? 1 : 0; }); seq = null; stepText = o ? 'FAR · LOCKED' : 'NORMAL'; }
    btn.setAttribute('aria-pressed', String(o));
    $('bloom-btn-t').textContent = o ? 'Fold away, back to normal' : 'Switch to far mode';
    $('bloom-tag').textContent = o ? 'FAR · PETALS OPEN · FEED POD AT THE FOCUS' : 'NORMAL · PETALS FOLDED AWAY';
    kick();
  }
  btn.addEventListener('click', function () { set(!open); });
  const NOTE = {
    tx: 'Sending: the tweeter at the focus fires into the dish, and the curve turns the spreading sound into a narrow parallel beam. The lines across the beam are wavefronts, one wavelength apart.',
    rx: 'Listening: sound arriving straight on hits the whole dish and is reflected to one point, the focus, where the pod’s mic sits.'
  };
  document.querySelectorAll('.bloom-rays button').forEach(function (b) {
    b.addEventListener('click', function () {
      rx = b.getAttribute('data-ray') === 'rx';
      document.querySelectorAll('.bloom-rays button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      $('bloom-note').textContent = NOTE[rx ? 'rx' : 'tx'];
      kick();
    });
  });

  /* ---------- Measurements taken from the model itself ---------- */
  const stowed = centreline(0, 0);
  let budR = 0, budTop = 0;
  for (let i = 0; i <= NSI; i += 2) for (let j = 0; j <= 24; j++) {
    const p = surf(stowed, i, -1 + j / 12, 0.3);
    budR = Math.max(budR, Math.hypot(p[0], p[2])); budTop = Math.max(budTop, p[1]);
  }
  const budDia = 2 * budR, budLen = HUB_H + budTop + 1.5 + POD_H;
  // stretch needed to lay the doubly curved petal on a developable (rolled) shape: best flat
  // development, as a strain along the petal; then add the bending strain where it is worst
  const devK = (function () {
    let lo = 9, hi = 0; for (let i = 0; i < MER.length; i += 20) { const q = MER[i].r / (R0 + MER[i].s); lo = Math.min(lo, q); hi = Math.max(hi, q); }
    return { k: (lo + hi) / 2, max: (hi - lo) / (hi + lo) * 100 };
  })();
  const memAt = function (s) { const m = at(s); return Math.abs(m.r / (R0 + s) / devK.k - 1) * 100; };
  const membrane = devK.max;
  const bendCrease = T / (2 * RC) * 100, bendWrap = T / (2 * R0) * 100;
  const spots = [[bendCrease + memAt(SC), 'at the crease'], [bendWrap + memAt(0), 'at the hub'], [T / (2 * (R0 + 2 * PITCH)) * 100 + memAt(L), 'at the rim']]
    .sort(function (p, q) { return q[0] - p[0]; });
  const worst = spots[0][0], worstAt = spots[0][1];
  const sheetPerStation = NP * DPSI * (2 * at(SC).r);
  const gain = RANGE.dish(D / 1000, RANGE.MODES.far.f, 20), bw = RANGE.BW(20);
  const row = function (k, v) { return '<tr><td>' + k + '</td><td>' + v + '</td></tr>'; };
  const f1 = function (x) { return x.toFixed(1); };
  $('bloom-table').innerHTML =
    row('Dish diameter D', D / 10 + ' cm') +
    row('Focal length F', F + ' mm (f/D = ' + (F / D).toFixed(2) + ')') +
    row('Depth at the rim, D² ÷ 16F', f1(D * D / (16 * F)) + ' mm') +
    row('Wavelength λ at 20 °C', (LAM / 10).toFixed(2) + ' cm') +
    row('Gain each end, η = ' + RANGE.ETA + ' assumed', '+' + gain.toFixed(1) + ' dB') +
    row('Beam width, ≈ 1.2·λ/D', bw.toFixed(1) + '° (aim within ±' + (bw / 2).toFixed(1) + '°)') +
    row('Range, long-range → far', '~' + RANGE.fmt(RANGE.R.lr) + ' m → ~' + RANGE.fmt(RANGE.R.far) + ' m');
  $('bloom-physics').innerHTML =
    row('Petal sheet', T + ' mm superelastic NiTi, ' + f1(L) + ' mm long, crease at ' + f1(SC) + ' mm') +
    row('Bend at the crease, t ÷ 2R (R = ' + RC + ' mm)', f1(bendCrease) + ' %') +
    row('Bend at the tightest wrap (R = ' + R0 + ' mm)', f1(bendWrap) + ' %') +
    row('Stretch to lay the curved petal flat (best fit)', f1(membrane) + ' %') +
    row('Worst point, bend and stretch together', f1(worst) + ' % ' + worstAt + ' (NiTi recovers 5–6 %)') +
    row('Folded bud, measured from the model', 'Ø ' + f1(budDia) + ' × ' + f1(budLen) + ' mm');
  document.querySelectorAll('[data-r]').forEach(function (e) { e.textContent = RANGE.fmt(RANGE.R[e.getAttribute('data-r')]); });

  /* ---------- Where it fits: the space budget, from the same model ---------- */
  (function () {
    const plan = $('fit-plan');
    if (!plan) return;
    const BUD = Math.ceil(budDia * 10) / 10 + 0.2, TUBE = 9.2, BORE = 8.8, ROOM = 9.6, MAST = 3;
    const wrapA = sheetPerStation * PITCH, mastA = Math.PI * MAST * MAST / 4;
    const budMin = 2 * Math.sqrt((wrapA + mastA) / Math.PI);
    const boardCut = 19.2 * 38.6, boardArea = 74.8 * 52.8;
    const cellOld = 5 * 34 * 50 / 1000, cellNew = 2 * 5 * 25 * 38 / 1000;
    $('fit-table').innerHTML =
      row('Petals', NP + ' × ' + T + ' mm NiTi on a Ø ' + (2 * R0) + ' mm hub, one crease at mid-length') +
      row('Petal sheet to wrap at any height', 'inner + outer half widths = ' + f1(sheetPerStation) + ' mm') +
      row('Wrapped at ' + PITCH + ' mm a layer, plus a Ø ' + MAST + ' mm mast', f1(wrapA) + ' + ' + f1(mastA) + ' mm² → bud at least Ø ' + f1(budMin) + ' mm') +
      row('Folded bud in the 3D model', 'Ø ' + f1(budDia) + ' mm, designed Ø ' + f1(BUD) + ' mm') +
      row('Bud length: hub + folded petals + pod', f1(budLen) + ' mm') +
      row('Pocket', 'tube Ø ' + BORE + ' inside, Ø ' + TUBE + ' outside, 38 mm deep') +
      row('Room inside the case at the pocket', ROOM + ' mm (e-paper to back) → ' + f1((ROOM - TUBE) / 2) + ' mm each side') +
      row('Bloom module footprint', '19.2 × 38.6 mm: tube, M2 lead screw, 6 mm gear motor') +
      row('Board area given up', f1(boardCut) + ' of ' + f1(boardArea) + ' mm² (' + f1(boardCut / boardArea * 100) + ' %)') +
      row('Battery volume', '1 × 34 × 50 mm = ' + f1(cellOld) + ' cm³ → 2 × 25 × 38 mm = ' + f1(cellNew) + ' cm³') +
      row('Peak strain in the petals', f1(worst) + ' % (NiTi recovers 5–6 %)');

    const Sx = 10, M = 30;
    const r = function (cls, x, y, w, hh, rxx, n) {
      return '<rect class="' + cls + '" x="' + (M + x * Sx) + '" y="' + (M + y * Sx) + '" width="' + (w * Sx) + '" height="' + (hh * Sx) + '" rx="' + (rxx || 0) * Sx + '"/>' +
        (n ? '<g class="fp-n"><circle cx="' + (M + (x + w / 2) * Sx) + '" cy="' + (M + (y + hh / 2) * Sx) + '" r="11"/><text x="' + (M + (x + w / 2) * Sx) + '" y="' + (M + (y + hh / 2) * Sx + 4) + '">' + n + '</text></g>' : '');
    };
    const c = function (cls, x, y, rr, n) {
      return '<circle class="' + cls + '" cx="' + (M + x * Sx) + '" cy="' + (M + y * Sx) + '" r="' + rr * Sx + '"/>' +
        (n ? '<g class="fp-n"><circle cx="' + (M + x * Sx) + '" cy="' + (M + y * Sx) + '" r="11"/><text x="' + (M + x * Sx) + '" y="' + (M + y * Sx + 4) + '">' + n + '</text></g>' : '');
    };
    let g = r('fp-case', 0, 0, 78, 56, 3) + r('fp-in', 1.2, 1.2, 75.6, 53.6, 2);
    g += r('fp-dash', 29.4, 1.2, 19.2, 37.4) + r('fp-dash mcu', 7.2, 8, 19.2, 14.4);
    g += r('fp-horn', 8, 1.2, 18.8, 14, 0.6, 3) + r('fp-horn', 55.6, 1.2, 18.8, 14, 0.6, 3);
    [10.2, 19, 57.8, 66.6].forEach(function (x) { g += r('fp-port', x, 0, 6, 1.2); });
    g += r('fp-cell', 2.4, 16, 25, 38, 0.8, 4) + r('fp-cell', 50.2, 16, 25, 38, 0.8, 4);
    g += r('fp-tube', 34.4, 0.4, TUBE, 37.2, 1.2) + r('fp-bud', 39 - BUD / 2, 1.4, BUD, budLen, 1.2, 1);
    g += r('fp-door', 34.4, 0, TUBE / 2, 1.2) + r('fp-door', 34.4 + TUBE / 2, 0, TUBE / 2, 1.2);
    g += r('fp-screw', 44.4, 1.2, 2.8, 36.4, 0.4, 2) + r('fp-motor', 28.4, 19.6, 5.6, 18, 1, 5) + r('fp-gear', 28.4, 37.6, 19.2, 1.6);
    g += c('fp-lra', 39, 44, 3.6, 6) + r('fp-usb', 26, 48.8, 9.2, 5.2, 0.6, 7);
    [[6.6, 3.6], [71.4, 3.6], [6.6, 51.6], [71.4, 51.6]].forEach(function (m) { g += c('fp-mic', m[0], m[1], 0.9); });
    const dim = function (x1, y1, x2, y2, t, tx, ty, rot) {
      return '<path class="fp-dim" d="M' + (M + x1 * Sx) + ' ' + (M + y1 * Sx) + ' L' + (M + x2 * Sx) + ' ' + (M + y2 * Sx) + '"/>' +
        '<text class="fp-dt" x="' + (M + tx * Sx) + '" y="' + (M + ty * Sx) + '"' + (rot ? ' transform="rotate(-90 ' + (M + tx * Sx) + ' ' + (M + ty * Sx) + ')"' : '') + ' text-anchor="middle">' + t + '</text>';
    };
    g += dim(29.4, -1.4, 48.6, -1.4, 'pocket module 19.2 mm', 39, -2.1);
    g += dim(0, 57.6, 78, 57.6, '78 mm', 39, 59.6) + dim(79.4, 0, 79.4, 56, '56 mm', 80.9, 28, true);
    plan.setAttribute('viewBox', '0 0 ' + (2 * M + 84 * Sx) + ' ' + (2 * M + 62 * Sx));
    plan.innerHTML = g;
    const KEY = [
      ['Folded bud', 'Ø ' + f1(BUD) + ' × ' + f1(budLen) + ' mm in a Ø ' + TUBE + ' mm tube; doors at the top edge'],
      ['Lead screw', 'M2, 2 mm lead, ' + TRAVEL + ' mm of travel'],
      ['Horn blocks', '4 piezo tweeters along the top edge'],
      ['Two cells', '25 × 38 × 5 mm each, 1000 mAh together (estimate)'],
      ['Gear motor', '6 mm, turns the screw through the gear plate'],
      ['Vibration motor', '8 mm LRA, moved below the pocket'],
      ['USB-C', 'unchanged']
    ];
    $('fit-key').innerHTML = KEY.map(function (k) { return '<li><b>' + k[0] + '</b><span>' + k[1] + '</span></li>'; }).join('');
    const K = 40, X0 = 10;
    const seg = function (cls, a, b) { return '<rect class="' + cls + '" x="' + (X0 + a * K) + '" y="26" width="' + ((b - a) * K) + '" height="40"/>'; };
    let st = seg('fs-glass', 0, 1.2) + seg('fs-paper', 1.2, 2.4) + seg('fs-room', 2.4, 12) + seg('fs-back', 12, 13);
    st += '<rect class="fs-tube" x="' + (X0 + 2.6 * K) + '" y="32" width="' + (TUBE * K) + '" height="28" rx="14"/>' +
      '<text class="fs-t" x="' + (X0 + 0.6 * K) + '" y="16" text-anchor="middle">glass</text>' +
      '<text class="fs-t" x="' + (X0 + 1.8 * K) + '" y="16" text-anchor="middle">e-paper</text>' +
      '<text class="fs-t" x="' + (X0 + 7.2 * K) + '" y="51" text-anchor="middle">tube Ø ' + TUBE + ' in ' + ROOM + ' mm of room</text>' +
      '<text class="fs-t" x="' + (X0 + 12.5 * K) + '" y="16" text-anchor="middle">back</text>' +
      '<path class="fp-dim" d="M' + X0 + ' 92 H' + (X0 + 13 * K) + '"/><text class="fp-dt" x="' + (X0 + 6.5 * K) + '" y="110" text-anchor="middle">13.0 mm, front to back</text>';
    $('fit-stack').setAttribute('viewBox', '0 0 ' + (2 * X0 + 13 * K) + ' 116');
    $('fit-stack').innerHTML = st;
  })();

  window.CIPHER_ECHO_BLOOM = { budDia: budDia, budLen: budLen, strain: worst, L: L, set: set, S: S };
  readTheme(); resize(); render(performance.now());
})();
