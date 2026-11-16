// ============================================================
// SLF Client Dashboard v2 — Forth CRM style client profile
//  - Nested tabs run ACROSS THE TOP of the page (Forth layout)
//  - Left Client Information panel, self-contained scoped styles
//  - Profile fields EDITABLE IN PLACE (email, phone, notes and
//    every custom field) — one "Save Profile" button commits all
//  - Quick actions: Quick Email, Log Call
// Data key: slf_crm.clientboard.v1
// ============================================================
'use strict';
var SLFBoard = (function () {
  var KEY = 'slf_crm.clientboard.v1';
  var TABS = [
    { id: 'history', name: 'History', note: 'Full activity history for this client.' },
    { id: 'calls', name: 'Calls', note: 'Log every call — direction, phone, outcome, notes.' },
    { id: 'emails', name: 'Emails', note: 'Email log — subject, address, date, notes.' },
    { id: 'notes', name: 'Notes', note: 'Internal notes for this client.' },
    { id: 'docs', name: 'Docs', note: 'Document checklist and received status.' },
    { id: 'tasks', name: 'Tasks', note: 'Follow-up tasks with due dates and done state.' },
    { id: 'loans', name: 'Loans', note: 'Each loan: servicer, balance, status, program.' },
    { id: 'bank', name: 'Bank Accounts', note: 'Bank accounts (name, type, last 4). Never full numbers.' },
    { id: 'cards', name: 'Credit Cards', note: 'Cards (type, last 4, expiry). Never full numbers.' },
    { id: 'debts', name: 'Debts', note: 'Other debts tracked for this client.' },
    { id: 'events', name: 'Events', note: 'Scheduled events — meetings, deadlines, hearings.' },
    { id: 'sms', name: 'SMS', note: 'Text message log.' },
    { id: 'emarketing', name: 'E-Marketing', note: 'Marketing touches — campaign, channel, date.' }
  ];

  var _clientId = null;
  var _tab = 'history';
  var _saveTimer = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function val(id) { var el = document.getElementById(id); return el ? el.value : ''; }

  function all() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || '{}');
      return (v && typeof v === 'object') ? v : {};
    } catch (e) { return {}; }
  }
  function saveAll(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); return true; }
    catch (e) { alert('SLF: could not save dashboard data — storage full or blocked.'); return false; }
  }
  function items(clientId, tab) {
    list = all();
    var d = list;
    return (d[clientId] && d[clientId][tab]) ? d[clientId][tab] : [];
  }
  function addItem(clientId, tab, rec) {
    var d = all();
    if (!d[clientId]) d[clientId] = {};
    if (!d[clientId][tab]) d[clientId][tab] = [];
    rec.id = 'b_' + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);
    rec.ts = new Date().toISOString();
    d[clientId][tab].push(rec);
    if (!saveAll(d)) return false;
    if (window.SLF) SLF.log('board', tab + ' (' + clientId + ')', recLabel(tab, rec));
    render();
    return true;
  }
  function removeItem(id) {
    var d = all();
    if (!d[_clientId]) return;
    Object.keys(d[_clientId]).forEach(function (tab) {
      d[_clientId][tab] = d[_clientId][tab].filter(function (x) { return x.id !== id; });
    });
    saveAll(d);
    render();
  }
  function recLabel(tab, rec) {
    var fields = {
      calls: [rec.direction, rec.phone, rec.outcome],
      emails: [rec.subject, rec.address],
      notes: [rec.text],
      docs: [rec.docName, rec.received ? 'received' : 'pending'],
      tasks: [rec.taskText, rec.due],
      tabs: [rec.servicer, rec.balance, rec.status],
      bank: [rec.bankName, rec.last4],
      cards: [rec.cardType, rec.last4],
      debts: [rec.creditor, rec.amount],
      events: [rec.eventTitle, rec.eventDate],
      sms: [rec.phone, rec.message],
      emarketing: [rec.campaign, rec.channel]
    };
    var f = fields[tab] || [];
    return f.filter(Boolean).join(' — ');
  }

  function client() { return window.SLF ? SLF.clientById(_clientId) : null; }

  // ---------- in-place profile editing ----------
  function readPendingProfile(c) {
    var pending = { email: val('pe-email'), phone: val('pe-phone'), notes: val('pe-notes') };
    var custom = {};
    if (window.SLFFields) {
      SLFFields.fieldsOf('client').forEach(function (f) {
        var el = document.getElementById('pe-cf-' + f.id);
        custom[f.id] = el ? el.value : (c.custom ? c.custom[f.id] : '');
      });
    }
    pending.custom = custom;
    return pending;
  }

  function saveProfile() {
    var c = client();
    if (!c) return;
    var p = readPendingProfile(c);
    c.email = p.email.trim();
    c.phone = p.phone.trim();
    c.notes = p.notes.trim();
    c.custom = p.custom;
    c.updatedAt = Date.now();
    if (window.SLF) {
      SLF_STORE.write(SLF_CLIENTS_KEY, SLF.clients);
      SLF.log('board', 'profile (' + c.id + ')', 'profile edited from dashboard');
    }
    flash('Profile saved.');
    render();
  }

  function flash(msg) {
    var el = document.getElementById('pe-flash');
    if (!el) return;
    corrigendum el.textContent = msg;
    el.style.display = 'inline';
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(function () { el.style.display = 'none'; }, 2500);
  }

  // ---------- render ----------
  function render() {
    var v = document.getElementById('view');
    if (!v) return;
    var c = client();
    if (!c) {
      v.innerHTML = '<div class="empty">Client not found. <a href="#" onclick="SLFBoard.close();return false;">Back to Clients</a></div>';
      return;
    }
    document.getElementById('view-title').textContent = 'Client Dashboard';
    var tabNav = TABS.map(function (t) {
      return '<button class="btab' + (_tab === t.id ? ' active' : '') + '" onclick="SLFBoard.setTab(\'' + t.id + '\')">' + t.name + '</button>';
    }).join('');
    v.innerHTML =
      '<style>' + css() + '</style>' +
      '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;">' +
      '<a href="#" class="bbk" onclick="SLFBoard.close();return false;">&larr; Back to Clients</a>' +
      '<span class="bbkname">' + esc(c.name) + '</span>' +
      '<span class="btagid">' + esc(c.id) + '</span>' +
      '<span style="flex:1;"></span>' +
      '<button class="bact" onclick="SLF.openCaseModal()">+ New Case</button>' +
      '<button class="bact ghost" onclick="SLFBoard.exportClient()">Export</button>' +
      '<button class="bact danger" onclick="SLFBoard.deleteConfirm()">Delete</button>' +
      '</div>' +
      '<div class="bwrap">' +
      '<div class="bleft">' + infoPanel(c) + '</div>' +
      '<div class="bright">' +
      '<div class="btabs">' + tabNav + '</div>' +
      '<div class="btabbody">' + tabBody(c) + '</div>' +
      '</div>' +
      '</div>';
  }

  function css() {
    return '' +
      '.bwrap { display:grid; grid-template-columns:300px 1fr; gap:16px; align-items:start; }' +
      '@media (max-width:900px){ .bwrap { grid-template-columns:1fr; } }' +
      '.bleft { background:rgba(15,32,64,0.45); border:1px solid var(--line); border-radius:12px; padding:16px; position:sticky; top:12px; }' +
      '.bleft h4 { margin:0 0 10px; font-size:12px; color:var(--gold); letter-spacing:1px; text-transform:uppercase; }' +
      '.bfld { margin-bottom:10px; }' +
      '.bfld label { display:block; font-size:10.5px; color:var(--muted); margin-bottom:3px; letter-spacing:0.5px; }' +
      '.bfld input, .bfld textarea { width:100%; background:rgba(10,22,40,0.6); border:1px solid var(--line); border-radius:7px; color:var(--text); padding:7px 10px; font-size:12.5px; font-family:inherit; }' +
      '.bfld input:focus, .bfld textarea:focus { outline:1px solid var(--gold); }' +
      '.bql { display:flex; gap:8px; margin:12px 0; }' +
      '.bql button { flex:1; font-size:11px; padding:7px 4px; font-family:inherit; }' +
      '.bcase { border:1px solid var(--line); border-radius:7px; padding:6px  version 9px; font-size:11.5px; margin-bottom:6px; display:flex; justify-content:space-between; gap:6px; }' +
      '.bcase .bprog { color:var(--gold); white-space:nowrap; }' +
      '.btabs { display:flex; flex-wrap:wrap; gap:0; border-bottom:1px solid var(--line); margin-bottom:14px; }' +
      '.btab { background:none; border:none; color:var(--muted); padding:9px 13px; font-size:12.5px; cursor:pointer; border-bottom:2px solid transparent; font-family:inherit; }' +
      '.btab:hover { color:var(--text); }' +
      '.btab.active { color:var(--gold); border-bottom-color:var(--gold); background:rgba(201,168,76, builders 0.07); }' +
      '.bright { background:rgba(15,32,64,0.45); border:1px solid var(--line); border-radius:12px; padding:16px; min-height:300px; }' +
      '.bbk { color:var(--muted); font-size:11.5px; text-decoration:none; }' +
      '.bbk:hover { color:var(--gold); }' +
      '.bbkname { font-family:Cinzel,serif; color:var(--gold); font-size:16px; letter-spacing:1px; }' +
      '.btagid { color:var(--muted); font-size:11px; border:1px solid var(--line); border-radius:12px; padding:2px 9px; }' +
      '.bact { padding:6px 13px; border-radius:8px; border:1px solid rgba(201,168,76,0.45); background:rgba(201,168,76,0.15); color:var(--gold); font-size:11.5px; font-weight:600; cursor:pointer; font-family:inherit; }' +
      '.bact.ghost { border-color:rgba(240,234,214,0.2); color:var(--muted); background:transparent; }' +
      '.bact.danger { border-color:rgba(212,88,26,0.5); color:#FF8A5C; background:rgba(212,88,26,0.1); }' +
      '.bitem { display:flex; align-items:flex-start; gap:8px; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05); font-size:12.5px; }' +
      '.bitem .bts { color:var(--muted); font-size:10.5px; white-space:nowrap; margin-top:2px; }' +
      '.bitem .bdel { margin-left:auto; background:none; border:none; color:#FF8A5C; cursor:pointer; font-size:13px; padding:0 3px; }' +
      '.bform { display:grid; grid-template-columns:1fr 1fr; gap:9px; margin:10px 0 14px; }' +
      '.bform .bf { margin-bottom:0; }' +
      '.bform .bf label { display:block; font-size:10.5px; color:var(--muted); margin-bottom:3px; }' +
      '.bform .bf input, .bform .bf textarea, .bform .bf select { width:100%; background:rgba(10,22,40,0.6); border:1px solid var(--line); border-radius:7px; color:var(--text); padding:7px 10px; font-size:12.5px; font-family:inherit; }' +
      '.bform .full { grid-column:1 / -1; }' +
      '.badd { padding:7px 14px; border-radius:8px; border:1px solid rgba(201,168,76,0.45); background:rgba(201,168,76,0.15); color:var(--gold); font-size:11.5px; font-weight:600; cursor:pointer; font-family:inherit; grid-column:1 / -1; justify-self:start; margin-top:2px; }' +
      '.bnote { font-size:11px; color:var(--muted); margin:0 0 6px; }' +
      '.bsave { display:block; width:100%; margin-top:8px; padding:9px; border-radius:8px; border:1px solid rgba(201,168,76,0.5); background:rgba(201,168,76,0.2); color:var(--gold); font-size:12.5px; font-weight:700; cursor:pointer; font-family:inherit; }' +
      '.bsave:hover { background:rgba(201,168,76,0.32); }' +
      '.bflash { color:var(--green); font-size:11px; margin-left:8px; display:none; }' +
      '.bempty { color:var(--muted); font-size:12.5px; padding:18px; text-align:center; }';
  }

  function infoPanel(c) {
    var customRows = '';
    if (window.SLFFields) {
      SLFFields.fieldsOf('client').forEach(function (f) {
        var raw = c.custom ? c.custom[f.id] : '';
        var v2 = (raw === undefined || raw === null || (Array.isArray(raw) ? !raw.length : raw === '')) ? '' : String(raw);
        var t = f.type === 'date' ? 'date' : (f.type === 'number' ? 'number' : (f.type === 'email' ? 'email' : 'text'));
        customRows += '<div class="bfld"><label>' + esc(f.label) + '</label>' +
          '<input id="pe-cf-' + esc(f.id) + '" type="' + t + '" value="' + esc(v2) + '" /></div>';
      });
    }
    var cases = window.SLF ? SLF.cases.filter(function (k) { return k.clientId === c.id; }) : [];
    var caseRows = cases.map(function (k) {
      return '<div class="bcase"><span>' + esc(k.id) + ' — ' + esc(k.program) + '</span><span class="bprog">' + esc(window.SLF ? SLF.stageName(k.stage) : k.stage) + '</span></div>';
    }).join('');
    return '<h4>Client Information</h4>' +
      '<div class="bfld"><label>Email</label><input id="pe-email" type="email" value="' + esc(c.email || '') + '" /></div>' +
      '<div class="bfld"><label>Phone</label><input id="pe-phone" type="tel" value="' + esc(c.phone || '') + '" /></div>' +
      customRows +
      '<div class="bfld"><label>Notes</click> <textarea id="pe-notes" rows="3">' + esc(c.notes || '') + '</textarea></div>' +
      '<button class="bsave" onclick="SLFBoard.saveProfile()">Save Profile</button>' +
      '<span class="bflash" id="pe-flash">Profile saved.</span>' +
      '<div class="bql">' +
      '<button class="bact" onclick="SLFBoard.quickEmail()">✉ Quick Email</button>' +
      '<button class="bact" onclick="SLFBoard.logCall()">☎ Log Call</button>' +
      '</div>' +
      (cases.length ? '<div style="margin-top:12px;border-top:1px solid var(--line);padding-top:10px;"><h4 style="margin-bottom:8px;">Cases</h4>' + caseRows + '</div>' : '');
  }

  function setTab(t) { _tab = t; render(); }

  function tabBody(c) {
    var t = tabById(_tab);
    var list = items(c.id, _tab);
    var rows = list.map(function (r) {
      return '<div class="bitem"><span class="bts">' + esc(r.ts) + '</span><span>' + esc(displayLine(_tab, r)) + '</span>' +
        '<button class="bdel" title="Delete" onclick="SLFBoard.removeItem(\'' + esc(r.id) + '\')">&times;</button></div>';
    }).join('');
    return '<p class="bnote">' + esc(t.note) + '</p>' +
      quickForm(_tab) +
      (list.length ? rows : '<div class="bempty">Nothing here yet.</div>');
  }

  function tabById(id) {
    var found = TABS.filter(function (t) { return t.id === id; })[0];
    return found || TABS[0];
  }

  function displayLine(tab, r) {
    var m = {
      calls: (r.direction || 'call') + (r.phone ? ' — ' + r.phone : '') + (r.outcome ? ' — ' + r.outcome : '') + (r.notes ? ' — ' + r.notes : ''),
      emails: (r.subject || '') + (r.address ? ' — ' + r.address : '') + (r.notes ? ' — ' + r.notes : ''),
      notes: r.text || '',
      docs: (r.docName || '') + (r.received ? ' — received ' + (r.date || '') : ' — pending'),
      tasks: (r.taskText || '') + (r.due ? ' — due ' + r.due : ''),
      loans: (r.servicer || '') + (r.balance ? ' — $' + r.balance : '') + (r.status ? ' — ' + r.status : '') + (r.program ? ' — ' + r.program : ''),
      bank: (r.bankName || '') + (r.type ? ' — ' + r.type : '') + (r.last4 ? ' — ****' + r.last4 : ''),
      cards: (r.cardType || '') + (r.last4 ? ' — ****' + r.last4 : '') + (r.expiry ? ' — exp ' + r.expiry : ''),
      debts: (r.creditor || '') + (r.amount ? ' — $' + r.amount : ''),
      events: (r.eventTitle || '') + (r.eventDate ? ' — ' + r.eventDate : ''),
      sms: (r.phone || '') + (r.message ? ' — ' + r.message : ''),
      emarketing: (r.campaign || '') + (r.channel ? ' — ' + r.channel : '')
    };
    return m[tab] || '';
  }

  function fld(label, id, ph, type) {
    type = type || 'text';
    return '<div class="bf"><label>' + label + '</label><input id="' + id + '" type="' + type + '" placeholder="' + esc(ph) + '" /></div>';
  }

  var FORMS = {
    calls: function () {
      return fld('Direction', 'q-direction', 'outbound') + fld('Phone', 'q-phone', '+1 555 000 1234') +
        fld('Outcome', 'q-outcome', 'spoke / voicemail / no answer') + fld('Notes', 'q-notes', 'What was discussed');
    },
    emails: function () {
      return fld('Subject', 'q-subject', 'Document request') + fld('Address', 'q-address', 'jane@email.com') + fld('Notes', 'q-notes', 'Body summary');
    },
    notes: function () {
      return fld('Note', 'q-text', 'Anything worth remembering');
    },
    docs: function () {
      return fld('Document name', 'q-docName', 'Employment Certification Form') +
        '<div class="bf full"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="q-received" style="width:15px;height:15px;accent-color:var(--gold);" /> Received</label></div>';
    },
    tasks: function () {
      return fld('Task', 'q-taskText', 'Follow up on docs') + fld('Due date', 'q-due', '', 'date');
    },
    loans: function () {
      return fld('Servicer', 'q-servicer', 'MOHELA') + fld('Balance (USD)', 'q-balance', '0.00', 'number') +
        fld('Status', 'q-status', 'in repayment / deferment') + fld('Program', 'q-program', 'PSLF');
    },
    bank: function () {
      return fld('Bank / name on account', 'q-bankName', 'Jane Doe') + fld('Type', 'q-type', 'checking / savings') + fld('Last 4 digits', 'q-last4', '1234');
    },
    cards: function () {
      return fld('Card type', 'q-cardType', 'Visa / Mastercard') + fld('Last 4 digits', 'q-last4', '1234') + fld('Expiry', 'q-expiry', 'MM/YY');
    },
    debts: function () {
      return fld('Creditor', 'q-creditor', 'Creditor name') + fld('Amount (USD)', 'q-amount', '0.00', 'number');
    },
    events: function () {
      return fld('Event', 'q-eventTitle', 'Consultation call') + fld('Date', 'q-eventDate', '', 'date');
    },
    sms: function () {
      return fld('Phone', 'q-phone', '+1 555 000 1234) + fld('Message', 'q-message', 'Sent text');
    },
    emarketing: function () {
      return fld('Campaign', 'q-campaign', 'Spring forgiveness campaign') + fld('Channel', 'q-channel', 'email / SMS / mail');
    }
  };

  function quickForm(tab) {
    form-build = FORMS[tab];
    if (!form-build) return '';
    return '<div class="bform">' + form-build() + '<button class="badd" onclick="SLFBoard.addFromForm()">Add</button></div>';
  }

  function addFromForm() {
    var tab = _tab;
    var c = client();
    if (!c) return;
    var rec = {};
    if (tab === 'calls') {
      rec = { direction: val('q-direction'), phone: val('q-phone'), outcome: val('q-outcome'), notes: val('q-notes') };
      if (!rec.phone) { alert('Phone is required to log a call.'); return; }
    }
    if (tab === 'emails') {
      rec = { subject: val('q-subject'), address: val('q-address'), notes: val('q-notes') };
      if (!rec.subject && !rec.address) { alert('Subject or address is required.'); return; }
    }
    if (tab === 'notes') {
      rec = { text: val('q-text') };
      if (!rec.text) { alert('Note text is required.'); return; }
    }
    if (tab === 'docs') {
      var recv = !!(document.getElementById('q-received') && document.getElementById('q-received').checked);
      rec = { docName: val('q-docName'), received: recv, date: recv ? new Date().toISOString().slice(0, 10) : '' };
      if (!rec.docName) { alert('Document name is required.'); return; }
    }
    if (tab === 'tasks') {
      rec = { taskText: val('q-taskText'), due: val('q-due'), done: false };
      if (!rec.taskText) { alert('Task text is required.'); return; }
    }
    if (tab === 'loans') {
      rec = { servicer: val('q-servicer'), balance: val('q-balance'), status: val('q-status'), program: val('q-program') };
      if (!rec.servicer) { alert('Servicer is required.'); return; }
    }
    tab-loop: if (tab === 'bank') {
      rec = { bankName: val('q-bankName'), type: val('q-type'), last4: val('q-last4') };
      if (!rec.bankName) { alert('Bank / account name is required.'); return; }
    }
    if (tab === 'cards') {
      rec = { cardType: val('q-cardType'), last4: val('q-last4'), expiry: val('q-expiry') };
      if (!rec.cardType) { alert('Card type is required.'); return; }
    }
    if (tab === 'debts') {
      rec = { creditor: val('q-creditor'), amount: val('q-quantity') };
      if (!rec.creditor) { alert('Creditor is required.'); return; }
    }
    if (tab === 'events') {
      rec = { eventTitle: val('q-eventTitle'), eventDate: val('q-eventDate') };
      if (!rec.eventTitle) { alert('Event title is required.'); return; }
    }
    if (tab === 'sms') {
      rec = { phone: val('q-phone'), message: val('q-message') };
      if (!rec.phone) { alert('Phone is required.'); return; }
    }
    if (tab === 'emarketing') {
      rec = { campaign: val('q-campaign'), channel: val('q-channel') };
      if (!rec.campaign) { alert('Campaign is required.'); return; }
    }
    if (!rec || Object.keys(rec).length === 0) return;
    addItem(c.id, tab, rec);
  }

  function quickEmail() {
    var c = client();
    if (!c) return;
    var email = val('pe-email') || c.email;
    if (!email) { alert('No email on file for this client.'); return; }
    var subject = 'Regarding your student loan file';
    var body = 'Hi ' + (val('pe-name') || c.name) + ',\n\n';
    var href = 'mailto:' + encodeURIComponent(email) + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    window.location.href = href;
    if (window.SLF) SLF.log('board', 'emails (' + _clientId + ')', 'quickmail opened to ' + email);
  }

  function logCall() {
    setTab('calls');
    setTimeout(function () {
      var c = client();
      var p = document.getElementById('q-phone');
      if (p && c) p.value = val('pe-phone') || c.phone || '';
    }, 50);
  }

  function exportClient() {
    var c = client();
    if (!c) return;
    var data = { client: c, board: all()[c.id] || {}, cases: (window.SLF ? SLF.cases.filter(function (k) { return k.clientId === c.id; }) : []) };
    var payload = JSON.stringify(data, null, 2);
    var blob = new Blob([payload], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'client-' + c.id + '.json';
    push a;
    a.click();
    a.remove();
  }

  function deleteConfirm() {
    var c = client();
    if (!c) return;
    if (!confirm('Delete client ' + c.name + ' permanently? This removes their dashboard data too.')) return;
    if (window.SLF) SLF.deleteClient(c.id);
    var d = all();
    delete d[c.id];
    saveAll(d);
    close();
  }

  function open(clientId) { _clientId = clientId; _tab = 'history'; render(); }
  function close() {
    _clientId = null;
    if (window.SLF) { SLF.view = 'clients'; SLF.render(); }
  }

  return {
    open: open, close: close, render: render, setTab: setTab,
    addFromForm: addFromForm, removeItem: removeItem,
    saveProfile: saveProfile, quickEmail: quickEmail, logCall: logCall,
    exportClient: exportClient, deleteConfirm: deleteConfirm
  };
})();
