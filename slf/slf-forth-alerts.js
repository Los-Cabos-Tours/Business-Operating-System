// Forth clone — Alerts nested tab (Forth doc: "Managing Alerts",
// Client Dashboards section). Adds the Alerts tab, the only tab
// named in Forth's Client Dashboard documentation that was still
// missing from this system. Alerts are per-client reminders:
// name, type, due date, notes. The tab label shows the number of
// open alerts. Forth's 14 documented tabs + Budget are all
// present already; this completes the documented set.
'use strict';
(function () {
  if (!window.SLFBoard || !SLFBoard.TABS) return;

  // Register the Alerts tab after Tasks (near Forth's workflow tabs).
  var TABS = SLFBoard.TABS;
  var taskIdx = -1;
  for (var i = 0; i < TABS.length; i++) if (TABS[i].id === 'tasks') taskIdx = i;
  var alertsTab = { id: 'alerts', name: 'Alerts', note: 'Reminders and alerts for this client.' };
  if (taskIdx >= 0) TABS.splice(taskIdx + 1, 0, alertsTab);
  else TABS.push(alertsTab);

  function openAlerts(clientId) {
    return (SLFBoard.items(clientId, 'alerts') || []).filter(function (r) { return !r.done; });
  }

  // Quick-add form fields.
  if (SLFBoard.forms && SLFBoard.forms.fld) {
    SLFBoard.forms.build = (function (orig) {
      return function (tab) {
        if (tab === 'alerts') {
          return SLFBoard.forms.fld('Alert name', 'q-aname', 'Follow up on docs') +
            SLFBoard.forms.fld('Type', 'q-atype', 'deadline / reminder / follow-up / escalation') +
            SLFBoard.forms.fld('Due date', 'q-adate', '', 'date') +
            SLFBoard.forms.fld('Notes', 'q-anotes', 'Optional detail');
        }
        return orig(tab);
      };
    })(SLFBoard.forms.build);
  }

  if (SLFBoard.val) {
    SLFBoard.readForm = (function (orig) {
      return function (tab) {
        if (tab === 'alerts') {
          var val = SLFBoard.val;
          var rec = {
            aname: val('q-aname'),
            atype: val('q-atype'),
            adate: val('q-adate'),
            anotes: val('q-anotes'),
            done: false
          };
          if (!rec.aname) { alert('Alert name is required.'); return null; }
          return rec;
        }
        return orig(tab);
      };
    })(SLFBoard.readForm);
  }

  if (SLFBoard.line) {
    SLFBoard.line = (function (orig) {
      return function (tab, r) {
        if (tab === 'alerts') {
          return (r.aname || '') + (r.atype ? ' — ' + r.atype : '') + (r.adate ? ' — due ' + r.adate : '') + (r.anotes ? ' — ' + r.anotes : '');
        }
        return orig(tab, r);
      };
    })(SLFBoard.line);
  }

  if (SLFBoard.recLabel) {
    SLFBoard.recLabel = (function (orig) {
      return function (tab, rec) {
        if (tab === 'alerts') return [rec.aname, rec.atype, rec.adate].filter(Boolean).join(' — ');
        return orig(tab, rec);
      };
    })(SLFBoard.recLabel);
  }

  // Mark an alert done (dismiss) from the tab body.
  SLFBoard.dismissAlert = function (id) {
    var st = SLFBoard.state();
    var d = SLFBoard.all();
    if (!d[st.clientId] || !d[st.clientId].alerts) return;
    d[st.clientId].alerts.forEach(function (r) {
      if (r.id === id) r.done = true;
    });
    SLFBoard.saveAll(d);
    if (window.SLF) SLF.log('board', 'alerts (' + st.clientId + ')', 'alert dismissed');
    SLFBoard.render();
  };

  // Tab label with open count, and a Dismiss button per alert.
  if (SLFBoard.panel) {
    SLFBoard.panel.tabNavHtml = (function (orig) {
      return function () {
        var html = orig();
        var st = SLFBoard.state();
        var c = SLFBoard.client();
        if (!c) return html;
        var open = openAlerts(c.id).length;
        if (!open) return html;
        // Append count to the Alerts label after render is tricky via
        // string surgery; instead decorate after insertion via a marker.
        return html.replace('>Alerts<', '>Alerts (' + open + ')<');
      };
    })(SLFBoard.panel.tabNavHtml);

    SLFBoard.panel.tabBody = (function (orig) {
      return function (c) {
        var html = orig(c);
        if (SLFBoard.state().tab !== 'alerts') return html;
        var esc = SLFBoard.esc;
        var open = openAlerts(c.id);
        if (!open.length) {
          return '<p class="bnote">Reminders and alerts for this client.</p>' +
            '<div class="bempty">No open alerts for this client.</div>';
        }
        var rows = open.map(function (r) {
          return '<div class="bitem">' +
            '<span class="bts">' + esc(r.ts || '') + '</span>' +
            '<span>' + esc(SLFBoard.line('alerts', r)) + '</span>' +
            '<button class="bact ghost" style="font-size:11px;padding:3px 8px;" onclick="SLFBoard.dismissAlert(\'' + r.id + '\')">Dismiss</button>' +
            '</div>';
        }).join('');
        return '<p class="bnote">Reminders and alerts for this client.</p>' + rows;
      };
    })(SLFBoard.panel.tabBody);
  }
})();
