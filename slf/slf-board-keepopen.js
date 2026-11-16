// ============================================================
// SLF Board Keep-Open v2 — the ejection fix that actually works.
// v1's fatal flaw: it checked SLFBoard.state().clientId (memory)
// to decide whether the board was still open. But a sync
// re-render wipes the SCREEN without touching that memory - so
// the check always said "board still intact, nothing to restore"
// while the user was staring at the Clients table. The guard
// never fired once. v1 also hooked SLF.render, which would have
// trapped the user inside the profile even when they clicked
// Dashboard themselves.
//
// v2 rules:
//  1. Track the open client (open/close/setTab hooks - same as v1).
//  2. Restore ONLY on sync-triggered full re-renders. Sync calls
//     SLF.init() after each pull; user navigation never does.
//  3. Decide by the DOM: if a board is open in memory but its
//     content is NOT on screen, the screen was wiped - restore it.
//  4. Everything in try/catch - the guard must never break sync.
// ============================================================
'use strict';
(function () {
  if (!window.SLFBoard || !window.SLF) return;

  var _open = { clientId: null, tab: 'history' };

  var origOpen = SLFBoard.open;
  SLFBoard.open = function (clientId) {
    _open.clientId = clientId;
    _open.tab = 'history';
    return origOpen.apply(SLFBoard, arguments);
  };

  var origClose = SLFBoard.close;
  SLFBoard.close = function () {
    _open.clientId = null;
    return origClose.apply(SLFBoard, arguments);
  };

  var origSetTab = SLFBoard.setTab;
  SLFBoard.setTab = function (t) {
    _open.tab = t;
    return origSetTab.apply(SLFBoard, arguments);
  };

  // Is the board's content actually on screen right now?
  function boardOnScreen() {
    try {
      var v = document.getElementById('view');
      if (!v) return false;
      // The board always renders its own <style> block (SLFBoard.css)
      // and its grid wrapper. If neither is in the live DOM, the
      // screen no longer shows the board.
      return !!(v.querySelector('.bwrap') || v.innerHTML.indexOf('Client Information') !== -1);
    } catch (e) { return false; }
  }

  // Restore after a sync-triggered re-render if the board was open.
  function protectAfterSyncRender() {
    if (!_open.clientId) return;          // no board open - user is elsewhere
    if (boardOnScreen()) return;         // board still on screen - done
    try {
      var wantedTab = _open.tab;
      SLFBoard.open(_open.clientId);
      if (wantedTab && wantedTab !== 'history') SLFBoard.setTab(wantedTab);
    } catch (e) { /* restore must never throw */ }
  }

  // Hook ONLY the sync path. SLFSync calls SLF.init() after each
  // pull; user navigation uses SLF.render()/setView and never init.
  var currentInit = SLF.init;
  if (currentInit && !currentInit.__keepOpenV2) {
    SLF.init = function () {
      var result = currentInit.apply(SLF, arguments);
      try { protectAfterSyncRender(); } catch (e) {}
      return result;
    };
    SLF.init.__keepOpenV2 = true;
  }
})();
