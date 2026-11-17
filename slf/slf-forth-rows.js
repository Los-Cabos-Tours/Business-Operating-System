// ============================================================
// Forth left panel — v8. Owner orders (2026-11-17):
//   "take away the Workflow History — we already have the
//    History tab in the system"
//   "take this away too: Request Release"
//   "Company Assignment / Change Secondary Assignment — that is
//    not a drop down [for everyone], that is something only
//    super admin has as a drop down to assign the lead to one
//    of my agents"
//   "where is all the info I asked for on the sidebar — that is
//    super important information you took it away"
//
// v8 rules:
//   REMOVED      Workflow History link  (History tab = one copy)
//   REMOVED      Request Release        (gone entirely)
//   SUPERADMIN   Company Assignment + Change Secondary
//     ONLY        Assignment dropdowns — they list AGENTS
//                (aetherion_users minus superadmin accounts);
//                no one else sees them.
//   RESTORED     File Type row (labeled data row, no banner)
//   RESTORED     Income / Expenses / Net values — real data
//                shown nowhere else. No "View Budget Analysis"
//                link (the action-bar button is the one copy).
//
// Panel for everyone: Quick Message, File Type, Customer ID,
// Income/Expenses/Net, profile fields, Notes (blank by
// default), Save Profile. Client Snapshot only when a case
// exists. Nothing on screen appears twice.
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

  function storedUsers() {
    try {
      var u = JSON.parse(localStorage.getItem('aetherion_users') || '[]');
      return Array.isArray(u) ? u : [];
    } catch (e) { return []; }
  }

  // Agents = every account EXCEPT superadmins. These are the
  // people a lead can be assigned to (owner: "assign the lead
  // to one of my agents").
  function agents() {
    return storedUsers().filter(function (u) {
      if (!u || !u.username) return false;
      return String(u.role || '').toLowerCase().replace(/[\s_-]/g, '') !== 'superadmin';
    });
  }

  var CSS =
    '.fp-acts{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px 0;}' +
    '.fp-acts a{flex:1;text-align:center;padding:5px 8px;border:1px solid var(--line);border-radius:7px;color:var(--gold);font-size:11.5px;cursor:pointer;text-decoration:none;white-space:nowrap;}' +
    '.fp-acts a:hover{background:rgba(201,168,76,0.08);}' +
    '.fp-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:12.5px;}' +
    '.fp-row .k{color:var(--muted);flex:none;}' +
    '.fp-row .v{color:var(--text);text-align:right;flex:1;min-width:0;}' +
    '.fp-row select{background:rgba(10,22,40,0.6);border:1px solid var(--line);border-radius:6px;color:var(--text);padding:4px 6px;font-size:11.5px;font-family:inherit;max-width:150px;}' +
    '.fp-sec{margin:14px 0 6px 0;padding-bottom:4px;border-bottom:1px solid var(--line);color:var(--gold);font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;}' +
    '.fp-tot{display:flex;justify-content:space-between;font-size:12.5px;padding:3px 0;}' +
    '.fp-tot .k{color:var(--muted);}' +
    '.fp-net{color:var(--gold);font-weight:700;}';

  function fileTypeOptions(c) {
    var types = ['Student Loan', 'Debt Settlement', 'General'];
    var cur = c.fileType || 'Student Loan';
    return types.map(function (t) {
      return '<option value="' + esc(t) + '"' + (cur === t ? ' selected' : '') + '>' + esc(t) + '</option>';
    }).join('');
  }

  // Superadmin-only lead assignment dropdown. Lists agents.
  function agentOptions(sel) {
    var list = agents();
    if (!list.length) return '<option value="" disabled selected>— no agents —</option>';
    var out = '<option value="">— none —</option>';
    list.forEach(function (u) {
      out += '<option value="' + esc(u.username) + '"' + (sel === u.username ? ' selected' : '') + '>' + esc(u.username) + '</option>';
    });
    return out;
  }

  function fpRow(label, valueHtml) {
    return '<div class="fp-row"><span class="k">' + label + ':</span><span class="v">' + valueHtml + '</span></div>';
  }

  // ---------- top block ----------
  SLFBoard.panel.forthPanel = function (c) {
    var html = '<style>' + CSS + '</style>' +
      '<div class="fp-acts"><a onclick="SLFBoard.quickEmail();">Quick Message</a></div>';
    // File Type — owner spec feature 2, a labeled row (not a banner).
    html += fpRow('File Type', '<select id="pe-filetype">' + fileTypeOptions(c) + '</select>');
    // Lead assignment — SUPERADMIN ONLY (owner order). These
    // dropdowns list agents and exist for assigning the lead.
    if (isSuperAdmin()) {
      html += fpRow('Company Assignment', '<select id="pe-company">' + agentOptions(c.company) + '</select>');
      html += fpRow('Change Secondary Assignment', '<select id="pe-secondary">' + agentOptions(c.secondary) + '</select>');
    }
    html += fpRow('Customer ID', esc(c.id));
    return html;
  };

  // ---------- tail: real data, shown nowhere else ----------
  function tailHtml(c) {
    var h = '';
    // Income / Expenses / Net — the values themselves. Always
    // shown; this is the owner's "super important information".
    // No View Budget Analysis link — the action-bar button is
    // the one navigation copy.
    var t = SLFBoard.budgetTotals ? SLFBoard.budgetTotals(c.id) : { income: 0, expenses: 0, net: 0 };
    h += '<div class="fp-sec">Income / Expenses</div>';
    h += '<div class="fp-tot"><span class="k">Income:</span><span>$' + Number(t.income || 0).toFixed(2) + '</span></div>';
    h += '<div class="fp-tot"><span class="k">Expenses:</span><span>$' + Number(t.expenses || 0).toFixed(2) + '</span></div>';
    h += '<div class="fp-tot"><span class="k">Net:</span><span class="fp-net">$' + Number(t.net || ((t.income || 0) - (t.expenses || 0))).toFixed(2) + '</span></div>';
    // Client Snapshot — only when a case exists; values appear
    // nowhere else on this screen.
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