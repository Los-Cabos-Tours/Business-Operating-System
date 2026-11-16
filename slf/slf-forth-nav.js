// Forth clone — top navigation bar module v4.
// Owner correction (this session): the magnifying glass belongs
// HERE — in the action bar, first item, exactly where Contact
// Search originally sat. NOT at the end of the nested tab strip.
// Clicking the glass changes NOTHING on screen except showing
// the inline search field inside this bar — the current tab,
// its records, and the whole workspace stay untouched (no tab
// switch, no workspace replacement). The user can start typing
// immediately.
// Everything else identical to v3 (bind on DOMContentLoaded,
// 8 labeled actions, #34's Update Status block untouched).
'use strict';
(function () {
  if (!window.SLFBoard) return;

  var GLASS = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" style="vertical-align:-2px;"><circle cx="11" cy="11" r="7"></circle><line x1="16.5" y1="16.5" x2="21" y2="21"></line></svg>';

  function bindActionBar() {
    if (!window.SLFBoard || !SLFBoard.panel) return;

    SLFBoard.panel.forthNavHtml = function (c) {
      function item(label, action) {
        return '<span class="fnavi" style="color:var(--gold);font-size:12px;cursor:pointer;white-space:nowrap;" onclick="SLFBoard.navAction(\'' + action + '\')">' + label + '</span>';
      }
      return '<div class="fnav" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin:0 0 12px 0;padding:8px 12px;background:rgba(15,32,64,0.35);border:1px solid var(--line);border-radius:10px;">' +
        '<span class="fnavi" title="Search this contact\'s records" style="color:var(--gold);font-size:12px;cursor:pointer;white-space:nowrap;" onclick="SLFBoard.toggleSearch()">' + GLASS + '</span>' +
        '<input id="fnav-search-input" placeholder="Search this contact\'s records…" style="display:none;width:220px;max-width:220px;padding:4px 8px;font-size:11.5px;border-radius:7px;border:1px solid var(--line);background:rgba(10,22,40,0.6);color:var(--text);font-family:inherit;" oninput="SLFBoard.runContactSearch(this.value)" />' +
        item('Edit Contact', 'edit') +
        item('Clone', 'clone') +
        item('Create Order', 'order') +
        item('Budget Analysis', 'budget') +
        item('Creditors', 'creditors') +
        item('Enrollment', 'enrollment') +
        item('Settlements', 'settlements') +
        '<span class="fnavi" style="color:var(--gold);font-size:12px;cursor:pointer;white-space:nowrap;" onclick="SLFBoard.setTab(\'alerts\');setTimeout(function(){var f=document.getElementById(\'q-aname\');if(f)f.focus();},60)">Add Alert</span>' +
        '<span style="margin-left:auto;display:inline-flex;align-items:center;gap:6px;">' +
        '<span style="color:var(--muted);font-size:11px;">Favorites</span>' +
        '<select id="fav-select" style="width:auto;max-width:150px;padding:4px 8px;font-size:11px;background:rgba(10,22,40,0.6);border:1px solid var(--line);border-radius:6px;color:var(--text);">' +
        '<option value="">— select —</option></select></span>' +
        '</div>' +
        '<div id="fnav-search-results" style="display:none;margin:0 0 12px 0;padding:8px 12px;background:rgba(15,32,64,0.35);border:1px solid var(--line);border-radius:10px;max-height:220px;overflow:auto;"></div>';
    };

    SLFBoard.navAction = function (a) {
      var c = SLFBoard.client();
      if (!c) return;
      switch (a) {
        case 'edit':
          if (window.SLF) SLF.openClientModal(SLF.clientById(c.id));
          break;
        case 'clone':
          if (window.SLF && SLF.openClientModal) {
            var src = SLF.clientById(c.id);
            SLF.openClientModal(null);
            setTimeout(function () {
              if (!src) return;
              document.getElementById('c-name').value = (src.name || '') + ' (Copy)';
              document.getElementById('c-email').value = src.email || '';
              document.getElementById('c-phone').value = src.phone || '';
              document.getElementById('c-notes').value = src.notes || '';
            }, 50);
          }
          break;
        case 'budget':
          SLFBoard.setTab('budget');
          break;
        case 'creditors':
          SLFBoard.setTab('debts');
          break;
        case 'enrollment':
          SLFBoard.setTab('loans');
          break;
        case 'order':
        case 'settlements':
          SLFBoard.setTab('history');
          break;
        default:
          break;
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindActionBar);
  } else {
    bindActionBar();
  }
})();
