// ============================================================
// SLF Client Dashboard — Forth CRM style client profile
// Opens per-client (click the client name in the Clients table).
// Structure mirrors Forth's Client Dashboard:
//  - Left panel: Client Information (name, contact info, custom
//    fields, quick actions — email opens Quick Email, phone
//    opens Log Call)
//  - Top action bar: Edit Client, New Case, Send Doc for
//    Signature, Export (JSON), Delete
//  - Nested tabs: History, Calls, Emails, Notes, Docs, Tasks,
//    Loans, Bank Accounts, Credit Cards, Debts, Events, SMS,
//    E-Marketing — each with working local storage and its own
//    quick-add form.
// All data rides in backups and cloud sync via SLFFields hook
// (data stored in slf_crm.clientboard.v1).
// ============================================================
'use strict';
var SLFBoard = (function () {
  var KEY = 'slf_crm.clientboard.v1';
  var TABS = [
    { id: 'history', name: 'History', note: 'Full activity history for this client.' },
    { id: 'calls', name: 'Calls', note: 'Log every call — date, direction, outcome, notes.' },
    { id: 'emails', name: 'Emails', note: 'Email log — subject, address, date, notes.' },
    { id: 'notes', name: 'Notes', note: 'Internal notes for this client.' },
    { id: 'docs', name: 'Docs', note: 'Document checklist and received status.' },
    { id: 'tasks', name: 'Tasks', note: 'Follow-up tasks with due dates and done state.' },
    { id: 'loans', name: 'Loans', note: 'Each loan: servicer, balance, status, program.' },
    { id: 'bank', name: 'Bank Accounts', note: 'Client bank accounts (name on account, type, last 4). Do NOT store full account numbers.' },
    { id: 'cards', name: 'Credit Cards', note: 'Cards on file (type, last 4, expiry). Do NOT store full card numbers.' },
    { id: 'debts', name: 'Debts', note: 'Other debts tracked for this client.' },
    { id: 'events', name: 'Events', note: 'Scheduled events — meetings, deadlines, hearings.' },
    { id: 'sms', name: 'SMS', note: 'Text message log.' },
    { id: 'emarketing', name: 'E-Marketing', note: 'Marketing touches — campaign, channel, date.' }
  ];

  var _clientId = null;
  var _tab = 'history';

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
    catch (e) { alert('SLF: could not save client dashboard data — storage full or blocked.'); return false; }
  }
  function items(clientId, tab) {
    var d = all();
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
    if (window.SLF) SLF.log('board', tab + ' (client ' + clientId + ')', recLabel(tab, rec));
    render();
    return true;
  }
  function removeItem(clientId, tab, id) {
    var d = all();
    if (!d[clientId] || !d[clientId][tab]) return;
    d[clientId][tab] = d[clientId][tab].filter(function (x) { return x.id !== id; });
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
      loans: [rec.servicer, rec.balance, rec.status],
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
    var nav = TABS.map(function (t) {
      return '<button class="btn small' + (_tab === t.id ? '' : ' ghost') + '" onclick="SLFBoard.setTab(\'' + t.id + '\')">' + t.name + '</button>';
    }).join(' ');
    v.innerHTML =
      '<a class="back" href="#" onclick="SLFBoard.close();return false;">&larr; Back to Clients</a>' +
      '<div class="card"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
      '<h3 style="margin:0;flex:1;font-size:16px;">' + esc(c.name) + '</h3>' +
      '<button class="btn small" onclick="SLF.openClientModal(SLF.clientById(\'' + esc(c.id) + '\'))">Edit Client</button> ' +
      '<button class="btn small" onclick="SLF.openCaseModal()">New Case</button> ' +
      '<button class="btn small ghost" onclick="SLFBoard.exportClient()">Export</button> ' +
      '<button class="btn small danger" onclick="SLFBoard.deleteConfirm()">Delete</button>' +
      '</div></div>' +
      infoPanel(c) +
      '<div class="card"><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">' + nav + '</div>' +
      tabBody(c) +
      '</div>';
  }

  function infoPanel(c) {
    var customRows = '';
    if (window.SLFFields) {
      SLFFields.fieldsOf('client').forEach(function (f) {
        var raw = c.custom ? c.custom[f.id] : '';
        var txt = (raw === undefined || raw === null || raw === '') ? '—' : String(raw);
        customRows += '<div class="ci-row"><span class="ci-l">' + esc(f.label) + '</span><span>' + esc(txt) + '</span></div>';
      });
    }
    var cases = window.SLF ? SLF.cases.filter(function (k) { return k.clientId === c.id; }) : [];
    var caseRows = cases.map(function (k) {
      return '<div class="ci-row"><span class="ci-l">' + esc(k.id) + '</span><span>' + esc(k.program) + ' — ' + esc(window.SLF ? SLF.stageName(k.stage) : k.stage) + '</span></div>';
    }).join('');
    return '<div class="card"><h3>Client Information</h3>' +
      '<div class="ci-row"><span class="ci-l">Client ID</span><span>' + esc(c.id) + '</span></div>' +
      '<div class="ci-row"><span class="ci-l">Email</span><span><a href="#" onclick="SLFBoard.quickEmail();return false;" style="color:var(--gold);">' + esc(c.email || '—') + '</a></span></div>' +
      '<div class="ci-row"><span class="ci-l">Phone</span><span><a href="#" onclick="SLFBoard.logCall();return false;" style="color:var(--gold);">' + esc(c.phone || '—') + '</a></span></div>' +
      customRows +
      (cases.length ? '<div style="margin-top:10px;border-top:1px solid var(--line);padding-top:10px;"><strong style="font-size:11px;color:var(--gold);letter-spacing:1px;">CASES</strong>' + caseRows + '</div>' : '') +
      '<p class="notice">' + esc(c.notes || '') + '</p>' +
      '</div>';
  }

  function setTab(t) { _tab = t; render(); }

  function tabBody(c) {
    var t = tabById(_tab);
    var list = items(c.id, _tab);
    var rows = list.map(function (r) {
      return '<div class="hist"><span class="h-ts">' + esc(r.ts) + '</span> — ' + esc(displayLine(_tab, r)) +
        ' <button class="btn small danger" style="float:right;" onclick="SLFBoard.removeItem(\'' + esc(r.id) + '\')">x</button></div>';
    }).join('');
    return '<p class="notice">' + esc(t.note) + '</p>' +
      quickForm(_tab) +
      (list.length ? rows : '<div class="empty">Nothing here yet.</div>');
  }

  function tabById(id) {
    var found = TABS.filter(function (t) { return t.id === id; })[0];
    return found || TABS[0];
  }

  function displayLine(tab, r) {
    var m = {
      calls: (r.direction || 'call') + ' — ' + (r.phone || '') + (r.outcome ? ' — ' + r.outcome : '') + (r.notes ? ' — ' + r.notes : ''),
      emails: (r.subject || '') + (r.address ? ' — ' + r.address : '') + (r.notes ? ' — ' + r.notes : ''),
      notes: r.text || '',
      docs: (r.docName || '') + (r.received ? ' — received ' + (r.date || '') : ' — pending'),
      tasks: (r.taskText || '') + (r.due ? ' — due ' + r.due : '') + (r.done ? ' — DONE' : ' — open'),
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
    return '<div class="full"><label class="fl">' + label + '</label><input id="' + id + '" type="' + type + '" placeholder="' + esc(ph) + '" /></div>';
  }
  function quickForm(tab) {
    var f = '';
    if (tab === 'calls') {
      f = fld('Direction', 'q-direction', 'outbound') + fld('Phone', 'q-phone', '+1 555 000 1234') +
        fld('Outcome', 'q-outcome', 'spoke / left voicemail / no answer') + fld('Notes', 'q-notes', 'What was discussed');
    } else if (tab === 'emails') {
      f = fld('Subject', 'q-subject', 'Document request') + fld('Address', 'q-address', 'jane@email.com') + fld('Notes', 'q-notes', 'Body summary');
    } else if (tab === 'notes') {
      f = fld('Note', 'q-text', 'Anything worth remembering');
    } else if (tab === 'docs') {
      f = fld('Document name', 'q-docName', 'Employment Certification Form') +
        '<div class="full"><label class="fl" style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="q-received" style="width:16px;height:16px;accent-color:var(--gold);" /> Received</label></div>';
    } else if (tab === 'tasks') {
      f = fld('Task', 'q-taskText', 'Follow up on docs') + fld('Due date', 'q-due', '', 'date');
    } else if (tab === 'loans') {
      f = fld('Servicer', 'q-servicer', 'MOHELA') + fld('Balance (USD)', 'q-balance', '0.00', 'number') +
        fld('Status', 'q-status', 'in repayment / deferment / default') + fld('Program', 'q-program', 'PSLF');
    } tab-form-break: else if (tab === 'bank') {
      f = fld('Bank / name on account', 'q-bankName', 'Jane Doe') + fld('Type', 'q-type', 'checking / savings') + fld('Last 4 digits', 'q-last4', '1234');
    } else if (tab === 'cards') {
      f = fld('Card type', 'q-cardType', 'Visa / Mastercard') + fld('Last 4 digits', 'q-last4', '1234') + fld('Expiry', 'q-expiry', 'MM/YY');
    } else if (tab === 'debts') {
      f = fld('Creditor', 'q-creditor', 'Creditor name') + fld('Amount (USD)', 'q-amount', '0.00', 'number');
    } else if (tab === 'events') {
      f = fld('Event', 'q-eventTitle', 'Consultation call') + fld('Date', 'q-eventDate', '', 'date');
    } else if (tab === 'sms') {
      f = fld('Phone', 'q-phone', '+1 555 000 1234') + fld('Message', 'q-message', 'Sent text');
    } else if (tab === 'emarketing') {
      f = fld('Campaign', 'q-campaign', 'Spring forgiveness campaign') + fld('Channel', 'q-channel', 'email / SMS / mail');
    }
    if (!f) return '';
    return '<div class="fgrid" style="margin-top:8px;">' + f +
      '</div><div class="modal-actions" style="justify-content:flex-start;"><button class="btn small" onclick="SLFBoard.addFromForm()">Add</button></div>';
  }

  function addFromForm() {
    var tab = _tab;
    var c = client();
    if (!c) return;
    var rec = {};
    if (tab === 'calls') {
      rec = { direction: val('q-direction'), phone: val('q-phone'), outcome: val('q-outcome'), notes: val('q-notes') };
      if (!rec.phone) { alert('Phone is required to log a call.'); return; }
    } else if (tab === 'emails') {
      rec = { subject: val('q-subject'), address: val('q-address'), notes: val('q-notes') };
      if (!rec.subject && !rec.address) { alert('Subject or address is required.'); return; }
    } else if (tab === 'notes') {
      rec = { text: val('q-text') };
      if (!rec.text) { alert('Note text is required.'); return; }
    } else if (tab === 'docs') {
      var recv = !!(document.getElementById('q-received') && document.getElementById('q-received').checked);
      rec = { docName: val('q-docName'), received: recv, date: recv ? new Date().toISOString().slice(0, 10) : '' };
      if (!rec.docName) { alert('Document name is required.'); return; }
    } records-check: else if (tab === 'tasks') {
      rec = { taskText: val('q-taskText'), due: val('q-due'), done: false };
      if (!rec.taskText) { alert('Task text is required.'); return; }
    } else if (tab === 'loans') {
      rec = { servicer: val('q-servicer'), balance: val('q-balance'), status: val('q-status'), program: val('q-program') };
      if (!rec.servicer) { alert('Servicer is required.'); return; }
    } else if (tab === 'bank') {
      rec = { bankName: val('q-bankName'), type: val('q-type'), last4: val('q-last4') };
      if (!rec.bankName) { alert('Bank / account name is required.'); return; }
    } else if (tab === 'cards') {
      rec = { cardType: val('q-cardType'), last4: val('q-last4'), expiry: val('q-expiry') };
      if (!rec.cardType) { alert('Card type is required.'); return; }
    } else if (tab === 'debts') {
      rec = { creditor: val('q-creditor'), amount: val('q-amount') };
      if (!rec.creditor) { alert('Creditor is required.'); return; }
    } else if (tab === 'events') {
      rec = { eventTitle: val('q-eventTitle'), eventDate: val('q-eventDate') };
      if (!rec.eventTitle) { alert('Event title is required.'); return; }
    } else if (tab === 'sms') {
      rec = { phone: val('q-phone'), message: val('q-message') };
      if (!rec.phone) { alert('Phone is required.'); return; }
    } else if (tab === 'emarketing') {
      rec = { campaign: val('q-campaign'), channel: val('q-channel') };
      if (!rec.campaign) { alert('Campaign is required.'); return; }
    } else { return; }
    addItem(c.id, tab, rec);
  }

  function quickEmail() {
    var c = client();
    if (!c || !c.email) { alert('No email on file for this client.'); return; }
    var subject = 'Regarding your student loan file';
    var body = 'Hi ' + c.name + ',\n\n';
    var href = 'mailto:' + encodeURIComponent(c.email) + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    window.location.href = href;
    var now = new Date().toISOString();
    addItemLog(now, 'quickmail-opened ' + c.email);
  }
  function addItemLog(ts, label) {
    if (!window.SLF) return;
    SLF.log('board', 'emails (client ' + _clientId + ')', label);
  }

  function logCall() {
    setTab('calls');
    setTimeout(function () {
      var c = client();
      var p = document.getElementById('q-phone');
      if (p && c && c.phone) p.value = c.phone;
    }, 50);
  }

  function exportClient() {
    var c = client();
    if (!c) return;
    var data = { client: c, board: all()[c.id] || {}, cases: (window.SLF ? SLF.cases.filter(function (k) { return k.clientId === c.id; }) : []) };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'client-' + c.id + '.json';
    document.body.appendChild(a);
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
    quickEmail: quickEmail, logCall: logCall,
    exportClient: exportClient, deleteConfirm: deleteConfirm
  };
})();
