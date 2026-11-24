/* =========================================================
   Cipher Forge — qr.js
   A small QR code generator (byte mode, error correction
   level M, versions 1–10), so a phone can open the receiver
   page with the key already filled in.
   The error correction is Reed–Solomon over the finite
   field GF(2⁸): more discrete maths at work.
   ========================================================= */
window.CF = window.CF || {};

CF.qr = (function () {
  'use strict';

  // Level M, versions 1–10
  const ECC_PER_BLOCK = [10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
  const NUM_BLOCKS = [1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
  const ECC_FORMAT = 0;    // the 2-bit code for level M

  function rawModules(ver) {
    let r = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      const n = Math.floor(ver / 7) + 2;
      r -= (25 * n - 10) * n - 55;
      if (ver >= 7) r -= 36;
    }
    return r;
  }
  function dataCodewords(ver) {
    return Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK[ver - 1] * NUM_BLOCKS[ver - 1];
  }

  /* ---------- Reed–Solomon in GF(2⁸) ---------- */
  function mul(x, y) {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z & 0xFF;
  }
  function divisor(degree) {
    const r = [];
    for (let i = 0; i < degree - 1; i++) r.push(0);
    r.push(1);
    let root = 1;
    for (let i = 0; i < degree; i++) {
      for (let j = 0; j < r.length; j++) {
        r[j] = mul(r[j], root);
        if (j + 1 < r.length) r[j] ^= r[j + 1];
      }
      root = mul(root, 0x02);
    }
    return r;
  }
  function remainder(data, div) {
    const r = div.map(function () { return 0; });
    data.forEach(function (b) {
      const f = b ^ r.shift();
      r.push(0);
      div.forEach(function (c, i) { r[i] ^= mul(c, f); });
    });
    return r;
  }

  function utf8(text) {
    const out = [];
    const s = unescape(encodeURIComponent(text));
    for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
    return out;
  }

  /* ---------- Encode: data codewords with error correction ---------- */
  function codewords(bytes, ver) {
    const bits = [];
    const put = function (val, len) { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    put(4, 4);                                    // byte mode
    put(bytes.length, ver <= 9 ? 8 : 16);
    bytes.forEach(function (b) { put(b, 8); });
    const cap = dataCodewords(ver) * 8;
    put(0, Math.min(4, cap - bits.length));
    put(0, (8 - bits.length % 8) % 8);
    for (let pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) put(pad, 8);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) {
      let v = 0;
      for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
      data.push(v);
    }
    // Split into blocks, add Reed–Solomon codewords, interleave
    const nb = NUM_BLOCKS[ver - 1], eccLen = ECC_PER_BLOCK[ver - 1];
    const raw = Math.floor(rawModules(ver) / 8);
    const numShort = nb - raw % nb, shortLen = Math.floor(raw / nb);
    const div = divisor(eccLen);
    const blocks = [];
    for (let i = 0, k = 0; i < nb; i++) {
      const dat = data.slice(k, k + shortLen - eccLen + (i < numShort ? 0 : 1));
      k += dat.length;
      const ecc = remainder(dat, div);
      if (i < numShort) dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    const result = [];
    for (let i = 0; i < blocks[0].length; i++) {
      blocks.forEach(function (blk, j) {
        if (i !== shortLen - eccLen || j >= numShort) result.push(blk[i]);
      });
    }
    return result;
  }

  /* ---------- Draw the symbol ---------- */
  function build(ver, cw, mask) {
    const size = ver * 4 + 17;
    const mod = [], fn = [];
    for (let y = 0; y < size; y++) { mod.push(new Array(size).fill(false)); fn.push(new Array(size).fill(false)); }
    const set = function (x, y, dark) { mod[y][x] = dark; fn[y][x] = true; };

    for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    [[3, 3], [size - 4, 3], [3, size - 4]].forEach(function (c) {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy)), x = c[0] + dx, y = c[1] + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
      }
    });
    if (ver > 1) {
      const n = Math.floor(ver / 7) + 2;
      const step = Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
      const pos = [6];
      for (let p = size - 7; pos.length < n; p -= step) pos.splice(1, 0, p);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(pos[i] + dx, pos[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
    const format = function (m) {
      const data = ECC_FORMAT << 3 | m;
      let rem = data;
      for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      const bits = (data << 10 | rem) ^ 0x5412;
      const b = function (i) { return ((bits >>> i) & 1) !== 0; };
      for (let i = 0; i <= 5; i++) set(8, i, b(i));
      set(8, 7, b(6)); set(8, 8, b(7)); set(7, 8, b(8));
      for (let i = 9; i < 15; i++) set(14 - i, 8, b(i));
      for (let i = 0; i < 8; i++) set(size - 1 - i, 8, b(i));
      for (let i = 8; i < 15; i++) set(8, size - 15 + i, b(i));
      set(8, size - 8, true);
    };
    format(0);
    if (ver >= 7) {
      let rem = ver;
      for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
      const bits = ver << 12 | rem;
      for (let i = 0; i < 18; i++) {
        const bit = ((bits >>> i) & 1) !== 0, a = size - 11 + i % 3, b = Math.floor(i / 3);
        set(a, b, bit); set(b, a, bit);
      }
    }
    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let v = 0; v < size; v++) for (let j = 0; j < 2; j++) {
        const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - v : v;
        if (!fn[y][x] && i < cw.length * 8) { mod[y][x] = ((cw[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0; i++; }
      }
    }
    const masks = [
      function (x, y) { return (x + y) % 2 === 0; },
      function (x, y) { return y % 2 === 0; },
      function (x) { return x % 3 === 0; },
      function (x, y) { return (x + y) % 3 === 0; },
      function (x, y) { return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; },
      function (x, y) { return x * y % 2 + x * y % 3 === 0; },
      function (x, y) { return (x * y % 2 + x * y % 3) % 2 === 0; },
      function (x, y) { return ((x + y) % 2 + x * y % 3) % 2 === 0; }
    ];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && masks[mask](x, y)) mod[y][x] = !mod[y][x];
    format(mask);
    return mod;
  }

  // A simple penalty score (rules 1, 2 and 4 of the standard) to pick a mask
  function penalty(m) {
    const n = m.length;
    let p = 0, dark = 0;
    for (let y = 0; y < n; y++) {
      let runX = 1, runY = 1;
      for (let x = 0; x < n; x++) {
        if (m[y][x]) dark++;
        if (x > 0) {
          if (m[y][x] === m[y][x - 1]) { runX++; if (runX === 5) p += 3; else if (runX > 5) p++; } else runX = 1;
          if (m[x][y] === m[x - 1][y]) { runY++; if (runY === 5) p += 3; else if (runY > 5) p++; } else runY = 1;
        }
        if (x > 0 && y > 0 && m[y][x] === m[y][x - 1] && m[y][x] === m[y - 1][x] && m[y][x] === m[y - 1][x - 1]) p += 3;
      }
    }
    p += (Math.ceil(Math.abs(dark * 20 - n * n * 10) / (n * n)) - 1) * 10;
    return p;
  }

  // text → matrix of booleans (true = dark). mask may be forced (0–7).
  function encode(text, forcedMask) {
    const bytes = utf8(text);
    let ver = 1;
    while (ver <= 10 && 4 + (ver <= 9 ? 8 : 16) + bytes.length * 8 > dataCodewords(ver) * 8) ver++;
    if (ver > 10) throw new Error('Text too long for this QR generator');
    const cw = codewords(bytes, ver);
    if (forcedMask !== undefined) return build(ver, cw, forcedMask);
    let best = null, bestP = Infinity;
    for (let k = 0; k < 8; k++) {
      const m = build(ver, cw, k), pp = penalty(m);
      if (pp < bestP) { bestP = pp; best = m; }
    }
    return best;
  }

  // Draw onto a canvas with a quiet zone
  function draw(canvas, text, opts) {
    opts = opts || {};
    const m = encode(text);
    const quiet = 3, n = m.length + quiet * 2;
    const px = opts.size || 200;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.height = Math.round(px * dpr);
    canvas.style.width = canvas.style.height = px + 'px';
    const g = canvas.getContext('2d');
    const cell = canvas.width / n;
    g.fillStyle = opts.light || '#ffffff';
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = opts.dark || '#000000';
    for (let y = 0; y < m.length; y++) for (let x = 0; x < m.length; x++) {
      if (m[y][x]) g.fillRect(Math.floor((x + quiet) * cell), Math.floor((y + quiet) * cell), Math.ceil(cell), Math.ceil(cell));
    }
  }

  return { encode: encode, draw: draw };
})();
