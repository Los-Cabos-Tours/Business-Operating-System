// ============================================================
// BOS CRM NAVIGATION — consolidated, FINAL placement.
// ROOT CAUSE of the "no tabs working" outage: the two previous
// nav modules loaded BEFORE slf-board-main.js (the controller
// that builds render/setTab/panel), so they wrapped half-built
// functions; and the second module overwrote the first's
// highlight logic pointing at removed DOM. This module is ONE
// file, loaded LAST (after the controller, after keepopen, after
// hook — same position as every module that always worked), and
// it wraps once, after everything is fully built.
// Contains: horizontal top module bar (17 modules, Forth-style),
// Lenders nested tab, contact action bar additions, breadcrumb,
// contact search, active-module highlight.
// The sidebar (#nav) is NEVER touched.
// ============================================================
'use strict';
(function () {
  if (!window.SLFBoard || !window.SLF) return;

  // ---------- 1. Lenders nested tab ----------
  if (SLFBoard.TABS && !SLFBoard.TABS.some(function (t) { return t.id === 'lenders'; })) {
    var loansIdx = -1;
    for (var li = 0; li < SLFBoard.TABS.length; li++) if (SLFBoard.TABS[li].id === 'loans') loansIdx = li;
    var lendersTab = { id: 'lenders', name: 'Lenders', note: 'Lenders associated with this contact.' };
    if (loansIdx >= 0) SLFBoard.TABS.splice(loansIdx + 1, 0, lendersTab);
    else SLFBoard.TABS.push(lendersTab);
  }
  if (SLFBoard.forms && SLFBoard.forms.fld) {
    var origBuild = SLFBoard.forms.build;
    SLFBoard.forms.build = function (tab) {
      if (tab === 'lenders') {
        return SLFBoard.forms.fld('Lender name', 'q-lname', 'e.g. Sallie Mae') +
          SLFBoard.forms.fld('Type', 'q-ltype', 'federal / private / state') +
          SLFBoard.forms.fld('Notes', 'q-lnotes', 'Optional detail');
      }
      return origBuild.apply(SLFBoard.forms, arguments);
    };
  }
  if (SLFBoard.val) {
    var origRead = SLFBoard.readForm;
    SLFBoard.readForm = function (tab) {
      if (tab === 'lenders') {
        var val = SLFBoard.val;
        var rec = { lname: val('q-lname'), ltype: val('q-ltype'), lnotes: val('q-lnotes') };
        if (!rec.lname) { alert('Lender name is required.'); return null; }
        return rec;
      }
      return origRead.apply(SLFBoard, arguments);
    };
  }
  if (SLFBoard.line) {
    var origLine = SLFBoard.line;
    SLFBoard.line = function (tab, r) {
      if (tab === 'lenders') return (r.lname || '') + (r.ltype ? ' — ' + r.ltype : '') + (r.lnotes ? ' — ' + r.lnotes : '');
      return origLine.apply(SLFBoard, arguments);
    };
  }
  if (SLFBoard.recLabel) {
    var origLabel = SLFBoard.recLabel;
    SLFBoard.recLabel = function (tab, rec) {
      if (tab === 'lenders') return [rec.lname, rec.ltype].filter(Boolean).join(' — ');
      return origLabel.apply(SLFBoard, arguments);
    };
  }

  // ---------- 2. Main CRM modules — horizontal top bar ----------
  var MODULES = [
    { id: 'dashboard', name: 'Dashboard', view: 'dashboard' },
    { id: 'guidelines', name: 'Guidelines', placeholder: true },
    { id: 'contacts', name: 'Contacts', view: 'clients' },
    { id: 'creditors', name: 'Creditors', placeholder: true },
    { id: 'tasks', name: 'Tasks', placeholder: true },
    { id: 'calendar', name: 'Calendar', placeholder: true },
    { id: 'enrollments', name: 'Enrollments', placeholder: true },
    { id: 'accounting', name: 'Accounting', placeholder: true },
    { id: 'billing', name: 'Billing', placeholder: true },
    { id: 'settlements', name: 'Settlements', placeholder: true },
    { id: 'docs', name: 'Docs', placeholder: true },
    { id: 'files', name: 'Files', placeholder: true },
    { id: 'emarketing', name: 'E-Marketing', placeholder: true },
    { id: 'sms', name: 'SMS', placeholder: true },
    { id: 'reports', name: 'Reports', placeholder: true },
    { id: 'insights', name: 'Insights', placeholder: true },
    { id: 'admin', name: 'Admin', placeholder: true }
  ];

  window.BOSCRM = {
    modules: MODULES,
    activeModule: 'dashboard',

    moduleNameById: function (id) {
      for (var i = 0; i < MODULES.length; i++) if (MODULES[i].id === id) return MODULES[i].name;
      return id;
    },

    renderTopBar: function () {
      var main = document.querySelector('main');
      if (!main) return;
      if (document.getElementById('bos-module-bar')) { this.syncActive(); return; }
      var bar = document.createElement('div');
      bar.id = 'bos-module-bar';
      bar.style.cssText = 'display:flex;flex-wrap:wrap;gap:2px;align-items:center;' +
        'border-bottom:1px solid var(--line);padding:6px 0 8px 0;margin-bottom:12px;';
      var self = this;
      MODULES.forEach(function (m) {
        var b = document.createElement('button');
        b.setAttribute('data-bos', m.id);
        b.textContent = m.name;
        b.style.cssText = 'background:none;border:none;border-bottom:2px solid transparent;' +
          'color:var(--muted);padding:7px 11px;font-size:12.5px;cursor:pointer;font-family:inherit;white-space:nowrap;';
        b.addEventListener('click', function () { self.selectModule(m.id); });
        bar.appendChild(b);
      });
      main.insertBefore(bar, main.firstChild);
      this.syncActive();
    },

    selectModule: function (id) {
      var m = null;
      for (var i = 0; i < MODULES.length; i++) if (MODULES[i].id === id) m = MODULES[i];
      if (!m) return;
      this.activeModule = m.id;
      if (m.view) {
        if (SLFBoard.state().clientId) SLFBoard.close();
        SLF.view = m.view;
        SLF.render();
      } else {
        this.renderPlaceholder(m);
      }
      this.syncActive();
    },

    renderPlaceholder: function (m) {
      var v = document.getElementById('view');
      var t = document.getElementById('view-title');
      if (SLFBoard.state().clientId) SLFBoard.close();
      if (t) t.textContent = m.name;
      if (v) {
        v.innerHTML = '<div class="card"><h3>' + m.name + ' — module workspace</h3>' +
          '<p style="color:var(--muted);font-size:13px;">This module\'s navigation destination is live. ' +
          'The ' + m.name + ' workflow is in development. No data is stored here yet — records will be added when the module ships.</p></div>';
      }
    },

    syncActive: function () {
      var bar = document.getElementById('bos-module-bar');
      if (!bar) return;
      var modId = this.activeModule;
      if (SLFBoard.state().clientId) modId = 'contacts';
      Array.prototype.forEach.call(bar.children, function (b) {
        var db = b.getAttribute('data-bos');
        b.style.color = (db === modId) ? 'var(--gold)' : 'var(--muted)';
        b.style.borderBottomColor = (db === modId) ? 'var(--gold)' : 'transparent';
        b.style.fontWeight = (db === modId) ? '600' : '400';
      });
    }
  };

  // ---------- 3. Action bar additions + breadcrumb ----------
  if (SLFBoard.panel) {
    if (SLFBoard.panel.forthNavHtml) {
      var rawNav = SLFBoard.panel.forthNavHtml;
      SLFBoard.panel.forthNavHtml = function (c) {
        var base = rawNav(c);
        var search = '<span class="fnavi" style="color:var(--gold);font-size:12px;cursor:pointer;white-space:nowrap;" onclick="SLF.view=\'clients\';SLF.render();setTimeout(function(){var s=document.getElementById(\'client-search\');if(s)s.focus();},50)">Contact Search</span>';
        var addAlert = '<span class="fnavi" style="color:var(--gold);font-size:12px;cursor:pointer;white-space:nowrap;" onclick="SLFBoard.setTab(\'alerts\');setTimeout(function(){var f=document.getElementById(\'q-aname\');if(f)f.focus();},60)">Add Alert</span>';
        var favs = '<span style="margin-left:auto;display:inline-flex;align-items:center;gap:6px;">' +
          '<span style="color:var(--muted);font-size:11px;">Favorites</span>' +
          '<select id="fav-select" style="width:auto;max-width:150px;padding:4px 8px;font-size:11px;">' +
          '<option value="">— select —</option></select></span>';
        return search + base + addAlert + favs;
      };
    }

    SLFBoard.panel.breadcrumbHtml = function (c) {
      return '<div style="font-size:11px;color:var(--muted);margin:0 0 8px 0;">' +
        'Main CRM / Contacts / ' + SLFBoard.esc(c.name) + '</div>';
    };
  }

  // ---------- 4. Single render wrap (AFTER the controller is built) ----------
  var rawBoardRender = SLFBoard.render;
  SLFBoard.render = function () {
    rawBoardRender.apply(SLFBoard, arguments);
    try {
      var c = SLFBoard.client();
      var v = document.getElementById('view');
      if (c && v && SLFBoard.panel.breadcrumbHtml) {
        v.insertAdjacentHTML('afterbegin', SLFBoard.panel.breadcrumbHtml(c));
      }
    } catch (e) { /* breadcrumb must never break the board */ }
    try { BOSCRM.syncActive(); } catch (e) {}
  };

  var rawSlfRender = SLF.render;
  SLF.render = function () {
    rawSlfRender.apply(SLF, arguments);
    try {
      if (SLF.view === 'clients') {
        var v = document.getElementById('view');
        if (v && !document.getElementById('client-search')) {
          v.insertAdjacentHTML('afterbegin', '<div class="toolbar" style="margin-bottom:12px;">' +
            '<input id="client-search" placeholder="Search contacts by name, email, phone, or ID…" ' +
            'style="max-width:320px;" oninput="BOSCRM.filterClients(this.value)" /></div>');
        }
      }
    } catch (e) { /* search must never break the directory */ }
    try { BOSCRM.syncActive(); } catch (e) {}
  };

  BOSCRM.filterClients = function (q) {
    q = String(q || '').toLowerCase().trim();
    var table = document.querySelector('#view table tbody');
    if (!table) return;
    Array.prototype.forEach.call(table.rows, function (row) {
      if (!q) { row.style.display = ''; return; }
      var text = (row.textContent || '').toLowerCase();
      row.style.display = text.indexOf(q) !== -1 ? '' : 'none';
    });
  };

  // ---------- 5. Boot ----------
  function boot() {
    BOSCRM.renderTopBar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
