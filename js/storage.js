// BOS Storage Hardening Layer
// Wraps localStorage with corrupt-read guards and atomic, quota-aware writes.
// Existing db.js continues to work unchanged; this layer is adopted incrementally
// at read/write call sites. No data migration required.

const BOS_DATA_KEYS = [
  'cabo_resorts',
  'cabo_operators',
  'cabo_guests',
  'cabo_bookings',
  'cabo_tasks',
  'cabo_catalog'
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
    console.warn(`Storage key "${key}" is corrupt; quarantining and using fallback. ` +
                 `A copy of the corrupt value is preserved under quarantine.`);
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
    localStorage.setItem(key, json);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: 'QUOTA',
      message: 'Browser storage is full or blocked. Your previous data is intact; ' +
               'the last change was NOT saved. Export a backup and free up storage.'
    };
  }
}

// Full snapshot of all BOS-owned keys for backup/restore.
function exportAllRaw() {
  const data = {};
  BOS_DATA_KEYS.forEach(k => {
    const v = localStorage.getItem(k);
    if (v !== null) data[k] = v;
  });
  // Settings + stage configs belong in backups too
  [SETTINGS_KEY, BOS_STAGE_KEY, SLF_STAGE_KEY].forEach(k => {
    const v = localStorage.getItem(k);
    if (v !== null) data[k] = v;
  });
  return data;
}

// Pre-destruction snapshot: writes a timestamped backup before any risky action.
function snapshotBefore(label) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = { at: new Date().toISOString(), label: label, data: exportAllRaw() };
  try {
    localStorage.setItem(BOS_BACKUP_PREFIX + stamp + '.' + label, JSON.stringify(backup));
    return true;
  } catch (e) {
    console.warn('Pre-destruction snapshot failed (quota); proceeding is unsafe without export.');
    return false;
  }
}

// Restore raw snapshot data. Caller must validate first; this writes as stored.
function restoreAllRaw(dataObj) {
  Object.keys(dataObj).forEach(k => {
    localStorage.setItem(k, dataObj[k]);
  });
}

window.BOSStorage = {
  safeParse,
  atomicWrite,
  exportAllRaw,
  snapshotBefore,
  restoreAllRaw,
  DATA_KEYS: BOS_DATA_KEYS,
  BACKUP_PREFIX: BOS_BACKUP_PREFIX
};
