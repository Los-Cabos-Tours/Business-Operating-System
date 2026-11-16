// Forth clone — Contact Search nested tab (magnifying glass).
// Owner request (this session): Contact Search must be a nested
// TAB with a magnifying glass icon, and it must search WITHOUT
// leaving the client profile. This module adds a magnifying-glass
// tab to the nested strip whose workspace searches every record
// stored for THIS contact across all tabs (history, calls,
// emails, notes, docs, tasks, events, sms, emarketing, cards,
// bank, debts, loans, lenders, servicing, alerts, budget) and
// shows the matching lines, live, as you type.
//
// Label: ICON ONLY — just the magnifying glass, no "Search" text.
//
// Also per owner order: the duplicate Budget strip button is
// REMOVED (the Budget Analysis action in the action bar opens
// the same budget workspace — the tab appears exactly once, as
// an action, not as a strip tab). Budget data hooks and storage
// are untouched.
'use strict';
(function () {
  if (!window.SLFBoard || !SLFBoard.TABS) return;

  // ---- 1. Remove the duplicate Budget strip tab ----
  // The Budget Analysis action (slf-forth-nav.js) opens the
  // budget workspace via setTab('budget'), so the data hooks
  // stay registered — only the strip button is removed.
  for (var i = SLFBoard.TABS.length - 1; i >= 0; i--) {
    if (SLFBoard.TABS[i].id === 'budget') SLFBoard.TABS.splice(i, 1);
  }

  // ---- 2. Add the Search tab (magnifying glass, icon only) ----
  SLFBoard.TABS.push({ id: 'search', name: '🔍', note: 'Search this contact\'s records without leaving the profile.' });

  var SEARCHABLE = ['history', 'calls', 'emails', 'notes', 'emarketing', 'sms', 'docs', 'events', 'tasks', 'alerts', 'cards', 'bank', 'debts', 'loans', 'lenders', 'servicing', 'budget'];

  function searchHtml(c) {
    var esc = SLFBoard.esc;
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
            // budget is no longer in the strip; keep a readable name
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
