// SLF Board base — state, storage, labels (split 1/5)
'use strict';
var SLFBoard = (function () {
  var KEY = 'slf_crm.clientboard.v1';
  var TABS = [
    { id: 'history', name: 'History', note: 'Full activity history for this client.' },
    { id: 'calls', name: 'Calls', note: 'Log every call — direction, phone, outcome, notes.' },
    { id: 'emails', name: 'Emails', note: 'Email log — subject, address, date, notes.' },
    { id: 'notes', name: 'Notes', note: 'Internal notes for this client.' },
    { id: 'docs', name: 'Docs', note: 'Document checklist and received status.' },
    { id: 'tasks', name: 'Tasks', note: 'Follow-up tasks with due dates.' },
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
    var d = all();
    return (d[clientId] && d[clientId][tab]) ? d[clientId][tab] : [];
  }
  function client() { return window.SLF ? SLF.clientById(_clientId) : null; }

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

  return {
    esc: esc, val: val, all: all, saveAll: saveAll, items: items,
    client: client, recLabel: recLabel, TABS: TABS,
    state: function () { return { clientId: _clientId, tab: _tab, saveTimer: _saveTimer }; },
    setClientId: function (id) { _clientId = id; },
    setTab: function (t) { _tab = t; },
    setSaveTimer: function (t) { _saveTimer = t; }
  };
})();
