// ============================================================
// BOS Session Gate — protects pages that live OUTSIDE the CRM
// shell (e.g. slf/index.html). If there is no signed-in user
// session, the page is replaced with a sign-in notice and the
// user is redirected to the main BOS entrance, where the
// login + 2FA flow runs. Closes the "open by URL without
// logging in" hole on the Student Loans pages.
// ============================================================
(function () {
  'use strict';

  var SESSION_KEY = 'aetherion_user';
  var PENDING_KEY = 'aetherion_2fa_pending';

  function getSession() {
    try {
      var s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      return (s && s.id) ? s : null;
    } catch (e) { return null; }
  }

  // The 2FA module holds the session back while a PIN challenge
  // is pending (session removed, pending challenge stored). A
  // pending challenge means the user is mid-verification — the
  // CRM gate is intentionally showing. This gate must NOT block
  // navigation to the main page in that state, and must NOT treat
  // the held-back state as "signed in" either.
  function challengePending() {
    try {
      var p = JSON.parse(localStorage.getItem(PENDING_KEY) || 'null');
      return !!(p && p.session && p.session.id);
    } catch (e) { return false; }
  }

  var s = getSession();

  if (s) {
    // Signed in (and 2FA, if any, already completed on this device).
    return;
  }
  if (challengePending()) {
    // Mid-2FA on the main page: let them go back there to finish.
    window.location.replace('../index.html');
    return;
  }

  // Not signed in at all: block this page and send to the entrance.
  document.documentElement.innerHTML = '<head><meta charset="UTF-8" /><title>Sign in required</title></head>' +
    '<body style="margin:0;background:#070F1C;color:#F0EAD6;font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;">' +
    '<div style="max-width:400px;padding:40px;">' +
    '<div style="width:56px;height:56px;margin:0 auto 16px;border-radius:50%;background:rgba(201,168,76,0.15);border:1px solid rgba(201,168,76,0.4);display:flex;align-items:center;justify-content:center;font-size:24px;color:#C9A84C;">&#128274;</div>' +
    '<div style="font-family:Cinzel,serif;font-size:20px;color:#C9A84C;letter-spacing:1px;margin-bottom:10px;">Sign in required</div>' +
    '<div style="font-size:13px;color:#A8B8C8;line-height:1.6;margin-bottom:24px;">You must sign in to the BOS to view this area. Taking you to the sign-in page…</div>' +
    '<a href="../index.html" style="display:inline-block;padding:10px 20px;border-radius:8px;border:1px solid rgba(201,168,76,0.45);background:rgba(201,168,76,0.15);color:#C9A84C;text-decoration:none;font-size:13px;font-weight:600;">Go to sign-in page</a>' +
    '</div></body>';
  window.setTimeout(function () { window.location.replace('../index.html'); }, 2500);
})();
