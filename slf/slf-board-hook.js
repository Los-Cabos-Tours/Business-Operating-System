// ============================================================
// SLF Board Hook — connects the Clients table to the Client
// Dashboard. After the clients view renders, each client name
// becomes a clickable link that opens SLFBoard (Forth-style
// client profile). Loaded via slf-guard after slf-client-dashboard.
// ============================================================
'use strict';
(function () {
  function bind() {
    if (!window.SLF || !window.SLFBoard) return;
    var origRender = SLF.render;
    if (SLF.render.__boardHooked) return;
    SLF.render = function () {
      origRender.apply(SLF, arguments);
      try {
        if (SLF.view !== 'clients') return;
        var rows = document.querySelectorAll('#view table tbody tr');
        Array.prototype.forEach.call(rows, function (tr) {
          if (tr.hasAttribute('data-board')) return;
          if (tr.cells.length < 2) return;
          tr.setAttribute('data-board', '1');
          var id = tr.cells[0].textContent.trim();
          var nameCell = tr.cells[1];
          nameCell.style.cursor = 'pointer';
          nameCell.style.color = 'var(--gold)';
          nameCell.title = 'Open Client Dashboard';
          nameCell.addEventListener('click', function () {
            SLFBoard.open(id);
          });
        });
      } catch (e) { /* hook must never break the main app */ }
    };
    SLF.render.__boardHooked = true;
  }
  document.addEventListener('DOMContentLoaded', function () { setTimeout(bind, 0); });
})();
