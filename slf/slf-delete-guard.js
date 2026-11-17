// ============================================================
// SLF Delete Guard — superadmin-only deletion
// Owner order (2026-11-17): "I don't give the user the ability
// to delete any file — only super admin can do that."
//
// WHAT THIS DOES: wraps the SLF delete paths at runtime so only
// a signed-in SUPERADMIN session may delete anything in the SLF
// CRM. Every other user gets a clear refusal message and nothing
// is removed. Deletion is blocked regardless of which UI button
// was clicked (record remove, client delete, case delete).
//
// SESSION READ: the SLF CRM runs in the same browser profile as
// the main BOS (same origin), so the signed-in session in
// localStorage (aetherion_user) identifies the current user.
// ============================================================
(function () {
  'use strict';

  function isSuperAdmin() {
    try {
      var s = JSON.parse(localStorage.getItem('aetherion_user') || 'null');
      return !!(s && String(s.role || '').toLowerCase().replace(/[\s_-]/g, '') === 'superadmin');
    } catch (e) { return false; }
  }

  function refuse() {
    alert('Deletion is restricted. Only the Super Admin can delete records. Ask your administrator.');
  }

  function wrap(name) {
    if (!window.SLFBoard || typeof window.SLFBoard[name] !== 'function') return;
    var orig = window.SLFBoard[name];
    window.SLFBoard[name] = function () {
      if (!isSuperAdmin()) { refuse(); return; }
      return orig.apply(window.SLFBoard, arguments);
    };
  }

  function wrapSlf(name) {
    if (!window.SLF || typeof window.SLF[name] !== 'function') return;
    var orig = window.SLF[name];
    window.SLF[name] = function () {
      if (!isSuperAdmin()) { refuse(); return; }
      return orig.apply(window.SLF, arguments);
    };
  }

  function install() {
    wrap('removeItem');
    wrap('deleteConfirm');
    wrapSlf('deleteClient');
    wrapSlf('deleteCase');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
  // The board controller may attach later; re-apply when it does.
  window.addEventListener('load', install);
})();