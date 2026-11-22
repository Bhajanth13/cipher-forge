/* =========================================================
   Cipher Forge — slides.js
   Seven slides on a heptagonal rotor. Scrolling turns the
   rotor from one face to the next; while a face is square to
   you, scrolling builds it step by step (like clicking through
   a slide). Every number on the slides is computed here from
   the same functions the lab uses.
   ========================================================= */
(function () {
  'use strict';
  const $ = function (id) { return document.getElementById(id); };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  const smooth = function (t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const outCubic = function (t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); };
  const span = function (p, a, b) { return clamp((p - a) / (b - a), 0, 1); };

  /* ---------- the cipher maths (A = 0 … Z = 25) ---------- */
  const AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', N = 26;
  const mod = function (a, m) { return ((a % m) + m) % m; };
  const shift = function (k) { return function (x) { return mod(x + k, N); }; };
  const mul = function (a) { return function (x) { return mod(a * x, N); }; };
  const mirror = function (x) { return N - 1 - x; };
  const F = function (x) { return mirror(mul(5)(shift(3)(x))); };
  const Finv = function (y) { return shift(-3)(mul(21)(mirror(y))); };   // f₁⁻¹ ∘ f₂⁻¹ ∘ f₃⁻¹
  const onText = function (s, f) { return s.replace(/[A-Z]/g, function (ch) { return AZ[f(AZ.indexOf(ch))]; }); };

  /* ---------- slides, rail, rotor geometry ---------- */
  const faces = Array.prototype.slice.call(document.querySelectorAll('.face'));
  const NS = faces.length, STEP = 360 / NS, DW = 0.7;      // DW: share of each slide's scroll spent building it
  const TITLES = ['Cipher Forge', 'Sets', 'Functions', 'Bijections', 'Relations and inverses', 'Breaking it', 'Counting keys'];
  const drum = $('drum'), scroller = $('scroller');
  let H = 0, SEG = 0, R = 0;
  $('rail').innerHTML = TITLES.map(function (t, i) {
    return '<li><button type="button" data-i="' + i + '" aria-label="Slide ' + (i + 1) + ': ' + t + '"><span class="rl">' + t + '</span><span class="rn">' + (i + 1) + '</span></button></li>';
  }).join('');
  const railItems = Array.prototype.slice.call(document.querySelectorAll('#rail li'));
  function measure() {
    H = window.innerHeight;
    SEG = Math.round(H * 1.5);
    R = H / (2 * Math.tan(Math.PI / NS));
    faces.forEach(function (f, i) { f.style.transform = 'rotateX(' + (-i * STEP) + 'deg) translateZ(' + R.toFixed(1) + 'px)'; });
    scroller.style.height = ((NS - 1) * SEG + DW * SEG + H) + 'px';
  }

  /* ---------- builds ---------- */
  const builds = faces.map(function (f) {
    return Array.prototype.slice.call(f.querySelectorAll('.b')).map(function (el) { return { el: el, at: parseFloat(el.getAttribute('data-at')) || 0 }; });
  });
  function build(i, p) { builds[i].forEach(function (b) { b.el.classList.toggle('on', p >= b.at - 1e-6); }); }

  /* ---------- 1 · rotors: HELLO turns three places into KHOOR ---------- */
  const WORD = 'HELLO', PA = 360 / N, PR = 46 / (2 * Math.tan(Math.PI / N));
  const rotors = WORD.split('').map(function (ch) {
    const r = document.createElement('div'); r.className = 'rotor';
    const d = document.createElement('div'); d.className = 'drumR';
    let html = '';
    for (let j = 0; j < N; j++) html += '<div class="plate" style="transform:rotateX(' + (-j * PA) + 'deg) translateZ(' + PR.toFixed(1) + 'px)">' + AZ[j] + '</div>';
    d.innerHTML = html; r.appendChild(d); $('rotors').appendChild(r);
    return { drum: d, start: AZ.indexOf(ch), plates: d.children };
  });
  function s1(p) {
    let kShown = 0;
    rotors.forEach(function (r, w) {
      const k = 3 * smooth(span(p, 0.18 + w * 0.06, 0.55 + w * 0.06));
      r.drum.style.transform = 'rotateX(' + ((r.start + k) * PA).toFixed(2) + 'deg)';
      const front = mod(Math.round(r.start + k), N);
      Array.prototype.forEach.call(r.plates, function (pl, j) { pl.classList.toggle('hit', j === front && k > 2.98); });
      if (w === rotors.length - 1) kShown = Math.round(k);
    });
    $('t-k').textContent = kShown;
    $('t-out').textContent = rotors.map(function (r, w) {
      const k = 3 * smooth(span(p, 0.18 + w * 0.06, 0.55 + w * 0.06));
      return AZ[mod(Math.round(r.start + k), N)];
    }).join('');
  }

  /* ---------- 2 · sets: letters assemble, then four set operations ---------- */
  const VOW = 'AEIOU';
  const tiles = AZ.split('').map(function (ch, i) {
    const el = document.createElement('div'); el.className = 'lt'; el.textContent = ch; $('letters').appendChild(el);
    const rnd = function (s) { const x = Math.sin((i + 1) * s) * 10000; return x - Math.floor(x) - 0.5; };
    return { el: el, ch: ch, dx: rnd(12.9) * 520, dy: rnd(78.2) * 360, dz: rnd(37.7) * 700, rx: rnd(4.1) * 300, ry: rnd(9.3) * 300 };
  });
  const OPS = [
    { t: 'A ∪ D: 26 letters + 10 digits = 36 symbols', on: ['v-a', 'v-d'], cut: [], tile: '' },
    { t: 'A ∩ V = {A, E, I, O, U}: 5 symbols', on: ['v-v'], cut: [], tile: 'vow' },
    { t: 'A − V: the 21 consonants', on: ['v-a'], cut: ['v-v'], tile: 'cons' },
    { t: 'V Δ D: in exactly one of them, 5 + 10 = 15', on: ['v-v', 'v-d'], cut: [], tile: 'vow' }
  ];
  function s2(p) {
    const a = outCubic(span(p, 0.0, 0.32)), k = 1 - a;
    tiles.forEach(function (t) {
      t.el.style.transform = k < 0.001 ? 'none' : 'translate3d(' + (t.dx * k).toFixed(1) + 'px,' + (t.dy * k).toFixed(1) + 'px,' + (t.dz * k).toFixed(1) + 'px) rotateX(' + (t.rx * k).toFixed(1) + 'deg) rotateY(' + (t.ry * k).toFixed(1) + 'deg)';
      t.el.style.opacity = (0.2 + 0.8 * a).toFixed(2);
    });
    const oi = p < 0.36 ? -1 : Math.min(3, Math.floor(span(p, 0.36, 0.7) * 4));
    const op = OPS[Math.max(0, oi)];
    ['v-a', 'v-v', 'v-d'].forEach(function (c) {
      const el = document.querySelector('#venn .' + c);
      el.classList.toggle('v-on', oi >= 0 && op.on.indexOf(c) >= 0);
      el.classList.toggle('v-cut', oi >= 0 && op.cut.indexOf(c) >= 0);
    });
    $('venn-op').textContent = op.t;
    tiles.forEach(function (t) {
      const v = VOW.indexOf(t.ch) >= 0;
      t.el.classList.toggle('vow', oi >= 0 && op.tile === 'vow' && v);
      t.el.classList.toggle('dim', oi >= 0 && ((op.tile === 'vow' && !v) || (op.tile === 'cons' && v)));
    });
  }

  /* ---------- 3 · functions: H travels through three blocks ---------- */
  const cubes = Array.prototype.slice.call(document.querySelectorAll('.pcube'));
  const SEQ = ['H', 'K', 'Y', 'B'];
  function s3(p) {
    const box = $('pipe').getBoundingClientRect();
    const cx = cubes.map(function (c) { const r = c.getBoundingClientRect(); return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top]; });
    const pts = [[cx[0][0] - 110, cx[0][1]]].concat(cx).concat([[cx[2][0] + 110, cx[2][1]]]);
    const t = span(p, 0.28, 0.8) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(t)), f = smooth(t - i);
    const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f;
    const tok = $('token');
    tok.style.transform = 'translate(' + x.toFixed(1) + 'px,' + (y - box.height / 2).toFixed(1) + 'px) scale(' + (p < 0.26 ? 0.6 : 1) + ')';
    tok.style.opacity = p < 0.26 ? 0 : 1;
    const passed = Math.min(3, Math.max(0, Math.floor(t - 0.5)));
    tok.textContent = SEQ[t < 1.5 ? 0 : passed];
    cubes.forEach(function (c, k) { c.style.borderColor = Math.abs(t - (k + 1)) < 0.5 ? 'var(--brass)' : ''; });
  }

  /* ---------- 4 · bijection vs collision ---------- */
  const AW = 560, AH = 300, Y0 = 12, DY = (AH - 24) / (N - 1);
  const yOf = function (j) { return Y0 + j * DY; };
  (function () {
    let g = '';
    for (let j = 0; j < N; j++) {
      g += '<text class="al" x="22" y="' + (yOf(j) + 3.5).toFixed(1) + '">' + AZ[j] + '</text>';
      g += '<text class="al out" data-j="' + j + '" x="528" y="' + (yOf(j) + 3.5).toFixed(1) + '">' + AZ[j] + '</text>';
      g += '<path class="ar" data-j="' + j + '"/>';
    }
    $('arrows').innerHTML = g;
  })();
  const arrowPaths = Array.prototype.slice.call(document.querySelectorAll('#arrows .ar'));
  const outs = Array.prototype.slice.call(document.querySelectorAll('#arrows .out'));
  function s4(p) {
    const q = smooth(span(p, 0.46, 0.6)), bad = q > 0.5;
    const hits = new Array(N).fill(0);
    arrowPaths.forEach(function (a, j) {
      const y1 = yOf(j), y2 = yOf(mul(3)(j)) + (yOf(mul(2)(j)) - yOf(mul(3)(j))) * q;
      a.setAttribute('d', 'M38 ' + y1.toFixed(1) + ' C 260 ' + y1.toFixed(1) + ', 300 ' + y2.toFixed(1) + ', 518 ' + y2.toFixed(1));
      a.style.opacity = p >= 0.06 + j * 0.006 ? 1 : 0;
      hits[bad ? mul(2)(j) : mul(3)(j)]++;
    });
    arrowPaths.forEach(function (a, j) { a.classList.toggle('clash', bad && hits[mul(2)(j)] > 1); });
    outs.forEach(function (o, j) { o.classList.toggle('clash', bad && hits[j] > 1); o.classList.toggle('miss', bad && hits[j] === 0); });
    $('ac-title').textContent = bad ? 'multiply(2): not one-to-one' : 'multiply(3): a bijection';
    $('ac-foot').textContent = bad ? 'A and N → A, B and O → C, … 13 letters are never reached' : '26 inputs · 26 different outputs · undo with multiply(9), since 3 × 9 = 27 ≡ 1';
    $('ac-title').closest('.arrows-card').classList.toggle('bad', bad);
  }

  /* ---------- 5 · relation matrix and the round trip ---------- */
  (function () {
    let h = '';
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) h += '<i class="mc' + (F(r) === c ? ' dot" data-r="' + r : '') + '"></i>';
    $('matrix').innerHTML = h;
    const m = $('trip-m').textContent, c = onText(m, F);
    $('trip-c').textContent = c;
    $('trip-d').textContent = onText(c, Finv);
  })();
  const dots = Array.prototype.slice.call(document.querySelectorAll('#matrix .dot'));
  function s5(p) {
    dots.forEach(function (d) {
      const r = +d.getAttribute('data-r'), on = p >= 0.08 + r * 0.013;
      d.style.opacity = on ? 1 : 0;
      d.style.setProperty('--hz', on ? (8 + 6 * Math.sin(r * 0.7 + p * 12)).toFixed(1) + 'px' : '0px');
    });
  }

  /* ---------- 6 · brute force reel and letter frequencies ---------- */
  const MSG = 'MEET ME AT THE LIBRARY AT NOON', KEY = 7, CT = onText(MSG, shift(KEY));
  $('bf-c').textContent = CT;
  const RA = 360 / N, RR = 28 / (2 * Math.tan(Math.PI / N));
  (function () {
    let h = '<div class="reel-drum" id="reel-drum">';
    for (let k = 0; k < N; k++) h += '<div class="rrow" data-k="' + k + '" style="transform:rotateX(' + (-k * RA) + 'deg) translateZ(' + RR.toFixed(1) + 'px)"><i>k = ' + k + '</i>' + onText(CT, shift(-k)) + '</div>';
    $('reel').innerHTML = h + '</div><div class="reel-win"></div>';
  })();
  const reelRows = Array.prototype.slice.call(document.querySelectorAll('.rrow'));
  // frequency analysis on a paragraph, encrypted with a fixed random substitution
  const PARA = 'DISCRETE MATHEMATICS STUDIES OBJECTS THAT COME IN SEPARATE PIECES SUCH AS LETTERS KEYS BITS AND CHOICES. A CIPHER TURNS EACH LETTER OF A MESSAGE INTO ANOTHER LETTER AND ONLY A BIJECTION CAN BE UNDONE. COUNTING TELLS US HOW MANY KEYS AN ATTACKER MUST TRY WHILE THE PIGEONHOLE PRINCIPLE EXPLAINS WHY A LONG MESSAGE STILL LEAKS THE SHAPE OF THE LANGUAGE IT WAS WRITTEN IN.';
  const SUB = (function () { const a = AZ.split(''); let s = 20261122; for (let i = a.length - 1; i > 0; i--) { s = (s * 1103515245 + 12345) % 2147483648; const j = s % (i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; } return a.join(''); })();
  const PCT = PARA.replace(/[A-Z]/g, function (ch) { return SUB[AZ.indexOf(ch)]; });
  const tally = function (s) { const c = {}; s.replace(/[A-Z]/g, function (ch) { c[ch] = (c[ch] || 0) + 1; return ch; }); return Object.keys(c).map(function (k) { return [k, c[k]]; }).sort(function (a, b) { return b[1] - a[1] || (a[0] < b[0] ? -1 : 1); }); };
  const cT = tally(PCT), pT = tally(PARA), MAXC = cT[0][1];
  $('freq').innerHTML = cT.map(function (c, i) {
    const pl = pT[i] || ['', 0];
    return '<div class="fq"><i class="up" style="--h:' + (c[1] / MAXC * 100).toFixed(1) + '%"></i><span class="cl">' + c[0] + '</span><span class="pl">' + pl[0] + '</span><i class="dn" style="--h:' + (pl[1] / MAXC * 100).toFixed(1) + '%"></i></div>';
  }).join('');
  $('freq-foot').textContent = 'Top: ciphertext letters · bottom: the message’s letters. Most common: ' + cT[0][0] + ' (' + cT[0][1] + ') in the ciphertext stands for ' + pT[0][0] + ' (' + pT[0][1] + ').';
  const bars = Array.prototype.slice.call(document.querySelectorAll('#freq .up, #freq .dn'));
  function s6(p) {
    const turn = outCubic(span(p, 0.08, 0.46)) * (N + KEY);
    $('reel-drum').style.transform = 'rotateX(' + (turn * RA).toFixed(2) + 'deg)';
    const k = mod(Math.round(turn), N), done = p >= 0.46;
    reelRows.forEach(function (r, j) { r.classList.toggle('win', done && j === KEY); });
    $('bf-foot').textContent = done ? 'k = ' + KEY + ' reads “' + MSG + '”, found after at most 26 tries' : 'trying k = ' + k;
    const g = smooth(span(p, 0.52, 0.78));
    bars.forEach(function (b) { b.style.setProperty('--g', g.toFixed(3)); });
  }

  /* ---------- 7 · counting: 26! on an odometer ---------- */
  let fact = 1n; for (let i = 2n; i <= 26n; i++) fact *= i;
  const FACT = fact.toString(), PW = 72n ** 8n;
  const commas = function (s) { return s.replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
  $('pw-n').textContent = commas(PW.toString());
  const YEAR = 365.25 * 86400;
  $('odo-years').textContent = 'about ' + (Number(fact) / 1e9 / YEAR / 1e9).toFixed(1) + ' billion years to try them all (the universe is about 13.8 billion years old)';
  $('pw-time').textContent = 'about ' + (Number(PW) / 1e9 / 86400).toFixed(1) + ' days at the same speed';
  const DA = 36, DR = 28 / (2 * Math.tan(Math.PI / 10));
  const digits = FACT.split('').map(function (d, i) {
    const box = document.createElement('div');
    box.className = 'dg' + ((FACT.length - i) % 3 === 0 && i > 0 ? ' sep' : '');
    let h = '<div class="dg-drum">';
    for (let v = 0; v < 10; v++) h += '<div class="dg-f" style="transform:rotateX(' + (-v * DA) + 'deg) translateZ(' + DR.toFixed(1) + 'px)">' + v + '</div>';
    box.innerHTML = h + '</div>';
    $('odo').appendChild(box);
    return { drum: box.firstChild, d: +d, spins: 20 + i * 1 };
  });
  function s7(p) {
    digits.forEach(function (g, i) {
      const t = outCubic(span(p, 0.42 + i * 0.004, 0.62 + i * 0.006));
      g.drum.style.transform = 'rotateX(' + ((g.d + g.spins * (1 - t) * (t > 0 ? 1 : 0)) * DA).toFixed(1) + 'deg)';
    });
  }
  const DEMO = [s1, s2, s3, s4, s5, s6, s7];

  /* ---------- scroll → rotor angle and build progress ---------- */
  const prog = new Array(NS).fill(-1);
  let angle = 0, lastNow = -1;
  function frame() {
    const y = window.scrollY;
    const i = clamp(Math.floor(y / SEG), 0, NS - 1), f = (y - i * SEG) / SEG;
    let a, pNow;
    if (f < DW || i === NS - 1) { a = i; pNow = clamp(f / DW, 0, 1); }
    else { const t = (f - DW) / (1 - DW); a = i + (reduce ? Math.round(t) : smooth(t)); pNow = 1; }
    angle = a;
    drum.style.transform = 'translateZ(' + (-R).toFixed(1) + 'px) rotateX(' + (a * STEP).toFixed(3) + 'deg)';
    faces.forEach(function (fc, k) {
      const off = Math.abs(a - k);
      fc.style.setProperty('--shade', Math.min(0.75, off * 0.9).toFixed(3));
      fc.style.visibility = off > 1.2 ? 'hidden' : 'visible';
      fc.setAttribute('aria-hidden', String(off > 0.5));
      const p = reduce ? (k <= i ? 1 : 0) : (k < i ? 1 : k === i ? pNow : 0);
      if (p !== prog[k]) { prog[k] = p; build(k, p); if (off < 1.2 || p === 1 || p === 0) DEMO[k](p); }
    });
    const now = Math.round(a);
    if (now !== lastNow) {
      lastNow = now;
      $('count-now').textContent = String(now + 1).padStart(2, '0');
      railItems.forEach(function (li, k) { li.classList.toggle('is-now', k === now); li.classList.toggle('is-done', k < now); });
    }
    if (y > 20) $('deck-hint').classList.add('gone');
  }
  let ticking = false;
  function request() { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; frame(); }); } }
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', function () { measure(); prog.fill(-1); frame(); });

  // settle onto a face when scrolling stops half-way through a turn
  let idle = 0;
  window.addEventListener('scroll', function () {
    clearTimeout(idle);
    idle = setTimeout(function () {
      const y = window.scrollY, i = Math.floor(y / SEG), f = (y - i * SEG) / SEG;
      if (i >= NS - 1 || f <= DW + 0.001) return;
      const t = (f - DW) / (1 - DW);
      go(t < 0.5 ? i * SEG + DW * SEG : (i + 1) * SEG);
    }, 180);
  }, { passive: true });

  /* ---------- keys, rail, full screen ---------- */
  function go(top) { window.scrollTo({ top: Math.round(top), behavior: reduce ? 'auto' : 'smooth' }); }
  const slideStart = function (i) { return i * SEG; }, slideBuilt = function (i) { return i * SEG + DW * SEG; };
  function next() {
    const y = window.scrollY + 2, i = clamp(Math.floor(y / SEG), 0, NS - 1);
    if (y < slideBuilt(i) - 4) go(slideBuilt(i)); else if (i < NS - 1) go(slideStart(i + 1));
  }
  function prev() {
    const y = window.scrollY - 2, i = clamp(Math.floor(y / SEG), 0, NS - 1);
    if (y > slideStart(i) + 4) go(slideStart(i)); else if (i > 0) go(slideStart(i - 1));
  }
  window.addEventListener('keydown', function (e) {
    if (e.target.closest && e.target.closest('input, textarea, select')) return;
    const k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || (k === ' ' && !e.shiftKey)) { e.preventDefault(); next(); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || (k === ' ' && e.shiftKey)) { e.preventDefault(); prev(); }
    else if (k === 'Home') { e.preventDefault(); go(0); }
    else if (k === 'End') { e.preventDefault(); go(slideBuilt(NS - 1)); }
    else if (/^[1-7]$/.test(k)) go(slideStart(+k - 1));
    else if (k === 'f' || k === 'F') toggleFull();
  });
  $('rail').addEventListener('click', function (e) { const b = e.target.closest('button'); if (b) go(slideStart(+b.getAttribute('data-i'))); });
  function toggleFull() {
    if (!document.fullscreenElement) { if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () {}); }
    else if (document.exitFullscreen) document.exitFullscreen();
  }
  $('btn-full').addEventListener('click', toggleFull);

  measure(); frame();
  DEMO.forEach(function (d, k) { d(prog[k] < 0 ? 0 : prog[k]); });
})();
