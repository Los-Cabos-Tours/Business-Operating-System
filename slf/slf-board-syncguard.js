// ============================================================
// SLF Board Sync Guard — fixes the "kicked out of the client
// profile" bug. Root cause: slf-sync.js calls SLF.init() after
// EVERY pull (every 60s), which re-renders the whole app and
// wipes the open Client Dashboard even when nothing changed.
// This module:
//  1. Makes applyRemote detect REAL changes (compares merged
//     result to what was already stored) — no change means no
//     re-render at all.
//  2. After any legit re-render caused by sync, re-opens the
//     SAME client dashboard (same client, same tab) if one was
//     open, so remote updates land around the user's work
//     instead of ejecting them.
// Load order: after slf-app.js, before slf-board-* modules.
// ============================================================
'use strict';
(function () {
  if (!window.SLFBoard) return;

  // ---- 1. real-change detection for SLF.init() ----
  // Wrap SLFSync.applyRemote? We cannot reach its internals
  // safely. Instead we detect the re-render at its source:
  // guard SLF.init itself. Sync calls SLF.init() only when
  // its "changed" flag is set; the flag is over-broad, so we
  // verify with fingerprints BEFORE letting the re-render run.
  var _lastFingerprint = null;
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
  function simpleHash(s) {
    if (!s) return '0';
    var h = 0;
    for (var i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) | 0;
    }
    return String(h);
  }

  var origInit = SLF.init;
  if (origInit && !SLF.init.__syncGuarded) {
    SLF.init = function () {
      var fp = currentFingerprint();
      if (_lastFingerprint === null) { _lastFingerprint = fp; return origInit.apply(SLF, arguments); }
      if (fp === _lastFingerprint) {
        // Nothing actually changed — sync pulled identical data.
        // Skip the re-render entirely; user stays where they are.
        return;
      }
      _lastFingerprint = fp;
      origInit.apply(SLF, arguments);
      // After a legit re-render, restore the open dashboard.
      restoreBoard();
    };
    SLF.init.__syncGuarded = true;
  }

  // ---- 2. dashboard restore after re-render ----
  function boardOpen() {
    try {
      var st = SLFBoard.state();
      return !!(st && st.clientId);
    } catch (e) { return false; }
  }

  function restoreBoard() {
    if (!boardOpen()) return;
    try {
      SLFBoard.render();
    } catch (e) { /* restore must never throw */ }
  }

  // ---- 3. seed the fingerprint at load so the first poll ----
  // ----    does not count as a change ----
  _lastFingerprint = currentFingerprint();

  // Keep the seed fresh whenever the board saves anything, so
  // the board's OWN writes are never mistaken for remote changes.
  var origBoardSave = SLFBoard.saveAll;
  if (origBoardSave) {
    SLFBoard.saveAll = function (data) {
      var ok = origBoardSave.apply(SLFBoard, arguments);
      if (ok) _lastFingerprint = currentFingerprint();
      return ok;
    };
  }

  // ---- 4. keep fingerprint fresh for modal saves too ----
  document.addEventListener('DOMContentLoaded', function () {
    var origSaveClient = SLF.saveClient;
    if (origSaveClient && !SLF.saveClient.__syncGuarded) {
      SLF.saveClient = function () {
        var before = SLF.clients.length;
        var result = origSaveClient.apply(SLF, arguments);
        if (SLF.clients.length !== before || (SLF.editingClientId && result !== false)) {
          _lastFingerprint = currentFingerprint();
        }
        return result;
      };
      SLF.saveClient.__syncGuarded = true;
    }
    var origSaveCase = SLF.saveCase;
    if (origSaveCase && !SLF.saveCase.__syncGuarded) {
      SLF.saveCase = function () {
        var before = SLF.saveCase ? SLF.cases.length : 0;
        var result = origSaveCase.apply(SLF, arguments);
        if (SLF.cases.length !== before || (SLF.editingCaseId && result !== false)) {
          _lastFingerprint = currentFingerprint();
        }
        return result;
      };
      SLF.saveCase.__syncGuarded = true;
  }
  });
})();
