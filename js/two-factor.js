// ============================================================
// BOS Two-Factor Authentication — email 6-digit PIN — v1
// Owner order (2026-11-16): every login must also enter a fresh
// 6-digit PIN emailed to the user, so a stolen password alone
// can never get anyone in. The SUPER ADMIN (owner) is exempt:
// they can log in at any time, from any device, with no PIN.
//
// HOW IT WORKS (parent page, same-origin with the CRM frame):
//  1. Watch for a fresh sign-in (aetherion_user session).
//  2. If the account is superadmin -> allowed immediately.
//  3. Otherwise: the session is held back, a 6-digit PIN is
//     generated, and the configured sync backend is asked to
//     email it to the user's address on file (aetherion_users).
//     The CRM's own login gate re-engages behind the overlay,
//     so the session cannot be used while the PIN is pending.
//  4. User types the PIN. Correct -> session restored, this
//     device is verified for that account. Wrong 5 times ->
//     challenge voided, sign in again.
//  5. Every NEW sign-in requires a new PIN (verified state is
//     cleared on sign-out). PINs expire after 10 minutes.
//
// EMAIL DELIVERY: the sync backend (Apps Script) must include
// the email handler (see repo docs). Without it, no email can
// be sent — the overlay says so plainly.
//
// SECURITY NOTES, stated honestly:
//  - The PIN is verified on this device. This stops a leaked
//    password being used on ANOTHER computer — the attacker's
//    device never receives the PIN email. It cannot stop an
//    attacker who physically uses this same browser profile.
//  - Superadmin exemption is intentional (owner order).
// ============================================================
(function () {
  'use strict';

  var SESSION_KEY = 'aetherion_user';
  var PENDING_KEY = 'aetherion_2fa_pending';
  var VERIFIED_KEY = 'aetherion_2fa_verified';
  var PIN_TTL_MS = 10 * 60 * 1000;
  var VERIFIED_TTL_MS = 12 * 60 * 60 * 1000;
  var MAX_ATTEMPTS = 5;

  function ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  function getSession() {
    try { var s = JSON.parse(ls(SESSION_KEY) || 'null'); return (s && s.id) ? s : null; } catch (e) { return null; }
  }
  function getPending() {
    try { var p = JSON.parse(ls(PENDING_KEY) || 'null'); return (p && p.session && p.session.id) ? p : null; } catch (e) { return null; }
  }
  function isVerified(id) {
    try {
      var v = JSON.parse(ls(VERIFIED_KEY) || 'null');
      return !!(v && v.id === id && Date.now() < v.exp);
    } catch (e) { return false; }
  }
  function findUserEmail(id) {
    try {
      var arr = JSON.parse(ls('aetherion_users') || '[]');
      if (!Array.isArray(arr)) return null;
      for (var i = 0; i < arr.length; i++) {
        if (arr[i] && arr[i].id === id) return arr[i].email || null;
      }
      return null;
    } catch (e) { return null; }
  }

  // ---- email the PIN through the sync backend ----
  function sendPinEmail(email, pin, username) {
    var url = (ls('aetherion_sync_url') || '').trim();
    if (!url) return;
    var payload = {
      type: 'bos_2fa_pin',
      email: email,
      pin: String(pin),
      username: username,
      ts: Date.now()
    };
    try {
      fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(payload) })
        .catch(function () {});
    } catch (e) {}
  }

  // ---- overlay UI ----
  var overlay = null;
  function buildOverlay() {
    if (document.getElementById('bos-2fa-overlay')) return;
    overlay = document.createElement('div');
    overlay.id = 'bos-2fa-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(7,15,28,0.97);display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;';
    overlay.innerHTML =
      '<div style="background:#0A1628;border:1px solid rgba(201,168,76,0.3);border-radius:14px;padding:36px 38px;width:100%;max-width:380px;text-align:center;box-shadow:0 24px 80px rgba(0,0,0,0.6);">' +
      '<div style="width:52px;height:52px;margin:0 auto 14px;border-radius:50%;background:rgba(201,168,76,0.15);border:1px solid rgba(201,168,76,0.4);display:flex;align-items:center;justify-content:center;font-size:22px;color:#C9A84C;">&#128273;</div>' +
      '<div style="font-family:Cinzel,serif;font-size:17px;color:#C9A84C;letter-spacing:1px;margin-bottom:6px;">Verification Required</div>' +
      '<div id="bos-2fa-email" style="font-size:12px;color:#A8B8C8;margin-bottom:18px;line-height:1.5;"></div>' +
      '<input id="bos-2fa-input" inputmode="numeric" maxlength="6" placeholder="6-digit code" style="width:100%;box-sizing:border-box;padding:11px 12px;font-size:18px;letter-spacing:6px;text-align:center;background:rgba(10,22,40,0.6);border:1px solid rgba(201,168,76,0.2);border-radius:8px;color:#F0EAD6;outline:none;" />' +
      '<div id="bos-2fa-error" style="font-size:11px;color:#FF6B6B;margin-top:8px;min-height:14px;"></div>' +
      '<button id="bos-2fa-verify" style="width:100%;margin-top:10px;padding:10px;border-radius:8px;border:1px solid rgba(201,168,76,0.45);background:rgba(201,168,76,0.15);color:#C9A84C;font-size:13px;font-weight:600;cursor:pointer;">Verify &amp; Sign In</button>' +
      '<div id="bos-2fa-hint" style="font-size:11px;color:#A8B8C8;margin-top:14px;line-height:1.5;">Didn\'t get the email? Check spam, or press Resend. Codes expire in 10 minutes.</div>' +
      '<div style="display:flex;gap:8px;margin-top:10px;">' +
      '<button id="bos-2fa-resend" style="flex:1;padding:8px;border-radius:8px;border:1px solid rgba(240,234,214,0.2);background:transparent;color:#A8B8C8;font-size:11px;cursor:pointer;">Resend code</button>' +
      '<button id="bos-2fa-cancel" style="flex:1;padding:8px;border-radius:8px;border:1px solid rgba(240,234,214,0.2);background:transparent;color:#A8B8C8;font-size:11px;cursor:pointer;">Cancel</button>' +
      '</div></div>';
    document.body.appendChild(overlay);
    document.getElementById('bos-2fa-verify').addEventListener('click', function () { verifyPin(); });
    document.getElementById('bos-2fa-resend').addEventListener('click', function () { resendPin(); });
    document.getElementById('bos-2fa-cancel').addEventListener('click', function () { cancelChallenge(); });
    document.getElementById('bos-2fa-input').addEventListener('keydown', function (e) { if (e.key === 'Enter') verifyPin(); });
  }

  function maskEmail(email) {
    var at = email.indexOf('@');
    if (at < 1) return email;
    var name = email.substring(0, at);
    var shown = name.substring(0, 2) + '****';
    return shown + email.substring(at);
  }

  function showOverlay(pending) {
    buildOverlay();
    var emailEl = document.getElementById('bos-2fa-email');
    emailEl.textContent = 'A 6-digit code was sent to ' + (pending.email ? maskEmail(pending.email) : 'your email') + '. Enter it to finish signing in as ' + pending.session.username + '.';
    document.getElementById('bos-2fa-error').textContent = pending.email ? '' : 'No email address is on file for this account — contact your administrator.';
    document.getElementById('bos-2fa-input').value = '';
    document.getElementById('bos-2fa-input').focus();
  }

  function hideOverlay() {
    var el = document.getElementById('bos-2fa-overlay');
    if (el && el.parentNode) el.parentNode.removeChild(el);
    overlay = null;
  }

  // ---- challenge lifecycle ----
  function startChallenge(session) {
    var email = findUserEmail(session.id);
    var pin = String(Math.floor(100000 + Math.random() * 900000));
    var pending = {
      session: session,
      email: email,
      pin: pin,
      exp: Date.now() + PIN_TTL_MS,
      attempts: 0
    };
    lsSet(PENDING_KEY, JSON.stringify(pending));
    lsDel(SESSION_KEY);
    if (email) sendPinEmail(email, pin, session.username);
    showOverlay(pending);
  }

  function resendPin() {
    var p = getPending();
    if (!p) { hideOverlay(); return; }
    p.pin = String(Math.floor(100000 + Math.random() * 900000));
    p.exp = Date.now() + PIN_TTL_MS;
    p.attempts = 0;
    lsSet(PENDING_KEY, JSON.stringify(p));
    if (p.email) sendPinEmail(p.email, p.pin, p.session.username);
    document.getElementById('bos-2fa-error').textContent = '';
    document.getElementById('bos-2fa-input').focus();
  }

  function cancelChallenge() {
    lsDel(PENDING_KEY);
    hideOverlay();
  }

  function verifyPin() {
    var p = getPending();
    var input = (document.getElementById('bos-2fa-input') || {}).value || '';
    var errEl = document.getElementById('bos-2fa-error');
    if (!p) { hideOverlay(); return; }
    if (Date.now() > p.exp) { errEl.textContent = 'Code expired — press Resend.'; return; }
    if (!p.email) { errEl.textContent = 'No email on file — contact your administrator.'; return; }
    if (input.trim() !== String(p.pin)) {
      p.attempts = (p.attempts || 0) + 1;
      lsSet(PENDING_KEY, JSON.stringify(p));
      if (p.attempts >= MAX_ATTEMPTS) {
        lsDel(PENDING_KEY);
        errEl.textContent = 'Too many wrong codes. Sign in again.';
        setTimeout(function () { hideOverlay(); }, 1600);
        return;
      }
      errEl.textContent = 'Wrong code. ' + (MAX_ATTEMPTS - p.attempts) + ' attempts left.';
      return;
    }
    lsSet(VERIFIED_KEY, JSON.stringify({ id: p.session.id, exp: Date.now() + VERIFIED_TTL_MS }));
    lsSet(SESSION_KEY, JSON.stringify(p.session));
    lsDel(PENDING_KEY);
    hideOverlay();
    var frame = document.getElementById('bos-frame');
    try { if (frame) frame.contentWindow.location.reload(); } catch (e) { if (frame) frame.src = frame.src; }
  }

  // ---- watcher ----
  function tick() {
    var s = getSession();
    if (!s) {
      // Signed out (or held back): verified state is void — every
      // NEW sign-in must earn a fresh PIN. Never clear a pending
      // challenge here (the CRM gate is intentionally showing
      // behind it).
      lsDel(VERIFIED_KEY);
      return;
    }
    if (s.role === 'superadmin') {
      lsDel(PENDING_KEY);
      hideOverlay();
      return;
    }
    if (isVerified(s.id)) { lsDel(PENDING_KEY); hideOverlay(); return; }
    if (getPending() && getPending().session.id === s.id) return;
    startChallenge(s);
  }

  setInterval(tick, 500);
  tick();
})();
