// Forth clone — in-bar contact record search.
// Owner correction (this session): the magnifying glass lives in
// the ACTION BAR (first item, where Contact Search originally
// sat) — NOT in the nested tab strip, NOT at the bottom. Clicking
// it changes NOTHING on screen except revealing the inline
// search field inside the action bar itself. The current tab,
// its records, and the whole workspace are never touched — no
// tab switch, no workspace replacement, no data taken away.
// Results render in a small panel that appears under the action
// bar, above the current tab content.
// The Budget strip button stays removed (per earlier owner
// order — Budget Analysis in the action bar is the one entry).
'use strict';
(function () {
  if (!window.SLFBoard || !SLFBoard.TABS) return;

  // ---- Keep the duplicate Budget strip tab removed (#43 order) ----
  for (var i = SLFBoard.TABS.length - 1; i >= 0; i--) {
    if (SLFBoard.TABS[i].id === 'budget') SLFBoard.TABS.splice(i, 1);
  }

  // ---- Strip stays clean: no search tab, no icon in the strip ----
  // (Earlier attempts wrongly appended the search as a strip tab.
  // It has been removed; the strip is exactly the plain tabs.)

  var SEARCHABLE = ['history', 'calls', 'emails', 'notes', 'emarketing', 'sms', 'docs', 'events', 'tasks', 'alerts', 'cards', 'bank', 'debts', 'loans', 'lenders', 'servicing', 'budget'];

  // Toggle the inline search field in the action bar. Nothing
  // else on screen changes; the current tab is untouched.
  SLFBoard.toggleSearch = function () {
    var box = document.getElementById('fnav-search-input');
    var out = document.getElementById('fnav-search-results');
    if (!box) return;
    var showing = box.style.display !== 'none';
    box.style.display = showing ? 'none' : 'inline-block';
    if (out) {
      out.style.display = 'none';
      out.innerHTML = '';
    }
    if (!showing) box.focus();
    else box.value = '';
  };

  SLFBoard.runContactSearch = function (q) {
    var c = SLFBoard.client();
    var out = document.getElementById('fnav-search-results');
    if (!c || !out) return;
    q = String(q || '').toLowerCase().trim();
    out.style.display = 'block';
    if (!q) {
      out.innerHTML = '<div style="color:var(--muted);font-size:12px;">Type to search this contact\'s records.</div>';
      return;
    }
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
    // IMPORTANT: the current tab and its records are untouched.
    // Search results live only in this panel under the bar.
  };
})();
