// ============================================================
// BOS Login Guarantee — v2: ALL accounts work on ANY device
// Owner order (2026-11-17): every account the owner creates
// (superadmin, oliver1, and all future team accounts) must be
// able to sign in from any device, anywhere in the world.
//
// THREE ROOT CAUSES THIS CLOSES (verified in crm.html):
//  1. FRESH DEVICES SEED DEMO ACCOUNTS ONLY. crm.html's
//     initializeDB() re-seeds 6 shipped demo accounts on every
//     load. The owner deleted them, and real accounts
//     (oliver1, team) are NOT in that list, so login fails on
//     any browser that has not synced yet.
//  2. ID COLLISION KILLS REAL ACCOUNTS IN MERGES. The owner
//     deleted demo 'ana' (id U-002) — that id went into the
//     users tombstone list — and 'oliver1' was then created
//     with the SAME id U-002. Every sync merge on any device
//     excludes tombstoned ids, so oliver1 is silently dropped
//     from the merged user list everywhere except the owner's
//     own browser. A stale tombstone whose id now belongs to a
//     LIVE account must be removed.
//  3. NO RETRY. handleLogin() validates against localStorage
//     only; if the shared list has not been pulled yet, a
//     correct login is rejected with no second chance.
//
// WHAT THIS MODULE DOES (runs in the shell BEFORE crm.html):
//  A. BLOCKS DEMO SEEDING on every device (marks all six demo
//     ids as deleted-defaults before crm.html boots). Deleted
//     demo accounts can never resurrect, and the printed demo
//     passwords in the public repo can no longer log in.
//  B. PULLS the shared user list from the configured backend
//     (read-only JSONP, same transport as cross-device-login)
//     and merges last-write-wins by updatedAt. Runs at boot
//     (always if the local list is empty; hourly otherwise).
//     Password changes made on any device propagate to all.
//  C. CLEANS STALE USER TOMBSTONES: a tombstone whose id is now
//     owned by a live account is removed, so sync merges stop
//     deleting real accounts (fixes the oliver1/U-002 case for
//     every device, permanently, once the cleaned tombstone
//     list syncs up).
//  D. RETRY: wraps the CRM's handleLogin. If a sign-in fails,
//     it force-pulls the shared list and retries once with the
//     fresh data. No dead ends.
// ============================================================
(function () {
  'use strict';

  var USERS_KEY = 'aetherion_users';
  var TOMB_KEY = 'aetherion_tombstones';
  var DELETED_DEFAULTS_KEY = 'aetherion_deleted_defaults';
  var GUARANTEE_AT_KEY = 'aetherion_login_guarantee_at';
  var PULL_TIMEOUT_MS = 8000;
  var THROTTLE_MS = 60 * 60 * 1000; // hourly refresh once list is populated

  // The six shipped demo account ids (crm.html DEFAULT_USERS).
  var DEMO_USER_IDS = ['U-001', 'U-002', 'U-003', 'U-004', 'U-005', 'U-006'];

  function getOrig(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function setOrig(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function readUsers() {
    try {
      var a = JSON.parse(getOrig(USERS_KEY) || '[]');
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }
  function writeUsers(arr) { setOrig(USERS_KEY, JSON.stringify(arr)); }

  // ---- A. block demo seeding BEFORE crm.html boots ----
  function blockDemoSeeds() {
    try {
      var dd = [];
      try { dd = JSON.parse(getOrig(DELETED_DEFAULTS_KEY) || '[]'); } catch (e) { dd = []; }
      if (!Array.isArray(dd)) dd = [];
      var changed = false;
      DEMO_USER_IDS.forEach(function (id) {
        if (dd.indexOf(id) === -1) { dd.push(id); changed = true; }
      });
      if (changed) setOrig(DELETED_DEFAULTS_KEY, JSON.stringify(dd));
    } catch (e) { /* never fatal */ }
  }

  // ---- merge: last-write-wins by updatedAt, keep every live account ----
  function mergeUsers(localArr, remoteArr) {
    var map = {};
    localArr.forEach(function (u) {
      if (u && u.username) map[u.username.toLowerCase()] = u;
    });
    (remoteArr || []).forEach(function (u) {
      if (!u || !u.username) return;
      var k = u.username.toLowerCase();
      var ex = map[k];
      if (!ex || (Number(u.updatedAt) || 0) > (Number(ex.updatedAt) || 0)) map[k] = u;
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  // ---- C. remove tombstones whose id is owned by a LIVE account ----
  function cleanStaleUserTombstones(remoteUsers) {
    try {
      var tombs = JSON.parse(getOrig(TOMB_KEY) || '{}');
      if (!tombs || !Array.isArray(tombs.users) || tombs.users.length === 0) return;
      var live = {};
      readUsers().forEach(function (u) { if (u && u.id) live[String(u.id)] = true; });
      (remoteUsers || []).forEach(function (u) { if (u && u.id) live[String(u.id)] = true; });
      var kept = tombs.users.filter(function (id) { return !live[String(id)]; });
      if (kept.length !== tombs.users.length) {
        tombs.users = kept;
        setOrig(TOMB_KEY, JSON.stringify(tombs));
      }
    } catch (e) { /* never fatal */ }
  }

  // ---- B. pull the shared user list (read-only JSONP) ----
  function pullRemoteUsers(onDone) {
    var out = { users: null };
    var url = (getOrig('aetherion_sync_url') || '').trim();
    if (!url) { if (onDone) onDone(out); return; }
    var ns = (getOrig('aetherion_sync_namespace') || 'default').trim() || 'default';
    var sep = url.indexOf('?') >= 0 ? '&' : '?';
    var cb = 'boslg_cb_' + Date.now() + '_' + Math.floor(Math.random() * 9999);
    var script = null;
    var settled = false;
    function finish() {
      if (settled) return;
      settled = true;
      try { delete window[cb]; } catch (e) { window[cb] = undefined; }
      if (script && script.parentNode) script.parentNode.removeChild(script);
      if (onDone) onDone(out);
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
          out.users = valid;
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

  // ---- D. retry failed logins with a fresh pull ----
  function hookLogin() {
    var frame = document.getElementById('bos-frame');
    if (!frame) return;
    frame.addEventListener('load', function () {
      var attempts = 0;
      var timer = setInterval(function () {
        var w = null;
        try { w = frame.contentWindow; } catch (e) { w = null; }
        if (w && typeof w.handleLogin === 'function' && !w.__bos_lg_v2) {
          w.__bos_lg_v2 = true;
          clearInterval(timer);
          var orig = w.handleLogin;
          w.handleLogin = function () {
            orig();
            var failed = false;
            try {
              var errEl = w.document.getElementById('login-error');
              failed = !!(errEl && errEl.classList && errEl.classList.contains('visible'));
            } catch (e) {}
            if (!failed) return;
            // Login failed: pull the freshest shared list, then retry once.
            pullRemoteUsers(function (res) {
              cleanStaleUserTombstones(res && res.users);
              try {
                var errEl2 = w.document.getElementById('login-error');
                if (errEl2 && errEl2.classList) errEl2.classList.remove('visible');
              } catch (e) {}
              orig();
            });
          };
        }
        if (++attempts > 20) clearInterval(timer);
      }, 500);
    });
  }

  function boot() {
    blockDemoSeeds(); // before crm.html boots: no demo accounts anywhere
    var last = Number(getOrig(GUARANTEE_AT_KEY)) || 0;
    var needPull = readUsers().length === 0 || (Date.now() - last) > THROTTLE_MS;
    if (needPull) {
      pullRemoteUsers(function (res) {
        cleanStaleUserTombstones(res && res.users);
        setOrig(GUARANTEE_AT_KEY, String(Date.now()));
      });
    }
    hookLogin();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();