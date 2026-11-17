// ============================================================
// SLF UI Guard — sync is permanent; deletes are superadmin-only
// Owner orders (2026-11-17):
//   1. "Take that out, no one should turn off the sync — it
//      always has to sync." The CLOUD SYNC panel in the sidebar
//      (status chip, Disable Sync button, namespace note) is
//      removed from the UI on every load. The sync flag is
//      forced to enabled and re-asserted every second, so even
//      a stale browser holding 'false' flips back instantly.
//   2. "Take away any delete tabs from the users except the
//      super admin." Every delete control in the SLF CRM is
//      hidden from non-superadmin sessions: the record ×
//      buttons, the client Delete button, and the Export/Delete
//      row buttons on the client dashboard. Superadmin sees
//      everything as before.
//
// The runtime block from slf-delete-guard.js stays as the
// enforcement layer — this module hides the buttons so users
// never even see them; the guard stops anything a user might
// trigger from a console. Defense in depth.
// ============================================================
(function () {
  'use strict';

  var SYNC_ENABLE_KEY = 'slf_crm.sync.enabled';

  function isSuperAdmin() {
    try {
      var s = JSON.parse(localStorage.getItem('aetherion_user') || 'null');
      return !!(s && String(s.role || '').toLowerCase().replace(/[\s_-]/g, '') === 'superadmin');
    } catch (e) { return false; }
  }

  // ---- 1. sync is always on ----
  function forceSyncOn() {
    try { if (localStorage.getItem(SYNC_ENABLE_KEY) !== 'true') localStorage.setItem(SYNC_ENABLE_KEY, 'true'); } catch (e) {}
  }
  forceSyncOn();
  setInterval(forceSyncOn, 1000); // re-assert forever; the toggle can never stick off

  function removeSyncPanel() {
    var box = document.getElementById('slf-sync-box');
    if (box && box.parentNode) box.parentNode.removeChild(box);
  }

  // ---- 2. hide every delete control from non-superadmins ----
  function hideDeleteControls() {
    if (isSuperAdmin()) return;
    var scoped = document.querySelectorAll('.bdel, .bact.danger');
    Array.prototype.forEach.call(scoped, function (el) { el.style.display = 'none'; });
    // belt-and-braces: any button whose visible label is Delete / Remove
    var buttons = document.querySelectorAll('button');
    Array.prototype.forEach.call(buttons, function (b) {
      var label = (b.textContent || '').trim().toLowerCase();
      if (label === 'delete' || label === 'remove' || label === '\u00d7') b.style.display = 'none';
    });
  }

  function apply() {
    removeSyncPanel();
    hideDeleteControls();
  }

  // The board re-renders its DOM constantly; re-apply after
  // every render cycle and after any DOM change.
  function boot() {
    apply();
    setInterval(apply, 1000);
    if (window.MutationObserver) {
      new MutationObserver(function () {
        removeSyncPanel();
        hideDeleteControls();
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();