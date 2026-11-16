// Forth panel bridge v8: Update Status lives in the client header
// (rendered by slf-board-main.js) as a left-aligned
// "Update Status [dropdown]" row directly under the name/ID row.
// This module only builds the <option> list for that dropdown.
// The left panel carries ONLY the profile fields - no rows.
'use strict';

// Builds just the <option> elements for the header dropdown.
SLFBoard.panel.stageOptionsHtml = function (c) {
  var esc = SLFBoard.esc;
  var cases = window.SLF ? SLF.cases.filter(function (k) { return k.clientId === c.id; }) : [];
  var stages = window.SLF ? SLF.stages() : [];
  var current = cases.length ? cases[0].stage : '';
  return stages.map(function (s) {
    return '<option value="' + esc(s.id) + '"' + (s.id === current ? ' selected' : '') + '>' + esc(s.name) + '</option>';
  }).join('');
};

// Left panel: profile fields only (rendered by slf-forth-main.js).
// forthPanel is an empty string so no workflow rows appear.
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
