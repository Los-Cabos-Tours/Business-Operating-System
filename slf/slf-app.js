// ============================================================
// SLF CRM — Student Loan Forgiveness Case Manager
// Complete application logic.
// Own slf_crm.* namespace — never touches aetherion_* tour data.
// ============================================================
'use strict';

// ---------- Storage (mirrors BOS storage.js patterns) ----------
var SLF_STORE = {
  safeParse: function (key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      var v = JSON.parse(raw);
      return (v === null || v === undefined) ? fallback : v;
    } catch (e) {
      console.warn('SLF: key unreadable, quarantined:', key);
      try {
        var qk = key + '.quarantine.' + Date.now();
        localStorage.setItem(qk, localStorage.getItem(key));
        localStorage.removeItem(key);
      } catch (e2) {}
      return fallback;
    }
  },
  write: function (key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      alert('SLF: could not save — browser storage is full or blocked. Export a backup, then remove old cases.');
      return false;
    }
  },
  snapshotBefore: function (reason) {
    try {
      var dump = {};
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('slf_crm.') === 0) dump[k] = localStorage.getItem(k);
      }
      localStorage.setItem('slf_crm.snapshot.' + reason + '.' + Date.now(), JSON.stringify(dump));
      return true;
    } catch (e) {
      console.warn('SLF: pre-destruction snapshot failed:', reason);
      return false;
    }
  }
};

// ---------- Keys ----------
var SLF_CLIENTS_KEY = 'slf_crm.clients.v1';
var SLF_CASES_KEY = 'slf_crm.cases.v1';
var SLF_HISTORY_KEY = 'slf_crm.history.v1';
var SLF_COUNTER_KEY = 'slf_crm.counter.v1';

// ---------- App ----------
var SLF = {
  clients: [],
  cases: [],
  history: [],
  counter: { client: 0, case: 0 },
  editingClientId: null,
  editingCaseId: null,
  view: 'dashboard',

  init: function () {
    this.clients = SLF_STORE.safeParse(SLF_CLIENTS_KEY, []);
    this.cases = SLF_STORE.safeParse(SLF_CASES_KEY, []);
    this.history = SLF_STORE.safeParse(SLF_HISTORY_KEY, []);
    this.counter = SLF_STORE.safeParse(SLF_COUNTER_KEY, { client: 0, case: 0 });
    this.bindNav();
    this.render();
  },

  bindNav: function () {
    var self = this;
    var buttons = document.querySelectorAll('#nav button');
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        buttons.forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        self.view = b.getAttribute('data-view');
        self.render();
      });
    });
  },

  esc: function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  stages: function () {
    if (window.BOSSettings) return window.BOSSettings.stages('slf');
    return [
      { id: 'new_lead', name: 'New Lead', isClosed: false },
      { id: 'initial_review', name: 'Initial Review', isClosed: false },
      { id: 'document_collection', name: 'Document Collection', isClosed: false },
      { id: 'eligibility_review', name: 'Eligibility Review', isClosed: false },
      { id: 'application_prep', name: 'Application Preparation', isClosed: false },
      { id: 'submitted', name: 'Submitted', isClosed: false },
      { id: 'under_review', name: 'Under Review', isClosed: false },
      { id: 'approved', name: 'Approved', isClosed: true },
      { id: 'denied_appeal', name: 'Denied / Appeal Review', isClosed: true },
      { id: 'closed', name: 'Closed', isClosed: true }
    ];
  },

  stageName: function (id) {
    var s = this.stages().filter(function (x) { return x.id === id; })[0];
    return s ? s.name : id;
  },

  clientById: function (id) {
    return this.clients.filter(function (c) { return c.id === id; })[0] || null;
  },

  nextId: function (kind) {
    this.counter[kind] = (this.counter[kind] || 0) + 1;
    SLF_STORE.write(SLF_COUNTER_KEY, this.counter);
    var prefix = kind === 'client' ? 'CL' : 'CS';
    return prefix + '-' + String(this.counter[kind]).padStart(4, '0');
  },

  log: function (action, target, detail) {
    this.history.push({ ts: new Date().toISOString(), action: action, target: target, detail: detail || '' });
    if (this.history.length > 500) this.history = this.history.slice(-500);
    try { localStorage.setItem(SLF_HISTORY_KEY, JSON.stringify(this.history)); } catch (e) {}
  },

  closeModal: function (id) { document.getElementById(id).classList.remove('open'); },

  validateClient: function (c) {
    var errs = [];
    if (!c.name) errs.push('Full name is required.');
    if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) errs.push('Email format is invalid.');
    if (c.phone && c.phone.length < 7) errs.push('Phone looks too short.');
    return errs;
  },

  validateCase: function (k) {
    var errs = [];
    if (!k.clientId) errs.push('A client must be selected.');
    if (!k.program) errs.push('Program must be selected.');
    if (k.balance !== '' && k.balance !== null && k.balance !== undefined) {
      var b = Number(k.balance);
      if (isNaN(b) || b < 0) errs.push('Loan balance must be a non-negative number.');
    }
    var known = this.stages().some(function (s) { return s.id === k.stage; });
    if (!known) errs.push('Unknown pipeline stage.');
    return errs;
  },

  openClientModal: function (existing) {
    document.getElementById('client-modal-title').textContent = existing ? 'Edit Client' : 'Add Client';
    document.getElementById('c-name').value = existing ? existing.name : '';
    document.getElementById('c-email').value = existing ? (existing.email || '') : '';
    document.getElementById('c-phone').value = existing ? (existing.phone || '') : '';
    document.getElementById('c-notes').value = existing ? (existing.notes || '') : '';
    this.editingClientId = existing ? existing.id : null;
    document.getElementById('client-modal').classList.add('open');
  },

  saveClient: function () {
    var rec = {
      id: this.editingClientId || this.nextId('client'),
      name: document.getElementById('c-name').value.trim(),
      email: document.getElementById('c-email').value.trim(),
      phone: document.getElementById('c-phone').value.trim(),
      notes: document.getElementById('c-notes').value.trim()
    };
    var errs = this.validateClient(rec);
    if (errs.length) { alert('Please fix:\n- ' + errs.join('\n- ')); return; }
    var ix = this.clients.findIndex(function (c) { return c.id === rec.id; });
    if (ix >= 0) this.clients[ix] = rec; else this.clients.push(rec);
    SLF_STORE.write(SLF_CLIENTS_KEY, this.clients);
    this.log(ix >= 0 ? 'edit' : 'create', 'client ' + rec.id, rec.name);
    this.closeModal('client-modal');
    this.render();
  },

  deleteClient: function (id) {
    var used = this.cases.some(function (k) { return k.clientId === id; });
    if (used) { alert('This client still has cases. Delete or reassign those first.'); return; }
    if (!confirm('Delete this client permanently?')) return;
    SLF_STORE.snapshotBefore('pre-delete-client');
    this.clients = this.clients.filter(function (c) { return c.id !== id; });
    SLF_STORE.write(SLF_CLIENTS_KEY, this.clients);
    this.log('delete', 'client ' + id, 'client record removed');
    this.render();
  },

  openCaseModal: function (existing) {
    var self = this;
    var sel = document.getElementById('k-client');
    sel.innerHTML = this.clients.map(function (c) {
      return '<option value="' + self.esc(c.id) + '">' + self.esc(c.name) + ' (' + self.esc(c.id) + ')</option>';
    }).join('');
    var stageSel = document.getElementById('k-stage');
    stageSel.innerHTML = this.stages().map(function (s) {
      return '<option value="' + self.esc(s.id) + '">' + self.esc(s.name) + '</option>';
    }).join('');
    document.getElementById('case-modal-title').textContent = existing ? 'Edit Case' : 'New Case';
    if (existing) {
      sel.value = existing.clientId;
      stageSel.value = existing.stage;
      document.getElementById('k-program').value = existing.program;
      document.getElementById('k-servicer').value = existing.servicer || 'MOHELA';
      document.getElementById('k-balance').value = existing.balance || '';
      document.getElementById('k-notes').value = existing.notes || '';
      this.editingCaseId = existing.id;
    } else {
      stageSel.value = 'new_lead';
      document.getElementById('k-program').value = 'PSLF';
      document.getElementById('k-servicer').value = 'MOHELA';
      document.getElementById('k-balance').value = '';
      document.getElementById('k-notes').value = '';
      this.editingCaseId = null;
    }
    document.getElementById('case-modal').classList.add('open');
  },

  saveCase: function () {
    var rec = {
      id: this.editingCaseId || this.nextId('case'),
      clientId: document.getElementById('k-client').value,
      program: document.getElementById('k-program').value,
      servicer: document.getElementById('k-servicer').value,
      balance: document.getElementById('k-balance').value,
      stage: document.getElementById('k-stage').value,
      notes: document.getElementById('k-notes').value.trim(),
      documents: [],
      createdAt: new Date().toISOString()
    };
    var errs = this.validateCase(rec);
    if (errs.length) { alert('Please fix:\n- ' + errs.join('\n- ')); return; }
    var ix = this.cases.findIndex(function (k) { return k.id === rec.id; });
    if (ix >= 0) {
      rec.documents = this.cases[ix].documents || [];
      rec.createdAt = this.cases[ix].createdAt;
      this.cases[ix] = rec;
    } else {
      this.cases.push(rec);
    }
    SLF_STORE.write(SLF_CASES_KEY, this.cases);
    this.log(ix >= 0 ? 'edit' : 'create', 'case ' + rec.id, rec.program + ' — ' + this.stageName(rec.stage));
    this.closeModal('case-modal');
    this.render();
  },

  advanceStage: function (caseId, newStage) {
    var k = this.cases.filter(function (x) { return x.id === caseId; })[0];
    if (!k) return;
    var oldName = this.stageName(k.stage);
    k.stage = newStage;
    SLF_STORE.write(SLF_CASES_KEY, this.cases);
    this.log('stage', 'case ' + k.id, oldName + ' to ' + this.stageName(newStage));
    this.render();
  },

  deleteCase: function (id) {
    if (!confirm('Delete this case permanently?')) return;
    SLF_STORE.snapshotBefore('pre-delete-case');
    this.cases = this.cases.filter(function (k) { return k.id !== id; });
    SLF_STORE.write(SLF_CASES_KEY, this.cases);
    this.log('delete', 'case ' + id, 'case record removed');
    this.render();
  },

  toggleDoc: function (caseId, docName) {
    var k = this.cases.filter(function (x) { return x.id === caseId; })[0];
    if (!k) return;
    if (!k.documents) k.documents = [];
    var entry = k.documents.filter(function (d) { return d.name === docName; })[0];
    if (entry) {
      entry.received = !entry.received;
      if (entry.received) entry.date = new Date().toISOString().slice(0, 10);
    } else {
      k.documents.push({ name: docName, received: true, date: new Date().toISOString().slice(0, 10) });
    }
    SLF_STORE.write(SLF_CASES_KEY, this.cases);
    this.log('doc', 'case ' + k.id, docName);
    this.render();
  },

  addDoc: function (caseId) {
    var name = prompt('Document name (e.g. Employment Certification Form):');
    if (!name || !name.trim()) return;
    var k = this.cases.filter(function (x) { return x.id === caseId; })[0];
    if (!k) return;
    if (!k.documents) k.documents = [];
    k.documents.push({ name: name.trim(), received: false, date: '' });
    SLF_STORE.write(SLF_CASES_KEY, this.cases);
    this.log('doc-add', 'case ' + k.id, name.trim());
    this.render();
  },

  downloadBackup: function () {
    var bundle = {
      format: 'slf-backup', version: 1, exportedAt: new Date().toISOString(),
      data: { clients: this.clients, cases: this.cases, history: this.history, counter: this.counter }
    };
    var blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'slf-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
  },

  restoreBackup: function (inputEl) {
    var self = this;
    var file = inputEl.files && inputEl.files[0];
    if (!file) { alert('Choose a backup file first.'); return; }
    var reader = new FileReader();
    reader.onload = function (ev) {
      var parsed = null;
      try { parsed = JSON.parse(ev.target.result); } catch (e) { alert('Invalid JSON file — cannot import.'); return; }
      if (!parsed || parsed.format !== 'slf-backup' || !parsed.data || !Array.isArray(parsed.data.clients) || !Array.isArray(parsed.data.cases)) {
        alert('Import rejected: not a valid SLF backup file.');
        return;
      }
      if (!confirm('Restoring replaces current SLF data with the backup. A safety snapshot is taken first. Continue?')) return;
      if (!SLF_STORE.snapshotBefore('pre-restore')) { alert('Import blocked: safety snapshot failed (storage full?).'); return; }
      self.clients = parsed.data.clients;
      self.cases = parsed.data.cases;
      self.history = parsed.data.history || [];
      self.counter = parsed.data.counter || { client: 0, case: 0 };
      SLF_STORE.write(SLF_CLIENTS_KEY, self.clients);
      SLF_STORE.write(SLF_CASES_KEY, self.cases);
      try { localStorage.setItem(SLF_HISTORY_KEY, JSON.stringify(self.history)); } catch (e) {}
      SLF_STORE.write(SLF_COUNTER_KEY, self.counter);
      self.log('restore', 'system', 'backup imported (' + parsed.data.cases.length + ' cases)');
      self.render();
      document.getElementById('restore-status').textContent = 'Restore complete.';
    };
    reader.onerror = function () { alert('Could not read the selected file.'); };
    reader.readAsText(file);
  },

  render: function () {
    var titles = {
      dashboard: 'Dashboard', clients: 'Clients', cases: 'Cases & Pipeline',
      history: 'Activity History', backup: 'Backup & Restore'
    };
    document.getElementById('view-title').textContent = titles[this.view] || 'Dashboard';
    var v = document.getElementById('view');
    if (this.view === 'dashboard') v.innerHTML = this.renderDashboard();
    else if (this.view === 'clients') v.innerHTML = this.renderClients();
    else if (this.view === 'cases') v.innerHTML = this.renderCases();
    else if (this.view === 'history') v.innerHTML = this.renderHistory();
    else if (this.view === 'backup') v.innerHTML = this.renderBackup();
  },

  renderDashboard: function () {
    var self = this;
    var open = this.cases.filter(function (k) {
      var s = self.stages().filter(function (x) { return x.id === k.stage; })[0];
      return s && !s.isClosed;
    });
    var totalBalance = this.cases.reduce(function (sum, k) { return sum + (Number(k.balance) || 0); }, 0);
    var stageRows = this.stages().map(function (s) {
      var n = self.cases.filter(function (k) { return k.stage === s.id; }).length;
      var pct = self.cases.length ? Math.round(n / self.cases.length * 100) : 0;
      return '<div class="bar-row"><span style="width:150px;">' + self.esc(s.name) + '</span>' +
        '<div class="bar"><i style="width:' + pct + '%"></i></div><span class="cnt">' + n + '</span></div>';
    }).join('');
    return '' +
      '<div class="kpis">' +
      '<div class="kpi"><div class="num">' + this.clients.length + '</div><div class="lbl">Total Clients</div></div>' +
      '<div class="kpi"><div class="num">' + this.cases.length + '</div><div class="lbl">Total Cases</div></div>' +
      '<div class="kpi"><div class="num">' + open.length + '</div><div class="lbl">Open Cases</div></div>' +
      '<div class="kpi"><div class="num">$' + totalBalance.toLocaleString() + '</div><div class="lbl">Portfolio Balance</div></div>' +
      '</div>' +
      '<div class="card"><h3>Pipeline Distribution</h3>' + stageRows + '</div>' +
      '<div class="card"><h3>Recent Activity</h3>' + this.renderHistorySlice(8) + '</div>';
  },

  renderClients: function () {
    var self = this;
    if (!this.clients.length) return '<div class="toolbar"><button class="btn" onclick="SLF.openClientModal()">+ Add Client</button></div><div class="empty">No clients yet. Add your first client to begin.</div>';
    var rows = this.clients.map(function (c) {
      var n = self.cases.filter(function (k) { return k.clientId === c.id; }).length;
      return '<tr><td>' + self.esc(c.id) + '</td><td>' + self.esc(c.name) + '</td><td>' + self.esc(c.email || '—') +
        '</td><td>' + self.esc(c.phone || '—') + '</td><td>' + n + '</td>' +
        '<td><button class="btn small" onclick="SLF.openClientModal(SLF.clientById(\'' + c.id + '\'))">Edit</button> ' +
        '<button class="btn small danger" onclick="SLF.deleteClient(\'' + c.id + '\')">Delete</button></td></tr>';
    }).join('');
    return '<div class="toolbar"><button class="btn" onclick="SLF.openClientModal()">+ Add Client</button></div>' +
      '<div class="card"><table><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Cases</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  },

  renderCases: function () {
    var self = this;
    if (!this.cases.length) return '<div class="toolbar"><button class="btn" onclick="SLF.openCaseModal()">+ New Case</button></div><div class="empty">No cases yet. Create a case for a client to start the pipeline.</div>';
    var stages = this.stages();
    var rows = this.cases.map(function (k) {
      var c = self.clientById(k.clientId);
      var stageDef = stages.filter(function (x) { return x.id === k.stage; })[0];
      var cls = 'stage-chip' + (stageDef && stageDef.isClosed ? (k.stage === 'approved' ? ' closed' : ' denied') : '');
      var docsIn = (k.documents || []).filter(function (d) { return d.received; }).length;
      var total = (k.documents || []).length;
      var idx = -1;
      for (var i = 0; i < stages.length; i++) { if (stages[i].id === k.stage) idx = i; }
      var nextBtn = (idx >= 0 && idx + 1 < stages.length)
        ? '<button class="btn small" onclick="SLF.advanceStage(\'' + k.id + '\',\'' + stages[idx + 1].id + '\')">Advance: ' + self.esc(stages[idx + 1].name) + '</button>'
        : '';
      var docs = (k.documents || []).map(function (d) {
        return '<div class="doc-item"><input type="checkbox" ' + (d.received ? 'checked' : '') +
          ' onchange="SLF.toggleDoc(\'' + k.id + '\',\'' + self.esc(d.name) + '\')" />' +
          '<span class="dname">' + self.esc(d.name) + '</span><span class="ddate">' + self.esc(d.date || '') + '</span></div>';
      }).join('');
      return '<tr><td>' + self.esc(k.id) + '</td><td>' + self.esc(c ? c.name : 'Unknown') + '</td><td>' + self.esc(k.program) +
        '</td><td>' + self.esc(k.servicer || '—') + '</td><td>$' + (Number(k.balance) || 0).toLocaleString() + '</td>' +
        '<td><span class="' + cls + '">' + self.esc(self.stageName(k.stage)) + '</span></td>' +
        '<td>' + docsIn + '/' + total + '</td>' +
        '<td><button class="btn small" onclick="SLF.openCaseModal(SLF.cases.filter(function(x){return x.id===\'' + k.id + '\';})[0])">Edit</button> ' +
        '<button class="btn small ghost" onclick="SLF.addDoc(\'' + k.id + '\')">+ Doc</button> ' +
        '<button class="btn small danger" onclick="SLF.deleteCase(\'' + k.id + '\')">Delete</button> ' + nextBtn + '</td></tr>' +
        (docs ? '<tr><td colspan="8" style="padding:0 10px 10px;">' + docs + '</td></tr>' : '');
    }).join('');
    return '<div class="toolbar"><button class="btn" onclick="SLF.openCaseModal()">+ New Case</button></div>' +
      '<div class="card"><table><thead><tr><th>ID</th><th>Client</th><th>Program</th><th>Servicer</th><th>Balance</th><th>Stage</th><th>Docs</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  },

  renderHistorySlice: function (n) {
    var self = this;
    if (!this.history.length) return '<div class="empty">No activity yet.</div>';
    return this.history.slice(-n).reverse().map(function (h) {
      return '<div class="hist"><span class="h-ts">' + self.esc(h.ts) + '</span> — <strong>' + self.esc(h.action) + '</strong> ' +
        self.esc(h.target) + (h.detail ? ' <span style="color:var(--muted)">' + self.esc(h.detail) + '</span>' : '') + '</div>';
    }).join('');
  },

  renderHistory: function () {
    return '<div class="card"><h3>Full Activity History (latest 200)</h3>' + this.renderHistorySlice(200) + '</div>';
  },

  renderBackup: function () {
    return '<div class="card"><h3>Download Backup</h3>' +
      '<p style="font-size:12.5px;color:var(--muted);">Exports all SLF clients, cases, documents, history and counters to one JSON file. This file restores your data on any device.</p>' +
      '<button class="btn" onclick="SLF.downloadBackup()">Download SLF Backup (.json)</button></div>' +
      '<div class="card"><h3>Restore From Backup</h3>' +
      '<p style="font-size:12.5px;color:var(--muted);">Imports an SLF backup file. Format and contents are validated first, and a safety snapshot of current data is taken before anything is overwritten.</p>' +
      '<input type="file" id="restore-file" accept=".json,application/json" style="max-width:320px;" />' +
      '<button class="btn danger" onclick="SLF.restoreBackup(document.getElementById(\'restore-file\'))">Restore Backup</button>' +
      '<div id="restore-status" style="color:var(--green);font-size:12px;margin-top:10px;"></div></div>';
  }
};

window.SLF = SLF;
document.addEventListener('DOMContentLoaded', function () { SLF.init(); });
