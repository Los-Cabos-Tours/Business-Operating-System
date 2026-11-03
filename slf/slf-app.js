// ============================================================
// SLF CRM — Student Loan Forgiveness Case Manager
// Part 1: storage layer, records, validation
// Own slf_crm.* namespace — never touches aetherion_* tour data
// ============================================================
'use strict';

// ---------- Storage (mirrors BOS storage.js patterns) ----------
const SLF_STORE = {
  safeParse(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      const v = JSON.parse(raw);
      return (v === null || v === undefined) ? fallback : v;
    } catch (e) {
      console.warn('SLF: key unreadable, quarantined:', key);
      try {
        const qk = key + '.quarantine.' + Date.now();
        localStorage.setItem(qk, localStorage.getItem(key));
        localStorage.removeItem(key);
      } catch (e2) {}
      return fallback;
    }
  },
  write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      alert('SLF: could not save — browser storage is full or blocked. Delete unused cases or export a backup first.');
      return false;
    }
    }
  },
  snapshotBefore(reason) {
    try {
      const dump = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf('slf_crm.') === 0) {
          dump[k] = localStorage.getItem(k);
        }
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
const SLF_CLIENTS_KEY = 'slf_crm.clients.v1';
const SLF_CASES_KEY = 'slf_crm.cases.v1';
const SLF_HISTORY_KEY = 'slf_crm.history.v1';
const SLF_COUNTER_KEY = 'slf_crm.counter.v1';
const SLF_STAGE_KEY = 'slf_crm.stages.case.v1';

// ---------- Records ----------
const SLF = {
  clients: [],
  cases: [],
  history: [],
  counter: { client: 0, case: 0 },

  init() {
    this.clients = SLF_STORE.safeParse(SLF_CLIENTS_KEY, []);
    this.cases = SLF_STORE.safeParse(SLF_CASES_KEY, []);
    this.history = SLF_STORE.safeParse(SLF_HISTORY_KEY, []);
    this.counter = SLF_STORE.safeParse(SLF_COUNTER_KEY, { client: 0, case: 0 });
    this.bindNav();
    this.render();
  },

  persistClients() { if (SLF_STORE.write(SLF_CLIENTS_KEY, this.clients)) this.log('update', 'clients'); },
  persistCases() { if (SLF_STORE.write(SLF_CASES_KEY, this.cases)) this.log('update', 'cases'); },

  // ID generation — stable, never derived from client name
  nextId(kind) {
    this.counter[kind] = (this.counter[kind] || 0) + 1;
    SLF_STORE.write(SLF_COUNTER_KEY, this.counter);
    const prefix = kind === 'client' ? 'CL' : 'CS';
    return prefix + '-' + String(this.counter[kind]).padStart(4, '0');
  },

  // Dated activity history — every mutation logs
  log(action, target, detail) {
    this.history.push({
      ts: new Date().toISOString(),
      action: action, target: target, detail: detail || ''
    });
    // cap history at 500 entries to protect quota
    if (this.history.length > 500) this.history = this.history.slice(-500);
    try { localStorage.setItem(SLF_HISTORY_KEY, JSON.stringify(this.history)); } catch (e) {}
  },

  stages() {
    if (window.BOSSettings) return window.BOSSettings.stages('slf');
    // fallback if settings.js failed to load
    return [
      { id: 'new_lead', name: 'New Lead', isClosed: false },
      { id: 'initial_review', name: 'Initial Review', isClosed: false },
      { id: 'document_collection', name: 'Document Collection', isClosed: false },
      { id: 'eligibility_review', name: 'Eligibility Review', isClosed: false },
      { id: 'application_prep', id: 'application_prep', name: 'Application Preparation', isClosed: false },
      { id: 'submitted', name: 'Submitted', isClosed: false },
      { id: 'under_review', name: 'Under Review', isClosed: false },
      { id: 'approved', name: ' Approved', isClosed: true },
      { id: 'denied_appeal', name: 'Denied / Appeal Review', isClosed: true },
      { id: 'closed', name: 'Closed', isClosed: true }
    ];
  },

  stageName(id) {
    const s = this.stages().find(x => x.id === id);
    return s ? s.name : id;
  },

  // ---------- Validation ----------
  validateClient(c) {
    const errs = [];
    if (!c.name || !String(c.name).trim()) errs.push('Full name is required.');
    if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(c.email).trim())) errs.push('Email format is invalid.');
    if (c.phone && String(c.phone).trim().length < 7) errs.push('Phone looks too short.');
    return errs;
  },

  validateCase(k) {
    const errs = [];
    if (!k.clientId) errs.push('A client must be selected.');
    if (!k.program) errs.push('Program must be selected.');
    if (k.balance !== undefined && k.balance !== '' && k.balance !== null) {
      const b = Number(k.balance);
      if (isNaN(b) || b < 0) errs.push('Loan balance must be a non-negative number.');
    }
    const stageOk = this.stages().some(s => s.id === k.stage);
    if (k.stage && !stageOk) errs.push('Unknown pipeline stage: ' + k.stage);
    return errs;
  },

  // ---------- Modals ----------
  closeModal(id) { document.getElementById(id).classList.remove('open'); },

  openClientModal(existing) {
    document.getElementById('client-modal-title').textContent = existing ? 'Edit Client' : 'Add Client';
    document.getElementById('c-name').value = existing ? existing.name : '';
    document.getElementById('c-email').value = existing ? (existing.email || '') : '';
    document.getElementById('c-phone').value = existing ? (existing.phone || '') : '';
    document.getElementById('c CLF-notes-placeholder') ? null : null;
    document.getElementById('c-notes').value = existing ? (existing.notes || '') : '';
    document.getElementById('client-modal').classList.add('open');
    this.editingClientId = existing ? existing.id : null;
  },

  saveClient() {
    const rec = {
      id: this.editingClientId || this.nextId('client'),
      name: document.getElementById('c-name').value.trim(),
      email: document.getElementById('c-email').value.trim(),
      phone: document.getElementById('c-phone').value.trim(),
      notes: document.getElementById('c-notes').value.trim()
    };
    const errs = this.validateClient(rec);
    if (errs.length) { alert('Please fix:\n- ' + errs.join('\n- ')); return; }
    const ix = this.clients.findIndex(c => c.id === rec.id);
    if (ix >= 0) this.clients[ix] = rec; else this.clients.push(rec);
    this.persistClients();
    this.log(ix >= 0 ? 'edit' : 'create', 'client ' + rec.id, rec.name);
    this.closeModal('client-modal');
    this.render();
  },

  openCaseModal(existing) {
    const sel = document.getElementById('k-client');
    sel.innerHTML = this.clients.map(c => '<option value="' + c.id + '">' + this.esc(c.name) + ' (' + c.id + ')</option>').join('');
    const stageSel = document.getElementById('k-stage');
    stageSel.innerHTML = this.stages().map(s => '<option value="' + s.id + '">' + s.name + '</option>').join('');
    document.getElementById('case-modal-title').textContent = existing ? 'Edit Case' : 'New Case';
    if (existing) {
      sel.value = existing.clientId;
      stageSel.value = existing.stage;
      document.getElementById('k-program').value = existing.program;
      document.getElementById('k-servicer').value = existing.servicer || 'MOHELA';
      document.getElementById('k-balance').value = existing.balance || '';
      document.getElementById('k-notes').value = existing.notes || '';
    } select stage default;
    document.getElementById('case-modal').classList.add('open');
    } else {
      stageSel.value = 'new_lead';
      document.getElementById('k-program').value = 'PSLF';
      document.getElementById('k-servicer').value = 'open';
      document.getElementById('k-balance').value = '';
      document.getElementById('k-notes').value = '';
    }
    document.getElementById('case-modal').classList.add('open');
    this.editingCaseId = existing ? existing.id : null;
  },
