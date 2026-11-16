// ============================================================
// BOS Two-Factor Authentication — email 6-digit PIN — v1.5
// Owner order (2026-11-16): every login must also enter a fresh
// 6-digit PIN emailed to the user, so a stolen password alone
// can never get anyone in. The SUPER ADMIN (owner) is exempt:
// they can log in at any time, from any device, with no PIN.
// PIN expires after 2 MINUTES. Three wrong attempts block the
// login.
//
// v1.5 FIXES (frozen pending challenge blocked later logins):
//  1. EXPIRY CHECK IN getPending(): a pending challenge whose
//     2-minute clock has run out is deleted and treated as
//     gone. Previously a stale pending record survived page
//     reloads and made every later login for that account hit
//     the "already pending" branch — silently skipping the
//     overlay AND the email. This is the freeze the owner hit.
//  2. OVERLAY REBUILD: if a valid challenge is pending but the
//     overlay element is missing (e.g. the page was reloaded
//     mid-challenge), the watcher rebuilds and shows it — the
//     user is never left signed-out with an invisible challenge.
//  3. window.BOS2FA.version now reports '1.5' so the live
//     version is verifiable from the browser console.
//
// v1.4 FIXES (kept): session discovery + normalization (the
// challenge fires whatever storage shape the CRM writes),
// case-insensitive superadmin check with account-list fallback,
// superadmin toast, missing-backend/missing-email warnings.
// ============================================================
(function () {
  'use strict';

  // Embedded in the shell's iframe? The shell (index.html) runs 2FA.
  try { if (window.self !== window.top) return; } catch (e) { return; }

  var VERSION = '1.5';
  var SESSION_KEY = 'aetherion_user';
  var USERS_KEY = 'aetherion_users';
  var PENDING_KEY = 'aetherion_2fa_pending';
  var VERIFIED_KEY = 'aetherion_2fa_verified';
  var SYNC_URL_KEY = 'aetherion_sync_url';
  var PIN_TTL_MS = 2 * 60 * 1000;          // owner order: 2 minutes
  var VERIFIED_TTL_MS = 12 * 60 * 60 * 1000;
  var MAX_ATTEMPTS = 3;                    // owner order: 3 wrong attempts block

  function ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  function readUsers() {
    try {
      var arr = JSON.parse(ls(USERS_KEY) || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function hasBackend() { return !!(ls(SYNC_URL_KEY) || '').trim(); }

  // ---- session discovery ----
  // Primary: 'aetherion_user'. Fallback: any storage key holding
  // a JSON object whose username matches a real account.
  function rawSession() {
    var s = null;
    try { s = JSON.parse(ls(SESSION_KEY) || 'null'); } catch (e) { s = null; }
    if (s && typeof s === 'object' && !Array.isArray(s) &&
        typeof s.username === 'string' && s.username) {
      return { key: SESSION_KEY, obj: s };
    }
    var skip = {};
    skip[SESSION_KEY] = 1; skip[USERS_KEY] = 1;
    skip[PENDING_KEY] = 1; skip[VERIFIED_KEY] = 1;
    try {
      var users = readUsers();
      var names = {};
      for (var i = 0; i < users.length; i++) {
        if (users[i] && users[i].username) names[users[i].username] = true;
      }
      for (var j = 0; j < localStorage.length; j++) {
        var k = localStorage.key(j);
        if (!k || skip[k]) continue;
        var v = null;
        try { v = JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { continue; }
        if (!v || typeof v !== 'object' || Array.isArray(v)) continue;
        if (typeof v.username !== 'string' || !v.username || !names[v.username]) continue;
        if (v.role !== undefined || v.id !== undefined || v.name !== undefined ||
            v.loginAt !== undefined || v.timestamp !== undefined || v.expiresAt !== undefined) {
          return { key: k, obj: v };
        }
      }
    } catch (e) { /* storage blocked */ }
    return null;
  }

  // ---- session normalization ----
  function normalizeSession(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var s = {
      id: (raw.id !== undefined && raw.id !== null) ? String(raw.id) : null,
      username: (typeof raw.username === 'string') ? raw.username : null,
      role: (typeof raw.role === 'string' && raw.role) ? raw.role : null
    };
    if (!s.username) return null;
    var users = readUsers();
    for (var i = 0; i < users.length; i++) {
      var u = users[i];
      if (u && typeof u === 'object' && u.username === s.username) {
        if (!s.id && u.id !== undefined && u.id !== null) s.id = String(u.id);
        if (!s.role && typeof u.role === 'string' && u.role) s.role = u.role;
        break;
      }
    }
    if (!s.id) s.id = 'u:' + s.username; // stable fallback id
    return s;
  }

  function isSuperAdmin(s) {
    var r = String((s && s.role) || '').toLowerCase().replace(/[\s_-]/g, '');
    return r === 'superadmin';
  }

  // ---- pending challenge (v1.5: expiry checked here) ----
  function getPending() {
    var p = null;
    try { p = JSON.parse(ls(PENDING_KEY) || 'null'); } catch (e) { return null; }
    if (!p || !p.session || !p.session.id) { lsDel(PENDING_KEY); return null; }
    if (typeof p.exp === 'number' && Date.now() > p.exp) {
      // v1.5: expired challenge is dead — clear it so a fresh
      // login gets a fresh PIN instead of a frozen no-op.
      lsDel(PENDING_KEY);
      return null;
    }
    return p;
  }

  function isVerified(id) {
    try {
      var v = JSON.parse(ls(VERIFIED_KEY) || 'null');
      return !!(v && v.id === id && Date.now() < v.exp);
    } catch (e) { return false; }
  }

  function findUserEmail(s) {
    var users = readUsers();
    for (var i = 0; i < users.length; i++) {
      var u = users[i];
      if (!u || typeof u !== 'object') continue;
      if (String(u.id) === String(s.id)) return u.email || null;
      if (String(s.id).indexOf('u:') === 0 && u.username === s.username) return u.email || null;
      if (u.username === s.username) return u.email || null;
    }
    return null;
  }

  // ---- email the PIN through the sync backend ----
  function sendPinEmail(email, pin, username) {
    var url = (ls(SYNC_URL_KEY) || '').trim();
    if (!url) return; // overlay explains this case
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
      '<div id="bos-2fa-hint" style="font-size:11px;color:#A8B8C8;margin-top:14px;line-height:1.5;">Didn\'t get the email? Check spam, or press Resend. Codes expire in 2 minutes.</div>' +
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
    var errEl = document.getElementById('bos-2fa-error');
    emailEl.textContent = 'A 6-digit code was sent to ' + (pending.email ? maskEmail(pending.email) : 'your email') + '. Enter it to finish signing in as ' + pending.session.username + '.';
    errEl.textContent = '';
    if (!pending.email) {
      errEl.textContent = 'No email address is on file for this account — contact your administrator.';
    } else if (!hasBackend()) {
      errEl.textContent = 'PIN email NOT sent: no CloudSync backend URL is configured on this device. Set it in Settings → CloudSync, then press Resend.';
    }
    document.getElementById('bos-2fa-input').value = '';
    document.getElementById('bos-2fa-input').focus();
  }

  function hideOverlay() {
    var el = document.getElementById('bos-2fa-overlay');
    if (el && el.parentNode) el.parentNode.removeChild(el);
    overlay = null;
  }

  // ---- toast: no more silent skips ----
  function toast(msg) {
    var t = document.getElementById('bos-2fa-toast');
    if (t) return;
    t = document.createElement('div');
    t.id = 'bos-2fa-toast';
    t.style.cssText = 'position:fixed;bottom:18px;right:18px;z-index:100000;background:#0A1628;border:1px solid rgba(201,168,76,0.45);color:#F0EAD6;font-family:Inter,sans-serif;font-size:12px;padding:10px 14px;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.5);max-width:340px;line-height:1.5;';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () {
      var el = document.getElementById('bos-2fa-toast');
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }, 6000);
  }

  // ---- challenge lifecycle ----
  function startChallenge(s, found) {
    var email = findUserEmail(s);
    var pin = String(Math.floor(100000 + Math.random() * 900000));
    var pending = {
      session: s,
      sessionRaw: found.obj,
      sessionKey: found.key,
      email: email,
      pin: pin,
      exp: Date.now() + PIN_TTL_MS,
      attempts: 0
    };
    lsSet(PENDING_KEY, JSON.stringify(pending));
    try { localStorage.removeItem(found.key || SESSION_KEY); } catch (e) {}
    if (email) sendPinEmail(email, pin, s.username);
    showOverlay(pending);
  }

  function resendPin() {
    var p = getPending();
    if (!p) { hideOverlay(); return; }
    p.pin = String(Math.floor(100000 + Math.random() * 900000));
    p.exp = Date.now() + PIN_TTL_MS;
    p.attempts = 0;
    lsSet(PENDING_KEY, JSON.stringify(p));
    var errEl = document.getElementById('bos-2fa-error');
    if (p.email && hasBackend()) {
      sendPinEmail(p.email, p.pin, p.session.username);
      errEl.textContent = '';
    } else if (!p.email) {
      errEl.textContent = 'No email address is on file for this account — contact your administrator.';
    } else {
      errEl.textContent = 'PIN email NOT sent: no CloudSync backend URL is configured on this device. Set it in Settings → CloudSync, then press Resend.';
    }
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
    if (!hasBackend()) { errEl.textContent = 'PIN was never emailed: configure the CloudSync backend URL, then press Resend.'; return; }
    if (input.trim() !== String(p.pin)) {
      p.attempts = (p.attempts || 0) + 1;
      lsSet(PENDING_KEY, JSON.stringify(p));
      if (p.attempts >= MAX_ATTEMPTS) {
        lsDel(PENDING_KEY);
        errEl.textContent = 'Too many wrong codes. Login blocked — sign in again.';
        setTimeout(function () { hideOverlay(); }, 1600);
        return;
      }
      errEl.textContent = 'Wrong code. ' + (MAX_ATTEMPTS - p.attempts) + ' attempts left.';
      return;
    }
    lsSet(VERIFIED_KEY, JSON.stringify({ id: p.session.id, exp: Date.now() + VERIFIED_TTL_MS }));
    // Restore the ORIGINAL sign-in record exactly as the CRM wrote it.
    lsSet(p.sessionKey || SESSION_KEY, JSON.stringify(p.sessionRaw || p.session));
    lsDel(PENDING_KEY);
    hideOverlay();
    var frame = document.getElementById('bos-frame');
    if (frame) {
      try { frame.contentWindow.location.reload(); } catch (e) { frame.src = frame.src; }
    } else {
      window.location.reload();
    }
  }

  // ---- watcher ----
  var lastSuperadminId = null;
  function tick() {
    var found = rawSession();
    var s = found ? normalizeSession(found.obj) : null;
    if (!s) {
      // Signed out (or held back): verified state is void.
      lsDel(VERIFIED_KEY);
      return;
    }
    if (isSuperAdmin(s)) {
      lsDel(PENDING_KEY);
      hideOverlay();
      if (lastSuperadminId !== s.id) {
        lastSuperadminId = s.id;
        toast('Signed in as superadmin — PIN step is skipped (owner rule). If you expected a PIN code, this account is superadmin.');
      }
      return;
    }
    if (isVerified(s.id)) { lsDel(PENDING_KEY); hideOverlay(); return; }
    var p = getPending();
    if (p && p.session && p.session.id === s.id) {
      // v1.5: challenge valid but overlay missing (page was
      // reloaded mid-challenge) — rebuild it so the user can
      // actually finish signing in.
      if (!document.getElementById('bos-2fa-overlay')) showOverlay(p);
      return;
    }
    startChallenge(s, found);
  }

  setInterval(tick, 500);
  tick();
  window.BOS2FA = { version: VERSION };
})();
