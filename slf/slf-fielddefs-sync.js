// ============================================================
// SLF Field-Definitions Sync — v1
// Owner order (2026-11-17): every user must see the same client
// profile info everywhere. Custom fields (Phone, E-Mail, DOB,
// SSN, Address, and anything the owner adds later) were stored
// under slf_crm.fielddefs.v1 / slf_crm.sections.v1 — keys the
// main SLF sync module does NOT sync. So field definitions only
// existed on the browser that created them, and every other
// device rendered a bare profile (Notes only).
//
// WHAT THIS MODULE DOES:
//  - Pulls the two definition keys from the same backend and
//    namespace as SLF CloudSync (user=slf-<ns>) and merges them
//    into local storage: union by id; on conflict the REMOTE
//    copy wins (the shared store is the source of truth).
//  - Pushes both keys whenever they change locally (debounced),
//    as its own small payload — the backend merges per-key, so
//    clients/cases/history are never touched by these pushes.
//  - Respects the SLF sync toggle (slf_crm.sync.enabled): while
//    sync is disabled, nothing leaves the device and no remote
//    data is applied.
//  - Polls like the main sync (60s) so edits propagate quickly.
//    A re-render is requested after any applied change.
// NOTE: field-definition DELETIONS do not propagate in v1 (no
// timestamps on definitions). Deleting a field removes it on
// this device; recreate-on-edit conflicts are prevented by
// remote-wins union. Owner-managed rare operation.
// ============================================================
(function () {
  'use strict';

  var DEFS_KEY = 'slf_crm.fielddefs.v1';
  var SECS_KEY = 'slf_crm.sections.v1';
  var ENABLE_KEY = 'slf_crm.sync.enabled';
  var TS_KEY = 'slf_crm.fielddefs.last_sync';
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

  function readArr(key) {
    try { var v = JSON.parse(_origGet(key) || '[]'); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  function writeArr(key, arr) { _origSet(key, JSON.stringify(arr)); }

  // Union by id; remote wins on conflict (shared store = truth).
  function unionRemoteWins(localArr, remoteArr) {
    var map = {};
    localArr.forEach(function (r) { if (r && r.id) map[String(r.id)] = r; });
    remoteArr.forEach(function (r) { if (r && r.id) map[String(r.id)] = r; });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function applyRemotePair(defsRemote, secsRemote) {
    var changed = false;
    if (Array.isArray(defsRemote) && defsRemote.length) {
      var mergedDefs = unionRemoteWins(readArr(DEFS_KEY), defsRemote);
      var defsStr = JSON.stringify(mergedDefs);
      if (defsStr !== _origGet(DEFS_KEY)) {
        _writing = true;
        try { _origSet(DEFS_KEY, defsStr); } finally { _writing = false; }
        changed = true;
      }
    }
    if (Array.isArray(secsRemote) && secsRemote.length) {
      var mergedSecs = unionRemoteWins(readArr(SECS_KEY), secsRemote);
      var secsStr = JSON.stringify(mergedSecs);
      if (secsStr !== _origGet(SECS_KEY)) {
        _writing = true;
        try { _origSet(SECS_KEY, secsStr); } finally { _writing = false; }
        changed = true;
      }
    }
    return changed;
  }

  function reRender() {
    if (window.SLF && typeof window.SLF.init === 'function') {
      try { window.SLF.init(); } catch (e) {}
    }
  }

  // ---- push (small per-key payload; backend merges, never replaces) ----
  function pushNow() {
    if (!isEnabled()) return;
    var url = getUrl();
    if (!url) return;
    if (_inFlight) return;
    _inFlight = true;
    var payload = {};
    payload[DEFS_KEY] = _origGet(DEFS_KEY) || '[]';
    payload[SECS_KEY] = _origGet(SECS_KEY) || '[]';
    payload[TS_KEY] = Date.now().toString();
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
    var cb = 'slffds_cb_' + Date.now();
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
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          var d = data[DEFS_KEY], s = data[SECS_KEY];
          var dArr = (typeof d === 'string') ? JSON.parse(d) : d;
          var sArr = (typeof s === 'string') ? JSON.parse(s) : s;
          if (applyRemotePair(dArr, sArr)) reRender();
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

  // ---- hook local writes on the two keys ----
  localStorage.setItem = function (key, value) {
    _origSet(key, value);
    if (_writing) return;
    if (key !== DEFS_KEY && key !== SECS_KEY) return;
    if (!isEnabled()) return;
    schedulePush();
  };

  // ---- lifecycle ----
  function start() {
    pullOnce();
    if (_poll === null) _poll = setInterval(pullOnce, POLL_MS);
  }
  function stop() {
    if (_poll !== null) { clearInterval(_poll); _poll = null; }
    clearTimeout(_debounce);
  }
  function boot() {
    if (isEnabled()) start();
    // follow the toggle if the user flips it later
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && isEnabled() && _poll === null) start();
    });
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

  window.SLFFieldDefsSync = { push: pushNow, pull: pullOnce };
})();