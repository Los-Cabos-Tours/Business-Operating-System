// ============================================================
// SLF Single Navigation — one nav, no duplicates
// Owner order (2026-11-17): "I do not need the same tab 2 times
// in the system — take away the side tabs; we already have them
// in the main tabs." Target layout is the Forth-style horizontal
// top module bar (already built in slf-bos-nav-final.js): 17
// modules across the top, no duplicate left-side tabs.
//
// WHAT THIS DOES:
//  - Hides the left sidebar's view-tab block (Dashboard, Clients,
//    Cases & Pipeline, Activity History, Backup & Restore,
//    Custom Fields, Signatures) on every load and after every
//    DOM change. Those destinations all remain reachable from
//    the TOP module bar / dashboard view, so nothing is lost —
//    the duplicate nav surface is simply removed.
//  - Keeps the sidebar's brand header (SLF CRM / Student Loan
//    Forgiveness) and the '← BOS Main' back link intact.
//  - The sidebar keeps its width so the layout does not jump.
//
// Sidebar DOM (slf/index.html):
//   <aside> <h1>SLF CRM</h1> <div class="tag">…</div> <nav id="nav">…</nav> </aside>
// The <nav id="nav"> block is the duplicated tab list. This
// module hides that nav block (and nothing else).
// ============================================================
(function () {
  'use strict';

  function hideSidebarTabs() {
    var nav = document.getElementById('nav');
    if (nav) nav.style.display = 'none';
    // Modules that dynamically inject sidebar buttons (Custom
    // Fields designer, eSign) append into #nav — already covered
    // by hiding the container. Belt-and-braces for any stray
    // sibling nav blocks:
    var strays = document.querySelectorAll('aside nav, aside #nav');
    Array.prototype.forEach.call(strays, function (n) { n.style.display = 'none'; });
  }

  function boot() {
    hideSidebarTabs();
    setInterval(hideSidebarTabs, 1000);
    if (window.MutationObserver) {
      new MutationObserver(hideSidebarTabs)
        .observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();