/* =========================================================
   Cipher Forge — future.js
   The future-enhancements page has no lab on it, so this
   file holds the cipher instead: the one last built in the
   lab (saved in this browser), or a key from the link
   (future.html?key=letters/shift-3), or the Caesar cipher.
   ========================================================= */
(function () {
  'use strict';

  const B = CF.blocks, S = CF.sets;

  let saved = null;
  try { saved = localStorage.getItem('cf-key'); } catch (e) { /* storage may be blocked */ }
  const fromLink = new URLSearchParams(location.search).get('key');
  const start = B.parseKey(fromLink) || B.parseKey(saved) || B.parseKey('letters/shift-3');

  const state = { setKey: start.setKey, chain: start.chain };
  function set() { return S.PRESETS[state.setKey].set; }

  CF.app = {
    state: state,
    set: set,
    encrypt: function (text) { return B.run(text, state.chain, set(), false).output; },
    decrypt: function (text) {
      const r = B.run(text, state.chain, set(), true);
      return r ? r.output : null;
    },
    keyCode: function () { return B.keyCode(state.setKey, state.chain); },
    loadKey: function (code) {
      const k = B.parseKey(code);
      if (!k) return false;
      state.setKey = k.setKey;
      state.chain = k.chain;
      try { localStorage.setItem('cf-key', B.keyCode(k.setKey, k.chain)); } catch (e) { /* ignore */ }
      document.dispatchEvent(new CustomEvent('cf:change'));
      return true;
    }
  };
})();
