// SLF Board panel and tabs (split 4/5)
'use strict';
SLFBoard.panel = (function () {
  function infoPanel(c) {
    var esc = SLFBoard.esc;
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
      return '<div class="bcase"><span>' + esc(k.id) + ' — ' + esc(k.program) + '</span><span class="bprog">' + esc(SLF.stageName(k.stage)) + '</span></div>';
    }).join('');
    return '<h4>Client Information</h4>' +
      '<div class="bfld"><label>Email</label><input id="pe-email" type="email" value="' + esc(c.email || '') + '" /></div>' +
      '<div class="bfld"><label>Phone</label><input id="pe-phone" type="tel" value="' + esc(c.phone || '') + '" /></div>' +
      customRows +
      '<div class="bfld"><label>Notes</label><textarea id="pe-notes" rows="3">' + esc(c.notes || '') + '</textarea></div>' +
      '<button class="bsave" onclick="SLFBoard.saveProfile()">Save Profile</button>' +
      '<span class="bflash" id="pe-flash">Profile saved.</span>' +
      '<div class="bql">' +
      '<button class="bact" onclick="SLFBoard.quickEmail()">Quick Email</button>' +
      '<button class="bact" onclick="SLFBoard.logCall()">Log Call</button>' +
      '</div>' +
      (cases.length ? '<div style="margin-top:12px;border-top:1px solid var(--line);padding-top:10px;"><h4 style="margin-bottom:8px;">Cases</h4>' + caseRows + '</div>' : '');
  }

  function tabNavHtml() {
    var esc = SLFBoard.esc;
    var cur = SLFBoard.state().tab;
    return SLFBoard.TABS.map(function (t) {
      return '<button class="btab' + (cur === t.id ? ' active' : '') + '" onclick="SLFBoard.setTab(\'' + t.id + '\')">' + esc(t.name) + '</button>';
    }).join('');
  }

  function tabBody(c) {
    var esc = SLFBoard.esc;
    var tab = SLFBoard.state().tab;
    var meta = SLFBoard.TABS.filter(function (t) { return t.id === tab; })[0] || SLFBoard.TABS[0];
    var list = SLFBoard.items(c.id, tab);
    var rows = list.map(function (r) {
      return '<div class="bitem"><span class="bts">' + esc(r.ts) + '</span><span>' + esc(SLFBoard.line(tab, r)) + '</span>' +
        '<button class="bdel" title="Delete" onclick="SLFBoard.removeItem(\'' + esc(r.id) + '\')">&times;</button></div>';
    }).join('');
    return '<p class="bnote">' + esc(meta.note) + '</p>' +
      SLFBoard.quickFormHtml(tab) +
      (list.length ? rows : '<div class="bempty">Nothing here yet.</div>');
  }

  return { infoPanel: infoPanel, tabNavHtml: tabNavHtml, tabBody: tabBody };
})();
