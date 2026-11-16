// Forth main bridge: use the Forth panel + keep inline editing + Save
'use strict';
(function () {
  if (!window.SLFBoard || !SLFBoard.panel) return;
  var origInfoPanel = SLFBoard.panel.infoPanel;
  SLFBoard.panel.infoPanel = function (c) {
    var esc = SLFBoard.esc;
    var forth = SLFBoard.panel.forthPanel ? SLFBoard.panel.forthPanel(c) : '';
    var customRows = '';
    if (window.SLFFields) {
      SLFFields.fieldsOf('client').forEach(function (f) {
        var raw = c.custom ? c.custom[f.id] : '';
        var v2 = (raw === undefined || raw === null || raw === '') ? '' : String(raw);
        var t = f.type === 'date' ? 'date' : (f.type === 'number' ? 'number' : 'text');
        customRows += '<div class="bfld"><label>' + esc(f.label) + '</label>' +
          '<input id="pe-cf-' + esc(f.id) + '" type="' + t + '" value="' + esc(v2) + '" /></div>';
      });
    }
    return forth +
      '<div style="margin-top:12px;border-top:1px solid #d8dcde;padding-top:10px;">' +
      '<h4 style="margin-bottom:8px;">Edit Profile</h4>' +
      '<div class="bfld"><label>Email</label><input id="pe-email" type="email" value="' + esc(c.email || '') + '" /></div>' +
      '<div class="bfld"><label>Phone</label><input id="pe-phone" type="tel" value="' + esc(c.phone || '') + '" /></div>' +
      customRows +
      '<div class="bfld"><label>Notes</label><textarea id="pe-notes" rows="3">' + esc(c.notes || '') + '</textarea></div>' +
      '<button class="bsave" onclick="SLFBoard.saveProfile()">Save Profile</button>' +
      '<span class="bflash" id="pe-flash">Profile saved.</span>' +
      '</div>';
  };
})();
