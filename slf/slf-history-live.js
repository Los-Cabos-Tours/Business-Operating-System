// History tab live-feed module. The History nested tab was showing
// "Nothing here yet" even for clients WITH activity, because it
// read from the per-tab quick-entry store (empty for 'history').
// Forth's History nested tab shows the client's actual activity,
// so this renders the app's real log (SLF.history), filtered to
// the current client (target text contains the client id), newest
// first. Quick-add stays functional on other tabs.
'use strict';
(function () {
  if (!window.SLFBoard || !SLFBoard.panel || !window.SLF) return;

  var esc = SLFBoard.esc;

  function clientLogs(c) {
    if (!c || !SLF.history) return [];
    var id = String(c.id);
    return SLF.history.filter(function (h) {
      return String(h.target || '').indexOf(id) !== -1;
    }).slice().reverse();
  }

  SLFBoard.panel.tabBody = (function (orig) {
    return function (c) {
      if (SLFBoard.state().tab !== 'history' || !window.SLF) return orig(c);
      var logs = clientLogs(c);
      if (!logs.length) {
        return '<p class="bnote">Full activity history for this client.</p>' +
          '<div class="bempty">No activity recorded for this client yet.</div>';
      }
      var rows = logs.map(function (h) {
        return '<div class="bitem">' +
          '<span class="bts">' + esc(h.ts) + '</span>' +
          '<span>' + esc((h.action || '') + (h.target ? ' — ' + h.target : '') + (h.detail ? ' — ' + h.detail : '')) + '</span>' +
          '</div>';
      }).join('');
      return '<p class="bnote">Full activity history for this client.</p>' + rows;
    };
  })(SLFBoard.panel.tabBody);
})();
