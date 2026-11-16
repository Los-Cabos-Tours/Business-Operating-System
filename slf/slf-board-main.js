// SLF Board main controller (split 5/5)
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
      emarketing: (r.campaign || '') + (r.channel ? ' — ' + r.channel : '')
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
    var st = SLFBoard.state();
    var c = SLFBoard.client();
    if (!c) {
      v.innerHTML = '<div class="empty">Client not found. <a href="#" onclick="SLFBoard.close();return false;">Back to Clients</a></div>';
      return;
    }
    document.getElementById('view-title').textContent = 'Client Dashboard';
    v.innerHTML =
      '<style>' + SLFBoard.css() + '</style>' +
      '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;">' +
      '<a href="#" class="bbk" onclick="SLFBoard.close();return false;">&larr; Back to Clients</a>' +
      '<span class="bbkname">' + SLFBoard.esc(c.name) + '</span>' +
      '<span class="btagid">' + SLFBoard.esc(c.id) + '</span>' +
      '<span style="flex:1;"></span>' +
      '<button class="bact" onclick="SLF.openCaseModal()">+ New Case</button>' +
      '<button class="bact ghost" onclick="SLFBoard.exportClient()">Export</button>' +
      '<button class="bact danger" onclick="SLFBoard.deleteConfirm()">Delete</button>' +
      '</div>' +
      '<div class="bwrap">' +
      '<div class="bleft">' + SLFBoard.panel.infoPanel(c) + '</div>' +
      '<div class="bright">' +
      '<div class="btabs">' + SLFBoard.panel.tabNavHtml() + '</div>' +
      '<div class="btabbody">' + SLFBoard.panel.tabBody(c) + '</div>' +
      '</div>' +
      '</div>';
  }
  SLFBoard.render = render;

  SLFBoard.setTab = function (t) { SLFBoard._setTab(t); render(); };

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
    render();
  };

  SLFBoard.removeItem = function (id) {
    var st = SLFBoard.state();
    var d = SLFBoard.all();
    if (!d[st.clientId]) return;
    Object.keys(d[st.clientId]).forEach(function (tab) {
      d[st.clientId][tab] = d[st.clientId][tab].filter(function (x) { return x.id !== id; });
    });
    SLFBoard.saveAll(d);
    render();
  };

  SLFBoard.saveProfile = function () {
    var c = SLFBoard.client();
    if (!c) return;
    var val = SLFBoard.val;
    c.email = val('pe-email').trim();
    c.phone = val('pe-phone').trim();
    c.notes = val('pe-notes').trim();
    var custom = {};
    if (window.SLFFields) {
      SLFFields.fieldsOf('client').forEach(function (f) {
        var el = document.getElementById('pe-cf-' + f.id);
        custom[f.id] = el ? el.value : (c.custom ? c.custom[f.id] : '');
      });
    }
    c.custom = custom;
    c.updatedAt = Date.now();
    if (window.SLF) {
      SLF_STORE.write(SLF_CLIENTS_KEY, SLF.clients);
      SLF.log('board', 'profile (' + c.id + ')', 'profile edited from dashboard');
    }
    flash('Profile saved.');
    render();
  };

  function flash(msg) {
    var el = document.getElementById('pe-flash');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'inline';
    clearTimeout(SLFBoard._timer());
    var t = setTimeout(function () { el.style.display = 'none'; }, 2500);
    SLFBoard._setTimer(t);
  }

  SLFBoard.quickEmail = function () {
    var c = SLFBoard.client();
    if (!c) return;
    var email = SLFBoard.val('pe-email') || c.email;
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
      if (p && c) p.value = SLFBoard.val('pe-phone') || c.phone || '';
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
    SLFBoard._setTab('history');
    render();
  };

  SLFBoard.close = function () {
    SLFBoard.setClientId(null);
    if (window.SLF) { SLF.view = 'clients'; SLF.render(); }
  };
})();
