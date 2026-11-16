// Forth main bridge v2: Edit Profile renders custom fields in the
// SAME section grouping and order as the Custom Fields designer,
// using the app's own fieldsInSections + inputHtml APIs. Every
// value appears exactly once. Save Profile still saves all inline.
'use strict';
(function () {
  if (!window.SLFBoard || !SLFBoard.panel) return;
  SLFBoard.panel.infoPanel = function (c) {
    var esc = SLFBoard.esc;
    var forth = SLFBoard.panel.forthPanel ? SLFBoard.panel.forthPanel(c) : '';
    var customHtml = '';
    if (window.SLFFields) {
      SLFFields.fieldsInSections('client').forEach(function (g) {
        if (!g.fields.length) return;
        customHtml += '<div class="bfld" style="margin-top:10px;border-bottom:1px solid var(--line);font-size:11px;letter-spacing:1px;color:var(--gold);text-transform:uppercase;padding-bottom:2px;">' + esc(g.section.name) + '</div>';
        if (g.section.columns === 2) {
          customHtml += '<div class="bform">';
          g.fields.forEach(function (f) {
            customHtml += '<div class="bf">' + SLFFields.inputHtml(f, c.custom ? c.custom[f.id] : '', 'pe-cf-', false) + '</div>';
          });
          customHtml += '</div>';
        } else {
          g.fields.forEach(function (f) {
            customHtml += SLFFields.inputHtml(f, c.custom ? c.custom[f.id] : '', 'pe-cf-', false);
          });
        }
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
