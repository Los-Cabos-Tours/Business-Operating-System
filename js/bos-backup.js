// BOS Backup & Restore Module
// Full-system backup (JSON file download), validated import, and restore preview.
// Works alongside the bundle's existing CloudSync; local-only safety net.

const BOS_BACKUP_FORMAT = 'aetherion-bos-backup';
const BOS_BACKUP_VERSION = 1;

function bosBuildBackupBundle() {
  return {
    format: BOS_BACKUP_FORMAT,
    formatVersion: BOS_BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    data: window.BOSStorage.exportAllRaw()
  };
}

function bosDownloadBackup() {
  if (!window.BOSStorage) {
    alert('BOS storage module not loaded.');
    return;
  }
  const bundle = bosBuildBackupBundle();
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bos-backup-' + stamp + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Validate an imported file before anything is written.
// Returns { ok, reason, bundle }.
function bosValidateBackupBundle(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, reason: 'File is not a valid JSON object.' };
  }
  if (parsed.format !== BOS_BACKUP_FORMAT) {
    return { ok: false, reason: 'This file is not a BOS backup bundle (unknown format).' };
  }
  if (typeof parsed.formatVersion !== 'number' || parsed.formatVersion < 1) {
    return { ok: false, reason: 'Backup format version is missing or invalid.' };
  }
  if (parsed.formatVersion > BOS_BACKUP_VERSION) {
    return { ok: false, reason: 'This backup was created by a newer version of BOS. Update the app first.' };
  }
  if (!parsed.data || typeof parsed.data !== 'object') {
    return { ok: false, reason: 'Backup bundle has no data section.' };
  }
  const keys = Object.keys(parsed.data);
  if (keys.length === 0) {
    return { ok: false, reason: 'Backup bundle is empty — nothing to restore.' };
  }
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (typeof parsed.data[k] !== 'string') {
      return { ok: false, reason: 'Backup value for "' + k + '" is not raw JSON text.' };
    }
  }
  return { ok: true, reason: '', bundle: parsed };
}

// Import handler: read file, validate, snapshot current state, then restore.
function bosHandleImportFile(fileInput, statusEl) {
  const file = fileInput.files && fileInput.files[0];
  if (!file) {
    if (statusEl) statusEl.textContent = 'No file selected.';
    return;
  }
  const reader = new FileReader();
  reader.onload = function (ev) {
    let parsed = null;
    try {
      parsed = JSON.parse(ev.target.result);
    } catch (e) {
      if (statusEl) statusEl.textContent = 'Invalid JSON file — cannot import.';
      return;
    }
    const check = bosValidateBackupBundle(parsed);
    if (!check.ok) {
      if (statusEl) statusEl.textContent = 'Import rejected: ' + check.reason;
      return;
    }
    // Safety: snapshot current state before overwriting anything
    const snapOk = window.BOSStorage.snapshotBefore('pre-import-' + Date.now());
    if (!snapOk) {
      if (statusEl) statusEl.textContent = 'Import blocked: could not create safety snapshot (storage full?). Export a manual backup first.';
      return;
    }
    window.BOSStorage.restoreAllRaw(check.bundle.data);
    if (statusEl) statusEl.textContent = 'Import complete. Reloading…';
    setTimeout(function () { location.reload(); }, 1200);
  };
  reader.onerror = function () {
    if (statusEl) statusEl.textContent = 'Could not read the selected file.';
  };
  reader.readAsText(file);
}

window.BOSBackup = {
  buildBundle: bosBuildBackupBundle,
  download: bosDownloadBackup,
  validate: bosValidateBackupBundle,
  importFile: bosHandleImportFile
};
