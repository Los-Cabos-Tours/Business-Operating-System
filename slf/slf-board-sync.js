// ============================================================
// SLF Client-Board Data Sync — v1
// Owner order (2026-11-17): ALL info in the system must be
// shared so every user on every device sees the same data.
//
// ROOT CAUSE (verified by audit): every client-board tab record
// (History, Calls, Emails, Notes, Docs, Tasks, Loans, Bank
// Accounts, Credit Cards, Debts, Events, SMS, E-Marketing,
// Servicing, Lenders) is stored under ONE localStorage key:
// slf_crm.clientboard.v1 — and the SLF CloudSync module does
// NOT include that key. So board notes and records only ever
// existed on the browser that typed them. Same class of bug as
// the field definitions (fixed by slf-fielddefs-sync.js).
//
// STRUCTURE: { "<clientId>": { "<tab>": [ { id, ts, ... } ] } }
// Board records carry id ("b_...") and ts (ISO string).
//
// MERGE RULE: per client, per tab — union by record id; when
// the same id exists on both sides the NEWER ts wins. A record
// missing locally is adopted. Local data is never dropped.
// DELETIONS do not propagate in v1 (removeItem filters by id on
// the local device only) — noted honestly; additions and edits
// propagate everywhere.
// ============================================================
(function () {
  'use strict';

  var BOARD_KEY = 'slf_crm.clientboard.v1';
  var ENABLE_KEY = 'slf_crm.sync.enabled';
  var BOOT_PUSH_AT_KEY = 'slf_crm.clientboard.boot_push_at';
  var BOOT_PUSH_THROTTLE_MS = 24 * 60 * 60 * 1000;
  var POLL_MS = 60000;
  var DEBOUNCE_MS = 2000;
  var PULL_TIMEOUT_MS = 8000;

  var _origSet = localStorage.setItem.bind(localStorage);
  var _origGet = localStorage.getItem.bind(localStorage);
  var _writing = false;
  var _debounce = null;
  var _poll = null;
  var _inFlight = false;

  function getUrl() { return (_origGet('aetherion_sync_url') || '').trim(); }
  function getNamespace() {
    var ns = (_origGet('aetherion_sync_namespace') || 'default').trim() || 'default';
    return 'slf-' + ns;
  }
  function isEnabled() { return _origGet(ENABLE_KEY) === 'true'; }

  function readBoard() {
    try { var v = JSON.parse(_origGet(BOARD_KEY) || '{}'); return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}; }
    catch (e) { return {}; }
  }
  function tsOf(r) { return Date.parse(r && r.ts) || 0; }

  // merge remote board into local: per client per tab, id union, newer ts wins
  function mergeBoard(local, remote) {
    var out = {};
    Object.keys(local).forEach(function (cid) { out[cid] = local[cid] || {}; });
    Object.keys(remote).forEach(function (cid) {
      if (!out[cid]) { out[cid] = {}; return; }
      var rTabs = remote[cid] || {};
      Object.keys(rTabs).forEach(function (tab) {
        var remoteArr = rTabs[tab];
        if (!Array.isArray(remoteArr)) return;
        var localArr = (out[cid] && Array.isArray(out[cid][tab])) ? out[cid][tab] : [];
        var map = {};
        localArr.forEach(function (r) { if (r && r.id) map[r.id] = r; });
        remoteArr.forEach(function (r) {
          if (!r || !r.id) return;
          var ex = map[r.id];
          if (!ex || tsOf(r) > tsOf(ex)) map[r.id] = r;
        });
        out[cid][tab] = Object.keys(map).map(function (k) { return map[k]; });
      });
    });
    return out;
  }

  function applyRemote(remote) {
    if (!remote || typeof remote !== 'object' || Array.isArray(remote)) return false;
    var merged = mergeBoard(readBoard(), remote);
    var mergedStr = JSON.stringify(merged);
    if (mergedStr !== _origGet(BOARD_KEY)) {
      _writing = true;
      try { _origSet(BOARD_KEY, mergedStr); } finally { _writing = false; }
      return true;
    }
    return false;
  }

  function reRender() {
    if (window.SLFBoard && typeof window.SLFBoard.render === 'function') {
      try { window.SLFBoard.render(); } catch (e) {}
    }
  }

  // ---- push (single small payload; backend merges per-key) ----
  function pushNow() {
    if (!isEnabled()) return;
    var url = getUrl();
    if (!url) return;
    if (_inFlight) return;
    _inFlight = true;
    var payload = {};
    payload[BOARD_KEY] = _origGet(BOARD_KEY) || '{}';
    payload['slf_crm.clientboard.last_sync'] = Date.now().toString();
    var target = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'user=' + encodeURIComponent(getNamespace());
    fetch(target, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(payload)
    }).catch(function () {}).finally(function () { _inFlight = false; });
  }
  function schedulePush() {
    clearTimeout(_debounce);
    _debounce = setTimeout(pushNow, DEBOUNCE_MS);
  }

  // ---- pull (JSONP, same transport as SLF CloudSync) ----
  function pullOnce() {
    if (!isEnabled()) return;
    var url = getUrl();
    if (!url) return;
    var cb = 'slfbs_cb_' + Date.now();
    var script = null;
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      try { delete window[cb]; } catch (e) { window[cb] = undefined; }
      if (script && script.parentNode) script.parentNode.removeChild(script);
    }
    window[cb] = function (data) {
      try {
        if (data && typeof data === 'object' && !Array.isArray(data) && data[BOARD_KEY] !== undefined) {
          var remote = (typeof data[BOARD_KEY] === 'string') ? JSON.parse(data[BOARD_KEY]) : data[BOARD_KEY];
          if (applyRemote(remote)) reRender();
        }
      } catch (e) { /* bad payload: ignore */ }
      finish();
    };
    script = document.createElement('script');
    script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'user=' + encodeURIComponent(getNamespace()) + '&callback=' + cb;
    script.onerror = function () { finish(); };
    document.head.appendChild(script);
    setTimeout(finish, PULL_TIMEOUT_MS);
  }

  // ---- hook local writes on the board key ----
  localStorage.setItem = function (key, value) {
    _origSet(key, value);
    if (_writing) return;
    if (key !== BOARD_KEY) return;
    if (!isEnabled()) return;
    schedulePush();
  };

  // ---- lifecycle ----
  function start() {
    // Boot push: the device holding board records must upload
    // them (throttled once per day) so other devices receive them.
    var lastPush = Number(_origGet(BOOT_PUSH_AT_KEY)) || 0;
    var hasLocal = Object.keys(readBoard()).length > 0;
    if (hasLocal && Date.now() - lastPush > BOOT_PUSH_THROTTLE_MS) {
      pushNow();
      _origSet(BOOT_PUSH_AT_KEY, String(Date.now()));
    }
    pullOnce();
    if (_poll === null) _poll = setInterval(pullOnce, POLL_MS);
  }
  function stop() {
    if (_poll !== null) { clearInterval(_poll); _poll = null; }
    clearTimeout(_debounce);
  }
  function boot() {
    if (isEnabled()) start();
    var prev = isEnabled();
    setInterval(function () {
      var now = isEnabled();
      if (now !== prev) { prev = now; if (now) start(); else stop(); }
    }, 1000);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.SLFBoardSync = { push: pushNow, pull: pullOnce };
})();