// ============================================================
// SLF Custom Fields — Zoho-style field designer for the SLF CRM
// Self-contained (mirrors the slf-sync.js injection pattern):
//  - Adds a "Custom Fields" nav view with its own click binding
//    (SLF.bindNav only binds buttons that exist at init time).
//  - FULLY ORDERABLE: every field can be moved up/down in the
//    designer; the chosen order is the display order in the
//    Add/Edit forms and the table views.
//  - Injects custom inputs into the existing client/case modals
//    by wrapping SLF methods at runtime — slf-app.js is untouched.
//  - Custom values live INSIDE each record (record.custom), so
//    existing sync carries them automatically. Field definitions
//    and e-sign data ride in backups via a superset bundle
//    (format stays 'slf-backup'; old files still import fine).
// Definitions key: slf_crm.fielddefs.v1 (array order = display order)
// ============================================================
'use strict';
var SLFFields = (function () {
  var KEY = 'slf_crm.fielddefs.v1';
  var TYPES = ['text', 'textarea', 'number', 'date', 'select', 'checkbox'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function defs() {
    try { var v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  function saveDefs(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; }
    catch (e) { alert('SLF: could not save field definitions — storage full or blocked.'); return false; }
  }
  // Array order IS the display order — list() preserves it.
  function list(entity) { return defs().filter(function (f) { return f.entity === entity; }); }

  // ---------- form inputs ----------
  function inputHtml(f, value, prefix) {
    var id = prefix + f.id;
    var v = (value === undefined || value === null) ? '' : value;
    var req = f.required ? ' <span style="color:#FF8A5C">*</span>' : '';
    if (f.type === 'checkbox') {
      return '<div class="full"><label class="fl" style="display:flex;align-items:center;gap:8px;cursor:pointer;">' +
        '<input type="checkbox" id="' + id + '" style="width:16px;height:16px;accent-color:var(--gold);"' + (v ? ' checked' : '') + ' /> ' +
        esc(f.label) + req + '</label></div>';
    }
    var label = '<label class="fl">' + esc(f.label) + req + '</label>';
    if (f.type === 'textarea') {
      return '<div class="full">' + label + '<textarea id="' + id + '" rows="2">' + esc(v) + '</textarea></div>';
    }
    if (f.type === 'select') {
      var opts = String(f.options || '').split('|').map(function (o) {
        o = o.trim();
        if (!o) return '';
        return '<option value="' + esc(o) + '"' + (String(v) === o ? ' selected' : '') + '>' + esc(o) + '</option>';
      }).join('');
      return '<div class="full">' + label + '<select id="' + id + '"><option value="">— none —</option>' + opts + '</select></div>';
    }
    var t = f.type === 'number' ? ' type="number" step="any"' : (f.type === 'date' ? ' type="date"' : ' type="text"');
    return '<div class="full">' + label + '<input id="' + id + '"' + t + ' value="' + esc(v) + '" /></div>';
  }

  function modalHtml(entity, values, prefix) {
    values = values || {};
    var fs = list(entity);
    if (!fs.length) return '';
    return fs.map(function (f) { return inputHtml(f, values[f.id], prefix); }).join('');
  }

  function readInputs(entity, prefix) {
    var out = { values: {}, errors: [] };
    list(entity).forEach(function (f) {
      var el = document.getElementById(prefix + f.id);
      if (!el) return;
      var v;
      if (f.type === 'checkbox') { v = !!el.checked; }
      else if (f.type === 'number') {
        v = el.value.trim();
        if (v !== '' && isNaN(Number(v))) out.errors.push('"' + f.label + '" must be a number.');
      } else { v = el.value.trim(); }
      if (f.required && (v === '' || v === false)) out.errors.push('"' + f.label + '" is required.');
      out.values[f.id] = v;
    });
    return out;
  }

  // ---------- designer view ----------
  function val(id) { var el = document.getElementById(id); return el ? el.value : ''; }

  function renderDesigner() {
    var v = document.getElementById('view');
    if (!v) return;
    var fs = defs();
    var rows = fs.map(function (f, ix) {
      var pos = ix + 1;
      return '<tr><td>' + esc(f.entity === 'client' ? 'Client' : 'Case') + '</td>' +
        '<td>' + pos + '</td>' +
        '<td>' + esc(f.label) + '</td><td>' + esc(f.type) + '</td><td>' + esc(f.type === 'select' ? (f.options || '') : '—') +
        '</td><td>' + (f.required ? 'Yes' : 'No') + '</td>' +
        '<td><button class="btn small ghost" ' + (ix === 0 ? 'disabled' : '') +
        ' onclick="SLFFields.moveField(\'' + esc(f.id) + '\', -1)" title="Move up">&#9650;</button> ' +
        '<button class="btn small ghost" ' + (ix === fs.length - 1 ? 'disabled' : '') +
        ' onclick="SLFFields.moveField(\'' + esc(f.id) + '\', 1)" title="Move down">&#9660;</button></td>' +
        '<td><button class="btn small danger" onclick="SLFFields.removeField(\'' + esc(f.id) + '\')">Delete</button></td></tr>';
    }).join('');
    var typeOpts = TYPES.map(function (t) { return '<option>' + t + '</option>'; }).join('');
    v.innerHTML =
      '<div class="card"><h3>Add Field</h3><div class="fgrid">' +
      '<div><label class="fl">Applies to *</label><select id="fd-entity"><option value="client">Clients</option><option value="case">Cases</option></select></div>' +
      '<div><label class="fl">Field type *</label><select id="fd-type">' + typeOpts + '</select></div>' +
      '<div class="full"><label class="fl">Field label *</label><input id="fd-label" placeholder="e.g. Date of Birth" /></div>' +
      '<div class="full"><label class="fl">Dropdown options (dropdown only — separate with |)</label><input id="fd-options" placeholder="Yes|No|Under Review" /></div>' +
      '<div class="full"><label class="fl" style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="fd-required" style="width:16px;height:16px;accent-color:var(--gold);" /> Required field</label></div>' +
      '</div><div class="modal-actions" style="justify-content:flex-start;"><button class="btn" onclick="SLFFields.addField()">Add Field</button></div></div>' +
      '<div class="card"><h3>Your Custom Fields</h3>' +
      (fs.length
        ? '<table><thead><tr><th>On</th><th>#</th><th>Label</th><th>Type</th><th>Options</th><th>Required</th><th>Order</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>' +
          '<p class="notice">Fields display in the order shown — use the up/down arrows to set exactly which field comes 1st, 2nd, 3rd and so on in the forms and tables. The order applies separately per tab (all Client fields keep their order on the Clients tab, all Case fields on the Cases tab). Custom fields appear automatically in the add/edit forms and tables, are validated when required, and travel inside every backup.</p>'
        : '<div class="empty">No custom fields yet. Add your first above — e.g. "Date of Birth" on Clients, or "Forgiveness Eligibility Date" on Cases.</div>') +
      '</div>';
  }

  function addField() {
    var entity = val('fd-entity');
    var label = val('fd-label').trim();
    var type = val('fd-type');
    var options = val('fd-options').trim();
    var required = !!(document.getElementById('fd-required') && document.getElementById('fd-required').checked);
    var errs = [];
    if (!label) errs.push('Field label is required.');
    if (type === 'select' && !options) errs.push('Dropdown fields need at least one option.');
    if (errs.length) { alert('Please fix:\n- ' + errs.join('\n- ')); return; }
    var f = {
      id: 'cf_' + Date.now().toString(36) + Math.floor(Math.random() * 10000).toString(36),
      entity: entity, label: label, type: type, required: required
    };
    if (type === 'select') f.options = options;
    var all = defs();
    all.push(f);
    if (!saveDefs(all)) return;
    if (window.SLF) SLF.log('fields', 'custom field', '"' + label + '" (' + type + ') added to ' + entity + 's');
    renderDesigner();
  }

  // ---------- ordering: swap a field with its neighbor ----------
  function moveField(id, dir) {
    var all = defs();
    var ix = -1;
    for (var i = 0; i < all.length; i++) { if (all[i] && all[i].id === id) ix = i; }
    if (ix < 0) return;
    var target = ix + dir;
    if (target < 0 || target >= all.length) return; // already at the top/bottom
    var tmp = all[ix];
    all[ix] = all[target];
    all[target] = tmp;
    if (!saveDefs(all)) return;
    if (window.SLF) SLF.log('fields', 'custom field', '"' + all[target].label + '" moved ' + (dir < 0 ? 'up' : 'down'));
    renderDesigner();
  }

  function removeField(id) {
    if (!confirm('Remove this custom field? Existing values already saved on records are kept (they simply stop being displayed).')) return;
    var all = defs().filter(function (f) { return f.id !== id; });
    if (!saveDefs(all)) return;
    if (window.SLF) SLF.log('fields', 'custom field', 'field removed');
    renderDesigner();
  }

  // ---------- modal injection ----------
  function ensureContainers() {
    var cGrid = document.querySelector('#client-modal .fgrid');
    if (cGrid && !document.getElementById('c-custom')) {
      var d = document.createElement('div');
      d.id = 'c-custom';
      d.style.display = 'contents';
      cGrid.appendChild(d);
    }
    var kGrid = document.querySelector('#case-modal .fgrid');
    if (kGrid && !document.getElementById('k-custom')) {
      var d2 = document.createElement('div');
      d2.id = 'k-custom';
      d2.style.display = 'contents';
      kGrid.appendChild(d2);
    }
  }
  function fillClient(existing) {
    var box = document.getElementById('c-custom');
    if (box) box.innerHTML = modalHtml('client', existing ? existing.custom : null, 'c-');
  }
  function fillCase(existing) {
    var box = document.getElementById('k-custom');
    if (box) box.innerHTML = modalHtml('case', existing ? existing.custom : null, 'k-');
  }

  // ---------- table columns ----------
  function augment() {
    if (!window.SLF) return;
    if (SLF.view !== 'clients' && SLF.view !== 'cases') return;
    var entity = SLF.view === 'clients' ? 'client' : 'case';
    var fs = list(entity);
    if (!fs.length) return;
    var t = document.querySelector('#view table');
    if (!t) return;
    var head = t.querySelector('thead tr');
    if (head && !head.hasAttribute('data-cf')) {
      head.setAttribute('data-cf', '1');
      fs.forEach(function (f) {
        var th = document.createElement('th');
        th.textContent = f.label;
        if (head.lastElementChild) head.insertBefore(th, head.lastElementChild);
        else head.appendChild(th);
      });
    }
    var body = t.querySelector('tbody');
    if (!body) return;
    var minCols = SLF.view === 'clients' ? 6 : 8;
    Array.prototype.forEach.call(body.rows, function (tr) {
      if (tr.hasAttribute('data-cf')) return;
      if (tr.cells.length < minCols) {
        for (var i = 0; i < tr.cells.length; i++) {
          var cs = tr.cells[i].getAttribute('colspan');
          if (cs) tr.cells[i].setAttribute('colspan', String(parseInt(cs, 10) + fs.length));
        }
        return;
      }
      tr.setAttribute('data-cf', '1');
      var recId = tr.cells[0].textContent.trim();
      var rec = entity === 'client'
        ? SLF.clientById(recId)
        : SLF.cases.filter(function (x) { return x.id === recId; })[0];
      fs.forEach(function (f) {
        var td = document.createElement('td');
        var raw = rec && rec.custom ? rec.custom[f.id] : '';
        if (f.type === 'checkbox') td.textContent = rec ? (raw ? 'Yes' : 'No') : '';
        else td.textContent = (raw === undefined || raw === null || raw === '') ? (rec ? '—' : '') : String(raw);
        if (tr.lastElementChild) tr.insertBefore(td, tr.lastElementChild);
        else tr.appendChild(td);
      });
    });
  }

  // ---------- hook SLF (runtime wrapping — slf-app.js is never modified) ----------
  function hook() {
    var nav = document.getElementById('nav');
    if (nav) {
      var b = document.createElement('button');
      b.setAttribute('data-view', 'fields');
      b.textContent = 'Custom Fields';
      b.addEventListener('click', function () {
        var all = document.querySelectorAll('#nav button');
        Array.prototype.forEach.call(all, function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        SLF.view = 'fields';
        SLF.render();
      });
      nav.appendChild(b);
    }
    ensureContainers();

    var origOpenClient = SLF.openClientModal;
    SLF.openClientModal = function (existing) {
      origOpenClient.apply(SLF, arguments);
      fillClient(existing);
    };
    var origOpenCase = SLF.openCaseModal;
    SLF.openCaseModal = function (existing) {
      origOpenCase.apply(SLF, arguments);
      fillCase(existing);
    };

    var origSaveClient = SLF.saveClient;
    SLF.saveClient = function () {
      var res = readInputs('client', 'c-');
      if (res.errors.length) { alert('Please fix:\n- ' + res.errors.join('\n- ')); return; }
      var before = SLF.clients.length;
      origSaveClient.apply(SLF, arguments);
      if (document.getElementById('client-modal').classList.contains('open')) return; // original validation failed
      var rec = SLF.editingClientId ? SLF.clientById(SLF.editingClientId)
        : (SLF.clients.length > before ? SLF.clients[SLF.clients.length - 1] : null);
      if (rec) {
        rec.custom = res.values;
        rec.updatedAt = Date.now();
        SLF_STORE.write(SLF_CLIENTS_KEY, SLF.clients);
      }
    };

    var origSaveCase = SLF.saveCase;
    SLF.saveCase = function () {
      var res = readInputs('case', 'k-');
      if (res.errors.length) { alert('Please fix:\n- ' + res.errors.join('\n- ')); return; }
      var before = SLF.cases.length;
      origSaveCase.apply(SLF, arguments);
      if (document.getElementById('case-modal').classList.contains('open')) return;
      var rec = SLF.editingCaseId ? SLF.cases.filter(function (x) { return x.id === SLF.editingCaseId; })[0]
        : (SLF.cases.length > before ? SLF.cases[SLF.cases.length - 1] : null);
      if (rec) {
        rec.custom = res.values;
        rec.updatedAt = Date.now();
        SLF_STORE.write(SLF_CASES_KEY, SLF.cases);
      }
    };

    // Superset backup: original format + field definitions + e-sign requests.
    SLF.downloadBackup = function () {
      var bundle = {
        format: 'slf-backup', version: 1, exportedAt: new Date().toISOString(),
        data: {
          clients: SLF.clients, cases: SLF.cases, history: SLF.history, counter: SLF.counter,
          fielddefs: defs(),
          esign: (window.SLFEsign ? SLFEsign.requests() : [])
        }
      };
      var blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'slf-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
    };

    SLF.restoreBackup = function (inputEl) {
      var file = inputEl.files && inputEl.files[0];
      if (!file) { alert('Choose a backup file first.'); return; }
      var reader = new FileReader();
      reader.onload = function (ev) {
        var parsed = null;
        try { parsed = JSON.parse(ev.target.result); } catch (e) { alert('Invalid JSON file — cannot import.'); return; }
        if (!parsed || parsed.format !== 'slf-backup' || !parsed.data || !Array.isArray(parsed.data.clients) || !Array.isArray(parsed.data.cases)) {
          alert('Import rejected: not a valid SLF backup file.'); return;
        }
        if (!confirm('Restoring replaces current SLF data with the backup. A safety snapshot is taken first. Continue?')) return;
        if (!SLF_STORE.snapshotBefore('pre-restore')) { alert('Import blocked: safety snapshot failed (storage full?).'); return; }
        SLF.clients = parsed.data.clients;
        SLF.cases = parsed.data.cases;
        SLF.history = parsed.data.history || [];
        SLF.counter = parsed.data.counter || { client: 0, case: 0 };
        SLF_STORE.write(SLF_CLIENTS_KEY, SLF.clients);
        SLF_STORE.write(SLF_CASES_KEY, SLF.cases);
        try { localStorage.setItem(SLF_HISTORY_KEY, JSON.stringify(SLF.history)); } catch (e) {}
        SLF_STORE.write(SLF_COUNTER_KEY, SLF.counter);
        if (Array.isArray(parsed.data.fielddefs)) {
          try { localStorage.setItem(KEY, JSON.stringify(parsed.data.fielddefs)); } catch (e) {}
        }
        if (Array.isArray(parsed.data.esign) && window.SLFEsign) SLFEsign.saveRequests(parsed.data.esign);
        SLF.log('restore', 'system', 'backup imported (' + parsed.data.cases.length + ' cases)');
        SLF.render();
        var st = document.getElementById('restore-status');
        if (st) st.textContent = 'Restore complete.';
      };
      reader.onerror = function () { alert('Could not read the selected file.'); };
      reader.readAsText(file);
    };

    var origRender = SLF.render;
    SLF.render = function () {
      origRender.apply(SLF, arguments);
      try {
        if (SLF.view === 'fields') {
          document.getElementById('view-title').textContent = 'Custom Fields';
          renderDesigner();
        } else {
          augment();
        }
      } catch (e) { /* module views must never break the main app */ }
    };
  }

  document.addEventListener('DOMContentLoaded', function () { if (window.SLF) hook(); });

  return {
    list: list, modalHtml: modalHtml, readInputs: readInputs,
    renderDesigner: renderDesigner, addField: addField, moveField: moveField, removeField: removeField
  };
})();
