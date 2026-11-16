// Forth panel bridge v7: the Update Status dropdown now lives
// in the client header, directly under the client name / ID
// badge row (rendered by slf-board-main.js). The left panel
// carries ONLY the profile fields - no workflow rows at all.
'use strict';

// Builds the Update Status dropdown HTML (used by the header).
SLFBoard.panel.stageSelectHtml = function (c) {
  var esc = SLFBoard.esc;
  var cases = window.SLF ? SLF.cases.filter(function (k) { return k.clientId === c.id; }) : [];
  var stages = window.SLF ? SLF.stages() : [];
  var current = cases.length ? cases[0].stage : '';
  var stageOptions = stages.map(function (s) {
    return '<option value="' + esc(s.id) + '"' + (s.id === current ? ' selected' : '') + '>' + esc(s.name) + '</option>';
  }).join('');
  return '<span class="flab">Update Status</span>' +
    '<select id="f-stage" onchange="SLFBoard.updateStage(this.value)">' + stageOptions + '</select>';
};

// Left panel: profile fields only (rendered by slf-forth-main.js).
// forthPanel is now an empty string so no workflow rows appear.
SLFBoard.panel.forthPanel = function (c) { return ''; };

SLFBoard.updateStage = function (stageId) {
  var c = SLFBoard.client();
  if (!c || !window.SLF) return;
  var cases = SLF.cases.filter(function (k) { return k.clientId === c.id; });
  if (!cases.length) { alert('This client has no cases yet.'); return; }
  var k = cases[0];
  k.stage = stageId;
  k.updatedAt = Date.now();
  try { SLF_STORE.write(SLF_CASES_KEY, SLF.cases); } catch (e) {}
  if (SLF.log) SLF.log('board', 'workflow (' + c.id + ')', 'stage set to ' + SLF.stageName(stageId));
  SLFBoard.render();
};
