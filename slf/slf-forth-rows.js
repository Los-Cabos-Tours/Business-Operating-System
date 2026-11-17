// ============================================================
// Forth left panel — v4, built from the actual Client Dashboard
// Left Side screenshot (owner OCR, 2026-11-17). Layout mirrors
// the image exactly:
//
//   [ FILE TYPE banner — bold, uppercase, gold ]
//   [ status strip: Stage · Updated X ago ]
//   [ Quick Message ] [ Workflow History ]   <- action links
//   [ hold notice + Request Release (superadmin) ]
//   Customer ID:            CL-0001
//   Company Assignment:     [ select ]
//   Change Secondary Assignment: [ select ]
//   ... profile fields (SSN, Birthday, Email, Phone, Address —
//       rendered by slf-forth-main.js, unchanged) ...
//   INCOME / EXPENSES
//   Income:   $20,000.00
//   Expenses: $2,550.00
//   Net:      $17,450.00
//   View Budget Analysis                   <- link
//   CLIENT SNAPSHOT
//   Enrolled: 10/25/2023
//   Debt:     $34,217.00
//   Plan:     ...
//   Servicer: ...
//   Stage:    ...
//   [ Notes / Save Profile as before ]
//
// No numbers anywhere (the 1-11 in the image are doc callouts).
// Income/Expenses + Client Snapshot are injected BEFORE the Notes
// field by wrapping infoPanel, so the order matches the screenshot
// exactly. fileType / company / secondary still save through the
// same saveProfile path and sync to every device in ~3 seconds.
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

  function rel(ts) {
    if (!ts) return '—';
    var s = Math.floor((Date.now() - ts) / 1000);
    if (s < 0) s = 0;
    if (s < 60) return s + ' seconds ago';
    var m = Math.floor(s / 60);
    if (m < 60) return m + ' minutes ago';
    var h = Math.floor(m / 60);
    if (h < 24) return h + ' hours ago';
    return Math.floor(h / 24) + ' days ago';
  }

  var CSS =
    '.fp-badge{display:block;width:100%;margin:0 0 6px 0;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:rgba(201,168,76,0.12);color:var(--gold);font-weight:700;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;font-family:inherit;text-align:center;cursor:pointer;}' +
    '.fp-badge option{color:#0A1628;text-transform:none;letter-spacing:0;}' +
    '.fp-strip{color:var(--muted);font-size:11px;margin:0 0 10px 0;text-align:center;}' +
    '.fp-acts{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px 0;}' +
    '.fp-acts a{flex:1;text-align:center;padding:5px 8px;border:1px solid var(--line);border-radius:7px;color:var(--gold);font-size:11.5px;cursor:pointer;text-decoration:none;white-space:nowrap;}' +
    '.fp-acts a:hover{background:rgba(201,168,76,0.08);}' +
    '.fp-note{padding:7px 9px;margin:0 0 10px 0;border:1px solid rgba(212,88,26,0.4);border-radius:7px;background:rgba(212,88,26,0.08);color:#FF8A5C;font-size:11px;}' +
    '.fp-note a{color:#FF8A5C;font-weight:700;cursor:pointer;text-decoration:underline;}' +
    '.fp-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:12.5px;}' +
    '.fp-row .k{color:var(--muted);flex:none;}' +
    '.fp-row .v{color:var(--text);text-align:right;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;}' +
    '.fp-row .v a{color:var(--gold);cursor:pointer;text-decoration:none;}' +
    '.fp-row .v a:hover{text-decoration:underline;}' +
    '.fp-row select{background:rgba(10,22,40,0.6);border:1px solid var(--line);border-radius:6px;color:var(--text);padding:4px 6px;font-size:11.5px;font-family:inherit;max-width:150px;}' +
    '.fp-sec{margin:14px 0 6px 0;padding-bottom:4px;border-bottom:1px solid var(--line);color:var(--gold);font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;}' +
    '.fp-tot{display:flex;justify-content:space-between;font-size:12.5px;padding:3px 0;}' +
    '.fp-tot .k{color:var(--muted);}' +
    '.fp-net{color:var(--gold);font-weight:700;}' +
    '.fp-view{display:block;margin:8px 0 0 0;color:var(--gold);font-size:12px;cursor:pointer;text-decoration:underline;text-underline-offset:3px;}';

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

  function fpRow(label, valueHtml) {
    return '<div class="fp-row"><span class="k">' + label + ':</span><span class="v">' + valueHtml + '</span></div>';
  }

  function clientCases(c) {
    return window.SLF ? SLF.cases.filter(function (k) { return k.clientId === c.id; }) : [];
  }

  // ---------- top block (replaces forthPanel) ----------
  SLFBoard.panel.forthPanel = function (c) {
    var cases = clientCases(c);
    var stage = cases.length ? SLF.stageName(cases[0].stage) : 'No case yet';
    var html = '<style>' + CSS + '</style>' +
      '<select id="pe-filetype" class="fp-badge">' + fileTypeOptions(c) + '</select>' +
      '<div class="fp-strip">Stage: ' + esc(stage) + ' &middot; Updated ' + esc(rel(c.updatedAt)) + '</div>' +
      '<div class="fp-acts">' +
      '<a onclick="SLFBoard.quickEmail();">Quick Message</a>' +
      '<a onclick="SLFBoard.setTab(\'history\');">Workflow History</a>' +
      '</div>';
    if (isSuperAdmin()) {
      html += '<div class="fp-note">Client on hold by the gateway? <a onclick="SLFBoard.requestRelease();">Request Release</a></div>';
    }
    html += fpRow('Customer ID', esc(c.id));
    html += fpRow('Company Assignment', '<select id="pe-company">' + userOptions(c.company) + '</select>');
    html += fpRow('Change Secondary Assignment', '<select id="pe-secondary">' + userOptions(c.secondary) + '</select>');
    return html;
  };

  // ---------- Income / Expenses + Client Snapshot (below the fields) ----------
  function tailHtml(c) {
    var t = SLFBoard.budgetTotals ? SLFBoard.budgetTotals(c.id) : { income: 0, expenses: 0, net: 0 };
    var h = '<div class="fp-sec">Income / Expenses</div>' +
      '<div class="fp-tot"><span class="k">Income:</span><span>$' + t.income.toFixed(2) + '</span></div>' +
      '<div class="fp-tot"><span class="k">Expenses:</span><span>$' + t.expenses.toFixed(2) + '</span></div>' +
      '<div class="fp-tot"><span class="k">Net:</span><span class="fp-net">$' + t.net.toFixed(2) + '</span></div>' +
      '<a class="fp-view" onclick="SLFBoard.setTab(\'budget\');">View Budget Analysis</a>';
    var cases = clientCases(c);
    if (cases.length) {
      var k = cases[0];
      h += '<div class="fp-sec">Client Snapshot</div>';
      h += fpRow('Enrolled', esc(String(k.createdAt || '').slice(0, 10) || '—'));
      h += fpRow('Debt', (k.balance !== undefined && k.balance !== null && k.balance !== '') ? '$' + Number(k.balance).toFixed(2) : '—');
      h += fpRow('Plan', esc(k.program || '—'));
      h += fpRow('Servicer', esc(k.servicer || '—'));
      h += fpRow('Stage', esc(SLF.stageName(k.stage)));
    }
    return h;
  }

  // Wrap infoPanel so the tail lands right BEFORE the Notes field
  // (same position as the screenshot: after Address, before the
  // notes box and Save Profile).
  var rawInfo = SLFBoard.panel.infoPanel;
  SLFBoard.panel.infoPanel = function (c) {
    var html = rawInfo.call(SLFBoard.panel, c);
    var tail = tailHtml(c);
    var marker = '<div class="bfld"><label>Notes</label>';
    var idx = html.indexOf(marker);
    if (idx === -1) return html + tail;
    return html.slice(0, idx) + tail + html.slice(idx);
  };

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