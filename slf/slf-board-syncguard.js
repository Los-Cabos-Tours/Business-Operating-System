// ============================================================
// SLF Board Sync Guard — fixes the "kicked out of the client
// profile" bug. Root cause: slf-sync.js calls SLF.init() after
// EVERY pull (every 60s), which re-renders the whole app and
// wipes the open Client Dashboard even when nothing changed.
// This module:
//  1. Fingerprint-checks SLF.init calls — if no data actually
//     changed since the last render, the re-render is skipped
//     entirely and the user stays exactly where they are.
//  2. After a legit re-render caused by real remote changes,
//     re-opens the SAME client dashboard (same client, same
//     tab), so updates land around the user's work.
//  3. Keeps the fingerprint fresh after the board's own saves
//     so local work is never mistaken for remote changes.
// Load order: after slf-app.js and after slf-board-* modules.
// ============================================================
'use strict';
(function () {
  if (!window.SLFBoard || !window.SLF) return;

  var _lastFingerprint = null;
  var _skipNextCheck = true; // the FIRST init is the page's own render - always let it through

  function simpleHash(s) {
    if (!s) return '0';
    var h = 0;
    for (var i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) | 0;
    }
    return String(h);
  }
  function currentFingerprint() {
    try {
      return [
        localStorage.getItem('slf_crm.clients.v1'),
        localStorage.getItem('slf_crm.cases.v1'),
        localStorage.getItem('slf_crm.history.v1'),
        localStorage.getItem('slf_crm.counter.v1'),
        localStorage.getItem('slf_crm.fielddefs.v1'),
        localStorage.getItem('slf_crm.sections.v1'),
        localStorage.getItem('slf_crm.clientboard.v1')
      ].join('\u0001').length + ':' + simpleHash(localStorage.getItem('slf_crm.clients.v1') + '|' + localStorage.getItem('slf_crm.cases.v1'));
    } catch (e) { return 'err'; }
  }

  function boardOpen() {
    try {
      var st = SLFBoard.state();
      return !!(st && st.clientId);
    } catch (e) { return false; }
  }
  function restoreBoard() {
    if (!boardOpen()) return;
    try { SLFBoard.render(); } catch (e) { /* restore must never throw */ }
  }

  var origInit = SLF.init;
  if (origInit && !SLF.init.__syncGuarded) {
    SLF.init = function () {
      if (_skipNextCheck) {
        _skipNextCheck = false;
        _lastFingerprint = currentFingerprint();
        return origInit.apply(SLF, arguments);
      }
      var fp = currentFingerprint();
      if (fp === _lastFingerprint) {
        // Sync pulled identical data - nothing actually changed.
        // Skip the re-render; the user stays exactly where they are.
        return;
      }
      _lastFingerprint = fp;
      origInit.apply(SLF, arguments);
      restoreBoard();
    };
    SLF.init.__syncGuarded = true;
  }

  // Keep the fingerprint fresh after the board's own saves so
  // local writes are never mistaken for remote changes.
  var origBoardSave = SLFBoard.saveAll;
  if (origBoardSave) {
    SLFBoard.saveAll = function (data) {
      var ok = origBoardSave.apply(SLFBoard, arguments);
      if (ok) _lastFingerprint = currentFingerprint();
      return ok;
    };
  }

  // Reseed shortly after ANY slf_crm storage write (covers
  // modal saves, field saves, sync merges) so the change is
  // recognized as ours, not treated as a remote surprise.
  if (!window.__syncGuardReseed) {
    window.__syncGuardReseed = true;
    var origSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function (key, value) {
      origSetItem(key, value);
      if (typeof key === 'string' && key.indexOf('slf_crm.') === 0) {
        setTimeout(function () { _lastFingerprint = currentFingerprint(); }, 300);
      }
    };
  }
})();
