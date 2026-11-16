// ============================================================
// REQUIRED CRM NAVIGATION ARCHITECTURE (owner specification)
// Implements exactly the specified structure:
//   - 17 main CRM modules in the top navigation, in order:
//     Dashboard, Guidelines, Contacts, Creditors, Tasks, Calendar,
//     Enrollments, Accounting, Billing, Settlements, Docs, Files,
//     E-Marketing, SMS, Reports, Insights, Admin
//   - Contacts workspace: directory -> individual contact -> Client
//     Dashboard (breadcrumb: Main CRM / Contacts / <contact>)
//   - Contact action bar: Contact search, Edit Contact, Clone,
//     Create Order, Budget Analysis, Creditors, Enrollment,
//     Settlements, Add Alert (+ Favorites selector)
//   - Nested tabs: the 14 required PLUS the already-shipped Budget
//     and Servicing and Alerts tabs (owner-approved earlier).
//     Missing-from-spec but required-by-spec: Lenders tab.
// Modules without developed functionality get a real, clearly
// identified development-placeholder workspace — every tab opens a
// destination; nothing is a dead click. No second app, no iframes,
// no redirects. Existing storage untouched; placeholders store
// nothing until their module is developed.
// ============================================================
'use strict';
(function () {
  if (!window.SLFBoard) return;

  // ---------- 1. Lenders nested tab (spec #4) ----------
  if (SLFBoard.TABS) {
    var hasLenders = SLFBoard.TABS.some(function (t) { return t.id === 'lenders'; });
    if (!hasLenders) {
      var loansIdx = -1;
      for (var li = 0; li < SLFBoard.TABS.length; li++) if (SLFBoard.TABS[li].id === 'loans') loansIdx = li;
      var lendersTab = { id: 'lenders', name: 'Lenders', note: 'Lenders associated with this contact.' };
      if (loansIdx >= 0) SLFBoard.TABS.splice(loansIdx + 1, 0, lendersTab);
      else SLFBoard.TABS.push(lendersTab);
    }
  }
  if (SLFBoard.forms && SLFBoard.forms.fld) {
    SLFBoard.forms.build = (function (orig) {
      return function (tab) {
        if (tab === 'lenders') {
          return SLFBoard.forms.fld('Lender name', 'q-lname', 'e.g. Sallie Mae') +
            SLFBoard.forms.fld('Type', 'q-ltype', 'federal / private / state') +
            SLFBoard.forms.fld('Notes', 'q-lnotes', 'Optional detail');
        }
        return orig(tab);
      };
    })(SLFBoard.forms.build);
  }
  if (SLFBoard.val) {
    SLFBoard.readForm = (function (orig) {
      return function (tab) {
        if (tab === 'lenders') {
          var val = SLFBoard.val;
          var rec = { lname: val('q-lname'), ltype: val('q-ltype'), lnotes: val('q-lnotes') };
          if (!rec.lname) { alert('Lender name is required.'); return null; }
          return rec;
        }
        return orig(tab);
      };
    })(SLFBoard.readForm);
  }
  if (SLFBoard.line) {
    SLFBoard.line = (function (orig) {
      return function (tab, r) {
        if (tab === 'lenders') return (r.lname || '') + (r.ltype ? ' — ' + r.ltype : '') + (r.lnotes ? ' — ' + r.lnotes : '');
        return orig(tab, r);
      };
    })(SLFBoard.line);
  }
  if (SLFBoard.recLabel) {
    SLFBoard.recLabel = (function (orig) {
      return function (tab, rec) {
        if (tab === 'lenders') return [rec.lname, rec.ltype].filter(Boolean).join(' — ');
        return orig(tab, rec);
      };
    })(SLFBoard.recLabel);
  }

  // ---------- 2. Main CRM top navigation (spec #1) ----------
  // The 17 modules. 'view' maps to an existing SLF view where one
  // exists; otherwise 'placeholder' opens the in-shell dev
  // workspace. Contacts is the entry to the contact dashboards.
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
    activePlaceholder: null,

    // Render the 17-module bar into the existing sidebar nav area.
    renderTopNav: function () {
      var nav = document.getElementById('nav');
      if (!nav || !window.SLF) return;
      var self = this;
      var html = MODULES.map(function (m) {
        return '<button data-bos="' + m.id + '"' + (m.id === self.activeModule ? ' class="active"' : '') + '>' + m.name + '</button>';
      }).join('');
      nav.innerHTML = html;
      Array.prototype.forEach.call(nav.querySelectorAll('button[data-bos]'), function (b) {
        b.addEventListener('click', function () {
          self.selectModule(b.getAttribute('data-bos'));
        });
      });
    },

    selectModule: function (id) {
      var m = null;
      for (var i = 0; i < MODULES.length; i++) if (MODULES[i].id === id) m = MODULES[i];
      if (!m) return;
      this.activeModule = m.id;
      this.activePlaceholder = m.placeholder ? m.id : null;
      if (m.view && window.SLF) {
        // Existing SLF view — use it (Contacts -> clients directory).
        if (SLFBoard.state().clientId) SLFBoard.close();
        SLF.view = m.view;
        SLF.render();
      } else {
        this.renderPlaceholder();
      }
      this.renderTopNav();
    },

    renderPlaceholder: function () {
      if (!window.SLF) return;
      var v = document.getElementById('view');
      var t = document.getElementById('view-title');
      var m = null;
      for (var i = 0; i < MODULES.length; i++) if (MODULES[i].id === this.activeModule) m = MODULES[i];
      if (!m) return;
      if (SLFBoard.state().clientId) SLFBoard.close();
      if (t) t.textContent = m.name;
      if (v) {
        v.innerHTML = '<div class="card"><h3>' + m.name + ' — module workspace</h3>' +
          '<p style="color:var(--muted);font-size:13px;">This module\'s navigation destination is live. ' +
          'The ' + m.name + ' workflow is in development. No data is stored here yet — records will be added when the module ships.</p></div>';
      }
    }
  };

  // ---------- 3. Contact action bar: add Contact search + Add Alert ----------
  if (SLFBoard.panel) {
    var rawNav = SLFBoard.panel.forthNavHtml;
    if (rawNav) {
      SLFBoard.panel.forthNavHtml = function (c) {
        var base = rawNav(c);
        var esc = SLFBoard.esc;
        // Contact search (spec action 1) — filters the directory
        // when executed from the dashboard; here it jumps to the
        // search field of the Contacts workspace.
        var search = '<span class="fnavi" style="color:var(--gold);font-size:12px;cursor:pointer;white-space:nowrap;" onclick="SLF.view=\'clients\';SLF.render();setTimeout(function(){var s=document.getElementById(\'client-search\');if(s)s.focus();},50)">Contact Search</span>';
        // Add Alert (spec action 9) — jumps to the Alerts tab's quick-add.
        var addAlert = '<span class="fnavi" style="color:var(--gold);font-size:12px;cursor:pointer;white-space:nowrap;" onclick="SLFBoard.setTab(\'alerts\');setTimeout(function(){var f=document.getElementById(\'q-aname\');if(f)f.focus();},60)">Add Alert</span>';
        // Favorites selector (spec: "where appropriate").
        var favs = '<span style="margin-left:auto;display:inline-flex;align-items:center;gap:6px;">' +
          '<span style="color:var(--muted);font-size:11px;">Favorites</span>' +
          '<select id="fav-select" style="width:auto;max-width:150px;padding:4px 8px;font-size:11px;">' +
          '<option value="">— select —</option></select></span>';
        return search + base + addAlert + favs;
      };
    }

    // Breadcrumb (spec #5): Main CRM / Contacts / <contact name>
    SLFBoard.panel.breadcrumbHtml = function (c) {
      return '<div style="font-size:11px;color:var(--muted);margin:0 0 8px 0;">' +
        'Main CRM / Contacts / ' + SLFBoard.esc(c.name) + '</div>';
    };
  }

  // ---------- 4. Wire up ----------
  function boot() {
    if (!window.SLF || !window.BOSCRM) return;
    BOSCRM.renderTopNav();
    if (SLFBoard.panel && SLFBoard.panel.breadcrumbHtml) {
      var rawTabBody = SLFBoard.panel.tabBody;
      SLFBoard.panel.tabBody = function (c) {
        return (SLFBoard.panel.breadcrumbHtml ? SLFBoard.panel.breadcrumbHtml(c) : '') + rawTabBody(c);
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
