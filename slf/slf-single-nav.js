// ============================================================
// SLF Single Navigation — v6. Owner orders (2026-11-17):
//   "we need only one tab not 2 or more"
//   "not repeat the same info"
//   panel under "SLF CRM / Student Loan Forgiveness"
//   Client Dashboard header at the very top
//
// While a client is open:
//   SIDEBAR: title + the client panel (nav tabs hidden)
//   MAIN:    Client Dashboard header at the VERY TOP — the
//            17-module bar is HIDDEN during the board, so there
//            is exactly ONE tab strip: the nested client tabs.
//   Panel is never deleted while the board is open.
//
// When no client is open:
//   The module bar returns (that is the ONE navigation for the
//   17 modules). The sidebar keeps ONLY the SLF items that are
//   NOT in the module bar (Cases & Pipeline, Activity History,
//   Backup & Restore, Custom Fields, Signatures). Any sidebar
//   button that duplicates a module-bar module — Dashboard,
//   Clients/Contacts, or any injected module button — is
//   removed. One tab set, no repeated info.
// ============================================================
(function () {
  'use strict';

  var PANEL_ID = 'slf-side-panel';
  // Sidebar buttons that duplicate the top module bar are removed.
  var DUP_VIEWS = ['dashboard', 'clients'];
  var DUP_LABELS = ['Dashboard', 'Guidelines', 'Contacts', 'Creditors', 'Tasks', 'Calendar',
    'Enrollments', 'Accounting', 'Billing', 'Settlements', 'Docs', 'Files',
    'E-Marketing', 'SMS', 'Reports', 'Insights', 'Admin'];

  function boardOpen() {
    try { return !!(window.SLFBoard && SLFBoard.state().clientId); } catch (e) { return false; }
  }

  function purgeSidebarDuplicates(nav) {
    if (!nav) return;
    var btns = nav.querySelectorAll('button');
    for (var i = btns.length - 1; i >= 0; i--) {
      var b = btns[i];
      var v = b.getAttribute('data-view');
      var label = (b.textContent || '').trim();
      if ((v && DUP_VIEWS.indexOf(v) !== -1) || DUP_LABELS.indexOf(label) !== -1) {
        if (b.parentNode) b.parentNode.removeChild(b);
      }
    }
  }

  function setModuleBar(show) {
    var bar = document.getElementById('bos-module-bar');
    if (bar) bar.style.display = show ? '' : 'none';
  }

  function apply() {
    var aside = document.querySelector('aside');
    if (!aside) return;
    var nav = document.getElementById('nav');
    var livePanel = document.querySelector('#view .bleft');

    if (boardOpen()) {
      // ONE tab strip: hide sidebar nav AND the module bar.
      if (nav) nav.style.display = 'none';
      setModuleBar(false);
      if (livePanel) {
        var old = document.getElementById(PANEL_ID);
        if (old && old !== livePanel && old.parentNode) old.parentNode.removeChild(old);
        livePanel.id = PANEL_ID;
        aside.appendChild(livePanel);
      }
      aside.style.width = '330px';
      var wrap = document.querySelector('#view .bwrap');
      if (wrap) {
        wrap.style.display = 'grid';
        wrap.style.gridTemplateColumns = '1fr';
      }
    } else {
      // Module bar is the one navigation; sidebar keeps only
      // items it does not already have.
      setModuleBar(true);
      purgeSidebarDuplicates(nav);
      if (nav) nav.style.display = '';
      var stale = document.getElementById(PANEL_ID);
      if (stale && stale.parentNode) stale.parentNode.removeChild(stale);
      aside.style.width = '';
    }
  }

  function boot() {
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