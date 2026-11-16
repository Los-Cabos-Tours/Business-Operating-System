// ============================================================
// SLF Board Keep-Open — ROOT fix for the ejection bug.
// v1 (syncguard) tried to guess when sync data changed using
// fingerprints. That had race windows: a local save -> sync
// push -> pull could still re-render and stomp an open
// profile within a minute. This module removes the guessing:
//
//  RULE: while a Client Dashboard is open, ANY full re-render
//  (from sync, from init, from anything) restores the SAME
//  dashboard (same client, same tab) immediately after.
//  No timing windows. No heuristics. The profile simply
//  cannot be closed by anything other than the user.
//
// Load order: after slf-board-* modules, before hook.
// ============================================================
'use strict';
(function () {
  if (!window.SLFBoard || !window.SLF) return;

  // current open board: clientId + tab, captured at open time
  var _open = { clientId: null, tab: 'history' };

  // track what the user has open, continuously
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

  // The protection itself: wrap SLF.render. If a board is open
  // and the main app re-renders (whatever the reason), put the
  // dashboard right back - same client, same tab.
  function protectRender() {
    if (!_open.clientId) return;
    try {
      if (SLFBoard.state().clientId === _open.clientId) return; // board still intact
    } catch (e) { /* fall through to restore */ }
    // the re-render wiped the view - restore the board in place
    try {
      SLFBoard.open(_open.clientId);
      if (_open.tab && _open.tab !== 'history') SLFBoard.setTab(_open.tab);
    } catch (e) { /* restore must never throw */ }
  }

  // Hook SLF.render (the board hook already wraps render; chain
  // on top of whatever exists - order-independent chaining).
  var current = SLF.render;
  if (current && !current.__keepOpen) {
    SLF.render = function () {
      var result = current.apply(SLF, arguments);
      try { protectRender(); } catch (e) {}
      return result;
    };
    SLF.render.__keepOpen = true;
  }

  // Hook SLF.init as well - sync calls init directly, which may
  // not go through render.
  var currentInit = SLF.init;
  if (currentInit && !currentInit.__keepOpen) {
    SLF.init = function () {
      var result = currentInit.apply(SLF, arguments);
      try { protectRender(); } catch (e) {}
      return result;
    };
    SLF.init.__keepOpen = true;
  }
})();
