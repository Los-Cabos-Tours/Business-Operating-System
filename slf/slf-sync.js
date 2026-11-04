// ============================================================
// SLF CloudSync — Phase 1, Task 1
// Synchronizes slf_crm.* storage keys to the same sync backend
// as the main BOS (Google Apps Script or Firebase), under a
// SEPARATE namespace (slf-<namespace>) so SLF and main BOS data
// can never mix.
//
// Design decisions (documented for independent review):
//  - OFF by default. No customer data is transmitted until the
//    operator opts in from the SLF UI. Reason: the main BOS sync
//    endpoint identifies datasets by a URL query parameter
//    (user=<ns>), which is NOT access control. Opt-in is the
//    smallest safe behavior for sensitive loan data.
//  - Local-first: sync failures never block or lose local writes.
//  - Merge: last-write-wins by record updatedAt (same conflict
//    model as main BOS CloudSync). Deleted record IDs are kept in
//    tombstones and are never resurrected.
//  - Remote payloads are validated before merge: wrong shape or
//    non-array values for array keys => pull discarded, local
//    data untouched.
//  - Never logs record contents — only counts and IDs.
// ============================================================
var SLFSync = (function () {
  'use strict';

  var KEYS = ['slf_crm.clients.v1', 'slf_crm.cases.v1', 'slf_crm.history.v1', 'slf_crm.counter.v1'];
  var MERGE_KEYS = { 'slf_crm.clients.v1': 'clients', 'slf_crm.cases.v1': 'cases' };
  var TOMB_KEY = 'slf_crm.tombstones.v1';
  var ENABLE_KEY = 'slf_crm.sync.enabled';
  var POLL_MS = 60000;
  var DEBOUNCE_MS = 2000;

  var _origSet = localStorage.setItem.bind(localStorage);
  var _origGet = localStorage.getItem.bind(localStorage);
  var _writing = false;
  var _pollTimer = null;
  var _debounceTimer = null;
  var _pushInFlight = false;

  // ---- configuration (mirrors main BOS keys, slf-prefixed ns) ----
  function getUrl() { return (_origGet('aetherion_sync_url') || '').trim(); }
  function getNamespace() {
    var ns = (_origGet('aetherion_sync_namespace') || 'default').trim() || 'default';
    return 'slf-' + ns;
  }
  function isEnabled() { return _origGet(ENABLE_KEY) === 'true'; }
  function isFirebase(u) { return u.indexOf('firebaseio.com') !== -1; }

  // ---- status chip ----
  function setChip(state, label) {
    var c = document.getElementById('slf-sync-chip');
    if (!c) return;
    var txt;
    if (state === 'syncing') { c.className = 'slf-sync-chip busy'; txt = 'Syncing...'; }
    else if (state === 'synced') {
      c.className = 'slf-sync-chip ok';
      txt = 'Synced ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    else if (state === 'error') { c.className = 'slf-sync-chip err'; txt = label || 'Sync Error'; }
    else { c.className = 'slf-sync-chip off'; txt = label || 'Local Only'; }
    c.textContent = txt;
  }

  // ---- tombstones ----
  function getTombs() {
    try { return JSON.parse(_origGet(TOMB_KEY) || '{}'); } catch (e) { return {}; }
  }
  function setTombs(t) { _origSet(TOMB_KEY, JSON.stringify(t)); }

  // Record IDs removed from a saved array so other devices'
  // pushes cannot resurrect intentionally deleted records.
  function trackDeletions(key, newValue) {
    try {
      var type = MERGE_KEYS[key];
      if (!type) return;
      var oldRaw = _origGet(key);
      if (!oldRaw) return;
      var oldArr = JSON.parse(oldRaw);
      var newArr = JSON.parse(newValue || '[]');
      if (!Array.isArray(oldArr) || !Array.isArray(newArr)) return;
      var newIds = {};
      newArr.forEach(function (item) { if (item && item.id) newIds[item.id] = true; });
      var removed = oldArr.filter(function (item) { return item && item.id && !newIds[item.id]; });
      if (!removed.length) return;
      var tombs = getTombs();
      if (!Array.isArray(tombs[type])) tombs[type] = [];
      removed.forEach(function (item) {
        if (tombs[type].indexOf(item.id) === -1) tombs[type].push(item.id);
      });
      setTombs(tombs);
    } catch (e) { /* deletion tracking must never throw */ }
  }

  // Merge two id-keyed arrays, last-write-wins by updatedAt,
  // excluding tombstoned ids on both sides.
  function mergeArr(localArr, remoteArr, tombList) {
    var tombSet = {};
    (tombList || []).forEach(function (id) { tombSet[id] = true; });
    var map = {};
    localArr.forEach(function (item) {
      if (item && item.id && !tombSet[item.id]) map[item.id] = item;
    });
    remoteArr.forEach(function (item) {
      if (!item || !item.id || tombSet[item.id]) return;
      var local = map[item.id];
      if (!local || (Number(item.updatedAt) || 0) > (Number(local.updatedAt) || 0)) {
        map[item.id] = item;
      }
    });
    return Object.keys(map).map(function (id) { return map[id]; });
  }

  // History: union by ts+action signature, newest first, cap 500.
  function mergeHistory(localStr, remoteStr) {
    var local = [], remote = [];
    try { local = JSON.parse(localStr || '[]'); } catch (e) {}
    try { remote = JSON.parse(remoteStr || '[]'); } catch (e) {}
    if (!Array.isArray(local)) local = [];
    if (!Array.isArray(remote)) remote = [];
    var map = {};
    local.forEach(function (e) { if (e && e.ts) map[e.ts + '|' + (e.action || '')] = e; });
    remote.forEach(function (e) { if (e && e.ts && !map[e.ts + '|' + (e.action || '')]) map[e.ts + '|' + (e.action || '')] = e; });
    var merged = Object.keys(map).map(function (k) { return map[k]; });
    merged.sort(function (a, b) { return new Date(b.ts || 0) - new Date(a.ts || 0); });
    if (merged.length > 500) merged = merged.slice(0, 500);
    return merged;
  }

  // Counters: max per kind so id sequences never collide across devices.
  function mergeCounter(localStr, remoteStr) {
    var local = {}, remote = {};
    try { local = JSON.parse(localStr || '{}'); } catch (e) { local = {}; }
    try { remote = JSON.parse(remoteStr || '{}'); } catch (e) { remote = {}; }
    var out = {};
    ['client', 'case'].forEach(function (k) {
      out[k] = Math.max(Number(local[k]) || 0, Number(remote[k]) || 0);
    });
    return out;
  }

  // Merge tombstones: union of deleted ids from all devices.
  function mergeTombs(localStr, remoteStr) {
    var local = getTombs(), remote = {};
    try { remote = JSON.parse(remoteStr || '{}'); } catch (e) { remote = {}; }
    var result = {};
    ['clients', 'cases'].forEach(function (type) {
      var combined = {};
      (local[type] || []).forEach(function (id) { combined[id] = true; });
      (remote[type] || []).forEach(function (id) { combined[id] = true; });
      result[type] = Object.keys(combined);
    });
    return result;
  }

  // ---- hook local writes (same technique as main BOS CloudSync) ----
  localStorage.setItem = function (key, value) {
    _origSet(key, value);
    if (_writing) return;
    if (KEYS.indexOf(key) === -1) return;
    if (!isEnabled()) return;
    trackDeletions(key, value);
    schedulePush();
  };

  // ---- push ----
  function pushNow() {
    if (!isEnabled()) return;
    var rawUrl = getUrl();
    if (!rawUrl) { setChip('off', 'Local Only (no sync URL)'); return; }
    if (_pushInFlight) return; // no duplicate in-flight pushes
    _pushInFlight = true;
    setChip('syncing');
    var ts = Date.now().toString();
    var payload = { slf_last_updated: ts };
    KEYS.forEach(function (k) { var v = _origGet(k); if (v != null) payload[k] = v; });
    var done = function () {
      _pushInFlight = false;
      setChip('synced');
      _origSet('slf_crm.sync.last_push', ts);
    };
    var fail = function () {
      _pushInFlight = false;
      setChip('error', 'Sync Error (push)');
    };
    if (isFirebase(rawUrl)) {
      var ns = encodeURIComponent(getNamespace().replace(/^slf-/, ''));
      var fbUrl = rawUrl.replace(/\/$/, '') + '/slf_' + ns + '.json';
      var fbPayload = {};
      KEYS.forEach(function (k) { var v = payload[k]; if (v != null) fbPayload[k] = JSON.parse(v); });
      fbPayload._ts = parseInt(ts, 10);
      fetch(fbUrl, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fbPayload) })
        .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); done(); })
        .catch(fail);
      return;
    }
    // Apps Script: no-cors POST; endpoint reads e.postData.contents and
    // stores raw strings under the user namespace — format identical to main BOS.
    var target = rawUrl + (rawUrl.indexOf('?') >= 0 ? '&' : '?') + 'user=' + encodeURIComponent(getNamespace());
    fetch(target, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(payload) })
      .then(done)
      .catch(fail);
  }

  function schedulePush() {
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(pushNow, DEBOUNCE_MS);
  }

  // ---- pull ----
  function pullOnce() {
    if (!isEnabled()) return;
    var rawUrl = getUrl();
    if (!rawUrl) { setChip('off', 'Local Only (no sync URL)'); return; }
    setChip('syncing');
    if (isFirebase(rawUrl)) {
      var ns = encodeURIComponent(getNamespace().replace(/^slf-/, ''));
      fetch(rawUrl.replace(/\/$/, '') + '/slf_' + ns + '.json')
        .then(function (r) { return r.json(); })
        .then(function (data) { applyRemote(data); })
        .catch(function () { setChip('error', 'Sync Error (pull)'); });
      return;
    }
    // Apps Script JSONP pull — same technique as main BOS.
    var cb = 'slfsync_cb_' + Date.now();
    var script = null;
    window[cb] = function (data) {
      try { delete window[cb]; } catch (e) { window[cb] = undefined; }
      if (script) script.remove();
      applyRemote(data);
    };
    script = document.createElement('script');
    script.src = rawUrl + (rawUrl.indexOf('?') >= 0 ? '&' : '?') + 'user=' + encodeURIComponent(getNamespace()) + '&callback=' + cb;
    script.onerror = function () {
      setChip('error', 'Sync Error (pull)');
      if (script) script.remove();
      window[cb] = undefined;
    };
    document.head.appendChild(script);
    setTimeout(function () {
      if (window[cb]) { window[cb] = undefined; if (script) script.remove(); }
    }, POLL_MS);
  }

  // ---- apply remote (validated; never overwrite on bad data) ----
  function applyRemote(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      setChip('error', 'Sync Error (bad remote payload)');
      return;
    }
    var tombs = getTombs();
    var changed = false;

    // Merge tombstones first so array merges respect deletions from both sides.
    if (data[TOMB_KEY] !== undefined) {
      tombs = mergeTombs(_origGet(TOMB_KEY), data[TOMB_KEY]);
      _writing = true;
      try { _origSet(TOMB_KEY, JSON.stringify(tombs)); } finally { _writing = false; }
    }

    KEYS.forEach(function (k) {
      var remote = data[k];
      if (remote === undefined || remote === null) return; // incomplete remote: leave local untouched
      var parsed;
      try { parsed = (typeof remote === 'string') ? JSON.parse(remote) : remote; } catch (e) { return; }
      var localRaw = _origGet(k) || null;
      if (k === 'slf_crm.clients.v1' || k === 'slf_crm.cases.v1') {
        if (!Array.isArray(parsed)) return; // invalid remote shape: discard this key
        var localArr = [];
        try { localArr = localRaw ? JSON.parse(localRaw) : []; } catch (e) { localArr = []; }
        if (!Array.isArray(localArr)) localArr = [];
        var merged = mergeArr(localArr, parsed, tombs[MERGE_KEYS[k]] || []);
        _writing = true;
        try { _origSet(k, JSON.stringify(merged)); } finally { _writing = false; }
        changed = true;
      } else if (k === 'slf_crm.history.v1') {
        if (!Array.isArray(parsed)) return;
        var mergedHist = mergeHistory(localRaw, typeof remote === 'string' ? remote : JSON.stringify(parsed));
        _writing = true;
        try { _origSet(k, JSON.stringify(mergedHist)); } finally { _writing = false; }
        changed = true;
      } else if (k === 'slf_crm.counter.v1') {
        if (typeof parsed !== 'object' || Array.isArray(parsed)) return;
        var mergedCounter = mergeCounter(localRaw, typeof remote === 'string' ? remote : JSON.stringify(parsed));
        _writing = true;
        try { _origSet(k, JSON.stringify(mergedCounter)); } finally { _writing = false; }
        changed = true;
      }
    });

    setChip('synced');
    _origSet('slf_crm.sync.last_pull', Date.now().toString());
    if (changed && window.SLF && typeof window.SLF.init === 'function') {
      try { window.SLF.init(); } catch (e) { /* re-render must never break sync */ }
    }
  }

  // ---- polling ----
  function startPolling() {
    if (_pollTimer !== null) return;
    _pollTimer = setInterval(pullOnce, POLL_MS);
  }
  function stopPolling() {
    if (_pollTimer !== null) { clearInterval(_pollTimer); _pollTimer = null; }
    clearTimeout(_debounceTimer);
  }

  // ---- public API ----
  return {
    enable: function () {
      _writing = true;
      try { _origSet(ENABLE_KEY, 'true'); } finally { _writing = false; }
      setChip('syncing');
      pushNow();
      pullOnce();
      startPolling();
    },
    disable: function () {
      _writing = true;
      try { _origSet(ENABLE_KEY, 'false'); } finally { _writing = false; }
      stopPolling();
      setChip('off');
    },
    status: function () {
      return {
        enabled: isEnabled(),
        namespace: getNamespace(),
        syncUrlConfigured: !!getUrl(),
        lastPush: _origGet('slf_crm.sync.last_push') || null,
        lastPull: _origGet('slf_crm.sync.last_pull') || null
      };
    },
    push: pushNow,
    pull: pullOnce,
    // Test hooks (synthetic-data testing only; no record contents ever logged)
    _test: {
      mergeArr: mergeArr,
      mergeHistory: mergeHistory,
      mergeCounter: mergeCounter,
      mergeTombs: mergeTombs,
      trackDeletions: trackDeletions,
      applyRemote: applyRemote,
      getNamespace: getNamespace,
      KEYS: KEYS
    }
  };
})();
