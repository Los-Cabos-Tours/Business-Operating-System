// Forth clone — in-bar contact record search.
// Owner correction (this session): clicking the magnifying glass
// produces ZERO screen change. The search input is ALWAYS in the
// action bar (same pixels before and after clicking); the glass
// only focuses it. The results panel appears ONLY after the user
// actually types — and even then, the current tab and its
// records below are never modified.
// The Budget strip button stays removed (#43 order).
'use strict';
(function () {
  if (!window.SLFBoard || !SLFBoard.TABS) return;

  // ---- Keep the duplicate Budget strip tab removed (#43 order) ----
  for (var i = SLFBoard.TABS.length - 1; i >= 0; i--) {
    if (SLFBoard.TABS[i].id === 'budget') SLFBoard.TABS.splice(i, 1);
  }

  var SEARCHABLE = ['history', 'calls', 'emails', 'notes', 'emarketing', 'sms', 'docs', 'events', 'tasks', 'alerts', 'cards', 'bank', 'debts', 'loans', 'lenders', 'servicing', 'budget'];

  // Clicking the glass does EXACTLY one thing: puts the cursor in
  // the box that is already on screen. No display change, no toggle.
  SLFBoard.focusSearch = function () {
    var box = document.getElementById('fnav-search-input');
    if (box) box.focus();
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
    // live only in this panel under the bar.
  };
})();
