// Forth panel bridge: numbered rows, Quick Message, Update Status, snapshot
'use strict';
SLFBoard.css = function () { return SLFBoard.__cssA + SLFBoard.__cssB; };

SLFBoard.panel.forthPanel = function (c) {
  var esc = SLFBoard.esc;
  var cases = window.SLF ? SLF.cases.filter(function (k) { return k.clientId === c.id; }) : [];
  var caseRows = cases.map(function (k) {
    return '<div class="bcase"><span>' + esc(k.id) + ' - ' + esc(k.program) + '</span><span class="bprog">' + esc(SLF.stageName(k.stage)) + '</span></div>';
  }).join('');
  var stageOptions = window.SLF && SLF.STAGES ? SLF.STAGES.map(function (s, i) {
    return '<option value="' + i + '">' + esc(SLF.stageName(i)) + '</option>';
  }).join('') : '';
  var snapshot = cases.length + ' case' + (cases.length === 1 ? '' : 's') + ' on file';
  return '<h4>Client Information</h4>' +
    '<div class="frow"><span class="fnum">1</span><span class="flab">Quick Message</span><button class="fbtn" onclick="SLFBoard.quickEmail()">Email</button></div>' +
    '<div class="frow"><span class="fnum">2</span><span class="flab">File Type</span><span>Student Loan</span></div>' +
    '<div class="frow"><span class="fnum">3</span><span class="flab">Workflow History</span><a href="#" onclick="SLFBoard.setTab(\'history\');return false;">View</a></div>' +
    '<div class="frow"><span class="fnum">4</span><span class="flab">Update Status</span><select id="f-stage" onchange="SLFBoard.updateStage(this.value)">' + stageOptions + '</select></div>' +
    '<div class="frow"><span class="fnum">5</span><span class="flab">Customer ID</span><span>' + esc(c.id) + '</span></div>' +
    '<div class="frow"><span class="fnum">6</span><span class="flab">Email</span><a href="#" onclick="SLFBoard.quickEmail();return false;">' + esc(c.email || 'add below') + '</a></div>' +
    '<div class="frow"><span class="fnum">7</span><span class="flab">Phone</span><a href="#" onclick="SLFBoard.logCall();return false;">' + esc(c.phone || 'add below') + '</a></div>' +
    '<div class="frow"><span class="fnum">8</span><span class="flab">Income / Expenses</span><a href="#" onclick="SLFBoard.setTab(\'budget\');return false;">View Budget</a></div>' +
    '<div style="margin-top:10px;border-top:1px solid #d8dcde;padding-top:8px;font-size:11.5px;color:#68737d;">Client Snapshot: <strong style="color:#2F3941;">' + esc(snapshot) + '</strong></div>' +
    (cases.length ? '<div style="margin-top:8px;">' + caseRows + '</div>' : '');
};

SLFBoard.updateStage = function (stageVal) {
  var c = SLFBoard.client();
  if (!c || !window.SLF) return;
  var n = Number(stageVal);
  var cases = SLF.cases.filter(function (k) { return k.clientId === c.id; });
  if (!cases.length) { alert('This client has no cases yet.'); return; }
  var k = cases[0];
  k.stage = n;
  k.updatedAt = Date.now();
  try { SLF_STORE.write(SLF_CASES_KEY, SLF.cases); } catch (e) {}
  if (SLF.log) SLF.log('board', 'workflow (' + c.id + ')', 'stage set to ' + SLF.stageName(n));
  SLFBoard.render();
};
