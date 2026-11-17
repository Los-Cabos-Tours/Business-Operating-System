// ============================================================
// Forth left-panel rows — matches the Client Dashboard Left
// Side screenshot EXACTLY. The numbers (1-11) in Forth's doc
// are annotations only — the real screen shows a clean list:
// small muted labels on the left, values / links on the right,
// thin dividers between rows. No numbers anywhere.
//
// Row order (Forth's documented order):
//   Quick Message (button)
//   File Type (dropdown — saved with Save Profile)
//   Workflow History (link → History tab)
//   [Update Status stays in the client header — PR #34,
//    user-approved placement, not duplicated here]
//   Request Release (link — superadmin-gated per Forth roles)
//   Customer ID (value)
//   Company Assignment (dropdown — saved with Save Profile)
//   Change Secondary Assignment (dropdown — saved with Save Profile)
//   Email (clickable → Quick Message)
//   Phone (clickable → Log Call)
//   Income / Expenses (live totals + View Budget Analysis link)
//
// Below this block the profile fields, Notes, and Save Profile
// render as before (slf-forth-main.js). Persistence wraps
// saveProfile — NOT replaces it — so the notes safety patch and
// custom fields keep working and fileType / company /
// secondary sync to every device in ~3 seconds.
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

  // One row: muted label left, value/link right, thin divider.
  function row(label, valueHtml) {
    return '<div class="frow"><span class="flab">' + label + '</span><span class="fval">' + valueHtml + '</span></div>';
  }

  SLFBoard.panel.forthPanel = function (c) {
    var t = (SLFBoard.budgetTotals ? SLFBoard.budgetTotals(c.id) : { income: 0, expenses: 0 });
    var html =
      // Scoped styles for this block only — nothing else on the
      // page changes. Clean Forth look: no numbers, subtle
      // dividers, right-aligned values.
      '<style>' +
      '.frow{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:12.5px;}' +
      '.frow:last-child{border-bottom:none;}' +
      '.frow .flab{color:var(--muted);flex:none;font-size:12px;}' +
      '.frow .fval{color:var(--text);text-align:right;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;}' +
      '.frow .fval a{color:var(--gold);cursor:pointer;text-decoration:none;}' +
      '.frow .fval a:hover{text-decoration:underline;}' +
      '.frow select{background:rgba(10,22,40,0.6);border:1px solid var(--line);border-radius:7px;color:var(--text);padding:4px 6px;font-size:11.5px;font-family:inherit;max-width:150px;}' +
      '</style>' +
      '<h4>Client Information</h4>' +
      row('Quick Message', '<button class="fbtn" onclick="SLFBoard.quickEmail()">Quick Message</button>') +
      row('File Type', '<select id="pe-filetype">' + fileTypeOptions(c) + '</select>') +
      row('Workflow History', '<a onclick="SLFBoard.setTab(\'history\')">View History</a>');

    // Request Release is role-gated (Forth: requires specific
    // role permissions) — superadmin only.
    if (isSuperAdmin()) {
      html += row('Request Release', '<a onclick="SLFBoard.requestRelease()">Request Release</a>');
    }

    html +=
      row('Customer ID', '<span style="color:var(--gold);font-weight:600;">' + esc(c.id) + '</span>') +
      row('Company Assignment', '<select id="pe-company">' + userOptions(c.company) + '</select>') +
      row('Change Secondary Assignment', '<select id="pe-secondary">' + userOptions(c.secondary) + '</select>') +
      row('Email', (c.email ? '<a onclick="SLFBoard.quickEmail()" title="Open Quick Message">' + esc(c.email) + '</a>' : '<span style="color:var(--muted);">— none on file —</span>')) +
      row('Phone', (c.phone ? '<a onclick="SLFBoard.logCall()" title="Log a call">' + esc(c.phone) + '</a>' : '<span style="color:var(--muted);">— none on file —</span>')) +
      row('Income / Expenses', '$' + t.income.toFixed(2) + ' / $' + t.expenses.toFixed(2) +
        ' &nbsp;<a onclick="SLFBoard.setTab(\'budget\')" title="View Budget Analysis">View Budget Analysis</a>');
    return html;
  };

  // Request Release: logs into the shared history so every
  // device sees it, and confirms to the operator.
  SLFBoard.requestRelease = function () {
    var c = SLFBoard.client();
    if (!c) return;
    if (window.SLF) SLF.log('board', 'release (' + c.id + ')', 'hold release requested for ' + c.name);
    alert('Release requested for ' + c.name + ' (' + c.id + '). The request is logged in History.');
  };

  // Persist fileType / company / secondary through the SAME
  // saveProfile path — wrapped, not replaced.
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