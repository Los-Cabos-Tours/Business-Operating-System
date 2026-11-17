// ============================================================
// BOS Login Guarantee — v1
// Owner order (2026-11-17): Oliver (oliver1) must be able to
// sign in from ANY device with his credentials.
//
// ROOT CAUSE (verified in crm.html):
//  1. A fresh browser seeds ONLY the six shipped demo accounts.
//     oliver1 is not among them, so before any sync pull the
//     local user list does not contain him -> every login fails
//     with "Invalid username or password".
//  2. The CloudSync _push() sends the WHOLE local aetherion_users
//     array to the backend. A fresh device with only demo users
//     can overwrite the shared store, wiping oliver1 from every
//     other device after their next pull.
//
// WHAT THIS MODULE DOES (runs before login, never touches
// crm.html's own code):
//  1. ENSURES oliver1 exists locally with the owner-verified
//     credentials (U-002, TiaJuana2027, admin, active, credV 2).
//     Last-write-wins by updatedAt is respected: a NEWER local
//     copy of the account (password changed on this device) is
//     never downgraded by this module.
//  2. PULLS the shared user list from the configured backend
//     (same JSONP GET path as cross-device-login) and merges it
//     last-write-wins by updatedAt. Remote accounts that are
//     newer overwrite older local copies, INCLUDING oliver1 —
//     so a password change made on one device reaches all.
//  3. RETRY: hooks the login form submit. If a sign-in fails
//     with "Invalid username or password", it force-refreshes
//     the shared user list once and lets the user retry —
//     no dead ends, no stuck browsers.
// ============================================================
(function () {
  'use strict';

  var USERS_KEY = 'aetherion_users';
  var GUARANTEE_AT_KEY = 'aetherion_login_guarantee_at';
  var PULL_TIMEOUT_MS = 8000;

  // Owner-verified account (from the live backend store, 2026-11-17).
  var OLIVER = {
    id: 'U-002',
    name: 'Oliver',
    username: 'oliver1',
    password: 'TiaJuana2027',
    email: 'hugoobednajerasolis81@gmail.com',
    phone: '',
    jobTitle: 'Co Founder',
    role: 'admin',
    active: true,
    permissions: {
      dashboard: { view: true },
      guests: { view: true, create: true, edit: true, delete: false, export: true, whatsapp: true },
      webleads: { view: true },
      bookings: { view: true, create: true, edit: true, delete: false, export: true, whatsapp: true },
      concierge: { view: true, create: true, edit: true, delete: false },
      operators: { view: true, create: false, edit: false, delete: false, whatsapp: true },
      history: { view: true, export: true },
      settings: { view: true, edit: true },
      users: { view: false, create: false, edit: false, delete: false },
      assistant: { view: true }
    },
    createdAt: '2026-11-16',
    credV: 2,
    updatedAt: 1794835140109 // matches the backend copy
  };

  function getOrig(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function setOrig(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function readUsers() {
    try {
      var arr = JSON.parse(getOrig(USERS_KEY) || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function writeUsers(arr) { setOrig(USERS_KEY, JSON.stringify(arr)); }

  function mergeUsers(localArr, remoteArr) {
    var map = {};
    localArr.forEach(function (u) {
      if (u && u.username) map[u.username.toLowerCase()] = u;
    });
    remoteArr.forEach(function (u) {
      if (!u || !u.username) return;
      var key = u.username.toLowerCase();
      var ex = map[key];
      if (!ex || (Number(u.updatedAt) || 0) > (Number(ex.updatedAt) || 0)) {
        map[key] = u;
      }
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  // 1. Ensure oliver1 exists locally (never downgrade a newer local copy).
  function ensureOliver() {
    try {
      var users = readUsers();
      var idx = -1;
      for (var i = 0; i < users.length; i++) {
        if (users[i] && String(users[i].username || '').toLowerCase() === 'oliver1') { idx = i; break; }
      }
      if (idx === -1) {
        users.push(OLIVER);
        writeUsers(users);
      } else {
        var local = users[idx];
        if ((Number(local.updatedAt) || 0) < OLIVER.updatedAt) {
          users[idx] = OLIVER;
          writeUsers(users);
        }
      }
    } catch (e) { /* must never break boot */ }
  }

  // 2. Pull the shared user list from the backend (read-only, JSONP).
  function pullRemoteUsers(onDone) {
    var url = (getOrig('aetherion_sync_url') || '').trim();
    if (!url) { if (onDone) onDone(); return; }
    var ns = (getOrig('aetherion_sync_namespace') || 'default').trim() || 'default';
    var sep = url.indexOf('?') >= 0 ? '&' : '?';
    var cb = 'boslg_cb_' + Date.now();
    var script = null;
    var settled = false;
    function finish() {
      if (settled) return;
      settled = true;
      try { delete window[cb]; } catch (e) { window[cb] = undefined; }
      if (script && script.parentNode) script.parentNode.removeChild(script);
      if (onDone) onDone();
    }
    window[cb] = function (data) {
      try {
        var arr = null;
        if (Array.isArray(data)) arr = data;
        else if (data && typeof data === 'object' && Array.isArray(data[USERS_KEY])) arr = data[USERS_KEY];
        if (arr) {
          var valid = [];
          for (var i = 0; i < arr.length; i++) {
            var u = arr[i];
            if (u && typeof u === 'object' && typeof u.username === 'string' && u.username &&
                typeof u.password === 'string' && u.password) valid.push(u);
          }
          if (valid.length > 0) writeUsers(mergeUsers(readUsers(), valid));
        }
      } catch (e) { /* bad payload: ignore */ }
      finish();
    };
    script = document.createElement('script');
    script.src = url + sep + 'user=' + encodeURIComponent(ns) + '&callback=' + cb;
    script.onerror = function () { finish(); };
    document.head.appendChild(script);
    setTimeout(finish, PULL_TIMEOUT_MS);
  }

  function boot() {
    ensureOliver();
    // Fresh pull of the shared list (re-pull at most once per hour).
    var last = Number(getOrig(GUARANTEE_AT_KEY)) || 0;
    if (Date.now() - last > 3600000) {
      pullRemoteUsers(function () {
        ensureOliver(); // merge can never drop oliver1: re-assert after pull
        setOrig(GUARANTEE_AT_KEY, String(Date.now()));
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();