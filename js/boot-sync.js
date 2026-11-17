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

  var SLF_KEYS = ['slf_crm.clients.v1', 'slf_crm.cases.v1', 'slf_crm.history.v1', 'slf_crm.counter.v1', 'slf_crm.tombstones.v1'];
  var BOS_KEYS = ['aetherion_guests', 'aetherion_bookings', 'aetherion_tasks', 'aetherion_operators', 'aetherion_resorts', 'aetherion_settings', 'aetherion_users', 'aetherion_webleads', 'aetherion_activitylog', 'aetherion_tombstones'];

  function getOrig(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function setOrig(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* never fatal */ } }

  function getUrl() { return (getOrig('aetherion_sync_url') || '').trim(); }
  function getNamespace() {
    return (getOrig('aetherion_sign_namespace') || getOrig('aetherion_sync_namespace') || 'default').trim() || 'default';
  }
  function isFirebase(u) { return u.indexOf('' !== null && u.indexOf('firebaseio.com') !== -1); }

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
      // Dead-list safety: make sure the dead old URL is on the
      // dead list and the new URL is NOT (any 2FA-style senders
      // refuse dead-listed URLs silently).
      var list = [];
      try { list = JSON.parse(getOrig('aetherion_dead_backends') || '[]'); } catch (e) { list = []; }
      if (!Array.isArray(list)) list = [];
      if (list.indexOf(DEAD_OLD_URL_ID) === -1) {
        list.push(DEAD_OLD_URL_ID);
        setOrig('aetherion_dead_backends', JSON.stringify(list));
      }
      if (list.some(function (u) { return NEW_URL.indexOf(u) !== -1; })) {
        setOrig('aetherion_dead_backends', JSON.stringify([]));
      }
      if (changed) setOrig(PULL_STATE_KEY, '0'); // force fresh boot pull from new backend
      setOrig(MIGRATION_DONE_KEY, 'true');
    } catch (e) { /* migration must never break the boot */ }
  }

  // ---- safe merge of one remote key into local storage ----
  function mergeKey(key,Namespace, remote) {