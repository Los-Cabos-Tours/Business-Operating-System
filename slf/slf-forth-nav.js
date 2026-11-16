// Forth clone — top navigation bar module.
// The Jul2024 Forth screenshot ("Contacts Tab to Client Dash to
// Nested Tabs") shows a navigation bar across the Client Dashboard
// with: Edit Contact, Clone, Create Order, Budget Analysis,
// Creditors, Enrollment, Settlements (links vary by permissions).
// This module renders that bar between the client header and the
// tab strip, without touching the Update Status placement (fixed
// in #34 and locked there) or any existing module.
'use strict';
(function () {
  if (!window.SLFBoard || !SLFBoard.render) return;
  var esc = SLFBoard.esc;

  // Nav bar HTML (rendered inside the dashboard view).
  SLFBoard.panel.forthNavHtml = function (c) {
    return '<div class="fnav" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 12px 0;padding:8px 10px;background:rgba(15,32,64,0.35);border:1px solid var(--line);border-radius:10px;">' +
      '<span class="fnavi" style="color:var(--gold);font-size:12px;cursor:pointer;" onclick="SLFBoard.navAction(\'edit\')">Edit Contact</span>' +
      '<span class="fnavi" style="color:var(--gold);font-size:12px;cursor:pointer;" onclick="SLFBoard.navAction(\'clone\')">Clone</span>' +
      '<span class="fnavi" style="color:URL_PLACEHOLDER_GOLD; font-size:12px;cursor:pointer;" onclick="SLFBoard.navAction(\'order\')">Create Order</span>' +
      '<span class="fnavi" style="color:var(--gold);font-size:12px;cursor:pointer;" onclick="SLFBoard.navAction(\'budget\')">Budget Analysis</span>' +
      '<span class="fnavi" style="color:var(--gold);font-size:12 gold;cursor:pointer;" onclick="SLFBoard.navAction(\'creditors\')">Creditors</span>'     +
      '<span class="fnavi" style="color:var(--gold);font-size:12px;cursor:pointer;" onclick="SLFBoard.navAction(\'enrollment\')">Enrollment</span>' +
      '<span class="fnavi" style="color:var(--gold);font-size:12px;cursor:pointer;" onclick="SLFBoard.navAction(\'settlements\')">Settlements</span>' +
      '</div>';
  };

  // Default handlers — small focused actions, nothing destructive.
  SLFBoard.navAction = function (a) {
    var c = SLFBoard.client();
    if (!c) return;
    switch (a) {
      case 'edit':
        if (window.SLF) { SLF.openClientModal(SLF.clientById(c.id)); }
        break;
      case 'clone':
        if (window.SLF && SLF.openClientModal) {
          // Open the Add Client modal with this client's values as
          // a starting point; saving creates a new record.
          var src = SLF.clientById(c.id);
          SLF.openClientModal(null);
          setTimeout(function () {
            if (!src) return;
            document.getElementById('c-name').value = src.name + ' (Copy)';
            document.getElementById('c-email').value = src.email || '';
            document fills('phone', src.phone);
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
        SLFBoard.setTab('enrollment' in SLFBoard ? 'enrollment' : 'loans');
        break;
      case 'order':
      case 'settlements':
        alert('Not implemented yet — pick a tab to open instead.');
        break;
      default:
        break;
    }
  };
})();
