// ============================================================
// BOS Boot Sync — v2
// Owner order (2026-11-16): all info in the system must be saved
// in the Google Apps Script backend and every user, on any
// device, must be able to view it.
//
// NEW in v2 (owner order 2026-11-17): one-time URL migration.
// The old backend deployment
// (AKfycbwnKUCCXJrgkzLU1z665lDnnU1B6voYeuvdU9INNmWfXgeHPsJAapGUNR9yEafoLlJY)
// is DEAD and must never receive data again. Any browser that
// still has it stored gets silently migrated to the owner's
// current deployment. No paste, no settings screen.
//
// v2.1 (owner order 2026-11-17): the SLF boot pull now also
// carries the custom field definitions (slf_crm.fielddefs.v1),
// sections (slf_crm.sections.v1), and the client board data
// (slf_crm.clientboard.v1 — notes, calls, emails, docs, tasks,
// loans, bank, cards, debts, events, sms, emarketing, servicing,
// lenders), so a fresh device shows the full picture from the
// very first open.
//
// GAPS THIS CLOSES (kept from v1):
//  1. SLF loan-data sync is opt-in PER DEVICE. Now: enabled
//     automatically on every device (one shared backend, all
//     data shared with all users).
//  2. Main BOS data had no guaranteed boot pull. Now: at load,
//     both namespaces (main + slf-) are pulled from the
//     configured backend and merged.
//
// MERGE SAFETY (never destroys local data):
//  - A key missing locally is filled from remote.
//  - A key that exists locally as an array of records is merged
//    last-write-wins by updatedAt.
//  - Any other existing local value is kept; remote cannot
//    clobber it.
//  - Remote payloads that fail shape checks are discarded.
//
// NO NEW WRITE PATH: pushes still happen through the existing
// CloudSync / SLFSync modules. This module only reads (GET),
// sets the opt-in flag, and migrates the dead URL.
// ============================================================
(function () {
  'use strict';

  var VERSION = 2;
  var SLF_ENABLE_KEY = 'slf_crm.sync.enabled';
  var PULL_STATE_KEY = 'aetherion_boot_sync_at';
  var MIGRATION_DONE_KEY = 'aetherion_url_migrated_v2';
  var DEAD_OLD_URL_ID = 'AKfycbwnKUCCXJrgkzLU1z665lDnnU1B6voYeuvdU9INNmWfXgeHPsJAapGUNR9yEafoLlJY';
  var NEW_URL = 'https://script.google.com/macros/s/AKfycbzHByvYoZMkU0n43bnqKw7ZC8SCCdEcF-ojeEStw6jAbwnvasoY3dsCGSBp-XxIzxhy/exec';
  var PULL_TIMEOUT_MS = 8000;
  var MAX_STALE_MS = 1000 * 60 * 5; // boot-pull at most every 5 min

  var SLF_KEYS = ['slf_crm.clients.v1', 'slf_crm.cases.v1', 'slf_crm.history.v1', 'slf_crm.counter.v1', 'slf_crm.tombstones.v1', 'slf_crm.fielddefs.v1', 'slf_crm.sections.v1', 'slf_crm.clientboard.v1'];
  var BOS_KEYS = ['aetherion_guests', 'aetherion_bookings', 'aetherion_tasks', 'aetherion_operators', 'aetherion_resorts', 'aetherion_settings', 'aetherion_users', 'aetherion_webleads', 'aetherion_activitylog', 'aetherion_tombstones'];

  function getOrig(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function setOrig(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* never fatal */ } }

  function getUrl() { return (getOrig('aetherion_sync_url') || '').trim(); }
  function getNamespace() {
    return (getOrig('aetherion_sync_namespace') || 'default').trim() || 'default';
  }
  function isFirebase(u) { return u.indexOf('firebaseio.com') !== -1; }

  // ---- one-time migration of the dead old backend URL ----
  function migrateDeadUrl() {
    try {
      if (getOrig(MIGRATION_DONE_KEY) === 'true') return;
      var stored = getOrig('aetherion_sync_url') || '';
      var changed = false;
      if (stored && stored.indexOf(DEAD_OLD_URL_ID) !== -1) {
        setOrig('aetherion_sync_url', NEW_URL);
        changed = true;
      }
      // Dead-list safety: the dead old URL goes ON the dead list,
      // and the new URL must NOT be on it (senders silently
      // refuse dead-listed URLs).
      var list = [];
      try { list = JSON.parse(getOrig('aetherion_dead_backends') || '[]'); } catch (e) { list = []; }
      if (!Array.isArray(list)) list = [];
      if (list.indexOf(DEAD_OLD_URL_ID) === -1) {
        list.push(DEAD_OLD_URL_ID);
        setOrig('aetherion_dead_backends', JSON.stringify(list));
      }
      if (list.some(function (u) { return u && NEW_URL.indexOf(u) !== -1; })) {
        list = list.filter(function (u) { return !(u && NEW_URL.indexOf(u) !== -1); });
        setOrig('aetherion_dead_backends', JSON.stringify(list));
      }
      if (changed) setOrig(PULL_STATE_KEY, '0'); // force a fresh boot pull from the new backend
      setOrig(MIGRATION_DONE_KEY, 'true');
    } catch (e) { /* migration must never break the boot */ }
  }

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

    // Objects: union-safe — keep local unless local is missing;
    // remote fills gaps per key. For the client board this unions
    // client entries so records from other devices are adopted.
    if (parsed && typeof parsed === 'object' && local && typeof local === 'object'
        && !Array.isArray(parsed) && !Array.isArray(local)) {
      var merged = {};
      // for the board key, deep-merge arrays per tab by record id
      if (key === 'slf_crm.clientboard.v1') {
        Object.keys(local).forEach(function (k) { merged[k] = local[k]; });
        Object.keys(parsed).forEach(function (cid) {
          if (!merged[cid]) { merged[cid] = parsed[cid]; return; }
          var lt = merged[cid] || {}, rt = parsed[cid] || {};
          Object.keys(rt).forEach(function (tab) {
            var rArr = rt[tab];
            if (!Array.isArray(rArr)) return;
            var lArr = Array.isArray(lt[tab]) ? lt[tab] : [];
            var map = {};
            lArr.forEach(function (r) { if (r && r.id) map[r.id] = r; });
            rArr.forEach(function (r) {
              if (!r || !r.id) return;
              var ex = map[r.id];
              var rTs = Date.parse(r.ts) || 0, lTs = ex ? (Date.parse(ex.ts) || 0) : 0;
              if (!ex || rTs > lTs) map[r.id] = r;
            });
            lt[tab] = Object.keys(map).map(function (k) { return map[k]; });
          });
          merged[cid] = lt;
        });
      } else {
        Object.keys(parsed).forEach(function (k) { merged[k] = parsed[k]; });
        Object.keys(local).forEach(function (k) { if (merged[k] === undefined) merged[k] = local[k]; });
      }
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
    migrateDeadUrl(); // one-time: dead old backend -> current deployment

    var url = getOrig('aetherion_sync_url') || '';
    url = url.trim();
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