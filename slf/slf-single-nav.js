// ============================================================
// SLF Single Navigation — v13.2
// OWNER ORDER (repeated many times, most recent 2026-11-18):
// the client header — the breadcrumb ("Main CRM / Contacts /
// <name>"), the big lead name row (its + New Case / Export /
// Delete buttons and the CL-ID chip ride inside it), and the
// "Update Status" row — moves into the SIDEBAR, above the ONE
// client panel. The Contact Search / Edit Contact action bar
// stays in main. The TOP 17-module bar is never hidden.
//
// v13.1 bugs, fixed in v13.2:
//   1. STACKING: every board render creates NEW breadcrumb /
//      name / status rows in #view. v13.1 moved each new copy
//      into the sidebar without removing the previous one, so
//      the sidebar stacked duplicates on every render and sync
//      tick — and its cleanup used getElementById, which only
//      ever finds the FIRST duplicate. v13.2 purges ALL stale
//      sidebar copies (querySelectorAll) on every pass and
//      keeps exactly one of each.
//   2. The Update Status row was not part of the move; the
//      owner's list includes it. It now moves left with the
//      rest of the header.
//
// Rules carried forward (owner standing orders):
//   - TOP 17-module bar never hidden.
//   - Sidebar tab buttons stay removed.
//   - Exactly ONE client panel — duplicates purged.
//   - A node moves only when not already in the sidebar;
//     observer re-entrancy guarded (no hang, ever).
// ============================================================
(function () {
  'use strict';

  var PANEL_ID = 'slf-side-panel';
  var CRUMB_ID = 'slf-side-crumb';
  var NAMEROW_ID = 'slf-side-namerow';
  var STAGE_ID = 'slf-side-stage';
  var applying = false;

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

  // Remove EVERY stale sidebar copy of the header rows. The board
  // re-creates these on every render; without this purge they
  // stack (the v13.1 bug). querySelectorAll catches ALL copies,
  // including duplicate-id leftovers getElementById missed.
  function purgeStaleHeaderCopies(aside, fresh) {
    var stale = aside.querySelectorAll('#' + CRUMB_ID + ', #' + NAMEROW_ID + ', #' + STAGE_ID);
    for (var k = 0; k < stale.length; k++) {
      if (stale[k] === fresh.crumb || stale[k] === fresh.nameRow || stale[k] === fresh.stageRow) continue;
      if (stale[k].parentNode) stale[k].parentNode.removeChild(stale[k]);
    }
  }

  // Identify the header rows inside #view by exact markers:
  //   nameRow  — the flex row containing .bbkname (big name)
  //   crumb    — the row whose text begins with "Main CRM"
  //   stageRow — the row whose text begins with "Update Status"
  // Nothing else on the board matches all of these.
  function findHeaderNodes() {
    var view = document.getElementById('view');
    if (!view) return null;
    var rows = view.children;
    var out = { crumb: null, nameRow: null, stageRow: null };
    for (var i = 0; i < rows.length; i++) {
      var d = rows[i];
      if (d.tagName !== 'DIV') continue;
      var txt = (d.textContent || '').replace(/^\s+/, '');
      if (!out.nameRow && d.querySelector('.bbkname')) { out.nameRow = d; continue; }
      if (!out.crumb && txt.indexOf('Main CRM') === 0) { out.crumb = d; continue; }
      if (!out.stageRow && txt.indexOf('Update Status') === 0) { out.stageRow = d; }
    }
    if (!out.nameRow || !out.crumb) return null;
    return out;
  }

  function moveIntoSidebar(el, aside, id) {
    if (!el) return;
    if (!el.id) el.id = id;
    if (el.parentNode !== aside) aside.appendChild(el);
  }

  function apply() {
    if (applying) return;
    applying = true;
    try {
      var aside = document.querySelector('aside');
      if (!aside) return;
      hideSidebarTabs();

      var title = document.getElementById('view-title');

      if (boardOpen()) {
        // Sidebar order (owner's order): "Client Dashboard"
        // heading, breadcrumb, lead name row (buttons + CL-ID
        // chip ride inside it), Update Status row, then panel.
        if (title && title.parentNode !== aside) aside.appendChild(title);
        var nodes = findHeaderNodes();
        if (nodes) {
          purgeStaleHeaderCopies(aside, nodes);
          moveIntoSidebar(nodes.crumb, aside, CRUMB_ID);
          moveIntoSidebar(nodes.nameRow, aside, NAMEROW_ID);
          moveIntoSidebar(nodes.stageRow, aside, STAGE_ID);
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
        purgeSidebarCopies(aside, null);
        var stale = aside.querySelectorAll('#' + CRUMB_ID + ', #' + NAMEROW_ID + ', #' + STAGE_ID);
        for (var j = 0; j < stale.length; j++) {
          if (stale[j].parentNode) stale[j].parentNode.removeChild(stale[j]);
        }
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