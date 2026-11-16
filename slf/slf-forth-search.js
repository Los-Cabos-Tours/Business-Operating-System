// Forth clone — in-bar contact record search.
// Owner correction (this session): ONE search entry in the bar —
// the magnifying glass alone. No permanently visible search box
// next to it (that was rejected as a duplicate). Clicking the
// glass reveals the floating search field directly under it,
// cursor ready; the results panel appears as you type. Neither
// element participates in the bar's flex layout, so nothing in
// the bar ever moves. The current tab and its records are never
// touched.
// The Budget strip button stays removed (#43 order).
'use strict';
(function () {
  if (!window.SLFBoard || !SLFBoard.TABS) return;

  // ---- Keep the duplicate Budget strip tab removed (#43 order) ----
  for (var i = SLFBoard.TABS.length - 1; i >= 0; i--) {
    if (SLFBoard.TABS[i].id === 'budget') SLFBoard.TABS.splice(i, 1);
  }

  var SEARCHABLE = ['history', 'calls', 'emails', 'notes', 'emarketing', 'sms', 'docs', 'events', 'tasks', 'alerts', 'cards', 'bank', 'debts', 'loans', 'lenders', 'servicing', 'budget'];

  // Clicking the glass reveals the floating field under it and
  // puts the cursor in. Clicking again (or Esc) hides it. Nothing
  // else on screen changes; the current tab is untouched.
  SLFBoard.toggleSearch = function () {
    var box = document.getElementById('fnav-search-input');
    var out = document.getElementById('fnav-search-results');
    if (!box) return;
    var showing = box.style.display !== 'none';
    box.style.display = showing ? 'none' : 'block';
    if (out) {
      out.style.display = 'none';
      out.innerHTML = '';
    }
    if (showing) {
      box.value = '';
    } else {
      box.focus();
    }
  };

  SLFBoard.runContactSearch = function (q) {
    var c = SLFBoard.client();
    var out = document.getElementById('fnav-search-results');
    if (!c || !out) return;
    q = String(q || '').toLowerCase().trim();
    if (!q) {
      out.style.display = 'none';
      out.innerHTML = '';
      return;
    }
    out.style.display = 'block';
    var esc = SLFBoard.esc;
    var matches = [];
    var d = SLFBoard.all();
    var rec = d[c.id] || {};
    SEARCHABLE.forEach(function (tabId) {
      var list = rec[tabId] || [];
      list.forEach(function (r) {
        var text = (r && typeof r === 'object') ? JSON.stringify(r) : String(r);
        if (text.toLowerCase().indexOf(q) !== -1) {
          var tabName = '';
          SLFBoard.TABS.forEach(function (t) { if (t.id === tabId) tabName = t.name; });
          if (!tabName && tabId === 'budget') tabName = 'Budget';
          var line = '';
          try { line = SLFBoard.line(tabId, r); } catch (e) { line = ''; }
          if (!line) line = text.slice(0, 120);
          matches.push('<div class="bitem"><span class="bts">' + esc(tabName) + '</span><span>' + esc(line) + '</span></div>');
        }
      });
    });
    out.innerHTML = matches.length
      ? matches.join('')
      : '<div style="color:var(--muted);font-size:12px;">No matches for "' + esc(q) + '".</div>';
    // The current tab and its records are never touched — results
    // live only in this floating panel under the bar.
  };
})();
