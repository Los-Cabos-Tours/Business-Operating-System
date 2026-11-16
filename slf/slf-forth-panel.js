// Forth panel bridge v2:
//  - Forth numbered rows WITHOUT duplication: Email/Phone/custom
//    fields live ONCE, in the Edit Profile block below, rendered
//    with fieldsInSections() so the order and section grouping
//    match the Custom Fields designer exactly.
//  - Numbered rows keep the WORKFLOW items (Quick Message, File
//    Type, Workflow History, Update Status, Customer ID, Budget).
//  - The stage dropdown is wired to the app's real stage list.
'use strict';
SLFBoard.panel.forthPanel = function (c) {
  var esc = SLFBoard.esc;
  var cases = window.SLF ? SLF.cases.filter(function (k) { return k.clientId === c.id; }) : [];
  var caseRows = cases.map(function (k) {
    return '<div class="bcase"><span>' + esc(k.id) + ' - ' + esc(k.program) + '</span><span class="bprog">' + esc(SLF.stageName(k.stage)) + '</span></div>';
  }).join('');

  // real stage list from the app (stageName is the app's own API)
  var stageOptions = '';
  for (var i = 0; i < 60; i++) {
    var nm = null;
    try { nm = SLF.stageName(i); } catch (e) { break; }
    if (nm === undefined || nm === null) break;
    stageOptions += '<option value="' + i + '">' + esc(String(nm)) + '</option>';
    if (nm === 'Closed' || nm === 'closed') break;
  }

  return '<h4>Client Information</h4>' +
    '<div class="frow"><span class="fnum">1</span><span class="flab">Quick Message</span><button class="fbtn" onclick="SLFBoard.quickEmail()">Email</button></div>' +
    '<div class="frow"><span class="fnum">2</span><span class="flab">File Type</span><span>Student Loan</span></div>' +
    '<div class="frow"><span class="fnum">3</span><span class="flab">Workflow History</span><a href="#" onclick="SLFBoard.setTab(\'history\');return false;">View</a></div>' +
    '<div class="frow"><span class="fnum">4</span><span class="flab">Update Status</span><select id="f-stage" onchange="SLFBoard.updateStage(this.value)">' + stageOptions + '</select></div>' +
    '<div class="frow"><span class="fnum">5</span><span class="flab">Customer ID</span><span>' + esc(c.id) + '</span></div>' +
    '<div class="frow"><span class="fnum">6</span><span class="flab">Income / Expenses</span><a href="#" onclick="SLFBoard.setTab(\'budget\');return false;">View Budget</a></div>' +
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
