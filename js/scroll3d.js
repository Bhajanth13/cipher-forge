/* =========================================================
   Cipher Forge — scroll3d.js
   The 3D layer: the hero rotor drum that turns HELLO into
   KHOOR as you scroll, and the chapters that roll in like
   a drum. Pure CSS 3D transforms driven by scroll position.
   ========================================================= */
(function () {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const WORD = 'HELLO';
  const SHIFT = 3;

  const N = 26;
  const FACE_H = 58;
  const STEP = 360 / N;                                       // degrees per letter
  const RADIUS = (FACE_H / 2) / Math.tan(Math.PI / N);        // so faces meet edge to edge
  const GAP = 94;

  const clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  const ease = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

  /* ---------- Build the rotors ---------- */
  const rig = document.getElementById('rig');
  const rotors = [];
  WORD.split('').forEach(function (ch, w) {
    const rotor = document.createElement('div');
    rotor.className = 'rotor';
    rotor.style.left = ((w - (WORD.length - 1) / 2) * GAP - 40) + 'px';
    const faces = [];
    for (let i = 0; i < N; i++) {
      const face = document.createElement('div');
      face.className = 'rotor-face';
      face.textContent = LETTERS[i];
      face.style.transform = 'rotateX(' + (i * STEP) + 'deg) translateZ(' + RADIUS.toFixed(2) + 'px)';
      rotor.appendChild(face);
      faces.push(face);
    }
    rig.appendChild(rotor);
    rotors.push({ el: rotor, start: LETTERS.indexOf(ch), faces: faces, front: -1 });
  });

  // The brass reading window sits just in front of the drum, inside the
  // same 3D space, so it stays on the front row whatever the angle.
  const span = (WORD.length - 1) * GAP + 80;
  const win = document.getElementById('rotor-window');
  win.style.left = (-span / 2 - 10) + 'px';
  win.style.width = (span + 20) + 'px';
  win.style.transform = 'translateZ(' + (RADIUS + 4).toFixed(1) + 'px)';

  const hero = document.getElementById('top');
  const outCipher = document.getElementById('hero-cipher');
  const outK = document.getElementById('hero-k');
  const plates = Array.prototype.slice.call(document.querySelectorAll('.chapter .plate'));
  const navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-steps a'));
  const bar = document.getElementById('progress');

  function setRotors(p) {
    let text = '';
    let turned = 0;
    rotors.forEach(function (r, w) {
      const local = reduce ? 1 : ease(clamp((p - w * 0.07) / 0.55, 0, 1));
      const pos = r.start + SHIFT * local;
      r.el.style.transform = 'rotateX(' + (-pos * STEP).toFixed(3) + 'deg)';
      const front = ((Math.round(pos) % N) + N) % N;
      if (front !== r.front) {
        if (r.front >= 0) r.faces[r.front].classList.remove('is-front');
        r.faces[front].classList.add('is-front');
        r.front = front;
      }
      text += LETTERS[front];
      turned += local;
    });
    outCipher.textContent = text;
    outK.textContent = Math.round((turned / rotors.length) * SHIFT);
    const yaw = reduce ? -14 : -30 + 22 * ease(clamp(p / 0.8, 0, 1));
    const pitch = reduce ? -6 : -10 + 6 * p;
    rig.style.transform = 'scale(' + fit.toFixed(3) + ') rotateX(' + pitch.toFixed(2) + 'deg) rotateY(' + yaw.toFixed(2) + 'deg)';
  }

  /* ---------- Chapters roll in like a drum ---------- */
  function setPlates(vh) {
    plates.forEach(function (plate) {
      const r = plate.parentElement.getBoundingClientRect();
      const enter = clamp((vh - r.top) / (vh * 0.6), 0, 1);
      const leave = clamp((vh * 0.3 - r.bottom) / (vh * 0.3), 0, 1);
      if (enter >= 1 && leave <= 0) {
        plate.style.transform = 'none';
        plate.style.opacity = '1';
        return;
      }
      const e = 1 - ease(enter);
      if (leave > 0) {
        plate.style.transformOrigin = '50% 100%';
        plate.style.transform = 'rotateX(' + (leave * 12).toFixed(2) + 'deg) scale(' + (1 - leave * 0.05).toFixed(3) + ')';
        plate.style.opacity = (1 - leave * 0.7).toFixed(3);
      } else {
        plate.style.transformOrigin = '50% 0%';
        plate.style.transform = 'translateY(' + (e * 90).toFixed(1) + 'px) translateZ(' + (-e * 160).toFixed(1) + 'px) rotateX(' + (e * 18).toFixed(2) + 'deg)';
        plate.style.opacity = (0.15 + 0.85 * (1 - e)).toFixed(3);
      }
    });
  }

  function setNav(vh) {
    const doc = document.documentElement;
    const max = doc.scrollHeight - vh;
    bar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
    let current = null;
    navLinks.forEach(function (a) {
      const sec = document.querySelector(a.getAttribute('href'));
      if (sec && sec.getBoundingClientRect().top < vh * 0.4) current = a;
    });
    navLinks.forEach(function (a) { a.classList.toggle('is-current', a === current); });
  }

  // Shrink the drum to fit narrow screens
  const stage = rig.parentElement;
  let fit = 1;
  function measure() {
    fit = Math.min(1, stage.clientWidth / 600, stage.clientHeight / 520);
  }

  let ticking = false;
  function frame() {
    ticking = false;
    const vh = window.innerHeight;
    const hr = hero.getBoundingClientRect();
    const span = Math.max(1, hero.offsetHeight - vh);
    setRotors(clamp(-hr.top / span, 0, 1));
    if (!reduce) setPlates(vh);
    setNav(vh);
  }
  function request() {
    if (!ticking) { ticking = true; window.requestAnimationFrame(frame); }
  }

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', function () { measure(); request(); });
  measure();
  frame();
})();
