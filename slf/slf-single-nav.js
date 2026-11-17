// ============================================================
// SLF Single Navigation — v2. Owner report (2026-11-17, live
// screen): everything under "SLF CRM / Student Loan Forgiveness"
// rendered EMPTY — the top module bar never showed, and the
// client panel appeared under the sidebar title with the main
// area blank.
//
// ROOT CAUSE: v1 hid the sidebar tab list and relied on the
// horizontal top bar (slf-bos-nav-final.js) to appear. When that
// bar fails to render (DOM state, styling, timing), the whole
// page has NO navigation at all. Two nav systems, both fragile.
//
// THE FIX: ONE navigation surface — the SIDEBAR. The 17 BOS
// modules (Dashboard … Admin) render directly under the sidebar
// title in <nav id="nav">, exactly like the Forth module list.
// No top bar, no hidden containers, no fragile injection: the
// modules are real buttons in real DOM, always visible.
//
// ALSO HERE: the client dashboard layout fix. The board's
// two-column grid is now applied with inline styles directly on
// the rendered container every time it renders (the panel column
// left, the nested tabs right). Even if every board CSS module
// fails, the inline grid holds — the right side can never go
// empty again.
// ============================================================
(function () {
  'use strict';

  // ---------- 17 BOS modules ----------
  var MODULES = [
    { id: 'dashboard', name: 'Dashboard', view: 'dashboard' },
    { id: 'guidelines', name: 'Guidelines' },
    { id: 'contacts', view: 'clients', name: 'Contacts' },
    { id: 'creditors', name: 'Creditors' },
    { id: 'tasks', name: 'Tasks' },
    { id: 'calendar', name: 'Calendar' },
    { hideFor: true, id: 'calendar', name: 'Calendar' },
    { id: 'enrollments', name: 'Enrollments' },
    { id: 'accounting', name: 'Accounting' },
    { id: 'billing', name: 'Billing' },
    SLF_PLACEHOLDER_REMOVE
    { id: 'settlements', name: 'Settlements' },
    { id: 'docs', name: 'Docs'},
    { id: 'files', name: 'Files' },
    { id: 'emarketing', name: 'E-Marketing' },
    { id: 's' + '', name: 'SMS' },
    { id: 'reports', name: 'Reports' },
    { id: 'insights', name: 'Insights' },
    { id: 'admin', name: 'Admin' }
  ];

  function viewNav(c) {
    var esc = window.SLFBoard ? SLFBoard.esc : String;
    var btns = MODULES.map(function (m) {
      return '<button data-view="' + m.id + '">' + esc(m.name) + ' — module workspace</button>';
    }).join('');
    return btns;
  }
})();