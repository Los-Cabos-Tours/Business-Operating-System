// SLF Board main controller (split 5/5) v7
// v7 FIX: internal actions (setTab, addFromForm, removeItem, open)
// previously called the private render() directly, which skipped
// every wrapper attached to the public SLFBoard.render (breadcrumb,
// highlight sync). They now call SLFBoard.render() so the full
// chain runs. The Update Status block is byte-identical to #34
// (user-approved placement — DO NOT MOVE).
// v8 (2026-11-17): the .bwrap two-column grid now ALSO carries an
// inline style fallback. If the CSS module chain is ever blocked
// or stale, the inline style alone guarantees: Client Information
// panel on the LEFT (340px), nested tabs on the RIGHT filling the
// rest. Owner reported the right side rendering empty — inline
// style makes that impossible regardless of stylesheet state.
// v9 (2026-11-17): the lead's NAME renders BIG at the very top of
// the Client Dashboard (Forth spec: the contact name is the large
// page title of the dashboard). Only the name span's styling
// changed — nothing else in this file was touched.
'use strict';
(function () {
  function displayLine(tab, r) {
    var m = {
      calls: (r.direction || 'call') + (r.phone ? ' — ' + r.phone : '') + (r.outcome ? ' — ' + r.outcome : '') + (r.notes ? ' — ' + r.notes : ''),
      emails: (r.subject || '') + (r.address ? ' — ' + r.address : '') + (r.notes ? ' — ' + r.notes : ''),
      notes: r.text || '',
      docs: (r.docName || '') + (r.received ? ' — received ' + (r.date || '') : ' — pending'),
      tasks: (r.taskText || '') + (r.due ? ' — due ' + r.due : ''),
      loans: (r.servicer || '') + (r.balance ? ' — $' + r.balance : '') + (r.status ? ' — ' + r.status : '') + (r.program ? ' — ' + r.program : ''),
      bank: (r.bankName || '') + (r.type ? ' — ' + r.type : '') + (r.last4 ? ' — ****' + r.last4 : ''),
      cards: (r.cardType || '') + (r.last4 ? ' — ****' + r.last4 : '') + (r.expiry ? ' — exp ' + r.expiry : ''),
      debts: (r.creditor || '') + (r.amount ? ' — $' + r.amount : ''),
      events: (r.eventTitle || '') + (r.eventDate ? ' — ' + r.eventDate : ''),
      sms: (r.phone || '') + (r.message ? ' — ' + r.message : ''),
      emarketing: (r.campaign || '') + (r.channel ? ' — ' + r.channel : ''),
      servicing: (r.servicer || '') + (r.action ? ' — ' + r.action : '') + (r.date ? ' — ' + r.date : '') + (r.notes ? ' — ' + r.notes : '')
    };
    return m[tab] || '';
  }
  SLFBoard.line = displayLine;

  SLFBoard.quickFormHtml = function (tab) {
    var inner = SLFBoard.forms.build(tab);
    if (!inner) return '';
    return '<div class="bform">' + inner + '<button class="badd" onclick="SLFBoard.addFromForm()">Add</button></div>';
  };

  function render() {
    var v = document.getElementById('view');
    if (!v) return;
    var c = SLFBoard.client();
    if (!c) {
      v.innerHTML = '<div class="empty">Client not found. <a href="#" onclick="SLFBoard.close();return false;">Back to Clients</a></div>';
      return;
    }
    document.getElementById('view-title').textContent = 'Client Dashboard';
    var stageOptions = '';
    if (SLFBoard.panel.stageOptionsHtml) {
      stageOptions = SLFBoard.panel.stageOptionsHtml(c);
    }
    var navBar = (SLFBoard.panel.forthNavHtml) ? SLFBoard.panel.forthNavHtml(c) : '';
    v.innerHTML =
      '<style>' + SLFBoard.css() + '</style>' +
      '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px;">' +
      '<span class="bbkname" style="font-size:30px;font-weight:800;letter-spacing:0.5px;color:var(--text);font-family:Cinzel,serif;line-height:1.2;">' + SLFBoard.esc(c.name) + '</span>' +
      '<span class="btagid">' + SLFBoard.esc(c.id) + '</span>' +
      '<span style="flex:1;"></span>' +
      '<button class="bact" onclick="SLF.openCaseModal()">+ New Case</button>' +
      '<button class="bact ghost" onclick="SLFBoard.exportClient()">Export</button>' +
      '<button class="bact danger" onclick="SLFBoard.deleteConfirm()">Delete</button>' +
      '</div>' +
      // Update Status: label + dropdown together, LEFT-aligned,
      // directly under the client name/ID row. Inline flex with
      // gap only - no flex:1 label - so the row hugs the left and
      // the dropdown sits next to its label, never pushed right.
      // DO NOT MOVE (user-approved placement, #34).
      (stageOptions ? '<div style="display:inline-flex;align-items:center;gap:8px;margin:0 0 14px 0;">' +
        '<span style="color:var(--muted);font-size:12.5px;">Update Status</span>' +
        '<select id="f-stage" style="background:rgba(10,22,40,0.6);border:1px solid var(--line);border-radius:7px;color:var(--text);padding:5px 8px;font-size:12px;font-family:inherit;max-width:220px;" onchange="SLFBoard.updateStage(this.value)">' + stageOptions + '</select>' +
        '</div>' : '') +
      // Forth top navigation bar (Contact Search, Edit Contact,
      // Clone, Create Order, Budget Analysis, Creditors, Enrollment,
      // Settlements, Add Alert, Favorites)
      (navBar ? navBar : '') +
      // Two-column layout: panel LEFT, tabs RIGHT. The inline style
      // is the fallback guarantee — even if the stylesheet chain
      // fails, the columns hold (owner: right side must never be
      // empty). The .bwrap class keeps its responsive CSS on top.
      '<div class="bwrap" style="display:grid;grid-template-columns:340px minmax(0,1fr);gap:16px;align-items:start;">' +
      '<div class="bleft">' + SLFBoard.panel.infoPanel(c) + '</div>' +
      '<div class="bright">' +
      '<div class="btabs">' + SLFBoard.panel.tabNavHtml() + '</div>' +
      '<div class="btabbody">' + SLFBoard.panel.tabBody(c) + '</div>' +
      '</div>' +
      '</div>';
  }
  SLFBoard.render = render;

  var rawSetTab = SLFBoard.setTab;
  SLFBoard.setTab = function (t) { rawSetTab(t); SLFBoard.render(); };

  SLFBoard.addFromForm = function () {
    var st = SLFBoard.state();
    var c = SLFBoard.client();
    if (!c) return;
    var rec = SLFBoard.readForm(st.tab);
    if (!rec) return;
    var d = SLFBoard.all();
    if (!d[c.id]) d[c.id] = {};
    if (!d[c.id][st.tab]) d[c.id][st.tab] = [];
    rec.id = 'b_' + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);
    rec.ts = new Date().toISOString();
    d[c.id][st.tab].push(rec);
    if (!SLFBoard.saveAll(d)) return;
    if (window.SLF) SLF.log('board', st.tab + ' (' + c.id + ')', SLFBoard.recLabel(st.tab, rec));
    SLFBoard.render();
  };

  SLFBoard.removeItem = function (id) {
    var st = SLFBoard.state();
    var d = SLFBoard.all();
    if (!d[st.clientId]) return;
    Object.keys(d[st.clientId]).forEach(function (tab) {
      d[st.clientId][tab] = d[st.clientId][tab].filter(function (x) { return x.id !== id; });
    });
    SLFBoard.saveAll(d);
    SLFBoard.render();
  };

  function flash(msg) {
    var el = document.getElementById('pe-flash');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'inline';
    clearTimeout(SLFBoard.state().saveTimer);
    SLFBoard.setSaveTimer(setTimeout(function () { el.style.display = 'none'; }, 2500));
  }

  function findCustomValue(needle) {
    var c = SLFBoard.client();
    if (!c || !c.custom || !window.SLFFields) return '';
    var hit = '';
    SLFFields.fieldsOf('client').forEach(function (f) {
      if (hit) return;
      var lab = (f.label || '').toLowerCase();
      var v = c.custom[f.id];
      if ((f.type === needle || lab.indexOf(needle) !== -1) && v) hit = String(v);
    });
    return hit;
  }

  SLFBoard.quickEmail = function () {
    var c = SLFBoard.client();
    if (!c) return;
    var email = c.email || findCustomValue('email');
    if (!email) { alert('No email on file for this client.'); return; }
    var subject = 'Regarding your student loan file';
    var body = 'Hi ' + c.name + ',\n\n';
    var href = 'mailto:' + encodeURIComponent(email) + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    window.location.href = href;
    if (window.SLF) SLF.log('board', 'emails (' + SLFBoard.state().clientId + ')', 'quickmail opened to ' + email);
  };

  SLFBoard.logCall = function () {
    SLFBoard.setTab('calls');
    setTimeout(function () {
      var c = SLFBoard.client();
      var p = document.getElementById('q-phone');
      if (p && c) p.value = c.phone || findCustomValue('phone') || '';
    }, 50);
  };

  SLFBoard.exportClient = function () {
    var c = SLFBoard.client();
    if (!c) return;
    var data = { client: c, board: SLFBoard.all()[c.id] || {}, cases: (window.SLF ? SLF.cases.filter(function (k) { return k.clientId === c.id; }) : []) };
    var payload = JSON.stringify(data, null, 2);
    var blob = new Blob([payload], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'client-' + c.id + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  SLFBoard.deleteConfirm = function () {
    var c = SLFBoard.client();
    if (!c) return;
    if (!confirm('Delete client ' + c.name + ' permanently? This removes their dashboard data too.')) return;
    if (window.SLF) SLF.deleteClient(c.id);
    var d = SLFBoard.all();
    delete d[c.id];
    SLFBoard.saveAll(d);
    SLFBoard.close();
  };

  SLFBoard.open = function (clientId) {
    SLFBoard.setClientId(clientId);
    rawSetTab('history');
    SLFBoard.render();
  };

  SLFBoard.close = function () {
    SLFBoard.setClientId(null);
    if (window.SLF) { SLF.view = 'clients'; SLF.render(); }
  };
})();