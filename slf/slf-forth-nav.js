// Forth clone — top navigation bar module v8.
// Owner directive (final, literal): ONE element — the magnifying
// glass INSIDE the field where you type. And when the user types
// in that field, NOTHING on the page changes: no panel appears,
// nothing moves, no tab switches, no workspace change. v7 still
// revealed a floating results panel on typing — that was a
// visible change and is removed in v8. The field is permanently
// in the action bar; click it and type; the page stays exactly
// as it is, before, during, and after typing.
// Everything else identical to v7 (8 labeled actions, #34's
// Update Status block untouched).
'use strict';
(function () {
  if (!window.SLFBoard) return;

  function bindActionBar() {
    if (!window.SLFBoard || !SLFBoard.panel) return;

    SLFBoard.panel.forthNavHtml = function (c) {
      function item(label, action) {
        return '<span class="fnavi" style="color:var(--gold);font-size:12px;cursor:pointer;white-space:nowrap;" onclick="SLFBoard.navAction(\'' + action + '\')">' + label + '</span>';
      }
      // Single search field: glass icon INSIDE the input (left),
      // embedded via absolute positioning over a padded input.
      // Click it, type. No toggle, no reveal, no results panel —
      // typing changes nothing on screen.
      return '<div class="fnav" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin:0 0 12px 0;padding:8px 12px;background:rgba(15,32,64,0.35);border:1px solid var(--line);border-radius:10px;">' +
        '<span style="position:relative;display:inline-flex;align-items:center;flex:none;">' +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none;"><circle cx="11" cy="11" r="7"></circle><line x1="16.5" y1="16.5" x2="21" y2="21"></line></svg>' +
        '<input id="fnav-search-input" placeholder="Search this contact\'s records…" style="width:210px;max-width:210px;padding:6px 10px 6px 27px;font-size:12px;border-radius:7px;border:1px solid var(--line);background:rgba(10,22,40,0.6);color:var(--text);font-family:inherit;" />' +
        '</span>' +
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
        '</div>';
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
