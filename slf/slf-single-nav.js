// ============================================================
// SLF Single Navigation — v4. Owner layout, taken literally from
// the report: "this goes under this — SLF CRM / Student Loan
// Forgiveness — with this at the very top — Client Dashboard…"
//
// When a client is open:
//   SIDEBAR:  SLF CRM / Student Loan Forgiveness
//             [nav tabs]
//             CLIENT PANEL — Student Loan banner, Quick Message,
//             Workflow History, Company/Secondary Assignment,
//             Phone, E-Mail, DOB, SSN, Address, Notes, Save
//             Profile (the .bleft panel, moved under the title)
//   MAIN:     Client Dashboard header (breadcrumb, name, ID,
//             + New Case, Export, Delete, Update Status) at the
//             VERY TOP, then the nested tabs filling the width.
// When no client is open: sidebar back to normal, nothing moved.
//
// That is the whole change. Nothing else is touched.
// ============================================================
(function () {
  'use strict';

  var DUPLICATED = ['dashboard', 'clients'];
  var PANEL_ID = 'slf-side-panel';

  function apply() {
    var aside = document.querySelector('aside');
    if (!aside) return;

    // Nav tabs: visible; only the two the top bar already shows stay hidden.
    var nav = document.getElementById('nav');
    if (nav) {
      nav.style.display = '';
      var btns = nav.querySelectorAll('button');
      for (var i = 0; i < btns.length; i++) {
        var v = btns[i].getAttribute('data-view');
        var dup = v && DUPLICATED.indexOf(v) !== -1;
        btns[i].style.display = dup ? 'none' : '';
      }
    }

    var livePanel = document.querySelector('#view .bleft');
    if (livePanel) {
      // Board open: the panel belongs in the sidebar, under the
      // title. Move it there.
      var existing = document.getElementById(PANEL_ID);
      if (existing && existing !== livePanel && existing.parentNode) {
        existing.parentNode.removeChild(existing);
      }
      livePanel.id = PANEL_ID;
      aside.appendChild(livePanel);
      aside.style.width = '330px';
      // The main area now carries header at top + tabs full width.
      var wrap = document.querySelector('#view .bwrap');
      if (wrap) {
        wrap.style.display = 'grid';
        wrap.style.gridTemplateColumns = '1fr';
      }
    } else {
      // Board closed: remove the moved panel, restore the sidebar.
      var old = document.getElementById(PANEL_ID);
      if (old && old.parentNode) old.parentNode.removeChild(old);
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