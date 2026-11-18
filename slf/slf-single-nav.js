// ============================================================
// SLF Single Navigation — v12. Owner report (2026-11-18):
//   the live page hangs: "RESULT_CODE_HUNG".
//
// Root cause, read from v11: every apply() pass called
// aside.appendChild on the heading AND the panel even when they
// were already in the sidebar. Appending a node that is not the
// last child MOVES it to the end — so each pass moved the
// heading behind the panel, and the MutationObserver watching the
// body saw that move, called apply() again, which moved the
// panel back, which fired the observer again: infinite ping-pong
// on the UI thread. The browser hangs on load. v11 also did this
// via the render hook AND the 1s interval simultaneously.
//
// v12 fixes:
//   1. A node is moved ONLY when it is NOT already in the
//      sidebar. Already-placed nodes are never re-appended, so
//      no move happens, so no mutation fires, so no loop exists.
//   2. The MutationObserver is re-entrancy guarded — mutations
//      caused by apply() itself never re-trigger apply().
// Everything else is unchanged from v11:
//   - The TOP 17-module bar is NEVER hidden (owner order).
//   - Client Dashboard heading + the ONE client panel live in
//     the sidebar while a client is open; heading returns to
//     main when the board closes.
//   - Sidebar tab buttons stay removed (owner's standing order).
//   - Exactly one panel — duplicates purged.
// ============================================================
(function () {
  'use strict';

  var PANEL_ID = 'slf-side-panel';
  var titleHome = null;   // where #view-title belongs when no client is open
  var applying = false;    // re-entrancy guard for the observer

  function boardOpen() {
    try { return !!(window.SLFBoard && SLFBoard.state().clientId); } catch (e) { return false; }
  }

  // Owner's standing order: no tab buttons in the sidebar, ever.
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

  // Remove every sidebar panel copy except `keep` — one panel only.
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
    if (applying) return; // never re-enter from our own mutations
    applying = true;
    try {
      var aside = document.querySelector('aside');
      if (!aside) return;
      hideSidebarTabs();

      // The TOP 17-module bar is never touched (owner order
      // 2026-11-18) — no hide call exists in any state.

      var title = document.getElementById('view-title');

      if (boardOpen()) {
        // Heading → sidebar, ONLY if it is not already there.
        if (title && title.parentNode !== aside) {
          titleHome = { parent: title.parentNode, next: title.nextSibling };
          aside.appendChild(title);
        }
        var incoming = document.querySelector('#view .bleft') || document.getElementById(PANEL_ID);
        purgeSidebarCopies(aside, incoming);
        var live = incoming;
        if (live) {
          live.id = PANEL_ID;
          // Panel → sidebar, ONLY if it is not already there.
          // Already-placed panels are never re-appended (that
          // re-append loop is what hung the browser in v11).
          if (live.parentNode !== aside) aside.appendChild(live);
        }
        aside.style.width = '330px';
        var wrap = document.querySelector('#view .bwrap');
        if (wrap) {
          wrap.style.display = 'grid';
          wrap.style.gridTemplateColumns = '1fr';
        }
      } else {
        purgeSidebarCopies(aside, null);
        // Heading back to its home, ONLY if it is in the sidebar.
        if (title && titleHome && title.parentNode === aside) {
          title.parentNode.removeChild(title);
          titleHome.parent.insertBefore(title, titleHome.next);
          titleHome = null;
        }
        aside.style.width = '';
      }
    } finally {
      applying = false;
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
      new MutationObserver(function () { apply(); }).observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();