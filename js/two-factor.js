(function () {
  'use strict';
  try { if (window.self !== window.top) return; } catch (e) { return; }
  try {
    localStorage.removeItem('aetherion_2fa_pending');
    localStorage.removeItem('aetherion_2fa_verified');
    localStorage.removeItem('aetherion_dead_backends');
  } catch (e) {}
  setInterval(function () {}, 1000);
  window.BOS2FA = { version: '2.3-off', enabled: false };
})();