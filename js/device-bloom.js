/* =========================================================
   Cipher Echo — device-bloom.js
   Far mode in 3D: a petal reflector that blooms out of the
   top edge. Units: 5 px = 1 mm, like the rest of the device.

   Geometry (design values, shown on the page):
   - dish diameter D = 100 mm, focal length F = 40 mm (f/D = 0.4)
   - paraboloid h(r) = r² / 4F, rim depth D² / 16F = 15.6 mm
   - eight petals from the hub (r = 4.8 mm) to the rim (r = 50 mm),
     each drawn as four flat segments that follow the curve
   - a feed pod (one tweeter, one mic) on a mast at the focus
   ========================================================= */
(function () {
  'use strict';
  const cam = document.getElementById('bloom-cam');
  if (!cam) return;
  const RANGE = window.CIPHER_ECHO_RANGE;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = function (id) { return document.getElementById(id); };

  const MM = 5;                       // px per mm
  const D = 100, F = 40, R0 = 4.8;    // mm
  const RIM = D / 2;
  const h = function (r) { return r * r / (4 * F); };
  const NP = 8;

  /* ---------- Body: 78 × 56 × 13 mm, top edge at y = 0 ---------- */
  const W = 78 * MM, H = 56 * MM, T = 13 * MM;
  function body() {
    const ports = [52, 96, 290, 334].map(function (x) { return '<i class="bl-port" style="left:' + x + 'px"></i>'; }).join('') +
      '<i class="bl-mic" style="left:30px"></i><i class="bl-mic" style="left:354px"></i><i class="bl-slot"></i>';
    const screen = '<div class="bl-paper"><b>CIPHER ECHO</b><span class="bl-mode"></span><span class="bl-aim"></span><span class="bl-bar"><i></i></span></div>';
    return '<div class="slab bl-body" style="--x:' + (-W / 2) + 'px;--y:0px;--w:' + W + 'px;--h:' + H + 'px;--t:' + T + 'px;--z:' + (-T / 2) + 'px">' +
      '<div class="f bot"></div><div class="f e-n">' + ports + '</div><div class="f e-s"></div><div class="f e-w"></div><div class="f e-e"></div>' +
      '<div class="f top">' + screen + '</div></div>';
  }

  /* ---------- A short cylinder standing on the axis (discs stacked upward) ---------- */
  function column(cls, d, len, n, y0) {
    let s = '<div class="bl-col ' + cls + '" style="transform:translateY(' + y0 + 'px)">';
    for (let i = 0; i < n; i++) {
      s += '<i class="' + (i === n - 1 ? 'cap' : i === 0 ? 'base' : '') + '" style="width:' + d + 'px;height:' + d + 'px;left:' + (-d / 2) + 'px;top:' + (-d / 2) + 'px;transform:translateY(' + (-len * i / (n - 1)).toFixed(1) + 'px) rotateX(90deg)"></i>';
    }
    return s + '</div>';
  }
  // A thin rod: two crossed planes
  function rod(cls, w, len) {
    return '<div class="bl-rod ' + cls + '"><i style="width:' + w + 'px;height:' + len + 'px;left:' + (-w / 2) + 'px;top:' + (-len) + 'px"></i>' +
      '<i style="width:' + w + 'px;height:' + len + 'px;left:' + (-w / 2) + 'px;top:' + (-len) + 'px;transform:rotateY(90deg)"></i></div>';
  }

  /* ---------- Petals ---------- */
  const EDGES = [R0, 16, 27.4, 38.7, RIM];          // radii where the segments meet, mm
  const OPEN = [], FOLD = [89, 0, 183, 0];             // segment angles, degrees (each relative to the last)
  const LEN = [], WIDTH = [];
  let prev = 0;
  for (let i = 0; i < 4; i++) {
    const dr = EDGES[i + 1] - EDGES[i], dh = h(EDGES[i + 1]) - h(EDGES[i]);
    const ang = Math.atan2(dh, dr) * 180 / Math.PI;
    OPEN.push(ang - prev); prev = ang;
    LEN.push(Math.hypot(dr, dh) * MM);
  }
  // open: each petal covers 1/8 of the circle plus a small overlap; folded: they wrap the mast
  for (let i = 0; i <= 4; i++) WIDTH.push(2 * Math.PI * EDGES[i] / NP * 1.1 * MM);
  const FOLDW = 2 * Math.PI * (R0 + 1) / NP * MM;
  // The trapezoid is drawn as a background image: clip-path would take the leaf out of
  // Chrome's 3D depth sorting and let the body draw over the front petals.
  function leafSVG(top, bot, light) {
    const pts = '0,' + top + ' 100,0 100,100 0,' + bot;
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'>" +
      "<defs><linearGradient id='g'><stop offset='0' stop-color='#8C97A4'/><stop offset='.4' stop-color='#D9E0E8'/><stop offset='.75' stop-color='#A6B0BB'/><stop offset='1' stop-color='#E4E9EE'/></linearGradient></defs>" +
      "<polygon points='" + pts + "' fill='url(#g)'/><polygon points='" + pts + "' fill='#080C12' fill-opacity='" + Math.max(0, 1 - light).toFixed(2) + "'/>" +
      "<polyline points='0," + top + " 100,0' stroke='#F4F7FA' stroke-width='1.2' fill='none' vector-effect='non-scaling-stroke'/></svg>";
    return 'url(&quot;data:image/svg+xml,' + encodeURIComponent(svg) + '&quot;)';
  }
  function petal(k) {
    const az = k * 360 / NP + 22.5;
    const light = 0.78 + 0.32 * Math.cos((az - 300) * Math.PI / 180);
    let inner = '';
    for (let i = 3; i >= 0; i--) {
      const wIn = WIDTH[i], wOut = WIDTH[i + 1], a = (wIn / wOut);
      const top = ((1 - a) / 2 * 100).toFixed(2), bot = ((1 + a) / 2 * 100).toFixed(2);
      inner = '<div class="bl-seg" style="--x:' + (i === 0 ? R0 * MM : LEN[i - 1]).toFixed(1) + 'px;--a1:' + OPEN[i].toFixed(2) + ';--a0:' + FOLD[i] + '">' +
        '<div class="bl-leaf" style="width:' + (LEN[i] + 1).toFixed(1) + 'px;height:' + wOut.toFixed(1) + 'px;top:' + (-wOut / 2).toFixed(1) + 'px;' +
        '--sf:' + (FOLDW / wOut).toFixed(3) + ';background-image:' + leafSVG(top, bot, light) + '"></div>' + inner + '</div>';
    }
    return '<div class="bl-petal" style="transform:rotateY(' + az + 'deg) translateY(' + (-h(R0) * MM).toFixed(1) + 'px)">' + inner + '</div>';
  }

  /* ---------- Sound paths in the plane through the axis ---------- */
  const SX = 300 * 1, SY = 820;
  function rays() {
    let p = '<rect class="bl-beam" x="' + (-RIM * MM) + '" y="' + (-SY + 30) + '" width="' + (D * MM) + '" height="' + (SY - 30 - h(RIM) * MM) + '"/>';
    p += '<path class="bl-prof" d="M' + (-RIM * MM) + ' ' + (-h(RIM) * MM) + ' Q0 ' + (h(RIM) * MM) + ' ' + (RIM * MM) + ' ' + (-h(RIM) * MM) + '"/>';
    [-46, -37, -28, -19, -11, 11, 19, 28, 37, 46].forEach(function (r) {
      const x = r * MM, y = -h(Math.abs(r)) * MM;
      p += '<path class="bl-ray" d="M0 ' + (-F * MM) + ' L' + x + ' ' + y.toFixed(1) + ' L' + x + ' ' + (-SY + 30) + '"/>';
    });
    p += '<circle class="bl-focus" cx="0" cy="' + (-F * MM) + '" r="6"/>' +
      '<text class="bl-ft" x="14" y="' + (-F * MM + 4) + '">focus</text>';
    return '<svg class="bl-rays" viewBox="' + (-SX) + ' ' + (-SY) + ' ' + (2 * SX) + ' ' + SY + '" style="left:' + (-SX) + 'px;top:' + (-SY) + 'px;width:' + (2 * SX) + 'px;height:' + SY + 'px">' + p + '</svg>';
  }

  /* ---------- Assemble ---------- */
  let petals = '';
  for (let k = 0; k < NP; k++) petals += petal(k);
  cam.innerHTML = '<div class="bl-rig" id="bl-rig">' + body() +
    '<div class="bl-bud">' +
      column('bl-hub', R0 * 2 * MM, 3 * MM, 4, 0) +
      rod('bl-mast1', 3 * MM, 22 * MM) +
      '<div class="bl-mast2">' + rod('', 2.2 * MM, 20 * MM) + '</div>' +
      '<div class="bl-pod">' + column('bl-podc', 12 * MM, 8 * MM, 5, 0) + '<i class="bl-tw"></i></div>' +
      petals +
    '</div>' + rays() + '</div>';

  /* ---------- Figures, all from the same model as the calculator ---------- */
  const c = RANGE.sound(20), lam = c / RANGE.MODES.far.f;
  const gain = RANGE.dish(D / 1000, RANGE.MODES.far.f, 20), bw = RANGE.BW(20);
  const row = function (k, v) { return '<tr><td>' + k + '</td><td>' + v + '</td></tr>'; };
  $('bloom-table').innerHTML =
    row('Dish diameter D', D / 10 + ' cm') +
    row('Focal length F', F + ' mm (f/D = ' + (F / D).toFixed(2) + ')') +
    row('Depth at the rim, D² ÷ 16F', (D * D / (16 * F)).toFixed(1) + ' mm') +
    row('Wavelength λ at 20 °C', (lam * 100).toFixed(2) + ' cm') +
    row('Gain each end, η = ' + RANGE.ETA + ' assumed', '+' + gain.toFixed(1) + ' dB') +
    row('Beam width, ≈ 1.2·λ/D', bw.toFixed(1) + '° (aim within ±' + (bw / 2).toFixed(1) + '°)') +
    row('Range, long-range → far', '~' + RANGE.fmt(RANGE.R.lr) + ' m → ~' + RANGE.fmt(RANGE.R.far) + ' m');
  cam.querySelector('.bl-mode').textContent = 'FAR · 21.2 kHz · ~' + RANGE.fmt(RANGE.R.far) + ' m';
  cam.querySelector('.bl-aim').textContent = 'AIM ±' + (bw / 2).toFixed(1) + '°';
  document.querySelectorAll('[data-r]').forEach(function (e) { e.textContent = RANGE.fmt(RANGE.R[e.getAttribute('data-r')]); });

  /* ---------- One press: bloom / fold ---------- */
  const rig = $('bl-rig'), btn = $('bloom-btn');
  let open = false;
  function set(o) {
    open = o;
    rig.classList.toggle('open', o);
    cam.closest('.bloom-stage').classList.toggle('open', o);
    btn.setAttribute('aria-pressed', String(o));
    $('bloom-btn-t').textContent = o ? 'Fold away, back to normal' : 'Switch to far mode';
    $('bloom-tag').textContent = o ? 'FAR · PETALS OPEN · FEED POD AT THE FOCUS' : 'NORMAL · PETALS FOLDED AWAY';
  }
  btn.addEventListener('click', function () { set(!open); });
  set(false);

  const NOTE = {
    tx: 'Sending: the tweeter at the focus fires into the dish, and the curve turns the spreading sound into a narrow parallel beam.',
    rx: 'Listening: sound arriving straight on hits the whole dish and is reflected to one point, the focus, where the pod’s mic sits.'
  };
  document.querySelectorAll('.bloom-rays button').forEach(function (b) {
    b.addEventListener('click', function () {
      const m = b.getAttribute('data-ray');
      rig.classList.toggle('rx', m === 'rx');
      document.querySelectorAll('.bloom-rays button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      $('bloom-note').textContent = NOTE[m];
    });
  });

  /* ---------- A slow turn so the curve reads as 3D ---------- */
  if (!reduce) {
    let t0 = 0, run = false, raf = 0;
    const tick = function (now) {
      if (!t0) t0 = now;
      rig.style.setProperty('--ry', (-32 + 14 * Math.sin((now - t0) / 4200)).toFixed(2) + 'deg');
      if (run) raf = requestAnimationFrame(tick);
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        run = es[0].isIntersecting;
        cancelAnimationFrame(raf);
        if (run) raf = requestAnimationFrame(tick);
      }).observe(cam);
    }
  }
})();
