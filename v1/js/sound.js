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
      { minMs: 0, markerMs: 350, snr: 12, minDb: -95, test: 3000 }),
    silent: makeBand('silent', 'Silent', 16900, 17250, 100, 18900, 17050, 16700, 19100, 1.0,
      { minMs: 200, markerMs: 600, snr: 9, minDb: -125, test: 18000 })
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

  // Every data tone lasts exactly SYMBOL_MS. Because the receiver knows this,
  // it can find each tone's time slot and judge it from the slot's middle,
  // where the echo of the previous tone has faded most.
  const SYMBOL_MS = 200;
  function effectiveMs() { return SYMBOL_MS; }

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
     Detection runs on every audio sample, in order, as it arrives
     (a ScriptProcessor feeds blocks of samples), so it never depends on
     how busy the page is. Every HOP samples it looks at the last N
     samples and measures each tone's strength with the Goertzel
     algorithm. A tone counts once it has been the strongest for HOLD
     hops in a row. The listener watches both bands; a start tone locks
     it to that band until the end tone. */
  function createListener(handlers) {
    const ac = audio();
    const SR = ac.sampleRate;
    const N = 2048, HOP = 512, HOLD = 4;          // 43 ms window, 10.7 ms steps, 43 ms hold

    // Hann window and Goertzel coefficients
    const hann = new Float32Array(N);
    let wsum = 0;
    for (let i = 0; i < N; i++) { hann[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)); wsum += hann[i]; }
    function coeff(f) { return 2 * Math.cos(2 * Math.PI * f / SR); }
    const GUARDS = {
      audible: [1250, 1600, 1875, 2625, 3375, 4125, 4500, 4800],
      silent: [16750, 17150, 17325, 17725, 18125, 18525, 18975, 19050]
    };
    const plans = {};
    Object.keys(BANDS).forEach(function (k) {
      plans[k] = {
        band: BANDS[k],
        tc: BANDS[k].targets.map(function (t) { return coeff(t.f); }),
        gc: GUARDS[k].map(coeff)
      };
    });

    const ring = new Float32Array(N), frameBuf = new Float32Array(N);
    let wpos = 0, sinceHop = 0;

    // Amplitude (dB relative to full scale) of one frequency in the current frame
    function amp(c) {
      let s1 = 0, s2 = 0;
      for (let i = 0; i < N; i++) { const s0 = frameBuf[i] + c * s1 - s2; s2 = s1; s1 = s0; }
      const power = s1 * s1 + s2 * s2 - c * s1 * s2;
      const a = 2 * Math.sqrt(Math.max(power, 0)) / wsum;
      return 20 * Math.log10(a + 1e-12);
    }
    function median(arr) { const v = arr.slice().sort(function (a, b) { return a - b; }); return (v[(v.length - 1) >> 1] + v[v.length >> 1]) / 2; }

    // Measure every tone of both bands in the current window
    function measure() {
      const out = {};
      Object.keys(plans).forEach(function (k) {
        const P = plans[k];
        const lv = P.tc.map(amp), fl = median(P.gc.map(amp));
        let best = 0;
        for (let i = 1; i < lv.length; i++) if (lv[i] > lv[best]) best = i;
        const snr = lv[best] - fl;
        out[k] = { lv: lv, fl: fl, snr: Math.max(0, snr), id: (lv[best] > -95 && snr > P.band.snr) ? P.band.targets[best].id : null };
      });
      return out;
    }

    const T = Math.round(SYMBOL_MS / 1000 * SR);          // one symbol, in samples
    function markerLen(k) { return Math.round(Math.max(BANDS[k].markerMs / 1000, 3 * SYMBOL_MS / 1000) * SR); }

    let state = 'idle', band = null, shown = 'audible', digits = [], prevDigit = null;
    let cand = null, candHops = 0, lastId = null, onsetC = 0, offC = 0, firstData = 0;
    let levels = { audible: 0, silent: 0 };
    let sampleNo = 0;                                       // samples seen so far
    let t0 = 0, slot = 0, acc = null, prevWin = -1, lastStrong = 0;
    const hist = [];                                        // recent windows, for replay and timing

    function finish(ok) {
      state = 'idle'; band = null; cand = null; candHops = 0;
      if (ok && handlers.onMessage) handlers.onMessage(unpack(digits), digits.slice(), shown);
      if (!ok && handlers.onLost) handlers.onLost(digits.slice());
    }

    // A slot has ended: its tone is the one strongest in the slot's middle.
    // Then nudge the timing so slot boundaries line up with the moments
    // the new tones actually took over.
    function decideSlot() {
      const P = plans[band];
      let best = 0;
      for (let i = 1; i < acc.length; i++) if (acc[i] > acc[best]) best = i;
      if (acc[best] === 0) return;                          // nothing heard in this slot
      if (prevWin >= 0 && prevWin !== best) {
        const edge = t0 + slot * T;
        for (let j = 0; j < hist.length; j++) {
          const h = hist[j];
          if (h.c < edge - 0.4 * T || h.c > edge + 0.4 * T) continue;
          if (h.m[band].lv[best] > h.m[band].lv[prevWin]) {
            const err = Math.max(-0.25 * T, Math.min(0.25 * T, h.c - edge));
            t0 += 0.3 * err;
            break;
          }
        }
      }
      prevWin = best;
      const id = P.band.targets[best].id;
      if (handlers.onTone) handlers.onTone(id, band);
      if (id === 'E') { finish(true); return; }
      if (id === 'S') return;
      const d = id === 'R' ? prevDigit : id;
      if (d === null) return;
      digits.push(d);
      prevDigit = d;
      if (handlers.onDigit) handlers.onDigit(digits.slice(), band);
      if (digits.length > 600) finish(false);
    }

    function dataStep(h) {
      const rel = h.c - t0;
      if (rel < 0) return;
      const s = Math.floor(rel / T);
      while (s > slot) {
        decideSlot();
        if (state !== 'data') return;
        slot++;
        acc = new Float64Array(plans[band].tc.length);
      }
      const frac = rel / T - s;
      const r = h.m[band];
      if (frac >= 0.3 && frac <= 0.9) {
        // Only tones clearly above the noise count
        for (let i = 0; i < r.lv.length; i++) if (r.lv[i] - r.fl > plans[band].band.snr * 0.5) acc[i] += Math.pow(10, r.lv[i] / 20);
      }
      if (r.id !== null) lastStrong = h.c;
      if (h.c - lastStrong > 1.2 * SR) finish(false);       // the sound stopped: message lost
    }

    function hop() {
      for (let i = 0; i < N; i++) frameBuf[i] = ring[(wpos + i) % N] * hann[i];
      const h = { c: sampleNo - N / 2, m: measure() };      // c: the middle of this window, in samples
      levels.audible = h.m.audible.snr; levels.silent = h.m.silent.snr;
      hist.push(h);
      if (hist.length > 160) hist.shift();

      if (state === 'idle') {
        // A start tone, held for HOLD windows, in either band
        let b = null;
        ['silent', 'audible'].forEach(function (k) { if (!b && h.m[k].id === 'S') b = k; });
        lastId = b ? 'S' : null;
        if (b !== cand) { cand = b; candHops = 0; if (b) onsetC = h.c; }
        candHops++;
        if (b && candHops === HOLD) {
          state = 'start'; band = b; shown = b; digits = []; prevDigit = null; firstData = 0;
          if (handlers.onTone) handlers.onTone('S', b);
          if (handlers.onStart) handlers.onStart(b);
        }
        return;
      }

      if (state === 'start') {
        // When the first data tone takes over, place slot 0. The start tone's
        // beginning is the cleaner clue (echo smears endings, not beginnings),
        // unless listening began part way through the start tone.
        const r = h.m[band];
        lastId = r.id;
        if (r.id !== null && r.id !== 'S') {
          if (++firstData === 1) offC = h.c;
          if (firstData === 2) {
            t0 = Math.min(onsetC + markerLen(band), offC);
            slot = 0; acc = new Float64Array(plans[band].tc.length); prevWin = -1; lastStrong = h.c;
            state = 'data';
            hist.forEach(function (old) { if (state === 'data' && old.c >= t0) dataStep(old); });
          }
        } else firstData = 0;
        if (state === 'start' && h.c - onsetC > markerLen(band) + 2 * SR) finish(false);
        return;
      }

      lastId = h.m[band].id;
      dataStep(h);
    }

    // Feed raw samples; run a hop every HOP samples
    function feed(data) {
      for (let i = 0; i < data.length; i++) {
        ring[wpos] = data[i];
        wpos = (wpos + 1) % N;
        sampleNo++;
        if (++sinceHop === HOP) { sinceHop = 0; hop(); }
      }
    }

    // Audio graph: input → processor (detection) and analyser (pictures)
    const analyser = ac.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0;
    const bins = new Float32Array(analyser.frequencyBinCount);
    const binHz = SR / analyser.fftSize;
    const proc = ac.createScriptProcessor(2048, 1, 1);
    const mute = ac.createGain();
    mute.gain.value = 0;
    proc.onaudioprocess = function (e) { feed(e.inputBuffer.getChannelData(0)); };
    proc.connect(mute);
    mute.connect(ac.destination);

    let source = null, stream = null, drawTimer = 0;
    function startDrawing() {
      drawTimer = setInterval(function () {
        if (handlers.onLevels) handlers.onLevels({ audible: levels.audible, silent: levels.silent });
        if (handlers.onFrame) { analyser.getFloatFrequencyData(bins); handlers.onFrame(bins, binHz, lastId, band || shown); }
      }, 40);
    }
    function connect(node) { node.connect(proc); node.connect(analyser); }

    return {
      // useMic = true: listen through the microphone. false: hear this device's own sender directly.
      start: function (useMic) {
        this.stop();
        state = 'idle'; band = null; cand = null; candHops = 0;
        if (!useMic) {
          connect(out);
          source = 'loopback';
          startDrawing();
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
          connect(source);
          startDrawing();
          if (ac.state === 'suspended') ac.resume();
        });
      },
      stop: function () {
        clearInterval(drawTimer);
        if (source === 'loopback') {
          try { out.disconnect(proc); } catch (e) { /* not connected */ }
          try { out.disconnect(analyser); } catch (e) { /* not connected */ }
        } else if (source) source.disconnect();
        if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
        source = null; stream = null; state = 'idle'; band = null;
      },
      sampleRate: SR
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
