// ============================================================
// SLF Single Navigation — v9. Owner report (2026-11-18, live
// screen): the client panel appears SEVEN TIMES in the sidebar.
//
// Root cause: v8 moved the freshly rendered panel into the
// sidebar but DROPPED v7's "remove the old copy" line. The
// board re-renders on every live-history tick, and each render
// creates a fresh panel; v8 appended each one while the old
// copies stayed. Seven re-renders = seven stacked panels.
//
// v9: every pass removes every existing sidebar copy EXCEPT the
// incoming one, then moves the incoming panel in. There is
// exactly ONE panel, on every render, forever. All other rules
// unchanged from v7/v8:
//   - Sidebar: SLF CRM / Student Loan Forgiveness + the ONE
//     client panel while a client is open. No tab buttons, ever.
//   - Client open: module bar hidden, ONE tab strip (nested
//     client tabs), Client Dashboard header at the very top.
//   - No client open: module bar is the one navigation.
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

  // Remove every sidebar panel copy except `keep`. Duplicate IDs
  // (from the v8 stacking bug) are all purged.
  function purgeSidebarCopies(aside, keep) {
    var kids = aside.children;
    for (var i = kids.length - 1; i >= 0; i--) {
      var el = kids[i];
      if (el !== keep && (el.id === PANEL_ID || el.className === 'bleft')) {
        if (el.parentNode) el.parentNode.removeChild(el);
      }
    }
  }

  function apply() {
    var aside = document.querySelector('aside');
    if (!aside) return;
    hideSidebarTabs();

    if (boardOpen()) {
      setModuleBar(false);
      // The freshly rendered panel from this pass (in #view), or
      // the one already living in the sidebar.
      var incoming = document.querySelector('#view .bleft');
      var existing = document.getElementById(PANEL_ID);
      // ONE panel rule: remove every copy except the incoming.
      purgeSidebarCopies(aside, incoming || existing);
      var live = incoming || existing;
      if (live) {
        live.id = PANEL_ID;
        if (live.parentNode !== aside) aside.appendChild(live);
      }
      aside.style.width = '330px';
      var wrap = document.querySelector('#view .bwrap');
      if (wrap) {
        wrap.style.display = 'grid';
        wrap.style.gridTemplateColumns = '1fr';
      }
    } else {
      setModuleBar(true);
      purgeSidebarCopies(aside, null); // board closed: no panel at all
      aside.style.width = '';
    }
  }

  function boot() {
    if (window.SLFBoard && typeof SLFBoard.render === 'function' && !SLFBoard.render.__singleNavHook) {
      var rawRender = SLFBoard.render;
      var hooked = function () {
        rawRender.apply(SLFBoard, arguments);
        apply();
      };
      hooked.__singleNavHook = true;
      SLFBoard.render = hooked;
    }
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