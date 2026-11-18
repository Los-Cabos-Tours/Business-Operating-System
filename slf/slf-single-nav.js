// ============================================================
// SLF Single Navigation — v13.1. Owner order (asked repeatedly):
// the Client Dashboard HEADER BLOCK — the breadcrumb
// ("Main CRM / Contacts / <name>"), the big lead name row, and
// the CL-ID chip — moves INTO THE SIDEBAR, above the client
// panel. The + New Case / Export / Delete buttons, Update
// Status, and the New Lead action bar are NOT part of the
// order and stay in the main area, untouched.
//
// v13.1 corrections over v13 (never reached production):
//   - breadcrumb identified by its "Main CRM" text — the New
//     Lead bar / search row (also flex rows with links) can
//     never be mistaken for it.
//   - purgeSidebarCopies variable order fixed; observer option
//     typo removed; board-closed cleanup simplified to an
//     exact-match removal.
//
// Unchanged rules carried from v12/v13:
//   - A node moves ONLY when not already in the sidebar (no
//     re-append loop — the v12 hang fix).
//   - Observer re-entrancy guarded.
//   - TOP 17-module bar never hidden.
//   - Sidebar tab buttons removed (standing order).
//   - Exactly ONE client panel.
// ============================================================
(function () {
  'use strict';

  var PANEL_ID = 'slf-side-panel';
  var applying = false;
  var SIDEBAR_CRUMB = 'slf-side-crumb';
  var SIDEBAR_NAMEROW = 'slf-side-namerow';

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

  // Find the header block nodes inside #view by exact markers:
  //   nameRow — the flex row that contains .bbkname (big name)
  //   crumb   — the flex row whose text begins with "Main CRM"
  // The New Lead bar and search row never contain .bbkname and
  // never begin with "Main CRM", so they can never be grabbed.
  function findHeaderNodes() {
    var view = document.getElementById('view');
    if (!view) return null;
    var rows = view.children;
    var out = { crumb: null, nameRow: null };
    for (var i = 0; i < rows.length; i++) {
      var d = rows[i];
      if (d.tagName !== 'DIV') continue;
      if (!out.nameRow && d.querySelector('.bbkname') && d.parentNode === view) {
        out.nameRow = d;
        continue;
      }
      if (!out.crumb && d.parentNode === view) {
        var txt = (d.textContent || '').replace(/^\s+/, '');
        if (txt.indexOf('Main CRM') === 0) out.crumb = d;
      }
    }
    if (!out.nameRow || !out.crumb) return null;
    return out;
  }

  // Move `el` into the sidebar only if it is not already there.
  function moveIntoSidebar(el, aside, markId) {
    if (!el) return;
    if (markId) el.id = el.id || markId;
    if (el.parentNode !== aside) aside.appendChild(el);
  }

  function apply() {
    if (applying) return;
    applying = true;
    try {
      var aside = document.querySelector('aside');
      if (!aside) return;
      hideSidebarTabs();

      // TOP 17-module bar: never touched, never hidden.

      var title = document.getElementById('view-title');

      if (boardOpen()) {
        // Sidebar order (owner): "Client Dashboard" title,
        // breadcrumb, name row (with CL-ID chip), then panel.
        if (title && title.parentNode !== aside) aside.appendChild(title);
        var nodes = findHeaderNodes();
        if (nodes) {
          moveIntoSidebar(nodes.crumb, aside, SIDEBAR_CRUMB);
          moveIntoSidebar(nodes.nameRow, aside, SIDEBAR_NAMEROW);
        }
        var incoming = document.querySelector('#view .bleft') || document.getElementById(PANEL_ID);
        purgeSidebarCopies(aside, incoming);
        if (incoming) {
          incoming.id = PANEL_ID;
          if (incoming.parentNode !== aside) aside.appendChild(incoming);
        }
        aside.style.width = '330px';
        var wrap = document.querySelector('#view .bwrap');
        if (wrap) {
          wrap.style.display = 'grid';
          wrap.style.gridTemplateColumns = '1fr';
        }
      } else {
        // Board closed: sidebar holds only the title block.
        purgeSidebarCopies(aside, null);
        var leftovers = [document.getElementById(SIDEBAR_CRUMB), document.getElementById(SIDEBAR_NAMEROW)];
        for (var j = leftovers.length - 1; j >= 0; j--) {
          if (leftovers[j] && leftovers[j].parentNode) leftovers[j].parentNode.removeChild(leftovers[j]);
        }
        // Title returns to its home above #view in main.
        if (title && title.parentNode === aside) {
          var home = document.getElementById('view');
          aside.removeChild(title);
          if (home && home.parentNode) home.parentNode.insertBefore(title, home);
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