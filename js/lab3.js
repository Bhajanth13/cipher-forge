/* =========================================================
   Cipher Forge — lab3.js
   Step 6 on the page: send the ciphertext as sound and
   receive it on another device (or this one).
   ========================================================= */
(function () {
  'use strict';

  const $ = function (id) { return document.getElementById(id); };
  const SD = CF.sound;

  function emit(name, detail) { document.dispatchEvent(new CustomEvent(name, { detail: detail })); }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function clip(s, n) { return s.length > n ? s.slice(0, n) + ' …' : s; }
  function toneLabel(id) {
    if (id === 'S') return 'start';
    if (id === 'E') return 'end';
    if (id === 'R') return 'repeat';
    return id.toString(16).toUpperCase();
  }

  let toneMs = 140;
  let player = null;
  let listener = null;
  let listening = false;
  let mode = 'loop';
  let keyEdited = false;

  /* ---------- Sender: the pipeline, live ---------- */
  function currentPlan() {
    const ct = CF.app.encrypt($('snd-msg').value);
    return { ct: ct, p: SD.plan(ct) };
  }

  function renderPipe() {
    const msg = $('snd-msg').value;
    const cur = currentPlan();
    $('pipe-msg').textContent = clip(msg.toUpperCase(), 34);
    $('pipe-ct').textContent = clip(cur.ct, 34);
    $('pipe-codes').textContent = clip(cur.p.codes.slice(0, 8).join(' '), 34);
    $('pipe-hex').textContent = clip(cur.p.codes.slice(0, 8).map(SD.hex).join(' '), 34);
    $('pipe-tones').textContent = cur.p.tones.slice(1, 5).map(function (id) { return SD.freqOf(id) + ' Hz'; }).join(', ') + ' …';

    const strip = $('snd-tones');
    const shown = cur.p.tones.slice(0, 48);
    strip.innerHTML = shown.map(function (id, i) {
      return '<span data-i="' + i + '" title="' + SD.freqOf(id) + ' Hz">' + toneLabel(id) + '</span>';
    }).join('') + (cur.p.tones.length > 48 ? '<span class="more">+' + (cur.p.tones.length - 48) + '</span>' : '');

    const seconds = ((cur.p.tones.length - 2) * toneMs / 1000 + 2 * Math.max(0.35, toneMs * 3 / 1000)).toFixed(1);
    if (!player) {
      $('snd-status').textContent = cur.p.codes.length + ' characters + 1 checksum = ' + (cur.p.digits.length) + ' digits, ' +
        cur.p.tones.length + ' tones, about ' + seconds + ' s of sound. Checksum = ' + SD.hex(cur.p.sum) + '.';
    }
  }

  function renderKeys() {
    $('snd-key').textContent = CF.app.keyCode();
    if (!keyEdited) $('rcv-key').value = CF.app.keyCode();
  }

  function send() {
    if (player) return;
    const cur = currentPlan();
    if (!cur.p.codes.length) { $('snd-status').textContent = 'Type a message first.'; return; }
    const chips = $('snd-tones').querySelectorAll('span[data-i]');
    $('snd-play').disabled = true;
    $('snd-stop').disabled = false;
    $('snd-status').textContent = 'Sending “' + clip(cur.ct, 30) + '” as sound…';
    emit('cf:txstart', { tones: cur.p.tones });
    let lastI = -1;
    player = SD.play(cur.p.tones, toneMs, function (i, frac) {
      if (i !== lastI) { lastI = i; emit('cf:tx', { i: i, id: cur.p.tones[i], freq: SD.freqOf(cur.p.tones[i]), frac: frac }); }
      chips.forEach(function (c) { c.classList.toggle('is-now', +c.dataset.i === i); c.classList.toggle('is-done', +c.dataset.i < i); });
      $('snd-progress').style.width = Math.min(100, frac * 100).toFixed(1) + '%';
    }, function () {
      player = null;
      emit('cf:txend', {});
      $('snd-play').disabled = false;
      $('snd-stop').disabled = true;
      $('snd-progress').style.width = '0%';
      chips.forEach(function (c) { c.classList.remove('is-now', 'is-done'); });
      $('snd-status').textContent = 'Sent. ' + (listening ? '' : 'Tip: press “Start listening” on the receiver first.');
    });
  }

  /* ---------- Receiver ---------- */
  function resetOut() {
    ['rcv-hex', 'rcv-cipher', 'rcv-check', 'rcv-plain'].forEach(function (id) { $(id).textContent = '—'; });
    $('rcv-plain').classList.remove('is-ok');
  }

  function digitsText(d) {
    let s = '';
    for (let i = 0; i < d.length; i += 2) s += d[i].toString(16).toUpperCase() + (d[i + 1] !== undefined ? d[i + 1].toString(16).toUpperCase() : '') + ' ';
    return clip(s.trim(), 60);
  }

  function startListening() {
    if (!listener) {
      listener = SD.createListener({
        onStart: function () { resetOut(); $('rcv-status').textContent = 'Start tone heard. Receiving…'; },
        onTone: function (id) { emit('cf:rx', { id: id }); },
        onDigit: function (d) { $('rcv-hex').textContent = digitsText(d); },
        onFrame: drawSpectrum,
        onMessage: function (res, d) {
          $('rcv-hex').textContent = digitsText(d);
          $('rcv-cipher').textContent = res.text || '(empty)';
          $('rcv-check').innerHTML = res.ok
            ? '<span class="ok">Correct: nothing was lost on the way</span>'
            : '<span class="bad">Wrong: some tones were misheard. Move the devices closer and send again.</span>';
          const plain = CF.app.decrypt(res.text);
          const el = $('rcv-plain');
          el.textContent = plain === null ? 'This key’s cipher has no inverse, so it cannot decrypt.' : plain;
          el.classList.toggle('is-ok', plain !== null && res.ok);
          $('rcv-status').textContent = 'Message received. Listening for the next one.';
          emit('cf:rxdone', { ok: res.ok, plain: plain });
        }
      });
    }
    const useMic = mode === 'mic';
    $('rcv-status').textContent = useMic ? 'Asking for the microphone…' : 'Listening to this device’s own sender.';
    listener.start(useMic).then(function () {
      listening = true;
      emit('cf:listen', { on: true });
      $('rcv-listen').textContent = 'Stop listening';
      $('rcv-listen').classList.add('primary');
      $('rcv-status').textContent = useMic
        ? 'Listening through the microphone. Waiting for the start tone… Keep the devices close and the sender’s volume up.'
        : 'Listening to this device. Now press “Encrypt and send as sound”.';
    }).catch(function (err) {
      $('rcv-status').textContent = 'Microphone not available: ' + (err && err.message ? err.message : 'permission was refused') + '. Use “This device, no microphone” instead.';
    });
  }

  function stopListening() {
    if (listener) listener.stop();
    listening = false;
    emit('cf:listen', { on: false });
    $('rcv-listen').textContent = 'Start listening';
    $('rcv-listen').classList.remove('primary');
    $('rcv-status').textContent = 'Not listening.';
    clearSpectrum();
  }

  /* ---------- Live spectrum ---------- */
  const canvas = $('spectrum');
  function colors() {
    const cs = getComputedStyle(document.documentElement);
    return { bar: cs.getPropertyValue('--steel-2').trim(), mark: cs.getPropertyValue('--rule').trim(), hit: cs.getPropertyValue('--brass').trim(), bg: cs.getPropertyValue('--graphite-2').trim() };
  }
  function fit() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    canvas.height = Math.round(120 * dpr);
  }
  function clearSpectrum() {
    fit();
    const g = canvas.getContext('2d'), c = colors();
    g.fillStyle = c.bg; g.fillRect(0, 0, canvas.width, canvas.height);
    drawMarks(g, c, null);
  }
  const LO = 1200, HI = 4900;
  function xOf(f) { return (f - LO) / (HI - LO) * canvas.width; }
  function drawMarks(g, c, hitId) {
    SD.TARGETS.forEach(function (t) {
      g.fillStyle = t.id === hitId ? c.hit : c.mark;
      const w = t.id === hitId ? 4 : 2;
      g.fillRect(xOf(t.f) - w / 2, 0, w, t.id === hitId ? canvas.height : 8 * (window.devicePixelRatio || 1));
    });
  }
  let lastDraw = 0;
  function drawSpectrum(bins, binHz, hitId) {
    const now = performance.now();
    if (now - lastDraw < 30) return;
    lastDraw = now;
    if (canvas.width !== Math.round(canvas.clientWidth * (window.devicePixelRatio || 1))) fit();
    const g = canvas.getContext('2d'), c = colors(), H = canvas.height;
    g.fillStyle = c.bg; g.fillRect(0, 0, canvas.width, H);
    drawMarks(g, c, hitId);
    g.fillStyle = c.bar;
    const lo = Math.floor(LO / binHz), hi = Math.ceil(HI / binHz);
    const w = Math.max(1, canvas.width / (hi - lo));
    for (let k = lo; k < hi; k++) {
      const v = Math.max(0, Math.min(1, (bins[k] + 110) / 80));
      const h = v * (H - 10);
      g.fillRect((k - lo) * w, H - h, Math.ceil(w), h);
    }
  }

  /* ---------- Wire up ---------- */
  $('snd-msg').addEventListener('input', renderPipe);
  $('snd-play').addEventListener('click', send);
  $('snd-stop').addEventListener('click', function () { if (player) player.stop(); });
  $('snd-copy').addEventListener('click', function () {
    const code = CF.app.keyCode();
    const done = function () { $('snd-copy').textContent = 'Copied'; setTimeout(function () { $('snd-copy').textContent = 'Copy key'; }, 1400); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, function () { window.prompt('Copy this key:', code); });
    else window.prompt('Copy this key:', code);
  });
  $('snd-speed').querySelectorAll('button').forEach(function (b) {
    b.addEventListener('click', function () {
      toneMs = +b.dataset.ms;
      $('snd-speed').querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); });
      renderPipe();
    });
  });
  $('rcv-mode').querySelectorAll('button').forEach(function (b) {
    b.addEventListener('click', function () {
      mode = b.dataset.mode;
      $('rcv-mode').querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); });
      if (listening) { stopListening(); startListening(); }
    });
  });
  $('rcv-listen').addEventListener('click', function () { listening ? stopListening() : startListening(); });
  $('rcv-key').addEventListener('input', function () { keyEdited = true; });
  $('rcv-apply').addEventListener('click', function () {
    const ok = CF.app.loadKey($('rcv-key').value);
    keyEdited = false;
    $('rcv-status').textContent = ok
      ? 'Key loaded. This page now uses the sender’s cipher, so it can decrypt their messages.'
      : 'That key is not valid. It should look like letters/shift-3/mirror.';
  });

  document.addEventListener('cf:change', function () { renderKeys(); renderPipe(); });
  window.addEventListener('resize', function () { if (!listening) clearSpectrum(); });

  renderKeys();
  renderPipe();
  clearSpectrum();

  CF.lab3 = { send: send, startListening: startListening, stopListening: stopListening, setMode: function (m) { mode = m; } };
})();
