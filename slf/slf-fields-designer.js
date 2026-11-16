// ============================================================
// SLF Custom Fields — visual designer (part 2 of 2)
// Zoho-style layout editor UI. Depends on slf-fields.js core:
//  - SECTIONS: add / rename / reorder / delete / 1-2 column toggle
//  - FIELDS: add / edit properties / delete / up-down reorder /
//    drag-and-drop between sections (desktop; arrows always work)
//  - Clients / Cases tabs
// All persistence goes through SLFFields core (same keys).
// ============================================================
'use strict';
var SLFFieldsDesigner = (function () {
  var _entity = 'client';
  var _editingFieldId = null;
  var _dragId = null;

  function esc(s) { return SLFFields.esc(s); }
  function val(id) { return SLFFields.val(id); }
  function defs() { return SLFFields.defs(); }
  function secs() { return SLFFields.secs(); }

  // ---------- render ----------
  function render() {
    var v = document.getElementById('view');
    if (!v) return;
    var gs = SLFFields.fieldsInSections(_entity);
    var secsHtml = gs.map(function (g, six) { return sectionCard(g, six, gs.length); }).join('');
    var secOpts = SLFFields.sectionsOf(_entity).map(function (s) {
      return '<option value="' + esc(s.id) + '">' + esc(s.name) + '</option>';
    }).join('');
    var typeOpts = SLFFields.TYPES.map(function (t) { return '<option>' + t + '</option>'; }).join('');
    v.innerHTML =
      '<div class="toolbar">' + pill('client') + ' ' + pill('case') +
      '<span style="flex:1;"></span>' +
      '<input id="fd-newsec" placeholder="New section name..." style="max-width:220px;" />' +
      '<button class="btn" onclick="SLFFieldsDesigner.addSection()">+ Add Section</button></div>' +
      '<div class="card"><h3>Add Field — ' + (_entity === 'client' ? 'Clients' : 'Cases') + '</h3><div class="fgrid">' +
      '<div><label class="fl">Section *</label><select id="fd-section">' + secOpts + '</select></div>' +
      '<div><label class="fl">Field type *</label><select id="fd-type">' + typeOpts + '</select></div>' +
      '<div class="full"><label class="fl">Field label *</label><input id="fd-label" placeholder="e.g. Date of Birth" /></div>' +
      '<div class="full"><label class="fl">Options (dropdown / multi-select — one per line)</label><textarea id="fd-options" rows="3" placeholder="Yes&#10;No&#10;Under Review"></textarea></div>' +
      '<div class="full"><label class="fl">Placeholder (optional hint text)</label><input id="fd-placeholder" placeholder="e.g. Type it exactly as on the ID" /></div>' +
      '<div class="full"><label class="fl" style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="fd-required" style="width:16px;height:16px;accent-color:var(--gold);" /> Required field</label></div>' +
      '</div><div class="modal-actions" style="justify-content:flex-start;"><button class="btn" onclick="SLFFieldsDesigner.addField()">Add Field</button></div></div>' +
      (secsHtml || '<div class="card"><div class="empty">No sections yet. Add one above to start grouping your fields — e.g. "Loan Details", "Personal Info".</div></div>') +
      '<p class="notice">Drag field rows to move them between sections. The 1-col / 2-col toggle sets each section\'s form layout. Everything here applies automatically to the forms, tables, validation, backups and cloud sync.</p>' +
      editModalHtml();
    bindDnd();
  }

  function pill(ent) {
    return '<button class="btn small' + (_entity === ent ? '' : ' ghost') + '" onclick="SLFFieldsDesigner.setEntity(\'' + ent + '\')">' +
      (ent === 'client' ? 'Clients' : 'Cases') + '</button>';
  }

  function fieldRow(f, ix, total) {
    return '<tr draggable="true" data-fid="' + esc(f.id) + '">' +
      '<td>' + (ix + 1) + '</td><td>' + esc(f.label) + '</td><td>' + esc(f.type) + '</td>' +
      '<td>' + (f.required ? 'Yes' : 'No') + '</td>' +
      '<td><button class="btn small ghost" ' + (ix === 0 ? 'disabled' : '') + ' onclick="SLFFieldsDesigner.moveField(\'' + esc(f.id) + '\',-1)" title="Move up">&#9650;</button> ' +
      '<button class="btn small ghost" ' + (ix === total - 1 ? 'disabled' : '') + ' onclick="SLFFieldsDesigner.moveField(\'' + esc(f.id) + '\',1)" title="Move down">&#9660;</button></td>' +
      '<td><button class="btn small" onclick="SLFFieldsDesigner.openFieldEdit(\'' + esc(f.id) + '\')">Edit</button> ' +
      '<button class="btn small danger" onclick="SLFFieldsDesigner.removeField(\'' + esc(f.id) + '\')">Delete</button></td></tr>';
  }

  function sectionCard(g, six, stotal) {
    var frows = g.fields.map(function (f, ix) { return fieldRow(f, ix, g.fields.length); }).join('');
    var colBtn = '<button class="btn small ghost" onclick="SLFFieldsDesigner.toggleColumns(\'' + esc(g.section.id) + '\')">' +
      (g.section.columns === 2 ? '2-col' : '1-col') + '</button>';
    return '<div class="card" data-sid="' + esc(g.section.id) + '" style="margin-bottom:14px;">' +
      '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
      '<h3 style="margin:0;flex:1;">' + esc(g.section.name) + '</h3>' + colBtn +
      '<button class="btn small ghost" ' + (six === 0 ? 'disabled' : '') + ' onclick="SLFFieldsDesigner.moveSection(\'' + esc(g.section.id) + '\',-1)">&#9650;</button>' +
      '<button class="btn small ghost" ' + (six === stotal - 1 ? 'disabled' : '') + ' onclick="SLFFieldsDesigner.moveSection(\'' + esc(g.section.id) + '\',1)">&#9660;</button>' +
      '<button class="btn small" onclick="SLFFieldsDesigner.renameSection(\'' + esc(g.section.id) + '\')">Rename</button>' +
      '<button class="btn small danger" onclick="SLFFieldsDesigner.deleteSection(\'' + esc(g.section.id) + '\')">Delete</button>' +
      '</div>' +
      (g.fields.length
        ? '<table style="margin-top:12px;"><thead><tr><th>#</th><th>Label</th><th>Type</th><th>Required</th><th>Order</th><th></th></tr></thead><tbody>' + frows + '</tbody></table>'
        : '<div class="empty" style="padding:14px;">No fields in this section yet — add one below, or drag a field here.</div>') +
      '</div>';
  }

  function editModalHtml() {
    if (!_editingFieldId) return '';
    var f = defs().filter(function (x) { return x.id === _editingFieldId; })[0];
    if (!f) { _editingFieldId = null; return ''; }
    var optsLines = String(f.options || '').split('|').map(function (o) { return o.trim(); }).filter(Boolean).join('\n');
    var typeOpts = SLFFields.TYPES.map(function (t) { return '<option' + (t === f.type ? ' selected' : '') + '>' + t + '</option>'; }).join('');
    return '<div class="modal-bg open" id="fd-edit">' +
      '<div class="modal"><h3>Edit Field</h3><div class="fgrid">' +
      '<div class="full"><label class="fl">Field label *</label><input id="fe-label" value="' + esc(f.label) + '" /></div>' +
      '<div><label class="fl">Field type</label><select id="fe-type">' + typeOpts + '</select></div>' +
      '<div><label class="fl">Required</label><select id="fe-required"><option value="no"' + (!f.required ? ' selected' : '') + '>Optional</option><option value="yes"' + (f.required ? ' selected' : '') + '>Required</option></select></div>' +
      '<div class="full"><label class="fl">Placeholder (hint text inside the input)</label><input id="fe-placeholder" value="' + esc(f.placeholder || '') + '" /></div>' +
      '<div class="full"><label class="fl">Options (dropdown / multi-select only — one per line)</label><textarea id="fe-options" rows="4">' + esc(optsLines) + '</textarea></div>' +
      '</div><div class="modal-actions">' +
      '<button class="btn ghost" onclick="SLFFieldsDesigner.closeFieldEdit()">Cancel</button>' +
      '<button class="btn" onclick="SLFFieldsDesigner.saveFieldEdit()">Save Field</button>' +
      '</div></div></div>';
  }

  // ---------- drag and drop ----------
  function bindDnd() {
    var rows = document.querySelectorAll('[data-fid]');
    Array.prototype.forEach.call(rows, function (r) {
      r.addEventListener('dragstart', function (e) {
        _dragId = r.getAttribute('data-fid');
        try { e.dataTransfer.setData('text/plain', _dragId); } catch (err) {}
        e.dataTransfer.effectAllowed = 'move';
      });
      r.addEventListener('dragover', function (e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
      r.addEventListener('drop', function (e) {
        e.preventDefault();
        if (!_dragId) return;
        dropField(_dragId, r.getAttribute('data-fid'), null);
        _dragId = null;
      });
    });
    var cards = document.querySelectorAll('[data-sid]');
    Array.prototype.forEach.call(cards, function (c) {
      c.addEventListener('dragover', function (e) { e.preventDefault(); });
      c.addEventListener('drop', blockers function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!_dragId) return;
        dropField(_dragId, null, c.getAttribute('data-sid'));
        _dragId = null;
      });
    });
  }

  function dropField(fieldId, beforeFieldId, sectionId) {
    var fs = defs();
    var f = fs.filter(function (x) { return x.id === fieldId; })[0];
    if (!f) return;
    if (beforeFieldId) {
      var target = fs.filter(function (x) { return x.id === beforeFieldId; })[0];
      if (!target || target.id === f.id) return;
      f.sectionId = target.sectionId;
      fs = fs.filter(function (x) { return x.id !== f.id; });
      fs.splice(fs.indexOf(target), 0, f);
    } else if (sectionId) {
      f.sectionId = sectionId;
    } else { return; }
    if (!SLFFields.writeDefs(fs)) return;
    if (window.SLF) SLF.log('fields', 'custom field', '"' + f.label + '" moved');
    render();
  }

  // ---------- actions ----------
  function setEntity(ent) { _entity = ent; render(); }

  function addField() {
    var sectionId = val('fd-section');
    var label = val('fd-label').trim();
    var type = val('fd-type');
    var placeholder = val('fd-placeholder').trim();
    var required = !!(document.getElementById('fd-required') && document.getElementById('fd-required').checked);
    var options = val('fd-options').split('\n').map(function (o) { return o.trim(); }).filter(Boolean).join('|');
    var errs = [];
    if (!sectionId) errs.push('Add a section first.');
    if (!label) errs.push('Field label is required.');
    if ((type === 'select' || type === 'multiselect') && !options) errs.push('Dropdown and multi-select fields need at least one option.');
    if (errs.length) { alert('Please fix:\n- ' + errs.join('\n- ')); return; }
    var f = {
      id: 'cf_' + Date.now().toString(36) + Math.floor(Math.random() * 10000).toString(36),
      entity: _entity, sectionId: sectionId, label: label, type: type, required: required
    };
    if (options) f.options = options;
    if (placeholder) f.placeholder = placeholder;
    var all = defs();
    all.push(f);
    if (!SLFFields.writeDefs(all)) return;
    if (window.SLF) SLF.log('fields', 'custom field', '"' + label + '" (' + type + ') added');
    render();
  }

  function openFieldEdit(id) { _editingFieldId = id; render(); }
  function closeFieldEdit() { _editingFieldId = null; render(); }

  function saveFieldEdit() {
    var id = _editingFieldId;
    if (!id) return;
    var f = defs().filter(function (x) { return x.id === id; })[0];
    if (!f) { _editingFieldId = null; return; }
    var label = val('fe-label').trim();
    var type = val('fe-type');
    var required = val('fe-required') === 'yes';
    var placeholder = val('fe-placeholder').trim();
    var options = val('fe-options').split('\n').map(function (o) { return o.trim(); }).filter(Boolean).join('|');
    if (!label) { alert('Field label is required.'); return; }
    if ((type === 'select' || type === 'multiselect') && !options) { alert('This field type needs at least one option.'); return; }
    if (type !== f.type && !confirm('Change field type from "' + f.type + '" to "' + type + '"? Existing values may display differently (no data is deleted).')) return;
    f.label = label; f.type = type; f.required = required;
    f.placeholder = placeholder || '';
    if (type === 'select' || type === 'multiselect') f.options = options;
    else delete f.options;
    if (!SLFFields.writeDefs(defs())) return;
    if (window.SLF) SLF.log('fields', 'custom field', '"' + label + '" edited');
    _editingFieldId = null;
    render();
  }

  function removeField(id) {
    if (!confirm('Remove this custom field? Existing values already saved on records are kept (they simply stop being displayed).')) return;
    if (!SLFFields.writeDefs(defs().filter(function (f) { return f.id !== id; }))) return;
    if (window.SLF) SLF.log('fields', 'custom field', 'field removed');
    render();
  }

  function moveField(id, dir) {
    var all = defs();
    var f = all.filter(function (x) { return x.id === id; })[0];
    if (!f) return;
    var same = all.filter(function (x) { return x.sectionId === f.sectionId; });
    var ix = same.indexOf(f);
    var target = same[ix + dir];
    if (!target) return;
    var a = all.indexOf(f), b = all.indexOf(target);
    all[a] = target; all[b] = f;
    if (!SLFFields.writeDefs(all)) return;
    render();
  }

  // ---------- sections ----------
  function addSection() {
    var name = val('fd-newsec').trim();
    if (!name) { alert('Type a name for the new section first.'); return; }
    var s = { id: 'sec_' + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36), entity: _entity, name: name, columns: 1 };
    var all = secs();
    all.push(s);
    if (!SLFFields.writeSecs(all)) return;
    if (window.SLF) SLF.log('fields', 'section', '"' + name + '" created');
    render();
  }

  function renameSection(id) {
    var all = secs();
    var s = all.filter(function (x) { return x.id === id; })[0];
    if (!s) return;
    var name = prompt('New section name:', s.name);
    if (!name || !name.trim() || name.trim() === s.name) return;
    s.name = name.trim();
    if (!SLFFields.writeSecs(all)) return;
    render();
  }

  function toggleColumns(id) {
    var all = secs();
    var s = all.filter(function (x) { return x.id === id; })[0];
    if (!s) return;
    s.columns = s.columns === 2 ? 1 : 2;
    if (!SLFFields.writeSecs(all)) return;
    render();
  }

  function moveSection(id, dir) {
    var all = secs();
    var ix = all.map(function (x) { return x.id; }).indexOf(id);
    var target = ix + dir;
    if (ix < 0 || target < 0 || target >= all.length) return;
    var tmp = all[ix]; all[ix] = all[target]; all[target] = tmp;
    if (!SLFFields.writeSecs(all)) return;
    render();
  }

  function deleteSection(id) {
    var all = secs();
    var s = all.filter(function (x) { return x.id === id; })[0];
    if (!s) return;
    var fs = defs();
    var count = fs.filter(function (f) { return f.sectionId === id; }).length;
    var msg = count
      ? 'Delete section "' + s.name + '"? Its ' + count + ' field(s) will move to "Additional Info".'
      : 'Delete section "' + s.name + '"?';
    if (!confirm(msg)) return;
    var fallback = all.filter(function (x) { return x.entity === s.entity && x._default && x.id !== id; })[0];
    if (!fallback) {
      fallback = { id: 'sec_' + s.entity + '_default', entity: s.entity, name: 'Additional Info', columns: 1, _default: true };
      all.push(fallback);
    }
    fs.forEach(function (f) { if (f.sectionId === id) f.sectionId = fallback.id; });
    if (!SLFFields.writeDefs(fs)) return;
    if (!SLFFields.writeSecs(all.filter(function (x) { return x.id !== id; }))) return;
    if (window.SLF) SLF.log('fields', 'section', '"' + s.name + '" deleted');
    render();
  }

  return {
    render: render, setEntity: setEntity, addField: addField,
    openFieldEdit: openFieldEdit, closeFieldEdit: closeFieldEdit, saveFieldEdit: saveFieldEdit,
    removeField: removeField, moveField: moveField,
    addSection: addSection, renameSection: renameSection, toggleColumns: toggleColumns,
    moveSection: moveSection, deleteSection: deleteSection
  };
})();
