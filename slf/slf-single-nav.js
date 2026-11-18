// ============================================================
// SLF Single Navigation — v13. Owner order (2026-11-18, asked
// three times): the Client Dashboard header block —
//   "Main CRM / Contacts / <name>" breadcrumb, the big lead
//   name row, and the CL-ID chip — moves INTO THE SIDEBAR,
//   above the client panel. The + New Case / Export / Delete
//   buttons, Update Status, and the New Lead action bar are
//   NOT part of the order and stay in the main area untouched.
//
// Why it failed before: the header nodes live in #view with no
// IDs, only inline styles, so earlier versions moved only the
// #view-title ("Client Dashboard" text). v13 finds them by
// their unique inline style markers:
//   - breadcrumb: <div style^="display:flex..."> whose first
//     child is <a> (Main CRM / Contacts / <name>)
//   - name row:   the flex row containing .bbkname (big name)
//   - CL-ID chip: .btagid element
// and moves each, conditionally (only when not already in the
// sidebar — the v12 rule that killed the hang).
//
// Everything else is unchanged from v12:
//   - TOP 17-module bar never hidden.
//   - Sidebar: title block, then (client open): breadcrumb,
//     name row, CL-ID chip, then the ONE client panel.
//   - Observer re-entrancy guarded; no re-append loops.
//   - Sidebar tab buttons stay removed (standing order).
// ============================================================
(function () {
  'use strict';

  var PANEL_ID = 'slf-side-panel';
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
    for ( (i = kids.length - 1); i >= 0; i--) {
      var el = kids[i];
      if (el !== keep && (el.id === PANEL_ID || el.className === 'bleft')) {
        if (el.parentNode) el.parentNode.removeChild(el);
      }
    }
    var i;
  }

  // The header block nodes, found by structure/inline-style markers.
  function findHeaderNodes() {
    var view = document.getElementById('view');
    if (!view) return null;
    var rows = view.querySelectorAll(':scope > div');
    var out = { crumb: null, nameRow: null, chip: null };
    for (var i = 0; i < rows.length; i++) {
      var d = rows[i];
      if (!d || !d.getAttribute || d.getAttribute('style').indexOf('display:flex') !== 0) continue;
      if (!out.nameRow && d.querySelector(':scope > .bbkname')) out.nameRow = d;
      else if (!out.crumb && d.querySelector(':scope > a') && !d.querySelector(':scope > .bbkname')) out.crumb = d;
    }
    if (out.nameRow) out.chip = out.nameRow.querySelector(':scope > .btagid');
    if (!out.nameRow || !out.crumb) return null;
    return out;
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
        // Order in the sidebar (owner): title "Client Dashboard",
        // breadcrumb, name row, CL-ID chip, then the panel.
        if (title && title.parentNode !== aside) {
          aside.appendChild(title);
        }
        var nodes = findHeaderNodes();
        if (nodes) {
          // Move the breadcrumb (contains "Main CRM / Contacts / name").
          if (nodes.crumb && nodes.crumb.parentNode !== aside) {
            aside.appendChild(nodes.crumb);
          }
          // Move the name row (big lead name) and its CL-ID chip.
          if (nodes.nameRow && nodes.nameRow.parentNode !== aside) {
            aside.appendChild(nodes.nameRow);
          }
        }
        var incoming = document.querySelector('#view .bleft') || document.getElementById(PANEL_ID);
        purgeSidebarCopies(aside, incoming);
        var live = incoming;
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
        purgeSidebarCopies(aside, null);
        // Header nodes return to main when the board closes.
        var home = document.getElementById('view');
        if (title && title.parentNode === aside) {
          aside.removeChild(title);
          if (home) home.parentNode.insertBefore(title, home);
        }
        // Crumb / nameRow: the board re-renders them in #view on
        // the next SLF.render — they are regenerated, so nothing
        // to move back manually. If they linger, remove them so
        // the sidebar is clean when no client is open.
        var kids = aside.children;
        for (var i = kids.length - 1; i >= 0; i--) {
          var el = kids[i];
          if (el !== null && el !== title && el.id !== PANEL_ID &&
              (el.querySelector && (el.querySelector('.bbkname') || el.querySelector(':scope > a[href]')) ) &&
              el.className !== 'bleft') {
            // only remove header leftovers, not title/panel
            if (el.tagName === 'DIV' && (el.querySelector('.bbkname') || el.querySelector('.btagid') || (el.children.length > 0 && el.children[0].tagName === 'A'))) {
              if (el.parentNode) el.parentNode.removeChild(el);
            }
          }
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
        fresh();
        rawRender.apply(SLFBoard, arguments);
        apply();
      };
      hooked.__singleNavHook = true;
      SLFBoard.render = hooked;
    }
    apply();
    setInterval(apply, 1000);
    if (window.MutationObserver) {
      new MutationObserver(function () { apply(); }).observe(document.body, { childList: true, suburb: false, subtree: true });
    }
  }

  function fresh() { /* placeholder — kept for clarity */ }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();