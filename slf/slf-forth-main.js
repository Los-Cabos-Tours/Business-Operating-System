// Forth main bridge v3: Edit Profile renders custom fields in the
// SAME section grouping, order, and column layout as the Custom
// Fields designer, using fieldsInSections (exported by the app).
// v2 bug: it called SLFFields.inputHtml, which the fields module
// does NOT export - the profile crashed the moment it tried to
// draw a field, so the page never opened. v3 builds the same
// inputs locally, so every designer field type is supported.
'use strict';
(function () {
  if (!window.SLFBoard || !SLFBoard.panel) return;

  // Local input builder - supports every designer field type,
  // mirrors the app's own modal markup and prefixes.
  function fieldInput(f, value, prefix) {
    var esc = SLFBoard.esc;
    var id = prefix + f.id;
    var v = (value === undefined || value === null) ? '' : value;
    var req = f.required ? ' <span style="color:#FF8A5C">*</span>' : '';
    var ph = f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '';

    if (f.type === 'checkbox') {
      return '<div><label class="fl" style="display:flex;align-items:center;gap:8px;cursor:pointer;">' +
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
      return '<div><label class="fl">' + esc(f.label) + req + '</label>' + boxes + '</div>';
    }
    var label = '<label class="fl">' + esc(f.label) + req + '</label>';
    if (f.type === 'textarea') {
      return '<div><label class="fl">' + esc(f.label) + req + '</label><textarea id="' + id + '" rows="2"' + ph + '>' + esc(v) + '</textarea></div>';
    }
    if (f.type === 'select') {
      var opts = String(f.options || '').split('|').map(function (o) {
        o = o.trim();
        if (!o) return '';
        return '<option value="' + esc(o) + '"' + (String(v) === o ? ' selected' : '') + '>' + esc(o) + '</option>';
      }).join('');
      return '<div><label class="fl">' + esc(f.label) + req + '</label><select id="' + id + '"><option value="">— none —</option>' + opts + '</select></div>';
    }
    var t = f.type === 'number' ? ' type="number" step="any"'
      : (f.type === 'date' ? ' type="date"'
      : (f.type === 'email' ? ' type="email"'
      : (f.type === 'phone' ? ' type="tel"' : ' type="text"')));
    return '<div><label class="fl">' + esc(f.label) + req + '</label><input id="' + id + '"' + t + ph + ' value="' + esc(v) + '" /></div>';
  }

  SLFBoard.panel.infoPanel = function (c) {
    var esc = SLFBoard.esc;
    var forth = SLFBoard.panel.forthPanel ? SLFBoard.panel.forthPanel(c) : '';
    var customHtml = '';
    if (window.SLFFields) {
      SLFFields.fieldsInSections('client').forEach(function (g) {
        if (!g.fields.length) return;
        var half = g.section.columns === 2;
        customHtml += '<div class="bfld" style="margin-top:10px;border-bottom:1px solid var(--line);font-size:11px;letter-spacing:1px;color:var(--gold);text-transform:uppercase;padding-bottom:2px;">' + esc(g.section.name) + '</div>';
        if (half) customHtml += '<div class="bform">';
        g.fields.forEach(function (f) {
          customHtml += fieldInput(f, c.custom ? c.custom[f.id] : '', 'pe-cf-');
        });
        if (half) customHtml += '</div>';
      });
    }
    return forth +
      '<div style="margin-top:12px;border-top:1px solid var(--line);padding-top:10px;">' +
      '<h4 style="margin-bottom:8px;">Edit Profile</h4>' +
      customHtml +
      '<div class="bfld"><label>Notes</label><textarea id="pe-notes" rows="3">' + esc(c.notes || '') + '</textarea></div>' +
      '<button class="bsave" onclick="SLFBoard.saveProfile()">Save Profile</button>' +
      '<span class="bflash" id="pe-flash">Profile saved.</span>' +
      '</div>';
  };
})();
