// ============================================================
// SLF Single Navigation — v10. Owner order (2026-11-18):
//   "I need the tab to be put back like how I had them — I
//    never asked you to move them or to take them away. Move
//    this Client Dashboard to the sidebar where it belongs and
//    put the tabs we had there in their place."
//
// v10 rules:
//   1. Sidebar tabs (Dashboard, Clients, Cases & Pipeline,
//      Activity History, Backup & Restore + injected Custom
//      Fields / Signatures) are BACK and permanently visible.
//      This module no longer hides them, purges them, or strips
//      injected buttons — nothing deletes sidebar tabs, ever.
//   2. While a client is open, the "Client Dashboard" heading
//      (#view-title) is MOVED INTO THE SIDEBAR, directly above
//      the client panel. When the board closes, the heading
//      returns to its original spot in the main area.
//   3. Exactly ONE client panel in the sidebar (v9 purge kept).
//   4. While a client is open: module bar hidden — the nested
//      client tabs in the main area are the one tab strip
//      there. No client open: module bar is the top navigation.
// ============================================================
(function () {
  'use strict';

  var PANEL_ID = 'slf-side-panel';
  var titleHome = null; // where #view-title belongs when no client is open

  function boardOpen() {
    try { return !!(window.SLFBoard && SLFBoard.state().clientId); } catch (e) { return false; }
  }

  function setModuleBar(show) {
    var bar = document.getElementById('bos-module-bar');
    if (bar) bar.style.display = show ? '' : 'none';
  }

  // Remove every sidebar panel copy except `keep` (v9 logic —
  // panels must never stack). The heading is not touched.
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

    // Owner order 2026-11-18: sidebar tabs are always visible.
    // No hiding, no purging, no stripping — ever again.
    var nav = document.getElementById('nav');
    if (nav) nav.style.display = '';

    var title = document.getElementById('view-title');

    if (boardOpen()) {
      setModuleBar(false); // one tab strip in main: the nested client tabs
      // "Client Dashboard" heading lives in the SIDEBAR, above the panel.
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
      setModuleBar(true);
      purgeSidebarCopies(aside, null);
      // Heading goes back to its home in the main area.
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