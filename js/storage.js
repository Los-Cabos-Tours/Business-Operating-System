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

function safeParse(key, fallback) {
  if (fallback === undefined) { fallback = []; }
  const raw = localStorage.getItem(key);
  if (raw === null || raw === undefined) { return fallback; }
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Storage key "' + key + '" is corrupt; quarantining and using fallback.');
    try {
      localStorage.setItem(BOS_BACKUP_PREFIX + 'quarantine.' + key, raw);
    } catch (q) { }
    return fallback;
  }
}

function atomicWrite(key, value) {
  const json = JSON.stringify(value);
  try {
    localStorage.setItem(key, json);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: 'QUOTA',
      message: 'Browser storage is full or blocked. Previous data intact; last change NOT saved.'
    };
  }
}

function exportAllRaw() {
  const data = {};
  BOS_DATA_KEYS.forEach(function (k) {
    const v = localStorage.getItem(k);
    if (v !== null) { data[k] = v; }
  });
  return data;
}

function snapshotBefore(label) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = {
    at: new Date().toISOString(),
    label: label,
    data: exportAllRaw()
  };
  try {
    localStorage.setItem(BOS_BACKUP_PREFIX + stamp + '.' + label, JSON.stringify(backup));
    return true;
  } catch (e) {
    console.warn('Pre-destruction snapshot failed (quota); export a backup before proceeding.');
    return false;
  }
}

function restoreAllRaw(dataObj) {
  Object.keys(dataObj).forEach(function (k) {
    localStorage.setItem(k, dataObj[k]);
  });
}

window.BOSStorage = {
  safeParse: safeParse,
  atomicWrite: atomicWrite,
  exportAllRaw: exportAllRaw,
  snapshotBefore: snapshotBefore,
  restoreAllRaw: restoreAllRaw,
  BACKUP_PREFIX: BOS_BACKUP_PREFIX,
  DATA_KEYS: BOS_DATA_KEYS
};
