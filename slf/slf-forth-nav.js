// Forth clone — top navigation bar module v7.
// Owner directive (stated repeatedly, final form): ONE search
// element — the magnifying glass INSIDE the tab/field where you
// type. Not a glass button beside a box (v5), not a glass that
// reveals a box (v6). v7 renders a single search input in the
// action bar with the glass icon embedded inside it on the left
// (absolutely positioned SVG, pointer-events:none). The user
// clicks the field and starts typing. Nothing toggles, nothing
// appears, nothing moves — the field is always there, identical
// before and after any click. Results render in a floating panel
// under the bar (absolute, zero reflow); the current tab and
// workspace are never touched.
// Everything else identical to v6 (8 labeled actions, #34's
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
      // Click it, type. No toggle, no reveal — it never changes.
      return '<div class="fnav" style="position:relative;display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin:0 0 12px 0;padding:8px 12px;background:rgba(15,32,64,0.35);border:1px solid var(--line);border-radius:10px;">' +
        '<span style="position:relative;display:inline-flex;align-items:center;flex:none;">' +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none;"><circle cx="11" cy="11" r="7"></circle><line x1="16.5" y1="16.5" x2="21" y2="21"></line></svg>' +
        '<input id="fnav-search-input" placeholder="Search this contact\'s records…" style="width:210px;max-width:210px;padding:6px 10px 6px 27px;font-size:12px;border-radius:7px;border:1px solid var(--line);background:rgba(10,22,40,0.6);color:var(--text);font-family:inherit;" oninput="SLFBoard.runContactSearch(this.value)" />' +
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
        // Floating results panel — hidden until the user types;
        // absolute, so nothing ever reflows.
        '<div id="fnav-search-results" style="display:none;position:absolute;top:calc(100% + 6px);left:12px;z-index:30;width:420px;max-width:calc(100% - 24px);padding:8px 12px;background:#0E1F3C;border:1px solid var(--line);border-radius:10px;max-height:220px;overflow:auto;box-shadow:0 6px 18px rgba(4,10,20,0.5);"></div>' +
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
