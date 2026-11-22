/* =========================================================
   Cipher Forge — receive.js
   The phone receiver page: tap the radar, listen through the
   microphone (either band), decode, check, decrypt.
   ========================================================= */
(function () {
  'use strict';

  const $ = function (id) { return document.getElementById(id); };
  const SD = CF.sound;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  /* ---------- Key ---------- */
  function showKey() { $('rx-keycode').textContent = CF.app.keyCode(); }
  $('rx-edit').addEventListener('click', function () {
    const form = $('rx-keyform');
    form.hidden = !form.hidden;
    $('rx-edit').setAttribute('aria-expanded', String(!form.hidden));
    if (!form.hidden) { $('rx-keyin').value = CF.app.keyCode(); $('rx-keyin').focus(); }
  });
  $('rx-keyform').addEventListener('submit', function (e) {
    e.preventDefault();
    const ok = CF.app.loadKey($('rx-keyin').value);
    $('rx-keymsg').textContent = ok ? 'Key loaded.' : 'That key is not valid. It should look like letters/shift-3/mirror.';
    if (ok) { $('rx-keyform').hidden = true; $('rx-edit').setAttribute('aria-expanded', 'false'); }
  });
  document.addEventListener('cf:change', showKey);
  showKey();

  /* ---------- Listening ---------- */
  const radar = $('rx-btn');
  let listener = null, listening = false, wake = null, shownBand = 'audible';
  const history = [];

  function setState(main, sub) {
    $('rx-state').textContent = main;
    $('rx-sub').textContent = sub;
  }
  function chips(locked) {
    ['audible', 'silent'].forEach(function (b) {
      const c = $('chip-' + b);
      c.classList.toggle('is-on', listening);
      c.classList.toggle('is-locked', locked === b);
    });
  }

  function keepAwake(on) {
    try {
      if (on && 'wakeLock' in navigator) navigator.wakeLock.request('screen').then(function (w) { wake = w; }).catch(function () {});
      else if (!on && wake) { wake.release(); wake = null; }
    } catch (e) { /* not supported */ }
  }
  document.addEventListener('visibilitychange', function () { if (listening && document.visibilityState === 'visible') keepAwake(true); });

  function showMessage(res, band) {
    const plain = CF.app.decrypt(res.text);
    $('rx-msg').hidden = false;
    $('rx-msg').style.animation = 'none'; void $('rx-msg').offsetWidth; $('rx-msg').style.animation = '';
    $('rx-plain').textContent = plain === null ? 'This key’s cipher cannot be undone.' : (plain || '(empty)');
    $('rx-cipher').textContent = res.text || '(empty)';
    $('rx-check').innerHTML = res.ok
      ? '<span class="ok">Checksum correct: every tone arrived</span>'
      : '<span class="bad">Checksum wrong: some tones were misheard. Move closer and ask for it again.</span>';
    history.unshift({ text: plain, ok: res.ok, band: band, at: new Date() });
    renderHistory();
    radar.classList.remove('got'); void radar.offsetWidth; radar.classList.add('got');
    if (navigator.vibrate) navigator.vibrate(res.ok ? 60 : [40, 60, 40]);
  }

  function renderHistory() {
    const older = history.slice(1, 8);
    $('rx-history').hidden = older.length === 0;
    $('rx-list').innerHTML = older.map(function (h) {
      const t = h.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return '<li><span class="h-text">' + esc(h.text === null ? '(could not decrypt)' : h.text) + '</span>' +
        '<span class="h-meta">' + t + ', ' + (h.band === 'silent' ? 'silent' : 'audible') + (h.ok ? '' : ', checksum wrong') + '</span></li>';
    }).join('');
  }

  function start() {
    if (!listener) {
      listener = SD.createListener({
        onStart: function (b) {
          shownBand = b;
          radar.classList.add('is-rx');
          chips(b);
          setState('Receiving', b === 'silent' ? 'silent band' : 'audible band');
          $('rx-status').textContent = 'Start tone heard on the ' + (b === 'silent' ? 'silent 16.9 kHz' : 'audible') + ' band. Hold still…';
        },
        onTone: function () { radar.classList.add('pulse'); setTimeout(function () { radar.classList.remove('pulse'); }, 80); },
        onDigit: function (d) { $('rx-sub').textContent = Math.floor(d.length / 2) + ' characters'; },
        onFrame: drawSpectrum,
        onLevels: meters,
        onLost: function () {
          radar.classList.remove('is-rx'); chips(null);
          setState('Listening', 'waiting for a start tone');
          $('rx-status').textContent = 'The message stopped half way. Ask for it again.';
        },
        onMessage: function (res, d, b) {
          radar.classList.remove('is-rx'); chips(null);
          setState('Listening', 'waiting for a start tone');
          $('rx-status').textContent = 'Message received. Still listening for the next one.';
          showMessage(res, b);
        }
      });
    }
    setState('Starting…', 'asking for the microphone');
    listener.start(true).then(function () {
      listening = true;
      radar.classList.add('is-on');
      radar.setAttribute('aria-pressed', 'true');
      chips(null);
      setState('Listening', 'waiting for a start tone');
      $('rx-status').textContent = 'Listening on both bands. Now press send on the other device. Tap the circle again to stop.';
      keepAwake(true);
    }).catch(function (err) {
      setState('Tap to listen', 'microphone off');
      $('rx-status').textContent = 'Microphone not available: ' + (err && err.message ? err.message : 'permission was refused') + '. Allow the microphone for this site and try again.';
    });
  }

  function stop() {
    if (listener) listener.stop();
    listening = false;
    radar.classList.remove('is-on', 'is-rx');
    radar.setAttribute('aria-pressed', 'false');
    chips(null);
    setState('Tap to listen', 'microphone off');
    $('rx-status').textContent = 'Stopped. Tap the circle to listen again.';
    keepAwake(false);
    clearSpectrum();
  }

  radar.addEventListener('click', function () { listening ? stop() : start(); });

  /* ---------- Signal meters ---------- */
  let lastMeter = 0;
  function meters(lv) {
    const now = performance.now();
    if (now - lastMeter < 80) return;
    lastMeter = now;
    ['audible', 'silent'].forEach(function (b) {
      const db = lv[b];
      $('m-' + b).style.width = Math.min(100, db / 40 * 100).toFixed(0) + '%';
      $('m-' + b).classList.toggle('is-strong', db >= SD.BANDS[b].snr);
      $('m-' + b + '-db').textContent = db < 1 ? 'quiet' : (db > 60 ? '+60 dB+' : '+' + db.toFixed(0) + ' dB');
    });
  }

  /* ---------- Spectrum of the band in use ---------- */
  const canvas = $('rx-spectrum');
  let cols = null;
  function readCols() {
    const cs = getComputedStyle(document.documentElement);
    cols = { bar: cs.getPropertyValue('--signal').trim(), mark: cs.getPropertyValue('--rule').trim(), hit: cs.getPropertyValue('--brass').trim(), bg: cs.getPropertyValue('--graphite-2').trim() };
  }
  new MutationObserver(function () { setTimeout(function () { readCols(); if (!listening) clearSpectrum(); }, 60); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  function fit() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    canvas.height = Math.round(90 * dpr);
  }
  function clearSpectrum() {
    fit();
    const g = canvas.getContext('2d');
    g.fillStyle = cols.bg; g.fillRect(0, 0, canvas.width, canvas.height);
  }
  let last = 0;
  function drawSpectrum(bins, binHz, hitId, band) {
    const now = performance.now();
    if (now - last < 33) return;
    last = now;
    if (band) shownBand = band;
    const B = SD.BANDS[shownBand];
    if (canvas.width !== Math.round(canvas.clientWidth * (window.devicePixelRatio || 1))) fit();
    const g = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
    g.fillStyle = cols.bg; g.fillRect(0, 0, W, H);
    B.targets.forEach(function (t) {
      const x = (t.f - B.lo) / (B.hi - B.lo) * W;
      g.fillStyle = t.id === hitId ? cols.hit : cols.mark;
      g.fillRect(x - 1, 0, 2, t.id === hitId ? H : 6);
    });
    const lo = Math.floor(B.lo / binHz), hi = Math.min(bins.length, Math.ceil(B.hi / binHz));
    const w = W / (hi - lo);
    g.fillStyle = cols.bar;
    g.globalAlpha = 0.85;
    for (let k = lo; k < hi; k++) {
      const v = Math.max(0, Math.min(1, (bins[k] + 120) / 90));
      g.fillRect((k - lo) * w, H - v * (H - 8), Math.ceil(w), v * (H - 8));
    }
    g.globalAlpha = 1;
  }

  readCols();
  clearSpectrum();
  window.addEventListener('resize', function () { if (!listening) clearSpectrum(); });
})();
