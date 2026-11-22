/* =========================================================
   Cipher Forge — device-steps.js
   Two 3D walkthroughs on the Cipher Echo page, each seven steps:
   1. From air to screen: one message, sender to receiver.
   2. The lab's seven steps, lit up inside an X-ray of the unit.
   ========================================================= */
(function () {
  'use strict';

  const W = window.CIPHER_ECHO;
  if (!W) return;
  const $ = function (id) { return document.getElementById(id); };
  const reduce = W.reduce, LETTERS = W.LETTERS;
  const wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  const shift3 = function (t) { return t.replace(/[A-Z]/g, function (c) { return LETTERS[(LETTERS.indexOf(c) + 3) % 26]; }); };

  /* ---------- A stepper: rail buttons, autoplay, pause when hidden ---------- */
  function stepper(railId, n, onStep, ms) {
    const rail = $(railId);
    const btns = Array.prototype.slice.call(rail.querySelectorAll('button'));
    let cur = -1, timer = 0, visible = false, held = false;
    rail.style.setProperty('--dur', ms + 'ms');
    function go(i) {
      cur = (i + n) % n;
      btns.forEach(function (b, k) {
        b.parentNode.classList.toggle('is-active', k === cur);
        b.parentNode.classList.toggle('is-done', k < cur);
        b.setAttribute('aria-current', k === cur ? 'step' : 'false');
      });
      rail.style.setProperty('--fill', (cur / (n - 1) * 100) + '%');
      if (rail.scrollWidth > rail.clientWidth) {
        const li = btns[cur].parentNode;
        rail.scrollTo({ left: li.offsetLeft - rail.clientWidth / 2 + li.offsetWidth / 2, behavior: reduce ? 'auto' : 'smooth' });
      }
      rail.classList.remove('run'); void rail.offsetWidth;
      if (!reduce && visible && !held) rail.classList.add('run');
      onStep(cur);
      schedule();
    }
    function schedule() {
      clearTimeout(timer);
      if (!reduce && visible && !held) timer = setTimeout(function () { go(cur + 1); }, ms);
    }
    btns.forEach(function (b, k) { b.addEventListener('click', function () { go(k); }); });
    const area = rail.parentNode;
    area.addEventListener('mouseenter', function () { held = true; rail.classList.add('held'); clearTimeout(timer); });
    area.addEventListener('mouseleave', function () { held = false; rail.classList.remove('held'); go(cur); });
    new IntersectionObserver(function (es) {
      const was = visible; visible = es[0].isIntersecting;
      if (visible && !was) go(cur < 0 ? 0 : cur); else if (!visible) clearTimeout(timer);
    }, { threshold: 0.35 }).observe(area);
    go(0);
  }

  function chips(list) { return '<div class="sc-chips">' + list.map(function (p) { return '<span class="mono">' + p + '</span>'; }).join('') + '</div>'; }

  /* =========================================================
     1. From air to screen
     ========================================================= */
  (function () {
    const cam = $('jr-cam');
    const MSG = 'MEET AT NOON', CIP = shift3(MSG);
    const BYTES = CIP.slice(0, 6).split('').map(function (c) { return c.charCodeAt(0); });
    const DIGITS = [];
    BYTES.forEach(function (b) { DIGITS.push(b >> 4, b & 15); });

    // A light version of the unit: body, screen and bezel only
    function lite(x, label) {
      const html =
        W.slab('lite-body', 0, 0, 390, 280, 55, 0) +
        '<div class="lite-scr" style="transform:translateZ(55px)">' + W.slab('panel3', 10, 14, 370, 248, 2, 0, W.PAPER) + '</div>' +
        '<div class="lite-bz" style="transform:translateZ(58px)">' + W.slab('bezel', 0, 0, 390, 280, 3, 0) + '</div>' +
        '<span class="lite-spk" style="transform:translateZ(61.5px)"></span><span class="lite-mic" style="transform:translateZ(61.5px)"></span>';
      const wrap = document.createElement('div');
      wrap.className = 'jr-dev';
      wrap.style.transform = 'translate3d(' + x + 'px, 0, 0) scale3d(.5, .5, .5)';
      wrap.innerHTML = '<div class="device lite">' + html + '</div>';
      cam.appendChild(wrap);
      const el = wrap.firstChild;
      el.querySelector('.paper-bar span').textContent = 'CIPHER ECHO · ' + label;
      return {
        el: el, wrap: wrap,
        text: el.querySelector('.pm-text'), cip: el.querySelector('.paper-cip'),
        state: el.querySelector('.pf-state'), bar: el.querySelector('.pf-bar i'),
        key: function (k) { return el.querySelector('.osk-k[data-key="' + k + '"]'); }
      };
    }

    // Floor, the two units, and the floating pieces for each step
    cam.innerHTML = '<div class="jr-floor"></div>';
    const tx = lite(-215, 'TO K'), rx = lite(215, 'FROM J');

    // Holograms: flat panels that face the viewer, pinned to points in the 3D scene
    const over = document.createElement('div');
    over.className = 'jr-over';
    $('jr-stage').appendChild(over);
    const pins = [];
    function pin(x, y, z) {
      const m = document.createElement('i');
      m.className = 'mk';
      m.style.transform = 'translate3d(' + x + 'px,' + y + 'px,' + z + 'px)';
      cam.appendChild(m);
      return m;
    }
    function stand(x, y, z, cls, inner) {
      const d = document.createElement('div');
      d.className = 'holo ' + cls;
      d.innerHTML = '<div class="holo-in">' + inner + '</div>';
      over.appendChild(d);
      pins.push({ el: d, mk: pin(x, y, z) });
      return d;
    }
    const fBadge = stand(-215, 0, 150, 'f-badge', '<span class="mono">F = shift(3)</span><b class="mono">MEET → PHHW</b>');
    const hex = stand(-215, 0, 150, 'hexrow', BYTES.map(function (b, i) {
      return '<span class="hx" style="--i:' + i + '"><i class="mono">' + CIP[i].replace(' ', '␠') + '</i><b class="mono">' + (b >> 4).toString(16).toUpperCase() + '</b><b class="mono">' + (b & 15).toString(16).toUpperCase() + '</b></span>';
    }).join(''));
    const tones = stand(-215, 0, 150, 'tonebars', DIGITS.map(function (d, i) {
      return '<span style="--h:' + (14 + d * 7) + 'px;--i:' + i + '"><i class="mono">' + d.toString(16).toUpperCase() + '</i></span>';
    }).join('') + '<p class="mono">tone = 20 500 + 100·d Hz</p>');
    let rings = '';
    for (let i = 0; i < 6; i++) rings += '<span class="ring" style="--i:' + i + '"></span>';
    const air = document.createElement('div');
    air.className = 'holo air';
    air.innerHTML = '<div class="air-beam">' + rings + '</div><p class="mono">20.5–22.0 kHz · above all human hearing</p>';
    over.appendChild(air);
    const airA = pin(-215, -40, 34), airB = pin(215, -40, 34);
    let bins = '';
    for (let i = 0; i < 16; i++) bins += '<span data-b="' + i + '"></span>';
    const spec = stand(215, 0, 150, 'spectrum', '<div class="bins">' + bins + '</div><p class="mono">16 tone detectors</p>');
    const fInv = stand(215, 0, 150, 'f-badge inv', '<span class="mono">F⁻¹ = shift(−3)</span><b class="mono">PHHW → MEET</b>');
    const floats = [fBadge, hex, tones, air, spec, fInv];

    const STEPS = [
      { t: 'Type', d: 'Tap the message on the on-screen keyboard.', m: 'm = "MEET AT NOON"', w: ['Touch e-paper', 'Touch controller'] },
      { t: 'Encrypt', d: 'The processor applies your key F to every letter.', m: 'c = F(m) = "PHHW DW QRRQ"', w: ['STM32U585', 'SE050 key'] },
      { t: 'Bytes to digits', d: 'Each character is one byte, split into two base-16 digits.', m: 'P = 80 = 16 × 5 + 0  →  5, 0', w: ['STM32U585'] },
      { t: 'Digits to tones', d: 'Each digit picks one of 16 ultrasonic tones, played for 200 ms through the piezo horns.', m: 'tone = 20 500 + 100·d Hz', w: ['DRV2700', '4 piezo horns'] },
      { t: 'Through the air', d: 'Ultrasound crosses the room; no one hears it and nothing goes over radio.', m: '20.5–22.0 kHz · ~65 m line of sight, ~110 m with the petal reflector', w: ['Air only'] },
      { t: 'Detect', d: 'Four ultrasonic mics are combined toward the sender; 16 detectors listen, a tone counts only above its noise, and Reed–Solomon repairs wrong digits.', m: 'Goertzel × 16 · floor + 9 dB · RS(15, 9)', w: ['SPH0641 × 4', 'STM32U585'] },
      { t: 'Decrypt and show', d: 'Digits rebuild the bytes, the checksum is checked, F⁻¹ restores the text.', m: 'm = F⁻¹(c) · sum mod 256 ✓', w: ['SE050 key', 'E-paper'] }
    ];
    const SHOW = [[], [0], [1], [2], [3], [4], [5]];  // which floats appear at each step

    function place() {
      const sr = $('jr-stage').getBoundingClientRect();
      pins.forEach(function (p) {
        const r = p.mk.getBoundingClientRect();
        p.el.style.left = (r.left - sr.left).toFixed(1) + 'px';
        p.el.style.top = (r.top - sr.top).toFixed(1) + 'px';
      });
      const a = airA.getBoundingClientRect(), b = airB.getBoundingClientRect();
      const ax = a.left - sr.left, ay = a.top - sr.top, bx = b.left - sr.left, by = b.top - sr.top;
      air.style.left = ax.toFixed(1) + 'px'; air.style.top = ay.toFixed(1) + 'px';
      air.style.width = Math.hypot(bx - ax, by - ay).toFixed(1) + 'px';
      air.style.transform = 'rotate(' + Math.atan2(by - ay, bx - ax).toFixed(4) + 'rad)';
    }
    let follow = 0;
    function track(ms) {
      const end = performance.now() + ms;
      cancelAnimationFrame(follow);
      (function loop() { place(); if (performance.now() < end) follow = requestAnimationFrame(loop); })();
    }
    addEventListener('resize', function () { track(50); });
    addEventListener('orbitchange', place);

    let token = 0, binTimer = 0;
    function setScreen(d, plain, cip, state, bar) {
      d.text.textContent = plain; d.cip.textContent = cip; d.state.textContent = state; d.bar.style.width = bar + '%';
    }
    async function typeOut(d, msg, my) {
      for (const ch of msg) {
        if (my !== token) return;
        const k = d.key(ch === ' ' ? 'SPACE' : ch);
        if (k) { k.classList.add('hit'); setTimeout(function () { k.classList.remove('hit'); }, 130); }
        d.text.textContent += ch;
        await wait(reduce ? 0 : 150);
      }
    }
    async function scramble(el, target, my) {
      for (let f = 1; f <= 16 && my === token; f++) {
        const done = Math.floor(f / 16 * target.length);
        el.textContent = target.split('').map(function (c, i) { return i < done || c === ' ' ? c : LETTERS[Math.floor(Math.random() * 26)]; }).join('');
        await wait(reduce ? 0 : 50);
      }
    }

    async function run(i) {
      const my = ++token;
      clearInterval(binTimer);
      const s = STEPS[i];
      $('jr-card').innerHTML = '<p class="sc-num mono">Step ' + (i + 1) + ' of 7</p><h3>' + s.t + '</h3><p class="sc-d">' + s.d + '</p>' +
        '<p class="sc-m mono">' + s.m + '</p><p class="sc-lbl mono">Where</p>' + chips(s.w);
      floats.forEach(function (f, k) { f.classList.toggle('on', SHOW[i].indexOf(k) >= 0); });
      tx.el.classList.toggle('glow-spk', i === 3 || i === 4);
      rx.el.classList.toggle('glow-mic', i === 4 || i === 5);
      tx.wrap.classList.toggle('focus', i <= 3); rx.wrap.classList.toggle('focus', i >= 5);
      const camZ = i <= 3 ? -5 : i >= 5 ? 5 : 0;
      cam.style.transform = 'rotateX(54deg) rotateZ(' + camZ + 'deg)';
      track(1400);

      // The two screens at this step
      if (i === 0) {
        setScreen(tx, '', '—', 'TYPING', 0); setScreen(rx, '', '—', 'LISTENING', 0);
        await typeOut(tx, MSG, my);
      } else {
        setScreen(tx, MSG, i === 1 ? '—' : CIP, i === 1 ? 'ENCRYPTING' : i < 5 ? 'SENDING · 21 kHz' : 'SENT ✓', i < 3 ? 0 : i === 3 ? 40 : 100);
        setScreen(rx, '', i >= 5 ? '' : '—', i === 5 ? 'RECEIVING' : i === 6 ? 'CHECKSUM ✓' : 'LISTENING', i === 5 ? 30 : i === 6 ? 100 : 0);
      }
      if (i === 1) { const k = tx.key('SEND'); if (k) k.classList.add('hit'); await wait(200); if (k) k.classList.remove('hit'); await scramble(tx.cip, CIP, my); }
      if (i === 5) {
        const bins = Array.prototype.slice.call(spec.querySelectorAll('.bins span'));
        let n = 0;
        const tick = function () {
          const d = DIGITS[n % DIGITS.length];
          bins.forEach(function (b, k) { b.style.height = (k === d ? 90 : 6 + Math.random() * 14) + 'px'; b.classList.toggle('peak', k === d); });
          rx.cip.textContent = CIP.slice(0, Math.min(CIP.length, Math.floor(n / 2) + 1));
          rx.bar.style.width = Math.min(100, n * 8) + '%';
          n++;
        };
        tick(); if (!reduce) binTimer = setInterval(tick, 240);
      }
      if (i === 6) {
        rx.cip.textContent = CIP;
        await wait(reduce ? 0 : 500);
        if (my !== token) return;
        rx.state.textContent = 'DECRYPTING';
        await scramble(rx.text, MSG, my);
        if (my === token) rx.state.textContent = 'DECRYPTED ✓';
      }
    }
    stepper('jr-rail', 7, run, 6200);
  })();

  /* =========================================================
     2. The lab's seven steps, inside an X-ray of the unit
     ========================================================= */
  (function () {
    const dev = W.build($('lb-device'));
    $('lb-device').classList.add('xray');
    const NAMES = { 'p-osk': 'On-screen keyboard', 'p-flash': 'W25Q128 flash', 'p-se': 'SE050 key store', 'p-mcu': 'STM32U585', 'p-mic': 'SPH0641 mic', 'p-amp': 'DRV2700 driver', 'p-spk': 'Piezo horns', 'p-fp': 'Fingerprint key' };
    const tagLayer = document.createElement('div');
    tagLayer.className = 'lb-tags';
    $('lb-stage').appendChild(tagLayer);
    let glowing = [];
    addEventListener('orbitchange', function () { placeTags(); });
    function placeTags() {
      const sr = $('lb-stage').getBoundingClientRect();
      tagLayer.querySelectorAll('.lb-t').forEach(function (t, k) {
        const g = glowing[k]; if (!g) return;
        const r = g.el.querySelector('.top').getBoundingClientRect();
        t.style.left = (r.left + r.width / 2 - sr.left).toFixed(1) + 'px';
        t.style.top = (r.top + r.height / 2 - sr.top).toFixed(1) + 'px';
      });
    }
    const camEl = $('lb-cam'), devEl = $('lb-device');
    const G = 70, SEP = 0.62;
    const STEPS = [
      { t: 'Symbols', lab: 'Choose the symbol set S.', dev: 'Every key on the screen is one element of S. Nothing outside S can be typed.',
        m: 'S = {A, B, …, Z},  |S| = 26', parts: ['Touch e-paper', 'W25Q128 flash'], layers: [2, 4], glow: ['p-osk', 'p-flash'] },
      { t: 'Build', lab: 'Chain blocks into one function F.', dev: 'The chain is saved as a key code inside the secure element, never in plain memory.',
        m: 'F = mirror ∘ shift(3)  ←  letters/shift-3/mirror', parts: ['NXP SE050'], layers: [4], glow: ['p-se'] },
      { t: 'Check', lab: 'F must be one-to-one and onto.', dev: 'The firmware refuses any key that is not a bijection, so every message can be undone.',
        m: 'valid  ⇔  one-to-one ∧ onto', parts: ['STM32U585'], layers: [4], glow: ['p-mcu'] },
      { t: 'Relate', lab: 'See the cipher as a relation: pairs in S × S.', dev: 'The tone table is a relation too. Each heard frequency is related to its nearest tone, giving 16 classes, one per digit.',
        m: 'f ~ g  ⇔  nearest(f) = nearest(g)  →  16 classes', parts: ['SPH0641 × 4', 'STM32U585'], layers: [4], glow: ['p-mic', 'p-mcu'] },
      { t: 'Encrypt', lab: 'Apply F; its inverse undoes it.', dev: 'The processor applies F, splits each byte into two digits and plays them through the speaker.',
        m: 'c = F(m),   byte = 16·hi + lo', parts: ['STM32U585', 'DRV2700', 'Piezo horns'], layers: [4, 5], glow: ['p-mcu', 'p-amp', 'p-spk'] },
      { t: 'Break', lab: 'Brute force and letter counts crack a shift cipher.', dev: 'So a field unit wraps F inside AES-256, and the secure element wipes the key after repeated wrong unlocks.',
        m: '26 keys  vs  2²⁵⁶ ≈ 1.2 × 10⁷⁷ keys', parts: ['NXP SE050', 'Fingerprint key'], layers: [4], glow: ['p-se', 'p-fp'] },
      { t: 'Count', lab: 'Count with the product rule.', dev: 'Each byte needs 2 digits; for long range, every 9 digits become 15 with error correction. Counting tells you how long a message takes.',
        m: 'tones = 15·⌈2n / 9⌉;   12 chars → 45 tones ≈ 18 s at 0.4 s', parts: ['STM32U585', 'Piezo horns'], layers: [4, 5], glow: ['p-mcu', 'p-spk'] }
    ];
    const cam = { z: 30, s: 0.5 }, tgt = { z: 30, s: 0.5 };
    let running = false;
    function base() { return innerWidth < 560 ? 0.45 : innerWidth < 980 ? 0.6 : 0.78; }
    function apply() {
      devEl.style.transform = 'scale3d(' + cam.s.toFixed(3) + ',' + cam.s.toFixed(3) + ',' + cam.s.toFixed(3) + ')';
      camEl.style.transform = 'rotateX(56deg) rotateZ(-30deg) translateZ(' + (-cam.z * cam.s).toFixed(1) + 'px)';
    }
    function tick() {
      const k = reduce ? 1 : 0.1;
      cam.z += (tgt.z - cam.z) * k; cam.s += (tgt.s - cam.s) * k;
      apply(); placeTags();
      if (Math.abs(tgt.z - cam.z) > 0.3 || Math.abs(tgt.s - cam.s) > 0.002) requestAnimationFrame(tick); else running = false;
    }
    function run(i) {
      const s = STEPS[i];
      dev.set(SEP, s.layers, G);
      devEl.querySelectorAll('.glow').forEach(function (g) { g.classList.remove('glow'); });
      glowing = [];
      s.glow.forEach(function (c) { devEl.querySelectorAll('.' + c).forEach(function (g) { g.classList.add('glow'); glowing.push({ el: g, name: NAMES[c] }); }); });
      tagLayer.innerHTML = glowing.map(function (g, k) {
        return '<div class="lb-t' + (k % 2 ? ' alt' : '') + '"><span class="lb-ring"></span><span class="lb-line"></span><span class="lb-name mono">' + g.name + '</span></div>';
      }).join('');
      requestAnimationFrame(placeTags);
      const zs = s.layers.map(function (k) { return W.LAYERS[k].z + W.LAYERS[k].ex * G * SEP + 24; });
      tgt.z = zs.reduce(function (a, b) { return a + b; }, 0) / zs.length;
      tgt.s = base() * (s.layers.length > 1 ? 1.0 : 1.2);
      if (!running) { running = true; requestAnimationFrame(tick); }
      setTimeout(placeTags, 700); setTimeout(placeTags, 1600);
      $('lb-tag').textContent = 'STEP ' + (i + 1) + ' / 7 · ' + s.t.toUpperCase();
      $('lb-card').innerHTML = '<p class="sc-num mono">Step ' + (i + 1) + ' of 7</p><h3>' + s.t + '</h3>' +
        '<dl class="sc-dl">' +
        '<div><dt class="mono">In the lab</dt><dd>' + s.lab + '</dd></div>' +
        '<div><dt class="mono">In Cipher Echo</dt><dd>' + s.dev + '</dd></div>' +
        '<div><dt class="mono">The maths</dt><dd class="mono sc-m">' + s.m + '</dd></div>' +
        '<div><dt class="mono">Parts</dt><dd>' + chips(s.parts) + '</dd></div></dl>' +
        '<a class="sc-link" href="index.html#' + ['alphabet', 'forge', 'inspect', 'relations', 'encrypt', 'break', 'attack'][i] + '">Open step ' + (i + 1) + ' in the lab</a>';
    }
    apply();
    stepper('lb-rail', 7, run, 6000);
  })();
})();
