// Forth clone — Contact Search nested tab (magnifying glass).
// Owner request (this session): Contact Search must be a nested
// TAB with a magnifying glass icon, and it must search WITHOUT
// leaving the client profile. Clicking the tab opens the search
// workspace IN the tab body (not a popup) and the cursor goes
// straight into the typing box.
// v2: the tab label is a REAL inline-SVG magnifying glass, not
// an emoji — the emoji glyph rendered invisibly on some machines
// (owner reported the tab could not be seen). SVG renders on
// every platform. Clicking it shows the search input inline in
// the tab workspace; type and results appear live, all without
// leaving the client record.
//
// Also per owner order: the duplicate Budget strip button is
// REMOVED (the Budget Analysis action in the action bar opens
// the same budget workspace). Budget data hooks and storage are
// untouched.
'use strict';
(function () {
  if (!window.SLFBoard || !SLFBoard.TABS) return;

  // ---- 1. Remove the duplicate Budget strip tab ----
  for (var i = SLFBoard.TABS.length - 1; i >= 0; i--) {
    if (SLFBoard.TABS[i].id === 'budget') SLFBoard.TABS.splice(i, 1);
  }

  // ---- 2. Add the Search tab (inline-SVG magnifying glass) ----
  // name is the icon markup; the strip renders it as-is. An
  // accessible aria-label keeps it usable for screen readers.
  SLFBoard.TABS.push({
    id: 'search',
    name: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-label="Search" style="vertical-align:middle;"><circle cx="11" cy="11" r="7"></circle><line x1="16.5" y1="16.5" x2="21" y2="21"></line></svg>',
    note: 'Search this contact\'s records without leaving the profile.',
    raw: true
  });

  var SEARCHABLE = ['history', 'calls', 'emails', 'notes', 'emarketing', 'sms', 'docs', 'events', 'tasks', 'alerts', 'cards', 'bank', 'debts', 'loans', 'lenders', 'servicing', 'budget'];

  function searchHtml(c) {
    return '<div class="bform" style="margin-bottom:10px;">' +
      '<input id="contact-search-input" placeholder="Search this contact\'s records…" ' +
      'style="width:100%;max-width:420px;" oninput="SLFBoard.runContactSearch(this.value)" />' +
      '</div>' +
      '<div id="contact-search-results" style="margin-top:6px;"></div>';
  }

  SLFBoard.runContactSearch = function (q) {
    var c = SLFBoard.client();
    var out = document.getElementById('contact-search-results');
    if (!c || !out) return;
    q = String(q || '').toLowerCase().trim();
    if (!q) { out.innerHTML = '<div class="bempty">Type above to search this contact\'s history, calls, emails, notes, and every other tab.</div>'; return; }
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
          if (!tabName) {
            if (tabId === 'budget') tabName = 'Budget';
          }
          var line = '';
          try { line = SLFBoard.line(tabId, r); } catch (e) { line = ''; }
          if (!line) line = text.slice(0, 120);
          matches.push('<div class="bitem"><span class="bts">' + esc(tabName) + '</span><span>' + esc(line) + '</span></div>');
        }
      });
    });
    out.innerHTML = matches.length
      ? matches.join('')
      : '<div class="bempty">No matches for "' + esc(q) + '".</div>';
  };

  // ---- 3. Render the Search workspace in the tab body ----
  var origTabBody = SLFBoard.panel.tabBody;
  SLFBoard.panel.tabBody = function (c) {
    if (SLFBoard.state().tab === 'search') {
      return '<p class="bnote">Search this contact\'s records without leaving the profile.</p>' + searchHtml(c);
    }
    return origTabBody.apply(SLFBoard.panel, arguments);
  };

  // Autofocus the search input when the Search tab opens.
  var origSetTab = SLFBoard.setTab;
  SLFBoard.setTab = function (t) {
    origSetTab(t);
    if (t === 'search') {
      setTimeout(function () {
        var el = document.getElementById('contact-search-input');
        if (el) el.focus();
      }, 50);
    }
  };
})();
