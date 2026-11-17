// ============================================================
// Forth left-panel rows — v3, mirrors the Client Dashboard Left
// Side screenshot. No numbers (Forth's 1-11 are doc annotations,
// never on screen — owner confirmed). No gold buttons. Every row
// is the same quiet pattern, exactly like Forth:
//   muted label on the left, value / plain link on the right,
//   thin divider between rows.
//
// Rows in Forth's order:
//   Quick Message          link -> quick email
//   File Type              dropdown (saved with Save Profile)
//   Workflow History       link -> History nested tab
//   Request Release        link (superadmin only, per Forth roles)
//   Customer ID            value (CL-xxxx)
//   Company Assignment     dropdown (saved with Save Profile)
//   Change Secondary
//   Assignment             dropdown (saved with Save Profile)
//   Email                  value, click -> Quick Message
//   Phone Numbers          value, click -> Log Call
//   Income / Expenses      live totals + View Budget Analysis link
//
// Update Status stays in the client header (PR #34) — not here.
// Style: reuses the board's own .frow / .flab classes from
// slf-forth-css-a.js (minus the number column). No <style> block,
// no new CSS, nothing loud. Persistence wraps saveProfile so
// fileType / company / secondary sync to every device in ~3s.
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

  // Forth row pattern: muted label left, value/link right,
  // thin divider. Uses the board's existing classes.
  function row(label, valueHtml) {
    return '<div class="frow"><span class="flab">' + label + '</span>' + valueHtml + '</div>';
  }
  function lnk(text, action, title) {
    return '<a title="' + esc(title || '') + '" onclick="' + action + '">' + esc(text) + '</a>';
  }
  function val(text) {
    return '<span style="color:var(--text);font-size:12.5px;">' + esc(text) + '</span>';
  }

  SLFBoard.panel.forthPanel = function (c) {
    var t = (SLFBoard.budgetTotals ? SLFBoard.budgetTotals(c.id) : { income: 0, expenses: 0 });
    var html = '<h4>Client Information</h4>';
    html += row('Quick Message', lnk('Quick Message', 'SLFBoard.quickEmail();', 'Send an email instantly'));
    html += row('File Type', '<select id="pe-filetype">' + fileTypeOptions(c) + '</select>');
    html += row('Workflow History', lnk('Workflow History', 'SLFBoard.setTab(\'history\');', 'View this contact\'s workflow history'));
    if (isSuperAdmin()) {
      html += row('Request Release', lnk('Request Release', 'SLFBoard.requestRelease();', 'Request a hold release'));
    }
    html += row('Customer ID', val(c.id));
    html += row('Company Assignment', '<select id="pe-company">' + userOptions(c.company) + '</select>');
    html += row('Change Secondary Assignment', '<select id="pe-secondary">' + userOptions(c.secondary) + '</select>');
    html += row('Email', c.email
      ? '<a title="Open Quick Message" onclick="SLFBoard.quickEmail();">' + esc(c.email) + '</a>'
      : val('— none on file —'));
    html += row('Phone Numbers', c.phone
      ? '<a title="Log a call" onclick="SLFBoard.logCall();">' + esc(c.phone) + '</a>'
      : val('— none on file —'));
    html += row('Income / Expenses',
      val('$' + t.income.toFixed(2) + ' / $' + t.expenses.toFixed(2)) +
      ' <a title="View Budget Analysis" onclick="SLFBoard.setTab(\'budget\');">View Budget Analysis</a>');
    return html;
  };

  SLFBoard.requestRelease = function () {
    var c = SLFBoard.client();
    if (!c) return;
    if (window.SLF) SLF.log('board', 'release (' + c.id + ')', 'hold release requested for ' + c.name);
    alert('Release requested for ' + c.name + ' (' + c.id + '). The request is logged in History.');
  };

  // Persist fileType / company / secondary through the SAME
  // saveProfile path — wrapped, not replaced, so the notes
  // safety patch and custom fields keep working untouched.
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