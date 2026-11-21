/* =========================================================
   Cipher Forge — sound.js
   Sending ciphertext as sound.

   The whole trip is a composition of bijections:
     send    = tones ∘ hex ∘ code ∘ F
     receive = F⁻¹ ∘ code⁻¹ ∘ hex⁻¹ ∘ tones⁻¹
   F is the cipher; code turns a character into a number
   0–255 (ASCII); hex splits it into two base-16 digits;
   tones gives each digit its own frequency (16 tones = 2⁴).
   A checksum (sum of the codes mod 256) catches errors.
   ========================================================= */
window.CF = window.CF || {};

CF.sound = (function () {
  'use strict';

  /* ---------- The tone plan ---------- */
  const START = 1400;                 // "a message begins"
  const BASE = 1800, STEP = 150;      // 16 data tones: 1800, 1950, …, 4050 Hz
  const REPEAT = 4350;                // "same digit as before"
  const END = 4650;                   // "the message ends"
  const DATA = [];
  for (let i = 0; i < 16; i++) DATA.push(BASE + i * STEP);

  const TARGETS = [{ id: 'S', f: START }]
    .concat(DATA.map(function (f, i) { return { id: i, f: f }; }))
    .concat([{ id: 'R', f: REPEAT }, { id: 'E', f: END }]);

  function freqOf(id) {
    if (id === 'S') return START;
    if (id === 'R') return REPEAT;
    if (id === 'E') return END;
    return DATA[id];
  }

  /* ---------- Pure maths: text ⇄ codes ⇄ hex digits ⇄ tones ---------- */

  // code : character → 0…255 (printable ASCII; anything else becomes "?")
  function toCodes(text) {
    return text.split('').map(function (c) {
      const n = c.charCodeAt(0);
      return n >= 32 && n <= 126 ? n : 63;
    });
  }
  function fromCodes(codes) {
    return codes.map(function (n) { return String.fromCharCode(n); }).join('');
  }

  // Checksum: Σ codes mod 256
  function checksum(codes) {
    return codes.reduce(function (a, b) { return (a + b) % 256; }, 0);
  }

  // hex : 0…255 → two digits 0…15 (high digit, then low digit)
  function toDigits(codes) {
    const out = [];
    codes.forEach(function (n) { out.push(Math.floor(n / 16), n % 16); });
    return out;
  }
  function fromDigits(digits) {
    const out = [];
    for (let i = 0; i + 1 < digits.length; i += 2) out.push(digits[i] * 16 + digits[i + 1]);
    return out;
  }

  // tones : digits → tone ids. A digit equal to the one before is sent as
  // REPEAT, so two neighbouring tones are never the same frequency.
  function toTones(digits) {
    const tones = ['S'];
    let prev = null, last = 'S';
    digits.forEach(function (d) {
      const t = (d === prev && last !== 'R') ? 'R' : d;
      tones.push(t);
      last = t;
      prev = d;
    });
    tones.push('E');
    return tones;
  }

  // The full sending plan for one ciphertext
  function plan(ciphertext) {
    const codes = toCodes(ciphertext);
    const withSum = codes.concat([checksum(codes)]);
    const digits = toDigits(withSum);
    return { codes: codes, sum: withSum[withSum.length - 1], digits: digits, tones: toTones(digits) };
  }

  // Turn received digits back into text and check the checksum
  function unpack(digits) {
    const bytes = fromDigits(digits);
    if (bytes.length < 1) return { text: '', ok: false, bytes: bytes };
    const codes = bytes.slice(0, -1);
    const ok = checksum(codes) === bytes[bytes.length - 1];
    return { text: fromCodes(codes), ok: ok, bytes: bytes };
  }

  function hex(n) { return (n < 16 ? '0' : '') + n.toString(16).toUpperCase(); }

  /* ---------- Playing tones (Web Audio API) ---------- */
  let ctx = null;
  let out = null;          // everything the sender plays passes through here
  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      out = ctx.createGain();
      out.gain.value = 1;
      out.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // Play a tone list. Returns { duration, stop } ; calls onStep(i) as it goes.
  function play(tones, toneMs, onStep, onDone) {
    const ac = audio();
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = 'sine';
    osc.connect(amp);
    amp.connect(out);
    const t0 = ac.currentTime + 0.08;
    const dur = toneMs / 1000;
    const marker = Math.max(0.35, dur * 3);           // longer start and end markers
    let t = t0;
    const times = [];
    tones.forEach(function (id, i) {
      const len = (id === 'S' || id === 'E') ? marker : dur;
      osc.frequency.setValueAtTime(freqOf(id), t);
      times.push(t);
      t += len;
    });
    amp.gain.setValueAtTime(0, t0 - 0.02);
    amp.gain.linearRampToValueAtTime(0.5, t0);
    amp.gain.setValueAtTime(0.5, t - 0.02);
    amp.gain.linearRampToValueAtTime(0, t);
    osc.start(t0 - 0.02);
    osc.stop(t + 0.02);

    let raf = 0, stopped = false;
    function tick() {
      if (stopped) return;
      const now = ac.currentTime;
      let i = 0;
      while (i + 1 < times.length && times[i + 1] <= now) i++;
      if (onStep && now >= t0) onStep(i, (now - t0) / (t - t0));
      if (now < t) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    osc.onended = function () { stopped = true; cancelAnimationFrame(raf); amp.disconnect(); if (onDone) onDone(); };
    return {
      duration: t - t0,
      stop: function () { try { osc.stop(); } catch (e) { /* already stopped */ } }
    };
  }

  /* ---------- Listening (microphone or loopback) ---------- */
  function createListener(handlers) {
    const ac = audio();
    const analyser = ac.createAnalyser();
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0;
    const bins = new Float32Array(analyser.frequencyBinCount);
    const binHz = ac.sampleRate / analyser.fftSize;

    let source = null, stream = null, timer = 0;
    let state = 'idle', digits = [], prevDigit = null;
    let cand = undefined, candCount = 0, accepted = undefined;
    const NEED = 3;                       // frames a tone must hold (~45 ms)

    function level(f) {
      const c = Math.round(f / binHz);
      let m = -Infinity;
      for (let k = c - 2; k <= c + 2; k++) if (bins[k] > m) m = bins[k];
      return m;
    }
    function noiseFloor() {
      const lo = Math.round(1000 / binHz), hi = Math.round(5000 / binHz);
      const arr = Array.prototype.slice.call(bins, lo, hi).sort(function (a, b) { return a - b; });
      return arr[Math.floor(arr.length / 2)];
    }

    function accept(id) {
      if (handlers.onTone) handlers.onTone(id);
      if (state === 'idle') {
        if (id === 'S') { state = 'rx'; digits = []; prevDigit = null; if (handlers.onStart) handlers.onStart(); }
        return;
      }
      if (id === 'S') return;
      if (id === 'E') {
        state = 'idle';
        if (handlers.onMessage) handlers.onMessage(unpack(digits), digits.slice());
        return;
      }
      const d = id === 'R' ? prevDigit : id;
      if (d === null) return;
      digits.push(d);
      prevDigit = d;
      if (handlers.onDigit) handlers.onDigit(digits.slice());
    }

    function frame() {
      analyser.getFloatFrequencyData(bins);
      const levels = TARGETS.map(function (t) { return level(t.f); });
      let best = 0;
      for (let i = 1; i < levels.length; i++) if (levels[i] > levels[best]) best = i;
      const floor = noiseFloor();
      const strong = levels[best] > -82 && levels[best] - floor > 16;
      const id = strong ? TARGETS[best].id : null;
      if (handlers.onFrame) handlers.onFrame(bins, binHz, id);

      if (id === cand) candCount++;
      else { cand = id; candCount = 1; }
      if (candCount === NEED) {
        if (id === null) { accepted = null; return; }
        if (id !== accepted) { accepted = id; accept(id); }
      }
    }

    return {
      // useMic = true: listen through the microphone. false: hear this device's own sender directly.
      start: function (useMic) {
        this.stop();
        state = 'idle'; accepted = undefined;
        if (!useMic) {
          out.connect(analyser);
          source = 'loopback';
          timer = setInterval(frame, 15);
          return Promise.resolve();
        }
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          return Promise.reject(new Error('This browser cannot use the microphone here. Open the site over https (the GitHub Pages link).'));
        }
        return navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
        }).then(function (s) {
          stream = s;
          source = ac.createMediaStreamSource(s);
          source.connect(analyser);
          timer = setInterval(frame, 15);
        });
      },
      stop: function () {
        clearInterval(timer);
        if (source === 'loopback') { try { out.disconnect(analyser); } catch (e) { /* not connected */ } }
        else if (source) source.disconnect();
        if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
        source = null; stream = null; state = 'idle';
      }
    };
  }

  return {
    START: START, END: END, REPEAT: REPEAT, DATA: DATA, TARGETS: TARGETS,
    freqOf: freqOf,
    toCodes: toCodes, fromCodes: fromCodes, checksum: checksum,
    toDigits: toDigits, fromDigits: fromDigits, toTones: toTones,
    plan: plan, unpack: unpack, hex: hex,
    play: play, createListener: createListener
  };
})();
