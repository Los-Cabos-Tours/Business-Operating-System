// ============================================================
// Forth left panel — v7. Owner order (2026-11-17): "I do not
// need the same info more than one time."
//
//   REMOVED  STUDENT LOAN file-type banner — the sidebar title
//             "Student Loan Forgiveness" already says it.
//   REMOVED  Income / Expenses + View Budget Analysis — the
//             action bar's Budget Analysis button already does
//             it. One copy only.
//
// Panel keeps exactly one copy of everything on it:
//   Quick Message, Workflow History, Request Release
//   (superadmin-gated), Customer ID, Company Assignment,
//   Change Secondary Assignment, then the profile fields,
//   Notes, Save Profile. Client Snapshot shows only when the
//   client has a case (Enrolled / Debt / Plan / Servicer —
//   shown nowhere else).
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

  var CSS =
    '.fp-acts{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px 0;}' +
    '.fp-acts a{flex:1;text-align:center;padding:5px 8px;border:1px solid var(--line);border-radius:7px;color:var(--gold);font-size:11.5px;cursor:pointer;text-decoration:none;white-space:nowrap;}' +
    '.fp-acts a:hover{background:rgba(201,168,76,0.08);}' +
    '.fp-note{padding:7px 9px;margin:0 0 10px 0;border:1px solid rgba(212,88,26,0.4);border-radius:7px;background:rgba(212,88,26,0.08);color:#FF8A5C;font-size:11px;}' +
    '.fp-note a{color:#FF8A5C;font-weight:700;cursor:pointer;text-decoration:underline;}' +
    '.fp-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:12.5px;}' +
    '.fp-row .k{color:var(--muted);flex:none;}' +
    '.fp-row .v{color:var(--text);text-align:right;flex:1;min-width:0;}' +
    '.fp-row select{background:rgba(10,22,40,0.6);border:1px solid var(--line);border-radius:6px;color:var(--text);padding:4px 6px;font-size:11.5px;font-family:inherit;max-width:150px;}' +
    '.fp-sec{margin:14px 0 6px 0;padding-bottom:4px;border-bottom:1px solid var(--line);color:var(--gold);font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;}' +
    '.fp-rl{color:var(--gold);font-size:12px;cursor:pointer;text-decoration:underline;text-underline-offset:3px;}';

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

  // ---------- top block: one copy of each piece of info ----------
  SLFBoard.panel.forthPanel = function (c) {
    var html = '<style>' + CSS + '</style>' +
      '<div class="fp-acts">' +
      '<a onclick="SLFBoard.quickEmail();">Quick Message</a>' +
      '<a onclick="SLFBoard.setTab(\'history\');">Workflow History</a>' +
      '</div>';
    // Request Release — role-gated (owner spec feature 5).
    // Real hold flag -> hold notice. No hold -> plain row.
    if (isSuperAdmin()) {
      if (c.hold === true || c.onHold === true) {
        html += '<div class="fp-note">This client is on hold by the gateway. <a onclick="SLFBoard.requestRelease();">Request Release</a></div>';
      } else {
        html += fpRow('Request Release', '<a class="fp-rl" onclick="SLFBoard.requestRelease();">Request release</a>');
      }
    }
    html += fpRow('Customer ID', esc(c.id));
    html += fpRow('Company Assignment', '<select id="pe-company">' + userOptions(c.company) + '</select>');
    html += fpRow('Change Secondary Assignment', '<select id="pe-secondary">' + userOptions(c.secondary) + '</select>');
    return html;
  };

  // ---------- tail: Client Snapshot only when a case exists ----------
  // No budget block — Budget Analysis lives in the action bar
  // (one copy, owner order). Snapshot values appear nowhere else.
  function tailHtml(c) {
    var h = '';
    var cases = window.SLF ? SLF.cases.filter(function (k) { return k.clientId === c.id; }) : [];
    if (cases.length) {
      var k = cases[0];
      h += '<div class="fp-sec">Client Snapshot</div>';
      h += fpRow('Enrolled', esc(String(k.createdAt || '').slice(0, 10) || '—'));
      h += fpRow('Debt', (k.balance !== undefined && k.balance !== null && k.balance !== '') ? '$' + Number(k.balance).toFixed(2) : '—');
      h += fpRow('Plan', esc(k.program || '—'));
      h += fpRow('Servicer', esc(k.servicer || '—'));
    }
    return h;
  }

  // Wrap infoPanel so the tail lands right BEFORE the Notes field.
  var rawInfo = SLFBoard.panel.infoPanel;
  SLFBoard.panel.infoPanel = function (c) {
    var html = rawInfo.call(SLFBoard.panel, c);
    var tail = tailHtml(c);
    if (!tail) return html;
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

  // Persist company / secondary through the SAME saveProfile
  // path — wrapped, not replaced. (File type banner is gone;
  // nothing to persist for it.)
  var rawSave = SLFBoard.saveProfile;
  if (typeof rawSave === 'function' && !rawSave.__forthRows) {
    var wrapped = function () {
      var c = SLFBoard.client();
      if (c) {
        var co = document.getElementById('pe-company');
        var se = document.getElementById('pe-secondary');
        if (co) c.company = co.value;
        if (se) c.secondary = se.value;
      }
      return rawSave.apply(SLFBoard, arguments);
    };
    wrapped.__forthRows = true;
    SLFBoard.saveProfile = wrapped;
  }
})();