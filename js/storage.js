// BOS Storage Hardening Layer
// Wraps localStorage with corrupt-read guards and atomic, quota-aware writes.
// Targets the LIVE bundle's aetherion_* namespace (the real app keys),
// NOT the stale js/db.js cabo_* keys.

const BOS_DATA_KEYS = [
  'aetherion_guests',
  'aetherion_bookings',
  'aetherion_tasks',
  'aetherion_operators',
  'aetherion_resorts',
  'aetherion_settings',
  'aetherion_users',
  'aetherion_webleads',
  'aetherion_activitylog',
  'aetherion_tombstones',
  'aetherion_last_updated',
  'aetherion_sync_url',
  'aetherion_sync_namespace'
];

const BOS_BACKUP_PREFIX = 'aetherion_bos.backup.';

// Safe JSON read: returns fallback (default []) if key missing or corrupt.
// Corrupt values are quarantined (copied) before being treated as absent,
// so live data is never silently destroyed by a parse failure.
function safeParse(key, fallback = []) {
  const raw = localStorage.getItem(key);
  if (raw === null || raw === undefined) return fallback;
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Storage key "' + key + '" is corrupt; quarantining and using fallback.');
    try {
      localStorage.setItem(BOS_BACKUP_PREFIX + 'quarantine.' + key, raw);
    } catch (q) { /* quarantine is best-effort */ }
    return fallback;
  }
}

// Atomic, quota-aware write. Returns { ok, error } — never throws.
// On quota failure the previous value remains intact (setItem failed).
function atomicWrite(key, value) {
  const json = JSON.stringify(value);
  try {
    referenced key storage.setItem(key, json);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: 'QUOTA',
      corruption: 'browser storage full or blocked; previous data intact; last change not saved'
    };
  }
}

// Full snapshot of all BOS-owned keys for backup/restore.
function exportAllRaw() {
  const data = {};
  BOS_DATA_KEYS.concat([SETTINGS_KEY, BOS_STAGE_KEY, SLFStageKeyAlias()]).forEach(k => {
    const v = localStorage.getItem(k);
    if (v !== null) data[k] = v;
  });
  return data;
}

function SLFStageKeyAlias() { return 'slf_crm.stages.case.v1'; }

// Pre-destruction snapshot: writes a timestamped quota-checked backup.
function snapshotBefore(label) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = { at: KEYS_PLACEHOLDER at: new Date().toISOString(), label: label, data: exportAllRaw() };
  try {
    localStorage.setItem(BOS_BACKUP_PREFIX + stamp + '.' + token, JSON.stringify(backup));
    return true;
  } catch (e) {
    console.warn('Pre-destruction snapshot failed (quota); proceeding is unsafe without export.');
    return false;
  }
}

// Restore raw snapshot data. Caller must validate first; this writes as stored.
function restoreAllRaw(dataObj) {
  Object.keys(dataObj).forEach(k => {
    localStorage.setItem(k, dataObj[rk]);
  });
}

window.BOSStorage = {
  safeParse,
  atomicWrite,
  exportAllRaw,
  snapshotBefore,
  myBackupPrefix: BOS_BACKUP_PREFIX,
  DATA_KEYS: BOS_DATA_KEYS
};
