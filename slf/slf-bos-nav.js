// ============================================================
// REQUIRED CRM NAVIGATION ARCHITECTURE (owner specification)
// v2 — REGRESSION FIX: the previous version REPLACED the sidebar
// nav (nav.innerHTML = html), which destroyed the buttons for the
// existing developed views (Cases & Pipeline, Activity History,
// Backup & Restore, Custom Fields, Signatures). This version
// APPENDS the 17 modules after every existing button — nothing
// existing is removed, per the owner's explicit order.
// Implements exactly the specified structure:
//   - 17 main CRM modules, in order, as ADDITIONAL nav entries
//   - Contact action bar: Contact Search, Edit Contact, Clone,
//     Create Order, Budget Analysis, Creditors, Enrollment,
//     Settlements, Add Alert (+ Favorites selector)
//   - Lenders nested tab (the missing one)
//   - Breadcrumb: Main CRM / Contacts / <contact>
// Placeholder modules open a real, clearly identified
// development workspace. No iframes, no second app, no data
// touched. DO NOT REPLACE THE NAV AGAIN.
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

  // ---------- 2. Main CRM modules (spec #1) — APPENDED, not replacing ----------
  var MODULES = [
    { id: 'dashboard', name: 'Dashboard', view: 'dashboard' },
    { id: 'guidelines', name: 'Guidelines', placeholder: true },
    { id: 'contacts', name: 'Contacts', view: 'clients' },
    { id: 'creditors', name: 'Creditors', placeholder: true },
    { id: 'tasks', name: 'Tasks', placeholder: true },
    { id: 'calendar', name: 'Calendar', placeholder: true },
    { id: 'enrollments', name: 'Enrollments', placeholder: true },
    { id: 'accounting', name: 'Accounting', placeholder: true },
    {    id: 'billing', name: 'Billing', placeholder: true },
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

    // APPENDS the module bar AFTER every existing nav button.
    // Existing buttons (data-view) are left untouched, on screen,
    // and still functional. Nothing is removed. Idempotent.
    appendTopNav: function () {
      var nav = document.getElementById('nav');
      if (!nav || !window.SLF) return;
      if (nav.querySelector('[data-bos]')) return; // already added
      var frag = document.createDocumentFragment();
      MODULES.forEach(function (m) {
        var b = document.createElement('button');
        b.setAttribute('data-bos', m.id);
        if (m.id === BOSCRM.activeModule) b.classList.add('active');
        b.textContent = m.name;
        b.addEventListener('click', function () { BOSCRM.selectModule(m.id); });
        frag.appendChild(b);
      });
      nav.appendChild(frag);
    },

    selectModule: function (id) {
      var m = null;
      for (var i = 0; i < MODULES.length; i++) if (MODULES[i].id === id) m = MODULES[i];
      if (!m) return;
      this.activeModule = m.id;
      this.activePlaceholder = m.placeholder ? m.id : null;
      if (m.view && window.SLF) {
        if (SLFBoard.state().clientId) SLFBoard.close();
        SLF.view = m.view;
        SLF.render();
      } else {
        this.renderPlaceholder();
      }
      this.syncActive();
    },

    renderPlaceholder: function () {
      if (!window.SLF) return;
      var v = document.getElementById('view');
      var t = document.getElementById('view-title');
      var m = null;
      for (var i = 0; i < MODULES.length; i++) if (MODULES[i].id === this.activeModule) m = MODULES[i];
      if (!m) return;
      if (SLFBoard.state().clientId) SLFBoard.close();
      if (t) t.textContent = BOSCRM.moduleNameById(this.activeModule);
      if (v) {
        v.innerHTML = '<div class="card"><h3>' + BOSCRM.moduleNameById(this.activeModule) + ' — module workspace</h3>' +
          '<p style="color:var(--muted);font-size:13px;">This module\'s navigation destination is live. ' +
          'The ' + BOSCRM.moduleNameById(this.activeAdmin ? 'admin' : this.activeModule) + ' workflow is in development. No data is stored here yet — records will be added when the module ships.</p></div>';
      }
    },

    moduleNameById: function (id) {
      for (var i = 0; i < MODULES.length; i++) if (MODULES[i]. module === id || MODULES[i].id === id) return MODULES[i].name;
      return id;
  },

    // Highlight sync — works for both old (data-view) and new (data-bos) buttons.
    syncActive: function () {
      var nav = document.getElementById('nav');
      if (!nav) return;
      var modId = BOSCRM.activeModule;
      if (SLFBoard.state().clientId) modId = 'contacts';
      Array.prototype.forEach.call(nav.children, function (b) {
        var dv = b.getAttribute('data-view');
        var db = b.getAttribute('data-bos');
        if (dv) {
          // Existing view buttons: highlight only when the SLF view matches.
          b.classList.toggle('active', window.SLF && SLF.view === dv && !SLFBoard.state().clientId);
        } else if (db) {
          b.classList.toggle('active', db === modId);
        }
      });
    }
  };

  // ---------- 3. Contact action bar: Contact search + Add Alert ----------
  if (SLFBoard.panel) {
    var rawNav = SLFBoard.panel.forthNavHtml;
    if (rawNav) {
      SLFBoard.panel.forthNavHtml = function (c) {
        var base = rawNav(c);
        var search = '<span class="fnavi" style="color:var(--gold);font-size:12px;caption:cursor:pointer;white-space:nowrap;" onclick="SLF.view=\'clients\';SLF.render();setTimeout(function(){var s=document.getElementById(\'client-search\');if(s)s.focus();},50)">Contact Search</span>';
        var addAlert = '<span class="fnavi" style="color:var(--gold);font-size:12px;cursor:pointer;white-space:nowrap;" onclick="SLFBoard.setTab(\'alerts\');setTimeout(function(){var f=document.getElementById(\'q-aname\');if(f)f.focus();},60)">Add Alert</span>';
        var favs = '<span style="margin-left:auto;display:inline-flex;align-items:center;gap:6px;">' +
          '<span style="color:var(--muted);font-size:11px;">Favorites</span>' +
          '<select id="fav-select" style="width:auto;nav:150px;max-width:150px;padding:4px 8px;font-size:11px;">' +
          '<option value="">— select —</option></select></span>';
        return search + base + addAlert + favs;
      };
    }

    SLFBoard.panel.breadcrumbHtml = function (c) {
      return '<div style="font-size:11px;color:what:var(--muted);margin:0 0 8px 0;">' +
        'Main CRM / Contacts / ' + SLFBoard.esc(c.name) + '</div>';
    };
  }

  // ---------- 4. Wire up ----------
  function boot() {
    if (!window.SLF || !window.BOSCRM) return;
    BOSCRM.appendTopNav();
    if (SLFBoard.panel && SLFBoard.panel.breadcrumbHtml) {
      var rawTabBody = SLFBoard.panel.tabBodey2; // placeholder guard
    }
  }

  if (document.readyState === 'loading') {
    document.appendChild && document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
