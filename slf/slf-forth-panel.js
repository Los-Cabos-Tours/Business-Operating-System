// Forth panel bridge v5: Client Information = Update Status +
// Income/Expenses (View Budget) only. Budget row restored per the
// user's screenshots (removed by v4 by mistake). All other rows
// stay gone - no duplication of the tabs.
'use strict';
SLFBoard.panel.forthPanel = function (c) {
  var esc = SLFBoard.esc;
  var cases = window.SLF ? SLF.cases.filter(function (k) { return k.clientId === c.id; }) : [];

  // real stages from the app (ids like 'new_lead', names like 'New Lead')
  var stages = window.SLF ? SLF.stages() : [];
  var current = cases.length ? cases[0].stage : '';
  var stageOptions = stages.map(function (s) {
    return '<option value="' + esc(s.id) + '"' + (s.id === current ? ' selected' : '') + '>' + esc(s.name) + '</option>';
  }).join('');

  return '<h4>Client Information</h4>' +
    '<div class="frow"><span class="flab">Update Status</span><select id="f-stage" onchange="SLFBoard.updateStage(this.value)">' + stageOptions + '</select></div>' +
    '<div class="frow"><span class="flab">Income / Expenses</span><a href="#" onclick="SLFBoard.setTab(\'budget\');return false;">View Budget</a></div>';
};

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
