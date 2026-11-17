// ============================================================
// Forth left-panel rows — all 11 numbered features from Forth's
// "Managing the Client Dashboard" doc, in Forth's order. Fills
// the empty forthPanel slot (slf-forth-panel.js v8 left it
// empty for exactly this) — no existing module is modified.
//
// Rows:
//  1  Quick Message            — opens the quick email (used often)
//  2  File Type                — dropdown, saved on Save Profile
//  3  Workflow History         — jumps to the History nested tab
//  4  Update Status            — NOT here: stays in the client
//                                header (user-approved placement,
//                                PR #34 — never duplicated)
//  5  Request Release          — role-gated hold-release request
//  6  Customer ID              — system identifier (CL-xxxx)
//  7  Company Assignment       — dropdown, saved on Save Profile
//  8  Change Secondary
//     Assignment               — dropdown, saved on Save Profile
//  9  Email                    — click opens Quick Message
// 10  Phone Numbers            — click logs a call
// 11  Income / Expenses        — live budget totals; click opens
//                                Budget Analysis (Student Loans)
//
// Persistence: fileType / company / secondary save through the
// SAME saveProfile path (wrapped below), so they sync to every
// device in ~3 seconds like all other client fields.
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

  function userTypeOptions(c) {
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

  function row(num, label, valueHtml) {
    return '<div class="frow"><span class="fnum">' + num + '</span><span class="flab">' + label + '</span>' + valueHtml + '</div>';
  }

  SLFBoard.panel.forthPanel = function (c) {
    var t = (SLFBoard.budgetTotals ? SLFBoard.budgetTotals(c.id) : { income: 0, expenses: 0, net: 0 });
    var html =
      '<h4>Client Information</h4>' +
      row(1, 'Quick Message', '<button class="fbtn" onclick="SLFBoard.quickEmail()">Quick Message</button>') +
      row(2, 'File Type', '<select id="pe-filetype">' + userTypeOptions(c) + '</select>') +
      row(3, 'Workflow History', '<button class="fbtn" onclick="SLFBoard.setTab(\'history\')">View History</button>');
    // Row 5 Request Release is role-gated (Forth: requires
    // specific role permissions). Superadmin only here.
    if (isSuperAdmin()) {
      html += row(5, 'Request Release', '<button class="fbtn" onclick="SLFBoard.requestRelease()">Request Release</button>');
    }
    html +=
      row(6, 'Customer ID', '<span style="color:var(--gold);font-weight:600;">' + esc(c.id) + '</span>') +
      row(7, 'Company Assignment', '<select id="pe-company">' + userOptions(c.company) + '</select>') +
      row(8, 'Change Secondary Assignment', '<select id="pe-secondary">' + userOptions(c.secondary) + '</select>') +
      row(9, 'Email', '<a onclick="SLFBoard.quickEmail()" title="Open Quick Message">' + esc(c.email || '— none on file —') + '</a>') +
      row(10, 'Phone Numbers', '<a onclick="SLFBoard.logCall()" title="Log a call">' + esc(c.phone || '— none on file —') + '</a>') +
      row(11, 'Income / Expenses', '<a onclick="SLFBoard.setTab(\'budget\')" title="View Budget Analysis">$' + t.income.toFixed(2) + ' / $' + t.expenses.toFixed(2) + '</a>');
    return html;
  };

  // Request Release: logs the request into the shared history so
  // every device sees it; alerts the operator.
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