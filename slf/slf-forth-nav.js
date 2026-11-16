// Forth clone — top navigation bar module.
// The Jul2024 Forth screenshot ("Contacts Tab to Client Dash to
// Nested Tabs") shows a navigation bar across the Client Dashboard
// with: Edit Contact, Clone, Create Order, Budget Analysis,
// Creditors, Enrollment, Settlements (links vary by permissions).
// Renders the bar between the client header and the tab strip.
// The Update Status placement (fixed in #34) is untouched.
'use strict';
(function () {
  if (!window.SLFBoard || !SLFBoard.render) return;
  var esc = SLFBoard.esc;

  // Nav bar HTML (rendered inside the dashboard view).
  SLFBoard.panel.forthNavHtml = function (c) {
    function item(label, action) {
      return '<span class="fnavi" style="color:var(--gold);font-size:12px;cursor:pointer;white-space:nowrap;" onclick="SLFBoard.navAction(\'' + action + '\')">' + label + '</span>';
    }
    return '<div class="fnav" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin:0 0 12px 0;padding:8px 12px;background:rgba(15,32,64,0.35);border:1px solid var(--line);border-radius:10px;">' +
      item('Edit Contact', 'edit') +
      item('Clone', 'clone') +
      item('Create Order', 'order') +
      item('Budget Analysis', 'budget') +
      item('Creditors', 'creditors') +
      item('Enrollment', 'enrollment') +
      item('Settlements', 'settlements') +
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
})();
