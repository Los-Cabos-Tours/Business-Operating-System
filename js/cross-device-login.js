// ============================================================
// BOS Cross-Device Login — v1
// Owner order (2026-11-16): "anyone with their log in can log
// in to the system from any computer or device."
//
// ROOT CAUSE: user accounts live in localStorage under
// 'aetherion_users' — per-device, per-browser-profile storage.
// A new device/browser has NO users in storage, so every login
// attempt fails there. Accounts never travel.
//
// FIX (this file only — crm.html's login code is NOT modified):
// Before the login check runs, hydrate 'aetherion_users' from
// the same cloud-sync backend already configured for this
// system (aetherion_sync_url + aetherion_sync_namespace, Apps
// Script or Firebase — identical mechanism to CloudSync and
// SLF CloudSync). The login overlay stays visible while we
// fetch; users merge last-write-wins by updatedAt; the login
// form re-checks after hydration. Local accounts are never
// overwritten by stale remote data. If no backend is
// configured or fetch fails, behavior is unchanged (local
// accounts still work — device just won't receive the shared
// list until sync is configured).
//
// SAFETY:
//  - Read-only on the sync backend (GET only).
//  - Remote shape validated: must be an array of objects with
//    username + password; anything else is discarded, local
//    data untouched.
//  - Local-only users the owner creates on this device are
//    pushed via the EXISTING CloudSync path on next save (no
//    new write logic here).
// ============================================================
(function () {
  'use strict';

  var USERS_KEY = 'aetherion_users';
  var PULL_STATE_KEY = 'aetherion_login_hydrated_at';
  var PULL_TIMEOUT_MS = 8000;
  var MAX_STALE_MS = 1000 * 60 * 60 * 24; // re-pull once per day max

  function getOrig(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function setOrig(key, val) {
    try { localStorage.setItem(key, String(val)); } catch (e) { /* never fatal */ }
  }
  function getUrl() { return (getOrig('aetherion_sync_url') || '').trim(); }
  function getNamespace() {
    return (getOrig('aetherion_sync_namespace') || 'default').trim() || 'default';
  }
  function isFirebase(u) { return u.indexOf('firebaseio.com') !== -1; }

  function validUserShape(arr) {
    if (!Array.isArray(arr)) return null;
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var u = arr[i];
      if (!u || typeof u !== 'object') continue;
      if (typeof u.username !== 'string' || !u.username) continue;
      if (typeof u.password !== 'string' || !u.password) continue;
      out.push(u);
    }
    return out;
  }

  function mergeUsers(localRaw, remoteArr) {
    // Last-write-wins by updatedAt (same conflict model as CloudSync).
    var local = [];
    try { local = JSON.parse(localRaw || '[]'); } catch (e) { local = []; }
    if (!Array.isArray(local)) local = [];
    var map = {};
    local.forEach(function (u) {
      if (u && u.username) map[u.username] = u;
    });
    remoteArr.forEach(function (u) {
      var existing = map[u.username];
      if (!existing || (Number(u.updatedAt) || 0) > (Number(existing.updatedAt) || 0)) {
        map[u.username] = u;
      }
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function applyRemoteUsers(remote) {
    // Accept either the raw array or { aetherion_users: [...] } wrapper.
    var arr = null;
    if (Array.isArray(remote)) {
      arr = validUserShape(remote);
    } else if (remote && typeof remote === 'object' && Array.isArray(remote[USERS_KEY])) {
      arr = validUserShape(remote[USERS_KEY]);
    }
    if (arr === null || arr.length === 0) return false;
    var merged = mergeUsers(getOrig(USERS_KEY), arr);
    if (merged.length === 0) return false;
    setOrig(USERS_KEY, JSON.stringify(merged));
    return true;
  }

  function pullFirebase(url) {
    return fetch(url.replace(/\/$/, '') + '/' + encodeURIComponent(getNamespace()) + '/aetherion_users.json', {
      method: 'GET'
    }).then(function (r) {
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    }).then(function (data) {
      applyRemoteUsers(data);
    });
  }

  function pullAppsScript(url) {
    // Apps Script GET with JSONP callback — identical technique to
    // main BOS CloudSync pull. Read-only.
    return new Promise(function (resolve) {
      var cb = 'boslogin_cb_' + Date.now();
      var script = null;
      var settled = false;
      function finish(ok) {
        if (settled) return;
        settled = true;
        try { delete window[cb]; } catch (e) { window[cb] = undefined; }
        if (script && script.parentNode) script.parentNode.removeChild(script);
        resolve();
      }
      window[cb] = function (data) {
        try { applyRemoteUsers(data); } catch (e) { /* bad payload: ignore */ }
        finish(true);
      };
      script = document.createElement('script');
      var sep = url.indexOf('?') >= 0 ? '&' : '?';
      script.src = url + sep + 'user=' + encodeURIComponent(getNamespace()) + '&callback=' + cb;
      script.onerror = function () { finish(false); };
      document.head.appendChild(script);
      setTimeout(function () { finish(false); }, PULL_TIMEOUT_MS);
    });
  }

  function hydrateOnce() {
    var url = getUrl();
    if (!url) return; // no backend configured: local logins still work
    var last = Number(getOrig(PULL_STATE_KEY)) || 0;
    if (Date.now() - last < MAX_STALE_MS) return; // pulled recently: skip
    var done = isFirebase(url) ? pullFirebase(url) : pullAppsScript(url);
    Promise.resolve(done).then(function () {
      setOrig(PULL_STATE_KEY, String(Date.now()));
    }).catch(function () { /* offline: try again next day */ });
  }

  function start() {
    hydrateOnce();
    // After hydration lands (or times out), re-check the login overlay:
    // if the page is still showing it, nothing to do — the login form
    // reads aetherion_users on every submit, so the merged list is used
    // automatically on the next attempt. No DOM patching of crm.html.
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
