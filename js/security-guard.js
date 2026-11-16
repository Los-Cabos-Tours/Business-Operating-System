// ============================================================
// BOS Security Guard — demo-account lockout v1.1
// Owner order (2026-11-16): strangers are logging into the Los
// Cabos Tours CRM. Root cause: crm.html ships DEFAULT_USERS —
// 6 seeded demo logins with printed passwords — in a PUBLIC
// GitHub repo. On a FRESH browser (a stranger's), crm.html
// re-seeds those active demo accounts into local storage, and
// the printed passwords work. Cross-device sync also carried
// them to the shared backend, so they work from any device.
//
// HOW THIS FIX WINS, on every device, WITHOUT touching
// crm.html's login logic:
//  - Any demo account still carrying its SHIPPED DEFAULT
//    password is marked active:false. crm.html's own
//    handleLogin()/getCurrentUser() already reject
//    active === false, so those accounts stop working.
//  - crm.html re-seeds demo accounts AFTER this script first
//    runs (the iframe loads async), so enforcement REPEATS:
//    immediately, on every storage change, and on a 2s poll
//    for the first 2 minutes. The lockout always wins.
//  - Any live session belonging to a disabled demo account
//    is removed immediately.
//  - Accounts whose password was CHANGED from the shipped
//    default (the owner's real logins) are never touched.
//
// WHAT THE OWNER MUST DO ONCE: keep only the accounts you
// want, each with a password you changed from the default
// (Users & Access). Anything left on a default password is
// treated as a demo account and disabled — that is the rule.
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
    if (enforcing) return; // never re-enter from our own write
    enforcing = true;
    try {
      var users = readUsers();
      if (!users) return;

      var disabledIds = {};
      var changed = false;
      users.forEach(function (u) {
        if (!u || typeof u !== 'object') return;
        var defPass = DEFAULTS[u.username];
        if (defPass !== undefined && u.password === defPass && u.active !== false) {
          u.active = false;
          disabledIds[u.id] = true;
          changed = true;
        }
      });

      // Kill any live session that belongs to a disabled account.
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
    // crm.html's iframe may seed/merge users at any moment after this
    // script first runs — keep enforcing so the lockout always wins.
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
