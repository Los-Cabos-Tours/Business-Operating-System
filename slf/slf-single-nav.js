// ============================================================
// SLF Single Navigation — v3.
// v3 UNDOES v2 (the 17-module sidebar move was never requested)
// and fixes the one reported defect: the area under
// "SLF CRM / Student Loan Forgiveness" rendered empty because v1
// hid the whole sidebar nav and the top bar does not cover it.
//
// v3 does exactly one thing: the sidebar tabs render again.
// Per the standing no-duplicates order, the two tabs the top
// module bar already shows (Dashboard, Clients/Contacts) stay
// hidden; the rest (Cases & Pipeline, Activity History,
// Backup & Restore, plus anything a module appends) are visible
// again. The top bar is untouched. The board is untouched.
// ============================================================
(function () {
  'use strict';

  var DUPLICATED = ['dashboard', 'clients'];

  function apply() {
    var nav = document.getElementById('nav');
    if (!nav) return;
    nav.style.display = '';
    var btns = nav.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      var v = btns[i].getAttribute('data-view');
      var dup = v && DUPLICATED.indexOf(v) !== -1;
      btns[i].style.display = dup ? 'none' : '';
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