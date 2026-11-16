// Forth panel bridge v3: Forth-style workflow rows only.
//  - Update Status uses the app's REAL stage ids (new_lead,
//    initial_review, ... closed) - v2 wrongly passed numbers,
//    which rendered a junk "0" option.
//  - Customer ID row REMOVED: the header already shows the
//    client ID badge, so the row duplicated information.
//  - Email/Phone/custom fields stay in Edit Profile only.
'use strict';
SLFBoard.panel.forthPanel = function (c) {
  var esc = SLFBoard.esc;
  var cases = window.SLF ? SLF.cases.filter(function (k) { return k.clientId === c.id; }) : [];
  var caseRows = cases.map(function (k) {
    return '<div class="bcase"><span>' + esc(k.id) + ' - ' + esc(k.program) + '</span><span class="bprog">' + esc(SLF.stageName(k.stage)) + '</span></div>';
  }).join('');

  // real stages from the app (ids like 'new_lead', names like 'New Lead')
  var stages = window.SLF ? SLF.stages() : [];
  var current = cases.length ? cases[0].stage : '';
  var stageOptions = stages.map(function (s) {
    return '<option value="' + esc(s.id) + '"' + (s.id === current ? ' selected' : '') + '>' + esc(s.name) + '</option>';
  }).join('');

  return '<h4>Client Information</h4>' +
    '<div class="frow"><span class="fnum">1</span><span class="flab">Quick Message</span><button class="fbtn" onclick="SLFBoard.quickEmail()">Email</button></div>' +
    '<div class="frow"><span class="fnum">2</span><span class="flab">File Type</span><span>Student Loan</span></div>' +
    '<div class="frow"><span class="fnum">3</span><span class="flab">Workflow History</span><a href="#" onclick="SLFBoard.setTab(\'history\');return false;">View</a></div>' +
    '<div class="frow"><span class="fnum">4</span><span class="flab">Update Status</span><select id="f-stage" onchange="SLFBoard.updateStage(this.value)">' + stageOptions + '</select></div>' +
    '<div class="frow"><span class="fnum">5</span><span class="flab">Income / Expenses</span><a href="#" onclick="SLFBoard.setTab(\'budget\');return false;">View Budget</a></div>' +
    (cases.length ? '<div style="margin-top:8px;">' + caseRows + '</div>' : '');
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
