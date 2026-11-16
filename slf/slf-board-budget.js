// Budget tab module — Income / Expenses for a client, opened
// from the Client Information panel (per the user's Forth
// screenshots). Loads after the board files and ADDS to the tab
// list; does not rewrite any existing module.
'use strict';
(function () {
  if (!window.SLFBoard || !SLFBoard.forms || !SLFBoard.readForm || !SLFBoard.TABS) return;

  // Register the tab at the TOP of the strip.
  SLFBoard.TABS.unshift({ id: 'budget', name: 'Budget', note: 'Income and expenses for this client.' });

  // Quick-add form fields.
  SLFBoard.forms.build = (function (orig) {
    return function (tab) {
      if (tab === 'budget') {
        return SLFBoard.forms.fld('Entry type', 'q-btype', 'income / rent / utilities / food / transport / other') +
          SLFBoard.forms.fld('Amount (USD)', 'q-bamount', '0.00', 'number') +
          SLFBoard.forms.fld('Frequency', 'q-bfreq', 'monthly') +
          SLFBoard.forms.fld('Notes', 'q-bnotes', 'Optional detail');
      }
      return orig(tab);
    };
  })(SLFBoard.forms.build);

  // Read the form into a record.
  SLFBoard.readForm = (function (orig) {
    return function (tab) {
      if (tab === 'budget') {
        var val = SLFBoard.val;
        var rec = {
          btype: val('q-btype'),
          amount: val('q-bamount'),
          freq: val('q-bfreq') || 'monthly',
          notes: val('q-bnotes')
        };
        if (!rec.btype) { alert('Entry type is required.'); return null; }
        if (!rec.amount || isNaN(Number(rec.amount))) { alert('Amount must be a number.'); return null; }
        return rec;
      }
      return orig(tab);
    };
  })(SLFBoard.readForm);

  // List line + label.
  SLFBoard.line = (function (orig) {
    return function (tab, r) {
      if (tab === 'budget') {
        return (r.btype || 'entry') + ' — $' + (r.amount || '0') + (r.freq ? ' — ' + r.freq : '') + (r.notes ? ' — ' + r.notes : '');
      }
      return orig(tab, r);
    };
  })(SLFBoard.line);

  SLFBoard.recLabel = (function (orig) {
    return function (tab, rec) {
      if (tab === 'budget') {
        return (rec.btype || 'entry') + ' — $' + (rec.amount || '0');
      }
      return orig(tab, rec);
    };
  })(SLFBoard.recLabel);

  // Totals summary shown above the entries list.
  SLFBoard.budgetTotals = function (clientId) {
    var items = SLFBoard.items(clientId, 'budget') || [];
    var inc = 0, exp = 0;
    items.forEach(function (r) {
      var n = Number(r.amount) || 0;
      if (String(r.btype || '').toLowerCase().indexOf('income') === 0) inc += n;
      else exp += n;
    });
    return { income: inc, expenses: exp, net: inc - exp };
  };

  // Decorate the tab body to show totals for the budget tab.
  SLFBoard.panel.tabBody = (function (orig) {
    return function (c) {
      var html = orig(c);
      if (SLFBoard.state().tab !== 'budget') return html;
      var t = SLFBoard.budgetTotals(c.id);
      var esc = SLFBoard.esc;
      var summary = '<div class="bform" style="margin-bottom:10px;">' +
        '<div class="bf"><label>Monthly income</label><span>' + esc(t.income.toFixed(2)) + '</span></div>' +
        '<div class="bf"><label>Expenses</label><span>' + esc(t.expenses.toFixed(2)) + '</span></div>' +
        '<div class="bf"><label>Net</label><span>' + esc(t.net.toFixed(2)) + '</span></div>' +
        '</div>';
      return summary + html;
    };
  })(SLFBoard.panel.tabBody);
})();
