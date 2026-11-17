// ============================================================
// SLF Single Navigation — v5. Fixes the v4 bug.
//
// v4 moved the client panel into the sidebar — but its cleanup
// loop then saw "no .bleft in #view" and treated that as "board
// closed", DELETING the panel it had just moved. The panel
// vanished from the screen. Owner report: "you broke my system."
//
// v5 rule (the owner's literal layout, nothing else):
//   Board open  -> nav tabs hidden; the client panel lives in
//                  the sidebar directly under "SLF CRM / Student
//                  Loan Forgiveness"; main = Client Dashboard
//                  header at the very top, tabs full width below.
//   Board closed-> sidebar back to normal, panel removed,
//                  width restored. Nothing else is touched.
// The panel is NEVER removed while the board is open — the only
// removal trigger is the board actually being closed.
// ============================================================
(function () {
  'use strict';

  var PANEL_ID = 'slf-side-panel';

  function boardOpen() {
    try { return !!(window.SLFBoard && SLFBoard.state().clientId); } catch (e) { return false; }
  }

  function apply() {
    var aside = document.querySelector('aside');
    if (!aside) return;
    var nav = document.getElementById('nav');
    var livePanel = document.querySelector('#view .bleft');

    if (boardOpen()) {
      if (nav) nav.style.display = 'none';
      // A fresh board render put the panel back in #view — move
      // the fresh copy up, drop the stale copy. This is a
      // REPLACE, never a delete-while-open.
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