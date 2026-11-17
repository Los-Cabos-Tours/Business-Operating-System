// ============================================================
// SLF Single Navigation — v7. Owner order (2026-11-17):
//   "I asked you to remove those tabs from the sidebar and you
//    put them back. Remove them now."
//   Sidebar tabs (Cases & Pipeline, Activity History, Backup &
//   Restore, Custom Fields, Signatures, Dashboard, Clients) are
//   removed PERMANENTLY. The sidebar shows ONLY:
//     SLF CRM
//     Student Loan Forgiveness
//     (+ the client panel while a client is open)
//
//   The 17-module top bar is the ONE navigation when no client
//   is open. While a client is open it hides, and the ONE tab
//   strip is the nested client tabs under the Client Dashboard
//   header at the very top of the main area.
//   No element ever appears more than once on screen.
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
    // Belt and suspenders: any tab buttons ever re-injected into
    // the sidebar by another module are removed from the DOM.
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
    var livePanel = document.querySelector('#view .bleft');

    if (boardOpen()) {
      setModuleBar(false); // one tab strip: the nested client tabs
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
      setModuleBar(true); // the one navigation while no client is open
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