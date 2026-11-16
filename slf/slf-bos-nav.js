// ============================================================
// REQUIRED CRM NAVIGATION ARCHITECTURE (owner specification)
// v4 — MODULES GO ON TOP, HORIZONTALLY, LIKE THE FORTH CRM.
// Owner correction (this session): the 17 modules do NOT belong
// in the sidebar stacked vertically — they belong in a horizontal
// bar ACROSS THE TOP of the page, matching the Forth CRM Client
// Dashboard screenshot. The sidebar (Dashboard, Clients, Cases &
// Pipeline, Activity History, Backup & Restore, Custom Fields,
// Signatures) is NEVER touched — it stays exactly as the owner
// built it. v1's replace-the-sidebar bug and v3's appended-
// sidebar-button placement are both rolled back for the module
// buttons; only the top bar carries them now.
// Also retained from the spec: 9-item contact action bar, Lenders
// nested tab, breadcrumb, working contact search, and real
// placeholder workspaces for undeveloped modules.
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

  // ---------- 2. Main CRM modules — HORIZONTAL TOP BAR ----------
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

    moduleNameById: function (id) {
      for (var i = 0; i < MODULES.length; i++) {
        if (MODULES[i].id === id) return MODULES[i].name;
      }
      return id;
    },

    // Renders the horizontal module bar ACROSS THE TOP of the
    // page (inside <main>, above the back link and view title),
    // exactly like the Forth CRM screenshot's top module row.
    // The sidebar nav (#nav) is NEVER touched.
    renderTopBar: function () {
      var main = document.querySelector('main');
      if (!main || !window.SLF) return;
      var bar = document.getElementById('bos-module-bar');
      if (bar) return; // already rendered
      bar = document.createElement('div');
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
      var name = this.moduleNameById(this.activeModule);
      if (SLFBoard.state().clientId) SLFBoard.close();
      if (t) t.textContent = name;
      if (v) {
        v.innerHTML = '<div class="card"><h3>' + name + ' — module workspace</h3>' +
          '<p style="color:var(--muted);font-size:13px;">This module\'s navigation destination is live. ' +
          'The ' + name + ' workflow is in development. No data is stored here yet — records will be added when the module ships.</p></div>';
      }
    },

    // Highlights the active module in the top bar only. The
    // sidebar keeps its own independent highlighting.
    syncActive: function () {
      var bar = document.getElementById('bos-module-bar');
      if (!bar || !window.SLF) return;
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

  // ---------- 3. Contact action bar: Contact Search + Add Alert ----------
  if (SLFBoard.panel) {
    var rawNav = SLFBoard.panel.forthNavHtml;
    if (rawNav) {
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

  // ---------- 4. Wire up ----------
  function boot() {
    if (!window.SLF || !window.BOSCRM) return;
    BOSCRM.renderTopBar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
