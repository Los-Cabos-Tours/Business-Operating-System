// Forth clone module v2 — completes the nested tab strip so it
// matches the Forth CRM Client Dashboard exactly (doc FHC-CONT-02
// v2.8, "Nested Tabs"). Adds the missing Servicing tab and
// reorders existing tabs to Forth's documented order:
// History, Calls, Emails, Notes, E-Marketing, SMS, Docs, Events,
// Tasks, Credit Card, Bank Account, Debts, Loans, Servicing.
// Budget stays available (registered first by slf-board-budget.js)
// so income/expense work is not lost; it appears before the Forth
// set, which was already merged and verified working.
'use strict';
(function () {
  if (!window.SLFBoard || !SLFBoard.TABS) return;

  // Remove the existing tabs list, then rebuild in Forth's order.
  SLFBoard.TABS.length = 0;
  var FORTH_TABS = [
    { id: 'history', name: 'History', note: 'Full activity history for this client.' },
    { id: 'calls', name: 'Calls', note: 'Log every call — direction, phone, outcome, notes.' },
    { id: 'emails', name: 'Emails', note: 'Email log — subject, address, date, notes.' },
    { id: 'notes', name: 'Notes', note: 'Internal notes for this client.' },
    { id: 'emarketing', name: 'E-Marketing', note: 'Marketing touches — campaign, channel, date.' },
    { id: 'sms', name: 'SMS', note: 'Text message log.' },
    { id: 'docs', name: 'Docs', note: 'Document checklist and received status.' },
    { id: 'events', name: 'Events', note: 'Scheduled events — meetings, deadlines, hearings.' },
    { id: 'tasks', name: 'Tasks', note: 'Follow-up tasks with due dates.' },
    { id: 'cards', name: 'Credit Cards', note: 'Cards (type, last 4, expiry). Never full numbers.' },
    { id: 'bank', name: 'Bank Accounts', note: 'Bank accounts (name, type, last 4). Never full numbers.' },
    { id: 'debts', name: 'Debts', note: 'Other debts tracked for this client.' },
    { id: 'loans', name: 'Loans', note: 'Each loan: servicer, balance, status, program.' },
    { id: 'servicing', name: 'Servicing', note: 'Servicer interactions — provider, date, outcome, notes.' }
  ];
  FORTH_TABS.forEach(function (t) { SLFBoard.TABS.push(t); });

  // Budget re-inserted at the front (it was unshifted by the budget
  // module earlier in the load order).
  if (SLFBoard.budgetTotals) {
    SLFBoard.TABS.unshift({ id: 'budget', name: 'Budget', note: 'Income and expenses for this client.' });
  }

  // ---- Servicing tab: form, validation, list line, label ----
  if (SLFBoard.forms && SLFBoard.forms.fld) {
    SLFBoard.forms.build = (function (orig) {
      return function (tab) {
        if (tab === 'servicing') {
          return SLFBoard.forms.fld('Servicer', 'q-servicer', 'MOHELA / Aidvantage / Nelnet') +
            SLFBoard.forms.fld('Interaction type', 'q-saction', 'call / email / portal / payment') +
            SLFBoard.forms.fld('Date', 'q-sdate', '', 'date') +
            SLFBoard.forms.fld('Outcome / notes', 'q-snotes', 'What happened');
        }
        return orig(tab);
      };
    })(SLFBoard.forms.build);
  }

  if (SLFBoard.val) {
    SLFBoard.readForm = (function (orig) {
      return function (tab) {
        if (tab === 'servicing') {
          var val = SLFBoard.val;
          var rec = {
            servicer: val('q-servicer'),
            action: val('q-saction'),
            date: val('q-sdate'),
            notes: val('q-snotes')
          };
          if (!rec.servicer) { alert('Servicer is required.'); return null; }
          if (!rec.action) { alert('Interaction type is required.'); return null; }
          return rec;
        }
        return orig(tab);
      };
    })(SLFBoard.readForm);
  }

  if (SLFBoard.line) {
    SLFBoard.line = (function (orig) {
      return function (tab, r) {
        if (tab === 'servicing') {
          return (r.servicer || '') + (r.action ? ' — ' + r.action : '') + (r.date ? ' — ' + r.date : '') + (r.notes ? ' — ' + r.notes : '');
        }
        return orig(tab, r);
      };
    })(SLFBoard.line);
  }

  if (SLFBoard.recLabel) {
    SLFBoard.recLabel = (function (orig) {
      return function (tab, rec) {
        if (tab === 'servicing') {
          return [rec.servicer, rec.action, rec.date].filter(Boolean).join(' — ');
        }
        return orig(tab, rec);
      };
    })(SLFBoard.recLabel);
  }
})();
