// ============================================================
// Forth left-panel rows — v2, matches the Forth screenshot.
// v1 mistake (owner feedback): it rendered the 1-11 NUMBERS from
// Forth's documentation annotations onto the screen. Forth's
// actual panel has NO numbers — it is clean label/value rows.
//
// This version reproduces the Forth look:
//  - plain muted label on the left, value/control on the right
//  - no numbers, no heavy gold buttons
//  - clickable values shown as quiet gold links (underline on
//    hover), dropdowns inline and compact
//  - subtle hairline separator between rows
//
// Rows (Forth order, no on-screen numbering):
//   Quick Message | File Type | Workflow History | Request
//   Release (superadmin) | Customer ID | Company Assignment |
//   Change Secondary Assignment | Email (click = Quick
//   Message) | Phone Numbers (click = Log Call) |
//   Income / Expenses (click = Budget Analysis)
//   Update Status stays in the client header (PR #34 — never
//   duplicated here).
//
// Persistence unchanged from v1: fileType / company / secondary
// save through the same saveProfile path and sync to every
// device in ~3 seconds.
// ============================================================
'use strict';
(function () {
  if (!window.SLFBoard || !SLFBoard.panel) return;
  var esc = SLFBoard.esc;

  function isSuperAdmin() {
    try {
      var s = JSON.parse(localStorage.getItem('aetherion_user') || 'null');
      return !!(s && String(s.role || '').toLowerCase().replace(/[\s_-]/g, '') === 'superadmin');
    } catch (e) { return false; }
  }

  // Shared row style — Forth look: label muted left, value right.
  var LAB = 'color:var(--muted);font-size:12px;flex:1;letter-spacing:0.2px;';
  var VAL = 'color:var(--gold);font-size:12px;text-align:right;cursor:pointer;text-decoration:none;';
  var SEL = 'background:rgba(10,22,40,0.6);border:1px solid var(--line);border-radius:6px;color:var(--text);padding:4px 8px;font-size:11.5px;font-family:inherit;max-width:160px;';

  function row(label, valueHtml) {
    return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">' +
      '<span style="' + LAB + '">' + label + '</span>' + valueHtml + '</div>';
  }
  function link(text, action, title) {
    return '<a style="' + VAL + '" title="' + esc(title || '') + '" onclick="' + action + ' onmouseover="this.style.textDecoration=\'underline\'" onmouseout="this.style.textDecoration=\'none\'">' + esc(text) + '</a>';
  }
  function plain(text) {
    return '<span style="color:var(--text);font-size:12px;text-align:right;">' + esc(text) + '</span>';
  }
  function select(id, optionsHtml) {
    return '<select id="' + id + '" style="' + SEL + '">' + optionsHtml + '</select>';
  }

  function fileTypeOptions(c) {
    var types = ['Student Loan', 'Debt Settlement', 'General'];
    var cur = c.fileType || 'Student Loan';
    return types.map(function (t) {
      return '<option value="' + esc(t) + '"' + (cur === t ? ' selected' : '') + '>' + esc(t) + '</option>';
    }).join('');
  }

  function userOptions(sel) {
    var users = [];
    try { users = JSON.parse(localStorage.getItem('aetherion_users') || '[]'); } catch (e) { users = []; }
    if (!Array.isArray(users) || !users.length) users = [{ username: 'unassigned' }];
    var out = '<option value="">— none —</option>';
    users.forEach(function (u) {
      if (!u || !u.username) return;
      out += '<option value="' + esc(u.username) + '"' + (sel === u.username ? ' selected' : '') + '>' + esc(u.username) + '</option>';
    });
    return out;
  }

  SLFBoard.panel.forthPanel = function (c) {
    var t = (SLFBoard.budgetTotals ? SLFBoard.budgetTotals(c.id) : { income: 0, expenses: 0, net: 0 });
    var html = '<h4>Client Information</h4>';
    html += row('Quick Message', link('Compose', 'SLFBoard.quickEmail();', 'Send an email instantly'));
    html += row('File Type', select('pe-filetype', fileTypeOptions(c)));
    html += row('Workflow History', link('View', 'SLFBoard.setTab(\'history\');', 'Workflow history for this contact'));
    if (isSuperAdmin()) {
      html += row('Request Release', link('Request', 'SLFBoard.requestRelease();', 'Request a hold release'));
    }
    html += row('Customer ID', plain(c.id));
    html += row('Company Assignment', select('pe-company', userOptions(c.company)));
    html += row('Change Secondary Assignment', select('pe-secondary', userOptions(c.secondary)));
    html += row('Email', c.email ? link(c.email, 'SLFBoard.quickEmail();', 'Open Quick Message') : plain('— none on file —'));
    html += row('Phone Numbers', c.phone ? link(c.phone, 'SLFBoard.logCall();', 'Log a call') : plain('— none on file —'));
    html += row('Income / Expenses', link('$' + t.income.toFixed(2) + ' / $' + t.expenses.toFixed(2), 'SLFBoard.setTab(\'budget\');', 'View Budget Analysis'));
    return html;
  };

  SLFBoard.requestRelease = function () {
    var c = SLFBoard.client();
    if (!c) return;
    if (window.SLF) SLF.log('board', 'release (' + c.id + ')', 'hold release requested for ' + c.name);
    alert('Release requested for ' + c.name + ' (' + c.id + '). The request is logged in History.');
  };

  // Same save path as v1 — wrapped, not replaced.
  var rawSave = SLFBoard.saveProfile;
  if (typeof rawSave === 'function' && !rawSave.__forthRows) {
    var wrapped = function () {
      var c = SLFBoard.client();
      if (c) {
        var ft = document.getElementById('pe-filetype');
        var co = document.getElementById('pe-company');
        var se = document.getElementById('pe-secondary');
        if (ft) c.fileType = ft.value;
        if (co) c.company = co.value;
        if (se) c.secondary = se.value;
      }
      return rawSave.apply(SLFBoard, arguments);
    };
    wrapped.__forthRows = true;
    SLFBoard.saveProfile = wrapped;
  }
})();