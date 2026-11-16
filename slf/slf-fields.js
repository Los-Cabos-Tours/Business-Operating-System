// ============================================================
// SLF Custom Fields — core engine (part 1 of 2)
// Zoho-style customization: storage, sections, 9 field types,
// form injection, validation, backups, migration from v1.
// The visual designer lives in slf-fields-designer.js (part 2).
// slf-app.js is never modified — this module wraps at runtime.
// Keys: slf_crm.fielddefs.v1 (fields), slf_crm.sections.v1
// ============================================================
'use strict';
var SLFFields = (function () {
  var KEY = 'slf_crm.fielddefs.v1';
  var SEC_KEY = 'slf_crm.sections.v1';
  var TYPES = ['text', 'textarea', 'number', 'date', 'select', 'multiselect', 'checkbox', 'email', 'phone'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function val(id) { var el = document.getElementById(id); return el ? el.value : ''; }

  function rawDefs() {
    try { var v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  function rawSecs() {
    try { var v = JSON.parse(localStorage.getItem(SEC_KEY) || '[]'); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  function writeDefs(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; }
    catch (e) { alert('SLF: could not save field definitions — storage full or blocked.'); return false; }
  }
  function writeSecs(list) {
    try { localStorage.setItem(SEC_KEY, JSON.stringify(list)); return true; }
    catch (e) { alert('SLF: could not save sections — storage full or blocked.'); return false; }
  }

  // Migration: v1 fields (no sectionId) get a default section.
  function ensureMigrated() {
    var fs = rawDefs();
    var ss = rawSecs();
    var changed = false;
    ['client', 'case'].forEach(function (ent) {
      var orphan = fs.filter(function (f) { return f.entity === ent && !f.sectionId; });
      if (!orphan.length) return;
      var sec = ss.filter(function (s) { return s.entity === ent && s._default; })[0];
      if (!sec) {
        sec = { id: 'sec_' + ent + '_default', entity: ent, name: 'Additional Info', columns: 1, _default: true };
        ss.push(sec);
      }
      fs.forEach(function (f) {
        if (f.entity === ent && !f.sectionId) { f.sectionId = sec.id; changed = true; }
      });
    });
    if (changed) { writeDefs(fs); writeSecs(ss); }
  }

  function defs() { ensureMigrated(); return rawDefs(); }
  function secs() { ensureMigrated(); return rawSecs(); }
  function sectionsOf(entity) { return secs().filter(function (s) { return s.entity === entity; }); }
  function fieldsOf(entity) { return defs().filter(function (f) { return f.entity === entity; }); }
  function fieldsInSections(entity) {
    var out = [];
    sectionsOf(entity).forEach(function (s) {
      out.push({ section: s, fields: defs().filter(function (f) { return f.sectionId === s.id; }) });
    });
    return out;
  }

  // ---------- form inputs ----------
  function inputHtml(f, value, prefix, halfWidth) {
    var id = prefix + f.id;
    var v = (value === undefined || value === null) ? '' : value;
    var req = f.required ? ' <span style="color:#FF8A5C">*</span>' : '';
    var cls = halfWidth ? '' : ' full';
    var ph = f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '';

    if (f.type === 'checkbox') {
      return '<div class="' + cls.trim() + '"><label class="fl" style="display:flex;align-items:center;gap:8px;cursor:pointer;">' +
        '<input type="checkbox" id="' + id + '" style="width:16px;height:16px;accent-color:var(--gold);"' + (v ? ' checked' : '') + ' /> ' +
        esc(f.label) + req + '</label></div>';
    }
    if (f.type === 'multiselect') {
      var boxes = String(f.options || '').split('|').map(function (o, ix) {
        o = o.trim();
        if (!o) return '';
        var checked = (Array.isArray(v) && v.indexOf(o) !== -1) ? ' checked' : '';
        return '<label class="fl" style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;margin:0 0 4px 0;">' +
          '<input type="checkbox" id="' + id + '_opt_' + ix + '" data-opt="' + esc(o) + '" style="width:14px;height:14px;accent-color:var(--gold);"' + checked + ' /> ' +
          esc(o) + '</label>';
      }).join('');
      return '<div class="' + cls.trim() + '"><label class="fl">' + esc(f.label) + req + '</label>' + boxes + '</div>';
    }
    var label = '<label class="fl">' + esc(f.label) + req + '</label>';
    if (f.type === 'textarea') {
      return '<div class="' + cls.trim() + '">' + label + '<textarea id="' + id + '" rows="2"' + ph + '>' + esc(v) + '</textarea></div>';
    }
    if (f.type === 'select') {
      var opts = String(f.options || '').split('|').map(function (o) {
        o = o.trim();
        if (!o) return '';
        return '<option value="' + esc(o) + '"' + (String(v) === o ? ' selected' : '') + '>' + esc(o) + '</option>';
      }).join('');
      return '<div class="' + cls.trim() + '">' + label + '<select id="' + id + '"><option value="">— none —</option>' + opts + '</select></div>';
    }
    var t = f.type === 'number' ? ' type="number" step="any"'
      : (f.type === 'date' ? ' type="date"'
      : (f.type === 'email' ? ' type="email"'
      : (f.type === 'phone' ? ' type="tel"' : ' type="text"')));
    return '<div class="' + cls.trim() + '">' + label + '<input id="' + id + '"' + t + ph + ' value="' + esc(v) + '" /></div>';
  }

  function modalHtml(entity, values, prefix) {
    values = values || {};
    var html = '';
    fieldsInSections(entity).forEach(function (g) {
      if (!g.fields.length) return;
      html += '<div class="full" style="margin-top:6px;padding-bottom:2px;border-bottom:1px solid var(--line);font-size:11px;letter-spacing:1px;color:var(--gold);text-transform:uppercase;">' + esc(g.section.name) + '</div>';
      var half = g.section.columns === 2;
      html += g.fields.map(function (f) { return inputHtml(f, values[f.id], prefix, half); }).join('');
    });
    return html;
  }

  function readInputs(entity, prefix) {
    var out = { values: {}, errors: [] };
    fieldsOf(entity).forEach(function (f) {
      var el = document.getElementById(prefix + f.id);
      if (f.type === 'multiselect') {
        var picked = [];
        var boxes = document.querySelectorAll('[id^="' + prefix + f.id + '_opt_"]');
        Array.prototype.forEach.call(boxes, function (b) { if (b.checked) picked.push(b.getAttribute('data-opt')); });
        if (f.required && !picked.length) out.errors.push('"' + f.label + '" requires at least one choice.');
        out.values[f.id] = picked;
        return;
      }
      if (!el) return;
      var v;
      if (f.type === 'checkbox') { v = !!el.checked; }
      else if (f.type === 'number') {
        v = el.value.trim();
        if (v !== '' && isNaN(Number(v))) out.errors.push('"' + f.label + '" must be a number.');
      } else { v = el.value.trim(); }
      if (f.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) out.errors.push('"' + f.label + '" must be a valid email address.');
      if (f.type === 'phone' && v && v.replace(/[^0-9]/g, '').length < 7) out.errors.push('"' + f.label + '" looks too short for a phone number.');
      if (f.required && (v === '' || v === false)) out.errors.push('"' + f.label + '" is required.');
      out.values[f.id] = v;
    });
    return out;
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
    var fs = fieldsOf(entity);
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
        if (!rec) { td.textContent = ''; }
        else if (f.type === 'checkbox') { td.textContent = raw ? 'Yes' : 'No'; }
        else if (Array.isArray(raw)) { td.textContent = raw.join(', ') || '—'; }
        else { td.textContent = (raw === undefined || raw === null || raw === '') ? '—' : String(raw); }
        if (tr.lastElementChild) tr.insertBefore(td, tr.lastElementChild);
        else tr.appendChild(td);
      });
    });
  }

  // ---------- hook SLF ----------
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

    SLF.openClientModal = (function (orig) {
      return function (existing) {
        orig.apply(SLF, arguments);
        fillClient(existing);
      };
    })(SLF.openClientModal);

    SLF.openCaseModal = (function (orig) {
      return function (existing) {
        orig.apply(SLF, arguments);
        fillCase(existing);
      };
    })(SLF.openCaseModal);

    SLF.saveClient = (function (orig) {
      return function () {
        var res = readInputs('client', 'c-');
        if (res.errors.length) { alert('Please fix:\n- ' + res.errors.join('\n- ')); return; }
        var before = SLF.clients.length;
        orig.apply(SLF, arguments);
        if (document.getElementById('client-modal').classList.contains('open')) return;
        var rec = SLF.editingClientId ? SLF.clientById(SLF.editingClientId)
          : (SLF.clients.length > before ? SLF.clients[SLF.clients.length - 1] : null);
        if (rec) {
          rec.custom = res.values;
          rec.updatedAt = Date.now();
          SLF_STORE.write(SLF_CLIENTS_KEY, SLF.clients);
        }
      };
    })(SLF.saveClient);

    SLF.saveCase = (function (orig) {
      return function () {
        var res = readInputs('case', 'k-');
        if (res.errors.length) { alert('Please fix:\n- ' + res.errors.join('\n- ')); return; }
        var before = SLF.cases.length;
        orig.apply(SLF, arguments);
        if (document.getElementById('case-modal').classList.contains('open')) return;
        var rec = SLF.editingCaseId ? SLF.cases.filter(function (x) { return x.id === SLF.editingCaseId; })[0]
          : (SLF.cases.length > before ? SLF.cases[SLF.cases.length - 1] : null);
        if (rec) {
          rec.custom = res.values;
          rec.updatedAt = Date.now();
          SLF_STORE.write(SLF_CASES_KEY, SLF.cases);
        }
      };
    })(SLF.saveCase);

    SLF.downloadBackup = function () {
      var bundle = {
        format: 'slf-backup', version: 1, exportedAt: new Date().toISOString(),
        data: {
          clients: SLF.clients, cases: SLF.cases, history: SLF.history, counter: SLF.counter,
          fielddefs: defs(), sections: secs(),
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
        if (Array.isArray(parsed.data.sections)) {
          try { localStorage.setItem(SEC_KEY, JSON.stringify(parsed.data.sections)); } catch (e) {}
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

    SLF.render = (function (orig) {
      return function () {
        orig.apply(SLF, arguments);
        try {
          if (SLF.view === 'fields') {
            document.getElementById('view-title').textContent = 'Custom Fields';
            if (window.SLFFieldsDesigner) SLFFieldsDesigner.render();
            else document.getElementById('view').innerHTML = '<div class="empty">Designer module not loaded.</div>';
          } else {
            augment();
          }
        } catch (e) { /* module views must never break the main app */ }
      };
    })(SLF.render);
  }

  document.addEventListener('DOMContentLoaded', function () { if (window.SLF) hook(); });

  return {
    TYPES: TYPES, esc: esc, val: val,
    defs: defs, secs: secs, writeDefs: writeDefs, writeSecs: writeSecs,
    sectionsOf: sectionsOf, fieldsOf: fieldsOf, fieldsInSections: fieldsInSections,
    modalHtml: modalHtml, readInputs: readInputs
  };
})();
