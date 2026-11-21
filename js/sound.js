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

   Two bands carry the same tones:
     audible  1.4–4.65 kHz    works on almost any device
     silent   16.9–18.9 kHz   near-ultrasound: most people can't hear it.
              Laptop speakers get weaker as pitch rises, so the start and
              end markers sit at the bottom of the band, tones last longer,
              and the listener is more sensitive here.
   ========================================================= */
window.CF = window.CF || {};

CF.sound = (function () {
  'use strict';

  /* ---------- The tone plans ---------- */
  function makeBand(name, label, start, base, step, repeat, end, lo, hi, gain, opts) {
    const data = [];
    for (let i = 0; i < 16; i++) data.push(base + i * step);
    const targets = [{ id: 'S', f: start }]
      .concat(data.map(function (f, i) { return { id: i, f: f }; }))
      .concat([{ id: 'R', f: repeat }, { id: 'E', f: end }]);
    return {
      name: name, label: label, START: start, DATA: data, REPEAT: repeat, END: end, lo: lo, hi: hi, gain: gain, targets: targets,
      minMs: opts.minMs, markerMs: opts.markerMs, snr: opts.snr, minDb: opts.minDb, test: opts.test
    };
  }

  const BANDS = {
    audible: makeBand('audible', 'Audible', 1400, 1800, 150, 4350, 4650, 1200, 4900, 0.5,
      { minMs: 0, markerMs: 350, snr: 15, minDb: -105, test: 3000 }),
    silent: makeBand('silent', 'Silent', 16900, 17250, 100, 18900, 17050, 16700, 19100, 1.0,
      { minMs: 170, markerMs: 550, snr: 9, minDb: -125, test: 18000 })
  };

  function freqOf(id, band) {
    const b = BANDS[band] || BANDS.audible;
    if (id === 'S') return b.START;
    if (id === 'R') return b.REPEAT;
    if (id === 'E') return b.END;
    return b.DATA[id];
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

  // Silent mode never goes faster than its band allows
  function effectiveMs(band, toneMs) { return Math.max(toneMs, (BANDS[band] || BANDS.audible).minMs); }

  // Play a tone list. Calls onStep(i, fraction) as it goes, onDone at the end.
  function play(tones, toneMs, onStep, onDone, band) {
    band = BANDS[band] ? band : 'audible';
    const ac = audio();
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = 'sine';
    osc.connect(amp);
    amp.connect(out);
    const t0 = ac.currentTime + 0.08;
    const dur = effectiveMs(band, toneMs) / 1000;
    const marker = Math.max(BANDS[band].markerMs / 1000, dur * 3);   // longer start and end markers
    const level = BANDS[band].gain;
    let t = t0;
    const times = [];
    tones.forEach(function (id) {
      const len = (id === 'S' || id === 'E') ? marker : dur;
      osc.frequency.setValueAtTime(freqOf(id, band), t);
      times.push(t);
      t += len;
    });
    amp.gain.setValueAtTime(0, t0 - 0.02);
    amp.gain.linearRampToValueAtTime(level, t0);
    amp.gain.setValueAtTime(level, t - 0.02);
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

  // A steady test tone (between the data tones, so it never starts a message)
  function testTone(band, seconds) {
    const ac = audio(), b = BANDS[band] || BANDS.silent;
    const osc = ac.createOscillator(), amp = ac.createGain();
    osc.frequency.value = b.test;
    osc.connect(amp); amp.connect(out);
    const t0 = ac.currentTime + 0.05, t1 = t0 + seconds;
    amp.gain.setValueAtTime(0, t0);
    amp.gain.linearRampToValueAtTime(b.gain, t0 + 0.05);
    amp.gain.setValueAtTime(b.gain, t1 - 0.05);
    amp.gain.linearRampToValueAtTime(0, t1);
    osc.start(t0); osc.stop(t1 + 0.02);
    return { freq: b.test, stop: function () { try { osc.stop(); } catch (e) { /* done */ } } };
  }

  /* ---------- Listening (microphone or loopback) ----------
     The listener watches both bands. A start tone locks it to that band
     until the end tone, so speech in the audible band cannot disturb a
     silent message and the other way round. */
  function createListener(handlers) {
    const ac = audio();
    const analyser = ac.createAnalyser();
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0;
    const bins = new Float32Array(analyser.frequencyBinCount);
    const binHz = ac.sampleRate / analyser.fftSize;

    let source = null, stream = null, timer = 0;
    let state = 'idle', band = null, shown = 'audible', digits = [], prevDigit = null, lastHeard = 0;
    let cand = undefined, candCount = 0, accepted = undefined;
    const NEED = 3;                       // frames a tone must hold (~45 ms)

    function level(f) {
      const c = Math.round(f / binHz);
      let m = -Infinity;
      for (let k = c - 2; k <= c + 2; k++) if (bins[k] > m) m = bins[k];
      return m;
    }
    function floorOf(b) {
      const lo = Math.round(b.lo / binHz), hi = Math.min(bins.length - 1, Math.round(b.hi / binHz));
      const arr = Array.prototype.slice.call(bins, lo, hi).sort(function (x, y) { return x - y; });
      return arr[Math.floor(arr.length / 2)];
    }
    // The strongest tone in one band, or null if nothing stands out
    function strongest(b) {
      const lv = b.targets.map(function (t) { return level(t.f); });
      let best = 0;
      for (let i = 1; i < lv.length; i++) if (lv[i] > lv[best]) best = i;
      const ok = lv[best] > b.minDb && lv[best] - floorOf(b) > b.snr;
      return ok ? b.targets[best].id : null;
    }

    function accept(id, b) {
      lastHeard = performance.now();
      if (handlers.onTone) handlers.onTone(id, b);
      if (state === 'idle') {
        if (id === 'S') {
          state = 'rx'; band = b; shown = b; digits = []; prevDigit = null;
          if (handlers.onStart) handlers.onStart(b);
        }
        return;
      }
      if (id === 'S') return;
      if (id === 'E') {
        state = 'idle'; band = null;
        if (handlers.onMessage) handlers.onMessage(unpack(digits), digits.slice(), b);
        return;
      }
      const d = id === 'R' ? prevDigit : id;
      if (d === null) return;
      digits.push(d);
      prevDigit = d;
      if (handlers.onDigit) handlers.onDigit(digits.slice(), b);
    }

    function bandLevel(b) {
      const lo = Math.round(b.lo / binHz), hi = Math.min(bins.length - 1, Math.round(b.hi / binHz));
      let peak = -Infinity;
      for (let k = lo; k <= hi; k++) if (bins[k] > peak) peak = bins[k];
      return Math.max(0, peak - floorOf(b));
    }

    function frame() {
      analyser.getFloatFrequencyData(bins);
      if (handlers.onLevels) handlers.onLevels({ audible: bandLevel(BANDS.audible), silent: bandLevel(BANDS.silent) });
      let id = null, b = null;
      if (state === 'rx') {
        b = band; id = strongest(BANDS[band]);
        if (performance.now() - lastHeard > 3000) {      // the message stopped half way
          state = 'idle'; band = null;
          if (handlers.onLost) handlers.onLost(digits.slice());
        }
      } else {
        // Idle: look for a start tone in either band
        ['silent', 'audible'].forEach(function (k) {
          if (b) return;
          const s = strongest(BANDS[k]);
          if (s === 'S') { id = 'S'; b = k; }
        });
      }
      if (handlers.onFrame) handlers.onFrame(bins, binHz, id, b || shown);

      const key = id === null ? null : b + ':' + id;
      if (key === cand) candCount++;
      else { cand = key; candCount = 1; }
      if (candCount === NEED) {
        if (key === null) { accepted = null; return; }
        if (key !== accepted) { accepted = key; accept(id, b); }
      }
    }

    return {
      // useMic = true: listen through the microphone. false: hear this device's own sender directly.
      start: function (useMic) {
        this.stop();
        state = 'idle'; band = null; accepted = undefined;
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
        source = null; stream = null; state = 'idle'; band = null;
      },
      sampleRate: ac.sampleRate
    };
  }

  return {
    BANDS: BANDS,
    freqOf: freqOf,
    toCodes: toCodes, fromCodes: fromCodes, checksum: checksum,
    toDigits: toDigits, fromDigits: fromDigits, toTones: toTones,
    plan: plan, unpack: unpack, hex: hex,
    play: play, testTone: testTone, effectiveMs: effectiveMs, createListener: createListener
  };
})();
