// ============================================================
// SLF Guard — parse-gate loader (the "never crash" mechanism)
// Loaded FIRST, synchronously, before any CRM module.
// For each module: fetch its text, COMPILE-CHECK it (new Function
// compiles without executing), and only then write its script tag.
// A file with a syntax error can NEVER be executed. Failures are
// reported visibly instead of a dead page.
// When modules change, bump VERSION (cache-busting).
//
// LOAD ORDER RULE (learned the hard way): modules that wrap or
// decorate render/setTab/panel MUST load AFTER slf-board-main.js
// (the controller). slf-forth-rows.js wraps saveProfile (defined
// by slf-notes-patch.js), so it loads after slf-notes-patch.js.
//
// 3.18: slf-fast-sync.js — ONE consolidated pull every 3 seconds
//       dispatched to all sync modules; slf-delete-guard.js —
//       deletion is SUPERADMIN-ONLY; fixes the 3.17 reversed
//       module load order.
// 3.19: slf-ui-guard.js — CLOUD SYNC sidebar panel removed;
//       sync forced on forever; delete controls hidden from
//       non-superadmin users.
// 3.20: slf-single-nav.js — ONE navigation: the Forth-style top
//       module bar. The duplicate left sidebar tab list is
//       hidden — no tab appears twice (owner order 2026-11-17).
// 3.21: slf-forth-rows.js — all 11 numbered Forth left-panel
//       rows: Quick Message, File Type, Workflow History,
//       Request Release (superadmin-gated), Customer ID,
//       Company Assignment, Change Secondary Assignment,
//       clickable Email/Phone, Income/Expenses → Budget Analysis.
//       Update Status stays in the header (PR #34 — no dup).
// ============================================================
(function () {
  'use strict';
  var VERSION = '3.21';
  var MODULES = ['slf-sync.js', 'slf-app.js', 'slf-fields.js', 'slf-fields-designer.js', 'slf-esign.js',
    'slf-board-base.js', 'slf-forth-css-a.js', 'slf-forth-css-b.js', 'slf-forth-css-install.js', 'slf-board-forms.js', 'slf-board-panel.js',
    'slf-forth-panel.js', 'slf-forth-main.js', 'slf-board-budget.js', 'slf-forth-tabs.js', 'slf-forth-nav.js', 'slf-forth-alerts.js',
    'slf-board-main.js',
    'slf-notes-patch.js', 'slf-forth-rows.js', 'slf-history-live.js', 'slf-board-keepopen.js', 'slf-board-hook.js', 'slf-bos-nav-final.js', 'slf-forth-search.js',
    'slf-fielddefs-sync.js', 'slf-board-sync.js', 'slf-fast-sync.js', 'slf-delete-guard.js', 'slf-ui-guard.js', 'slf-single-nav.js'];
  var failures = [];
  var i, m, ok, xhr;

  for (i = 0; i < MODULES.length; i++) {
    m = MODULES[i];
    ok = true;
    try {
      xhr = new XMLHttpRequest();
      xhr.open('GET', m + '?v=' + VERSION, false);
      xhr.send(null);
      if (xhr.status === 200 || xhr.status === 0) {
        try {
          new Function(xhr.responseText);
        } catch (parseErr) {
          ok = false;
          failures.push(m + ' — syntax error blocked: ' + (parseErr && parseErr.message ? parseErr.message : 'parse failed'));
        }
      } else {
        ok = false;
        failures.push(m + ' — could not be fetched (HTTP ' + xhr.status + ')');
      }
    } catch (e) {
      ok = null;
    }
    if (ok === false) continue;
    document.write('<script src="' + m + '?v=' + VERSION + '"><\/script>');
  }

  window.__SLF_GUARD_FAILURES = failures;
})();