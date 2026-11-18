// ============================================================
// SLF Guard — parse-gate loader (the "never crash" mechanism)
// Loaded FIRST, synchronously, before any CRM module.
// For each module: fetch its text, COMPILE-CHECK it (new Function
// compiles without executing), and only then write its script tag.
// A file with a syntax error can NEVER be executed.
//
// 3.40: NOTHING FAILS SILENTLY ANYMORE.
//   v3.38/3.39 collected failures into __SLF_GUARD_FAILURES but
//   NOTHING displayed them — a blocked or missing module left a
//   half-dead page with zero on-screen explanation. That silence
//   is why "nothing works" gave the owner no error to report.
//   v3.40 adds:
//   1. Blocked modules (syntax error / fetch fail) -> red banner
//      on the page, named, at load time.
//   2. window 'error' capture -> any runtime error anywhere
//      paints message + file + line into the same banner.
//   3. Script 404s (resource load failures) are shown too.
//   4. Post-load self-test names any missing core object
//      (SLF / SLFBoard / SLFBoard.render / BOSCRM) together
//      with the file that owns it.
//   Manifest and parse gate unchanged.
// ============================================================
(function () {
  'use strict';
  var VERSION = '3.40';
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

  // ---------- v3.40: the visible failure banner ----------
  function banner(text) {
    try {
      var b = document.getElementById('slf-error-banner');
      if (!b) {
        b = document.createElement('div');
        b.id = 'slf-error-banner';
        b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;' +
          'background:#7a1f1f;color:#FFFFFF;padding:10px 14px;font:12.5px/1.5 monospace;' +
          'border-bottom:2px solid #FF8A5C;white-space:pre-wrap;max-height:40%;overflow:auto;';
        (document.body || document.documentElement).insertBefore(b, (document.body || document.documentElement).firstChild);
      }
      b.appendChild(document.createTextNode(text + '\n'));
    } catch (e) { /* the banner must never itself break the page */ }
  }
  window.__SLF_BANNER = banner;

  // Any runtime error, anywhere, becomes visible text.
  window.addEventListener('error', function (e) {
    try {
      if (e && e.target && e.target.tagName === 'SCRIPT') {
        banner('FAILED TO LOAD SCRIPT: ' + (e.target.src || '(no src)'));
        return;
      }
      banner('RUNTIME ERROR: ' + (e.message || 'unknown error') +
        (e.filename ? '   [' + e.filename + ':' + (e.lineno || '?') + ']' : ''));
    } catch (err) {}
  }, true);

  // Post-load self-test: name exactly which core object is missing
  // and which file owns it, so a dead page explains itself.
  function selfTest() {
    try {
      if (failures.length) banner('MODULES BLOCKED BY GUARD: ' + failures.join('  |  '));
      var missing = [];
      if (!window.SLF) missing.push('SLF (from slf-app.js)');
      if (!window.SLFBoard) missing.push('SLFBoard (from slf-board-base.js)');
      else if (typeof SLFBoard.render !== 'function') missing.push('SLFBoard.render (from slf-board-main.js)');
      if (!window.BOSCRM) missing.push('BOSCRM top-tab bar (from slf-bos-nav-final.js)');
      if (missing.length) banner('MISSING AFTER LOAD: ' + missing.join('  |  '));
    } catch (e) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(selfTest, 0); });
  } else {
    setTimeout(selfTest, 0);
  }
})();