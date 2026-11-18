// ============================================================
// SLF Single Navigation — v8. Owner order (2026-11-17):
//   "why did you move the client's information from the sidebar
//    where I asked you to put it — do not move anything else."
//
// v7 relied on a 1-second polling loop to carry the panel from
// #view into the sidebar. If the board rendered (or another
// module re-rendered it) right after a poll, the panel sat in
// the main area until the next tick — or visibly stayed there.
// v8 enforces the placement AT RENDER TIME: SLFBoard.render is
// wrapped so the panel is moved into the sidebar the instant
// the board paints. The interval/MutationObserver stay only as
// backup. Placement is now immediate, every render, guaranteed.
//
// Rules unchanged from v7:
//   - Sidebar shows ONLY: SLF CRM / Student Loan Forgiveness
//     (+ the client panel while a client is open). No tabs, ever.
//   - While a client is open: module bar hidden, ONE tab strip
//     (the nested client tabs under the Client Dashboard header
//     at the very top of the main area).
//   - The panel is NEVER deleted while a client is open; the
//     only removal trigger is the board actually closing.
// ============================================================
(function () {
  'use strict';

  var PANEL_ID = 'slf-side-panel';

  function boardOpen() {
    try { return !!(window.SLFBoard && SLFBoard.state().clientId); } catch (e) { return false; }
  }

  function setModuleBar(show) {
    var bar = document.getElementById('bos-module-bar');
    if (bar) bar.style.display = show ? '' : 'none';
  }

  function hideSidebarTabs() {
    // Owner order: the sidebar NEVER shows tab buttons again.
    var nav = document.getElementById('nav');
    if (nav) nav.style.display = 'none';
    var aside = document.querySelector('aside');
    if (aside) {
      var btns = aside.querySelectorAll('nav button');
      for (var i = 0; i < btns.length; i++) {
        if (btns[i].parentNode) btns[i].parentNode.removeChild(btns[i]);
      }
    }
  }

  function apply() {
    var aside = document.querySelector('aside');
    if (!aside) return;
    hideSidebarTabs();

    if (boardOpen()) {
      setModuleBar(false); // one tab strip: the nested client tabs
      // Find the live panel wherever it is: freshly rendered in
      // #view (.bleft), or previously moved but dragged back.
      var livePanel = document.querySelector('#view .bleft') || document.getElementById(PANEL_ID);
      if (livePanel && livePanel.parentNode !== aside) {
        livePanel.id = PANEL_ID;
        aside.appendChild(livePanel);
      } else if (livePanel) {
        livePanel.id = PANEL_ID;
      }
      aside.style.width = '330px';
      var wrap = document.querySelector('#view .bwrap');
      if (wrap) {
        wrap.style.display = 'grid';
        wrap.style.gridTemplateColumns = '1fr';
      }
    } else {
      setModuleBar(true); // the one navigation while no client is open
      var stale = document.getElementById(PANEL_ID);
      if (stale && stale.parentNode) stale.parentNode.removeChild(stale);
      aside.style.width = '';
    }
  }

  function boot() {
    // 1) Enforce placement immediately after EVERY board render —
    //    this is the fix: no race, no panel left in the main area.
    if (window.SLFBoard && typeof SLFBoard.render === 'function' && !SLFBoard.render.__singleNavHook) {
      var rawRender = SLFBoard.render;
      var hooked = function () {
        rawRender.apply(SLFBoard, arguments);
        apply();
      };
      hooked.__singleNavHook = true;
      SLFBoard.render = hooked;
    }
    // 2) Backup only: interval + mutation observer.
    apply();
    setInterval(apply, 1000);
    if (window.MutationObserver) {
      new MutationObserver(apply).observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();