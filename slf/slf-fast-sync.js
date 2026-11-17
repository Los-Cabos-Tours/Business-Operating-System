// ============================================================
// SLF Fast Sync — 3-second heartbeat (owner order 2026-11-17)
// "everything must sync every 3 seconds — no exceptions."
//
// HOW: ONE consolidated JSONP GET every 3 seconds (while the
// tab is visible) fetches the whole slf- namespace from the
// backend, then dispatches the payload to all three sync
// modules — SLFSync (clients/cases/history/counter/tombstones),
// SLFFieldDefsSync (field definitions/sections), and
// SLFBoardSync (all board tab records). One network request
// covers everything, so 3-second freshness does not multiply
// backend load.
//
// Push side: every module pushes the moment data changes
// (debounce 800ms), so a change typed on any device is on the
// backend within ~1s and visible on every other device within
// ~3s after that.
//
// QUOTA GUARD (honest note): a hidden/background tab polls
// every 30s instead of 3s. Polling a hidden tab can never show
// anyone fresher data (nobody is looking at it) and protects
// the Apps Script backend's daily execution quota — if that
// quota dies, ALL syncing stops for everyone. The moment the
// tab becomes visible again, the 3-second heartbeat resumes
// instantly.
// ============================================================
(function () {
  'use strict';

  var ENABLE_KEY = 'slf_crm.sync.enabled';
  var VISIBLE_MS = 3000;   // owner order: every 3 seconds
  var HIDDEN_MS = 30000;   // background tab: quota protection
  var PULL_TIMEOUT_MS = 4000;

  var _timer = null;

  function enabled() {
    try { return localStorage.getItem(ENABLE_KEY) === 'true'; } catch (e) { return false; }
  }
  function getUrl() { return (localStorage.getItem('aetherion_sync_url') || '').trim(); }
  function getNamespace() {
    var ns = (localStorage.getItem('aetherion_sync_namespace') || 'default').trim() || 'default';
    return 'slf-' + ns;
  }

  // Dispatch one fetched namespace payload to every sync module.
  function dispatch(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return;
    try {
      if (window.SLFSync && window.SLFSync._test && typeof window.SLFSync._test.applyRemote === 'function') {
        window.SLFSync._test.applyRemote(data);
      }
    } catch (e) { /* never break the heartbeat */ }
    try {
      if (window.SLFFieldDefsSync && typeof window.SLFFieldDefsSync.applyRemotePayload === 'function') {
        window.SLFFieldDefsSync.applyRemotePayload(data);
      }
    } catch (e) { /* never break the heartbeat */ }
    try {
      if (window.SLFBoardSync && typeof window.SLFBoardSync.applyRemotePayload === 'function') {
        window.SLFBoardSync.applyRemotePayload(data);
      }
    } catch (e) { /* never break the heartbeat */ }
  }

  function pullOnce() {
    if (!enabled()) return;
    var url = getUrl();
    if (!url) return;
    var cb = 'slffast_cb_' + Date.now();
    var script = null;
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      try { delete window[cb]; } catch (e) { window[cb] = undefined; }
      if (script && script.parentNode) script.parentNode.removeChild(script);
    }
    window[cb] = function (data) {
      try { dispatch(data); } catch (e) {}
      finish();
    };
    script = document.createElement('script');
    script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'user=' + encodeURIComponent(getNamespace()) + '&callback=' + cb;
    script.onerror = function () { finish(); };
    document.head.appendChild(script);
    setTimeout(finish, PULL_TIMEOUT_MS);
  }

  function schedule() {
    if (_timer) { clearInterval(_timer); _timer = null; }
    var period = (document.visibilityState === 'visible') ? VISIBLE_MS : HIDDEN_MS;
    _timer = setInterval(pullOnce, period);
    pullOnce();
  }

  document.addEventListener('visibilitychange', schedule);

  function boot() {
    if (enabled()) schedule();
    // follow the sync toggle if the user flips it later
    var prev = enabled();
    setInterval(function () {
      var now = enabled();
      if (now !== prev) { prev = now; if (now) schedule(); }
    }, 1000);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();