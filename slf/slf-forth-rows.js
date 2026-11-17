// ============================================================
// Forth left panel + right blocks — v5 (owner feedback 2026-11-17):
// "no repeated information" and "move it to the right, the right
// is empty".
//
// De-duplication — anything already on screen is NOT repeated here:
//   Customer ID      → already in the header (CL-xxxx tag) — REMOVED
//   Stage / status   → already the header chip + Update Status — REMOVED
//   Budget Analysis  → already a nav-bar button — link REMOVED
//   Email / Phone    → already editable profile fields — REMOVED
//
// LEFT panel (top of the fields, Forth order):
//   [ File Type banner — the dropdown itself ]
//   [ Quick Message ] [ Workflow History ]
//   [ hold notice + Request Release — superadmin only ]
//   Company Assignment:            [ select ]
//   Change Secondary Assignment:   [ select ]
//   ... then the existing profile fields, Notes, Save Profile ...
//
// RIGHT column (was empty — now filled, above the tabs):
//   INCOME / EXPENSES   (Income / Expenses / Net — live totals)
//   CLIENT SNAPSHOT     (Enrolled / Debt / Plan / Servicer)
//
// Update Status stays in the header (PR #34 — never duplicated).
// fileType / company / secondary still save through the same
// saveProfile path → sync to every device in ~3 seconds.
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

  var CSS =
    '.fp-badge{display:block;width:100%;margin:0 0 8px 0;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:rgba(201,168,76,0.12);color:var(--gold);font-weight:700;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;font-family:inherit;text-align:center;cursor:pointer;}' +
    '.fp-badge option{color:#0A1628;text-transform:none;letter-spacing:0;}' +
    '.fp-acts{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px 0;}' +
    '.fp-acts a{flex:1;text-align:center;padding:5px 8px;border:1px solid var(--line);border-radius:7px;color:var(--gold);font-size:11.5px;cursor:pointer;text-decoration:none;white-space:nowrap;}' +
    '.fp-acts a:hover{background:rgba(201,168,76,0.08);}' +
    '.fp-note{padding:7px 9px;margin:0 0 10px 0;border:1px solid rgba(212,88,26,0.4);border-radius:7px;background:rgba(212,88,26,0.08);color:#FF8A5C;font-size:11px;}' +
    '.fp-note a{color:#FF8A5C;font-weight:700;cursor:pointer;text-decoration:underline;}' +
    '.fp-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:12.5px;}' +
    '.fp-row .k{color:var(--muted);flex:none;}' +
    '.fp-row .v{color:var(--text);text-align:right;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;}' +
    '.fp-row select{background:rgba(10,22,40,0.6);border:1px solid var(--line);border-radius:6px;color:var(--text);padding:4px 6px;font-size:11.5px;font-family:inherit;max-width:150px;}' +
    '.fp-sec{margin:0 0 6px 0;padding-bottom:4px;border-bottom:1px solid var(--line);color:var(--gold);font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;}' +
    '.fp-tot{display:flex;justify-content:space-between;font-size:12.5px;padding:3px 0;}' +
    '.fp-tot .k{color:var(--muted);}' +
    '.fp-net{color:var(--gold);font-weight:700;}' +
    '.fp-right{background:rgba(15,32,64,0.45);border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin-bottom:14px;}' +
    '.fp-right .fp-row{border-bottom:1px solid rgba(255,255,255,0.05);}';

  function fpRow(label, valueHtml) {
    return '<div class="fp-row"><span class="k">' + label + ':</span><span class="v">' + valueHtml + '</span></div>';
  }

  // ---------- LEFT: top of the profile panel ----------
  SLFBoard.panel.forthPanel = function (c) {
    var html = '<style>' + CSS + '</style>' +
      '<select id="pe-filetype" class="fp-badge">' + fileTypeOptions(c) + '</select>' +
      '<div class="fp-acts">' +
      '<a onclick="SLFBoard.quickEmail();">Quick Message</a>' +
      '<a onclick="SLFBoard.setTab(\'history\');">Workflow History</a>' +
      '</div>';
    if (isSuperAdmin()) {
      html += '<div class="fp-note">Client on hold by the gateway? <a onclick="SLFBoard.requestRelease();">Request Release</a></div>';
    }
    html += fpRow('Company Assignment', '<select id="pe-company">' + userOptions(c.company) + '</select>');
    html += fpRow('Change Secondary Assignment', '<select id="pe-secondary">' + userOptions(c.secondary) + '</select>');
    return html;
  };

  // ---------- RIGHT: Income / Expenses + Client Snapshot ----------
  function rightHtml(c) {
    var t = SLFBoard.budgetTotals ? SLFBoard.budgetTotals(c.id) : { income: 0, expenses: 0, net: 0 };
    var h = '<div class="fp-right">' +
      '<div class="fp-sec">Income / Expenses</div>' +
      '<div class="fp-tot"><span class="k">Income:</span><span>$' + t.income.toFixed(2) + '</span></div>' +
      '<div class="fp-tot"><span class="k">Expenses:</span><span>$' + t.expenses.toFixed(2) + '</span></div>' +
      '<div class="fp-tot"><span class="k">Net:</span><span class="fp-net">$' + t.net.toFixed(2) + '</span></div>' +
      '</div>';
    var cases = window.SLF ? SLF.cases.filter(function (k) { return k.clientId === c.id; }) : [];
    if (cases.length) {
      var k = cases[0];
      h += '<div class="fp-right">' +
        '<div class="fp-sec">Client Snapshot</div>' +
        fpRow('Enrolled', esc(String(k.createdAt || '').slice(0, 10) || '—')) +
        fpRow('Debt', (k.balance !== undefined && k.balance !== null && k.balance !== '') ? '$' + Number(k.balance).toFixed(2) : '—') +
        fpRow('Plan', esc(k.program || '—')) +
        fpRow('Servicer', esc(k.servicer || '—')) +
        '</div>';
    }
    return h;
  }

  // Inject the right-column blocks at the top of .bright (above
  // the tabs) after every render. Wraps render — replaces nothing.
  var rawRender = SLFBoard.render;
  if (typeof rawRender === 'function' && !rawRender.__forthRight) {
    var wrappedRender = function () {
      rawRender.apply(SLFBoard, arguments);
      var c = SLFBoard.client();
      var bright = document.querySelector('.bright');
      if (!c || !bright) return;
      var wrap = document.createElement('div');
      wrap.innerHTML = rightHtml(c);
      while (wrap.firstChild) bright.insertBefore(wrap.firstChild, bright.firstChild);
    };
    wrappedRender.__forthRight = true;
    SLFBoard.render = wrappedRender;
  }

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