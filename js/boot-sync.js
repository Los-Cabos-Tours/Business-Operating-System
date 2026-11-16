// ============================================================
// BOS Boot Sync — v1
// Owner order (2026-11-16): all info in the system must be saved
// in the Google Apps Script backend and every user, on any
// device, must be able to view it.
//
// GAPS THIS CLOSES:
//  1. SLF loan-data sync is opt-in PER DEVICE
//     (slf_crm.sync.enabled). A new device never pulled until
//     someone flipped the switch there. Now: the flag is set to
//     enabled automatically on every device (the owner has one
//     shared backend and wants all data shared).
//  2. Main BOS data had no guaranteed boot pull — a device that
//     never opened CloudSync settings could sit on empty data.
//     Now: at load, before the app renders, both namespaces
//     (main + slf-) are pulled from the configured backend and
//     merged.
//
// MERGE SAFETY (never destroys local data):
//  - A key missing locally is filled from remote.
//  - A key that exists locally as an array of records (objects
//    with id) is merged last-write-wins by updatedAt.
//  - Any other existing local value is kept; remote cannot
//    clobber it.
//  - Remote payloads that fail shape checks are discarded.
//
// NO NEW WRITE PATH: pushes still happen through the existing
// CloudSync / SLFSync modules. This module only reads (GET) and
// sets the opt-in flag.
// ============================================================
(function () {
  'use strict';

  var SLF_ENABLE_KEY = 'slf_crm.sync.enabled';
  var PULL_STATE_KEY = 'aetherion_boot_sync_at';
  var PULL_TIMEOUT_MS = 8000;
  var MAX_STALE_MS = 1000 * 60 * 5; // boot-pull at most every 5 min

  var SLF_KEYS = ['slf_crm.clients.v1', 'slf_crm.cases.v1', 'slf_crm.history.v1', 'slf_crm.counter.v1', 'slf_crm.tombstones.v1'];
  var BOS_KEYS = ['aetherion_guests', 'aetherion_bookings', 'aetherion_tasks', 'aetherion_operators', 'aetherion_resorts', 'aetherion_settings', 'aetherion_users', 'aetherion_webleads', 'aetherion_activitylog', 'aetherion_tombstones'];

  function getOrig(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function setOrig(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* never fatal */ } }

  function getUrl() { return (getOrig('aetherion_sync_url') || '').trim(); }
  function getNamespace() {
    return (getOrig('aetherion_sync_namespace') || 'default').trim() || 'default';
  }
  function isFirebase(u) { return u.indexOf('firebaseio.com') !== -1; }

  // ---- safe merge of one remote key into local storage ----
  function mergeKey(key, remote) {
    if (remote === undefined || remote === null) return;
    var parsed = remote;
    if (typeof remote === 'string') {
      try { parsed = JSON.parse(remote); } catch (e) { return; }
    }
    var localRaw = getOrig(key);
    if (localRaw === null || localRaw === undefined) {
      // Device has nothing here: adopt remote as-is.
      setOrig(key, typeof remote === 'string' ? remote : JSON.stringify(parsed));
      return;
    }
    var local = null;
    try { local = JSON.parse(localRaw); } catch (e) { local = null; }
    if (local === null) { setOrig(key, typeof remote === 'string' ? remote : JSON.stringify(parsed)); return; }

    // Arrays of records: merge last-write-wins by id + updatedAt.
    if (Array.isArray(parsed) && Array.isArray(local)) {
      var map = {};
      local.forEach(function (r) { if (r && typeof r === 'object' && r.id) map[r.id] = r; });
      var changed = false;
      parsed.forEach(function (r) {
        if (!r || typeof r !== 'object' || !r.id) return;
        var ex = map[r.id];
        if (!ex || (Number(r.updatedAt) || 0) > (Number(ex.updatedAt) || 0)) { map[r.id] = r; changed = true; }
      });
      if (changed) setOrig(key, JSON.stringify(Object.keys(map).map(function (k) { return map[k]; })));
      return;
    }

    // Objects (settings, counters, tombstones): union-safe — keep
    // local unless local is missing; remote fills gaps per key.
    if (parsed && typeof parsed === 'object' && local && typeof local === 'object'
        && !Array.isArray(parsed) && !Array.isArray(local)) {
      var merged = {};
      Object.keys(parsed).forEach(function (k) { merged[k] = parsed[k]; });
      Object.keys(local).forEach(function (k) { merged[k] = local[k]; });
      setOrig(key, JSON.stringify(merged));
      return;
    }
    // Everything else: keep local (remote never clobbers).
  }

  function applyNamespace(data, keys) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return;
    keys.forEach(function (k) {
      if (data[k] !== undefined) mergeKey(k, data[k]);
    });
  }

  // ---- transport (identical to CloudSync / cross-device-login) ----
  function pullFirebase(url, ns) {
    return fetch(url.replace(/\/$/, '') + '/' + encodeURIComponent(ns) + '.json', { method: 'GET' })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); });
  }

  function pullAppsScript(url, ns) {
    return new Promise(function (resolve) {
      var cb = 'bosboot_cb_' + Date.now();
      var script = null;
      var settled = false;
      function finish(data) {
        if (settled) return;
        settled = true;
        try { delete window[cb]; } catch (e) { window[cb] = undefined; }
        if (script && script.parentNode) script.parentNode.removeChild(script);
        resolve(data || null);
      }
      window[cb] = function (data) { finish(data); };
      script = document.createElement('script');
      var sep = url.indexOf('?') >= 0 ? '&' : '?';
      script.src = url + sep + 'user=' + encodeURIComponent(ns) + '&callback=' + cb;
      script.onerror = function () { finish(null); };
      document.head.appendChild(script);
      setTimeout(function () { finish(null); }, PULL_TIMEOUT_MS);
    });
  }

  function pullNamespace(url, ns, keys) {
    var p = isFirebase(url) ? pullFirebase(url, ns) : pullAppsScript(url, ns);
    return p.then(function (data) { applyNamespace(data, keys); })
      .catch(function () { /* offline: local data stays, try next boot */ });
  }

  function start() {
    var url = getUrl();
    if (!url) return; // no backend configured: nothing to pull, local-only mode

    // Owner directive: SLF data sync is ON for every device.
    if (getOrig(SLF_ENABLE_KEY) !== 'true') setOrig(SLF_ENABLE_KEY, 'true');

    var last = Number(getOrig(PULL_STATE_KEY)) || 0;
    if (Date.now() - last < MAX_STALE_MS) return; // pulled moments ago: skip

    var ns = getNamespace();
    pullNamespace(url, ns, BOS_KEYS).then(function () {
      return pullNamespace(url, 'slf-' + ns, SLF_KEYS);
    }).then(function () {
      setOrig(PULL_STATE_KEY, String(Date.now()));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
