// ============================================================
// SLF Single Navigation — v11. Owner order (2026-11-18):
//   "Did I say sidebar tabs? No — the TOP tabs. The tabs I
//    never asked you to take away are the top tabs."
//
// v10 misread the order and restored SIDEBAR tabs. The tabs the
// owner meant are the TOP 17-module bar — the one this module
// hid every time a client was opened. v11:
//
//   1. The 17-module TOP bar is NEVER hidden. Client open or
//      not, it stays at the top of the main area, exactly as it
//      was before this module started touching it. No
//      setModuleBar(false) exists anymore.
//   2. While a client is open, the "Client Dashboard" heading
//      (#view-title) moves into the SIDEBAR, above the client
//      panel (owner order, kept). Returns to main when closed.
//   3. Sidebar tabs stay REMOVED (owner's standing order from
//      2026-11-17; the v10 restoration was a misread — reverted).
//      Sidebar = SLF CRM / Student Loan Forgiveness, then the
//      heading + the ONE client panel while a client is open.
//      Injected duplicate buttons are purged, as before.
//   4. Exactly ONE client panel (v9 purge kept).
// ============================================================
(function () {
  'use strict';

  var PANEL_ID = 'slf-side-panel';
  var titleHome = null; // where #view-title belongs when no client is open

  function boardOpen() {
    try { return !!(window.SLFBoard && SLFBoard.state().clientId); } catch (e) { return false; }
  }

  // Owner's standing order 2026-11-17: no tab buttons in the
  // sidebar, ever. Hide the nav and remove any tab button ever
  // injected there (including duplicate injected items).
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

  // Remove every sidebar panel copy except `keep` — panels must
  // never stack. The heading is not touched.
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

    // The TOP 17-module bar is never touched. It stays visible in
    // every state — client open or not (owner order 2026-11-18).

    var title = document.getElementById('view-title');

    if (boardOpen()) {
      // "Client Dashboard" heading lives in the SIDEBAR, above
      // the panel (owner order, kept from v10).
      if (title && title.parentNode !== aside) {
        titleHome = { parent: title.parentNode, next: title.nextSibling };
        aside.appendChild(title);
      }
      var incoming = document.querySelector('#view .bleft') || document.getElementById(PANEL_ID);
      purgeSidebarCopies(aside, incoming);
      var live = incoming;
      if (live) {
        live.id = PANEL_ID;
        aside.appendChild(live); // lands directly under the heading
      }
      aside.style.width = '330px';
      var wrap = document.querySelector('#view .bwrap');
      if (wrap) {
        wrap.style.display = 'grid';
        wrap.style.gridTemplateColumns = '1fr';
      }
    } else {
      purgeSidebarCopies(aside, null);
      // Heading returns to its home in the main area.
      if (title && titleHome && title.parentNode === aside) {
        title.parentNode.removeChild(title);
        titleHome.parent.insertBefore(title, titleHome.next);
      }
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