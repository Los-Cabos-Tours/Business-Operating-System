// ============================================================
// Required CRM navigation architecture — render integration.
// Runs after slf-bos-nav.js (which defines window.BOSCRM and the
// module registry). This module:
//   - wraps SLFBoard.render so the breadcrumb (Main CRM /
//     Contacts / <contact>) is placed above the Client Dashboard
//     rather than inside the tab body
//   - adds a working Contact Search input to the Contacts
//     directory (filters the table live by name, email, phone, ID)
//   - highlights the active main module whenever the view changes
//   - wires placeholder-module selection through the same render
//     path so navigation state stays consistent
// No storage keys touched; read-only over SLF.clients.
// ============================================================
'use strict';
(function () {
  if (!window.SLFBoard || !window.SLF || !window.BOSCRM) return;

  // ---------- Breadcrumb above the Client Dashboard ----------
  var rawRender = SLFBoard.render;
  SLFBoard.render = function () {
    rawRender();
    var c = SLFBoard.client();
    var v = document.getElementById('view');
    if (c && v && SLFBoard.panel.breadcrumbHtml) {
      v.insertAdjacentHTML('afterbegin', SLFBoard.panel.breadcrumbHtml(c));
    }
    BOSCRM.syncActive();
  };

  // ---------- Contact search in the Contacts directory ----------
  var rawSlfRender = SLF.render;
  SLF.render = function () {
    rawSlfRender();
    if (SLF.view !== 'clients') return;
    var v = document.getElementById('view');
    if (!v) return;
    var tb = document.getElementById('client-search-input');
    if (tb) return; // already injected
    var bar = '<div class="toolbar" style="margin-bottom:12px;">' +
      '<input id="client-search-input" placeholder="Search contacts by name, email, phone, or ID…" ' +
      'style="max-width:320px;" oninput="BOSCRM.filterClients(this.value)" /></div>';
    v.insertAdjacentHTML('afterbegin', bar);
    var input = document.getElementById('client-search-input');
    if (input) input.id = 'client-search'; // match the action-bar focus target
  };

  BOSCRM.filterClients = function (q) {
    q = String(q || '').toLowerCase().trim();
    var table = document.querySelector('#view table tbody');
    if (!table) return;
    Array.prototype.forEach.call(table.rows, function (row) {
      if (!q) { row.style.display = ''; return; }
      var text = (row.textContent || '').toLowerCase();
      row.style.display = text.indexOf(q) !== -1 ? '' : 'none';
    });
  };

  // ---------- Keep main-module highlight in sync ----------
  BOSCRM.syncActive = function () {
    var map = { dashboard: 'dashboard', clients: 'contacts', cases: 'cases', history: 'history', backup: 'backup' };
    var current = SLF.view;
    var modId = null;
    for (var k in map) if (map[k] === current) modId = k;
    if (SLFBoard.state().clientId) modId = 'contacts';
    if (!modId) {
      // Placeholder views keep their module id directly.
      modId = BOSCRM.activePlaceholder || 'dashboard';
    }
    BOSCRM.activeModule = modId;
    var nav = document.getElementById('nav');
    if (!nav) return;
    Array.prototype.forEach.call(nav.querySelectorAll('button[data-bos]'), function (b) {
      var isActive = b.getAttribute('data-bos') === modId;
      b.classList.toggle('active', isActive);
    });
  };
})();
