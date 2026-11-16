// Forth clone — top navigation bar module v2.
// FIX: v1 guarded on `!SLFBoard.render` and returned early — but
// this file loads BEFORE slf-board-main.js (which creates
// SLFBoard.render), so it silently bailed on every load and the
// action bar never rendered. v2 drops that broken guard and
// binds the panel hooks on DOMContentLoaded, after ALL modules
// have loaded and the panel exists.
// Owner-approved placement (spec §3): Contact Search, Edit
// Contact, Clone, Create Order, Budget Analysis, Creditors,
// Enrollment, Settlements, Add Alert — all 9 actions — plus the
// Favorites selector. #34's Update Status block is untouched.
'use strict';
(function () {
  if (!window.SLFBoard) return;

  function bindActionBar() {
    if (!window.SLFBoard || !SLFBoard.panel) return;

    SLFBoard.panel.forthNavHtml = function (c) {
      function item(label, action) {
        return '<span class="fnavi" style="color:var(--gold);font-size:12px;cursor:pointer;white-space:nowrap;" onclick="SLFBoard.navAction(\'' + action + '\')">' + label + '</span>';
      }
      return '<div class="fnav" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin:0 0 12px 0;padding:8px 12px;background:rgba(15,32,64,0.35);border:1px solid var(--line);border-radius:10px;">' +
        '<span class="fnavi" style="color:var(--gold);font-size:12px;cursor:pointer;white-space:nowrap;" onclick="SLF.view=\'clients\';SLF.render();setTimeout(function(){var s=document.getElementById(\'client-search\');if(s)s.focus();},50)">Contact Search</span>' +
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
