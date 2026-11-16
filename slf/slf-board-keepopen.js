// ============================================================
// SLF Board Keep-Open — ROOT fix for the ejection bug.
// v1 (syncguard) tried to guess when sync data changed using
// fingerprints. That had race windows. This module removes the
// guessing entirely:
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

  // current open board: clientId + tab, tracked continuously
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

  // The protection: after any full re-render, if a board was
  // open, put the SAME dashboard back - same client, same tab.
  function protectRender() {
    if (!_open.clientId) return;
    try {
      if (SLFBoard.state().clientId === _open.clientId) return; // board still intact
    } catch (e) { /* fall through to restore */ }
    // capture the tab BEFORE opening (wrapped open resets it)
    var wantedTab = _open.tab;
    try {
      SLFBoard.open(_open.clientId);
      if (wantedTab && wantedTab !== 'history') SLFBoard.setTab(wantedTab);
    } catch (e) { /* restore must never throw */ }
  }

  var current = SLF.render;
  if (current && !current.__keepOpen) {
    SLF.render = function () {
      var result = current.apply(SLF, arguments);
      try { protectRender(); } catch (e) {}
      return result;
    };
    SLF.render.__keepOpen = true;
  }

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
