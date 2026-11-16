// ============================================================
// BOS Security Guard — demo-account lockout v2
// FIX (owner order, 2026-11-16): v1 disabled the owner's own
// superadmin account because it still carried a shipped demo
// password, locking the owner out of their own system.
// v2 rules:
//   RULE 1 — a superadmin account is NEVER disabled. If a
//   previous guard run disabled it, v2 re-activates it
//   automatically (self-repair).
//   RULE 2 — non-superadmin accounts still on a shipped
//   default password remain disabled (strangers use those
//   printed passwords). Accounts with changed passwords are
//   untouched.
// ============================================================
(function () {
  'use strict';

  var USERS_KEY = 'aetherion_users';
  var SESSION_KEY = 'aetherion_user';

  // Shipped demo credentials, exactly as printed in crm.html.
  var DEFAULTS = {
    'developer':     'Admin2026',
    'ana':           'Cabos2026',
    'carlos':        'Runner2026',
    'sofia':         'Lobby2026',
    'manuel':        'Drive2026',
    'leopobleteceo': 'Cabo2026'
  };

  var POLL_MS = 2000;
  var POLL_WINDOW_MS = 120000; // keep watching for 2 minutes after load

  function readUsers() {
    try {
      var raw = localStorage.getItem(USERS_KEY);
      if (!raw) return null;
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : null;
    } catch (e) { return null; }
  }

  function writeUsers(users) {
    try { localStorage.setItem(USERS_KEY, JSON.stringify(users)); } catch (e) {}
  }

  var enforcing = false;
  function enforce() {
    if (enforcing) return;
    enforcing = true;
    try {
      var users = readUsers();
      if (!users) return;

      var disabledIds = {};
      var changed = false;
      users.forEach(function (u) {
        if (!u || typeof u !== 'object') return;

        // RULE 1: superadmin is untouchable; repair if v1 disabled it.
        if (u.role === 'superadmin') {
          if (u.active === false) { u.active = true; changed = true; }
          return;
        }

        // RULE 2: non-superadmin on a shipped default password = demo account.
        var defPass = DEFAULTS[u.username];
        if (defPass !== undefined && u.password === defPass && u.active !== false) {
          u.active = false;
          disabledIds[u.id] = true;
          changed = true;
        }
      });

      try {
        var sess = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
        if (sess && disabledIds[sess.id]) {
          localStorage.removeItem(SESSION_KEY);
        }
      } catch (e) {}

      if (changed) writeUsers(users);
    } finally {
      enforcing = false;
    }
  }

  function start() {
    enforce();
    window.addEventListener('storage', function (e) {
      if (!e.key || e.key === USERS_KEY || e.key === SESSION_KEY) enforce();
    });
    var startedAt = Date.now();
    var timer = setInterval(function () {
      enforce();
      if (Date.now() - startedAt > POLL_WINDOW_MS) clearInterval(timer);
    }, POLL_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
