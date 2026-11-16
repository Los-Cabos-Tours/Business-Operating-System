// ============================================================
// BOS Security Guard — demo-account lockout v1
// Owner order (2026-11-16): strangers are logging into the Los
// Cabos Tours CRM. Root cause: crm.html ships DEFAULT_USERS —
// 6 seeded demo logins with printed passwords — in a PUBLIC
// GitHub repo. Anyone reading the repo can sign in. Worse, the
// cross-device login feature synced those demo accounts to the
// shared backend, so they now work from any device.
//
// THIS FILE (loaded before crm.html via index.html) fixes it
// on every device WITHOUT touching crm.html's login logic:
//
//  1. If the demo accounts still carry their SHIPPED DEFAULT
//     passwords, mark them active:false in aetherion_users.
//     crm.html's own handleLogin()/getCurrentUser() already
//     reject active === false, so the demo accounts stop
//     working everywhere — including devices that pull the
//     user list from the sync backend.
//  2. If the current session belongs to a disabled demo
//     account, remove the session immediately.
//  3. Never touch an account whose password was CHANGED from
//     the default — e.g. the owner's own login. Personalized
//     accounts keep working untouched.
//  4. The disabled list is written through the normal
//     localStorage write path, so CloudSync pushes it to the
//     backend and every other device gets the lockout too.
//
// WHAT THE OWNER MUST DO ONCE (only step needing the owner):
// on the main computer, sign in and change the password of any
// REAL account you want to keep (Users & Access). Any account
// left on a shipped default password is treated as a demo and
// disabled. That is the security rule, stated plainly.
// ============================================================
(function () {
  'use strict';

  var USERS_KEY = 'aetherion_users';
  var SESSION_KEY = 'aetherion_user';

  // Shipped demo credentials, exactly as printed in crm.html.
  var DEFAULTS = {
    'developer':    'Admin2026',
    'ana':          'Cabos2026',
    'carlos':       'Runner2026',
    'sofia':        'Lobby2026',
    'manuel':       'Drive2026',
    'leopobleteceo': 'Cabo2026'
  };

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

  function enforce() {
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enforce);
  } else {
    enforce();
  }
})();
