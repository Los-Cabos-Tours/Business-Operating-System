// ============================================================
// BOS Two-Factor Authentication — email 6-digit PIN — v1.9
// Owner order (2026-11-16): every login must also enter a fresh
// 6-digit PIN emailed to the user. SUPER ADMIN is exempt.
// PIN expires after 2 MINUTES. Three wrong attempts block.
//
// v1.9 (owner order: "why would you send the pin to the old
// dead backend"):
//  1. NEVER SEND TO THE DEAD BACKEND. If the configured CloudSync
//     URL is the old one (account lost, can never send email),
//     the PIN is NOT sent there. Refused.
//  2. URL FIELD ON THE PIN BOX. When the backend is missing or
//     dead, the PIN box shows an input where the new /exec URL
//     can be pasted directly. "Save URL & Send PIN" writes it to
//     aetherion_sync_url (the same key the CRM's CloudSync
//     settings read) and fires the PIN immediately.
//  3. Kept: one backend only; Cancel = full sign-out + reload;
//     resend = fresh code + fresh clock; verify reports attempts;
//     expired challenges auto-clear.
// ============================================================
(function () {
  'use strict';

  try { if (window.self !== window.top) return; } catch (e) { return; }

  var VERSION = '1.9';
  var SESSION_KEY = 'aetherion_user';
  var USERS_KEY = 'aetherion_users';
  var PENDING_KEY = 'aetherion_2fa_pending';
  var VERIFIED_KEY = 'aetherion_2fa_verified';
  var SYNC_URL_KEY = 'aetherion_sync_url';
  var PIN_TTL_MS = 2 * 60 * 1000;
  var VERIFIED_TTL_MS = 12 * 60 * 60 * 1000;
  var MAX_ATTEMPTS = 3;

  var OLD_BACKEND_ID = 'AKfycbwnKUCCXJrgkzLU1z665lDnnU1B6voYeuvdU9INNmWfXgeHPsJAapGUNR9yEafoLlJY';
  var SCRIPT_URL_RE = /^https:\/\/script\.google[a-z.]*\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec/;

  function ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  function readUsers() {
    try {
      var arr = JSON.parse(ls(USERS_KEY) || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function getSyncUrl() { return (ls(SYNC_URL_KEY) || '').trim(); }
  function isOldBackend(url) {
    return !!url && url.indexOf(OLD_BACKEND_ID) !== -1;
  }
  function backendState() {
    var url = getSyncUrl();
    if (!url) return { ok: false, url: '', dead: false, missing: true };
    if (isOldBackend(url)) return { ok: false, url: url, dead: true, missing: false };
    if (!SCRIPT_URL_RE.test(url)) return { ok: false, url: url, dead: false, missing: false };
    return { ok: true, url: url, dead: false, missing: false };
  }

  function setStatus(msg) {
    var el = document.getElementById('bos-2fa-status');
    if (el) el.textContent = msg;
  }

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
    } catch (e) {}
    return null;
  }

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
    if (!s.id) s.id = 'u:' + s.username;
    return s;
  }

  function isSuperAdmin(s) {
    var r = String((s && s.role) || '').toLowerCase().replace(/[\s_-]/g, '');
    return r === 'superadmin';
  }

  function getPending() {
    var p = null;
    try { p = JSON.parse(ls(PENDING_KEY) || 'null'); } catch (e) { return null; }
    if (!p || !p.session || !p.session.id) { lsDel(PENDING_KEY); return null; }
    if (typeof p.exp === 'number' && Date.now() > p.exp) {
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

  function sendPinEmail(email, pin, username) {
    var st = backendState();
    if (!st.ok) {
      if (st.dead) return { sent: false, url: st.url, dead: true, error: 'the configured backend is the OLD DEAD one — send REFUSED' };
      if (st.missing) return { sent: false, url: '', dead: false, error: 'no CloudSync backend URL is configured on this device' };
      return { sent: false, url: st.url, dead: false, error: 'the configured URL is not a valid Apps Script /exec URL' };
    }
    var payload = {
      type: 'bos_2fa_pin',
      email: email,
      pin: String(pin),
      username: username,
      ts: Date.now()
    };
    try {
      fetch(st.url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(payload) })
        .catch(function () {});
      return { sent: true, url: st.url, dead: false, error: '' };
    } catch (e) {
      return { sent: false, url: st.url, dead: false, error: String(e && e.message || e) };
    }
  }

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
      '</div>' +
      '<div id="bos-2fa-urlrow" style="display:none;margin-top:14px;text-align:left;">' +
      '<div style="font-size:11px;color:#FF6B6B;margin-bottom:6px;" id="bos-2fa-urlrow-reason"></div>' +
      '<input id="bos-2fa-url" type="url" placeholder="Paste your NEW Apps Script /exec URL here" style="width:100%;box-sizing:border-box;padding:9px 10px;font-size:11px;background:rgba(10,22,40,0.6);border:1px solid rgba(201,168,76,0.2);border-radius:8px;color:#F0EAD6;outline:none;" />' +
      '<button id="bos-2fa-urlsend" style="width:100%;margin-top:6px;padding:8px;border-radius:8px;border:1px solid rgba(201,168,76,0.45);background:rgba(201,168,76,0.15);color:#C9A84C;font-size:11px;font-weight:600;cursor:pointer;">Save URL &amp; Send PIN to this URL</button>' +
      '</div>' +
      '<div id="bos-2fa-status" style="font-size:10px;color:#7A8B9C;margin-top:14px;word-break:break-all;line-height:1.5;text-align:left;"></div>' +
      '</div>';
    document.body.appendChild(overlay);
    document.getElementById('bos-2fa-verify').addEventListener('click', function () { verifyPin(); });
    document.getElementById('bos-2fa-resend').addEventListener('click', function () { resendPin(); });
    document.getElementById('bos-2fa-cancel').addEventListener('click', function () { cancelChallenge(); });
    document.getElementById('bos-2fa-input').addEventListener('keydown', function (e) { if (e.key === 'Enter') verifyPin(); });
    document.getElementById('bos-2fa-urlsend').addEventListener('click', function () { saveUrlAndSend(); });
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
    }
    document.getElementById('bos-2fa-input').value = '';
    document.getElementById('bos-2fa-input').focus();
  }

  function refreshUrlRow() {
    var row = document.getElementById('bos-2fa-urlrow');
    var reason = document.getElementById('bos-2fa-urlrow-reason');
    if (!row) return;
    var st = backendState();
    if (st.ok) { row.style.display = 'none'; return; }
    row.style.display = 'block';
    if (st.dead) {
      reason.textContent = 'The configured backend is the OLD DEAD one. Paste your NEW /exec URL below — it will be saved as the system backend and the PIN sent there immediately.';
    } else if (st.missing) {
      reason.textContent = 'No backend URL is configured. Paste your NEW /exec URL below — it will be saved as the system backend and the PIN sent there immediately.';
    } else {
      reason.textContent = 'The configured URL is not a valid Apps Script /exec URL. Paste the correct one below.';
    }
  }

  function saveUrlAndSend() {
    var p = getPending();
    if (!p) { hideOverlay(); return; }
    var urlEl = document.getElementById('bos-2fa-url');
    var url = ((urlEl && urlEl.value) || '').trim();
    if (!SCRIPT_URL_RE.test(url)) {
      setStatus('That does not look like an Apps Script /exec URL. It must start with https://script.google.com/ and end with /exec.');
      return;
    }
    if (isOldBackend(url)) {
      setStatus('That is the OLD DEAD backend URL — it can never email you. Paste the NEW one from your NEW Google account.');
      return;
    }
    lsSet(SYNC_URL_KEY, url);
    var r = sendPinEmail(p.email, p.pin, p.session.username);
    if (r.sent) {
      setStatus('URL SAVED and PIN sent to the new backend:\n' + url + '\nCheck ' + (p.email ? maskEmail(p.email) : 'your email') + ' (and spam).');
      refreshUrlRow();
    } else {
      setStatus('URL SAVED, but PIN send failed: ' + r.error);
    }
  }

  function hideOverlay() {
    var el = document.getElementById('bos-2fa-overlay');
    if (el && el.parentNode) el.parentNode.removeChild(el);
    overlay = null;
  }

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
    showOverlay(pending);
    refreshUrlRow();
    if (email) {
      var r = sendPinEmail(email, pin, s.username);
      if (r.sent) {
        setStatus('PIN request SENT to the one backend:\n' + r.url + '\nCheck that address (and spam) — code expires in 2 minutes.');
      } else if (r.dead) {
        setStatus('PIN NOT SENT — REFUSED. The configured backend is the OLD DEAD one:\n' + r.url + '\nPaste your NEW /exec URL in the box below and press Save URL & Send.');
      } else {
        setStatus('PIN request NOT SENT — ' + r.error + '.\nIf you have a new URL, paste it in the box below.');
      }
    } else {
      setStatus('PIN NOT SENT — no email address on file for "' + s.username + '". Set it in Users & Access.');
    }
  }

  function resendPin() {
    var p = getPending();
    if (!p) { hideOverlay(); return; }
    p.pin = String(Math.floor(100000 + Math.random() * 900000));
    p.exp = Date.now() + PIN_TTL_MS;
    p.attempts = 0;
    lsSet(PENDING_KEY, JSON.stringify(p));
    var errEl = document.getElementById('bos-2fa-error');
    errEl.textContent = '';
    refreshUrlRow();
    if (p.email) {
      var r = sendPinEmail(p.email, p.pin, p.session.username);
      if (r.sent) {
        setStatus('RESENT to the one backend:\n' + r.url);
      } else if (r.dead) {
        setStatus('RESEND REFUSED — the configured backend is the OLD DEAD one.\nPaste your NEW /exec URL in the box below and press Save URL & Send.');
      } else {
        setStatus('RESEND FAILED — ' + r.error + '.\nIf you have a new URL, paste it in the box below.');
      }
    } else {
      setStatus('RESEND FAILED — no email on file for "' + p.session.username + '".');
    }
    document.getElementById('bos-2fa-input').focus();
  }

  function cancelChallenge() {
    lsDel(PENDING_KEY);
    lsDel(VERIFIED_KEY);
    lsDel(SESSION_KEY);
    hideOverlay();
    window.location.reload();
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
        errEl.textContent = 'Too many wrong codes. Login blocked — sign in again.';
        setTimeout(function () { cancelChallenge(); }, 1600);
        return;
      }
      errEl.textContent = 'Wrong code. ' + (MAX_ATTEMPTS - p.attempts) + ' attempts left.';
      return;
    }
    lsSet(VERIFIED_KEY, JSON.stringify({ id: p.session.id, exp: Date.now() + VERIFIED_TTL_MS }));
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

  var lastSuperadminId = null;
  function tick() {
    var found = rawSession();
    var s = found ? normalizeSession(found.obj) : null;
    if (!s) {
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
      if (!document.getElementById('bos-2fa-overlay')) showOverlay(p);
      return;
    }
    startChallenge(s, found);
  }

  setInterval(tick, 500);
  tick();
  window.BOS2FA = { version: VERSION };
})();
