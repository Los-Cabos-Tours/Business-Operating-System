// ============================================================
// SLF E-Sign — send legal documents out for signature
// Self-contained module (slf-sync.js injection pattern):
//  - "Signatures" nav view (own click binding — SLF.bindNav only
//    binds buttons present at init): create signing requests for
//    any case, send the signing link, import the signed copy.
//  - Generates a STANDALONE signer page (slf/esign-signer.html)
//    populated by URL query: signer reads the document, draws
//    their signature, types their name, agrees, and the page
//    produces a signed copy JSON for the operator to import.
//  - Tamper-evidence: request hash = SHA-256 of
//    id|docName|docText|signerName|signerEmail|createdAt.
//    The signer page recomputes and refuses to sign on mismatch;
//    import compares and REJECTS any mismatch.
//  - Sending: prefilled email draft (mailto:) with the signer
//    link, plus copy-link for WhatsApp/SMS. No third-party
//    e-sign service, no fees, no server holding your documents.
//  - Data: slf_crm.esign.v1 (requests). Included in backups via
//    slf-fields.js superset bundle.
// ============================================================
'use strict';
var SLFEsign = (function () {
  var KEY = 'slf_crm.esign.v1';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function requests() {
    try { var v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  function saveRequests(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; }
    catch (e) { alert('SLF: could not save signature requests — storage full or blocked.'); return false; }
  }
  function find(id) { return requests().filter(function (r) { return r.id === id; })[0] || null; }

  // ---------- tiny SHA-256 (pure JS; same implementation runs in the signer page) ----------
  var SHA = (function () {
    function rotr(n, x) { return (x >>> n) | (x << (32 - n)); }
    return function (str) {
      var utf8 = unescape(encodeURIComponent(str));
      var H = [0x6a09e667, 0xbb67ae85, 3, 0x510e527f, 0x6b1d6bbf, 0x10f0e52d, 0x67f6f2ab, 0x6c1d0f9b];
      var K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x74aa2d09, 0x68d9e612, 0x8e8c7d9a, 0x3be91c9b, 0x3ff0d335, 0xc2e7e035, 0xd15ded5c, 0x84dfe841,
        0xadfa7c67, 0xf7684a2b, 0x2fd6b0e7, 0xa9b9c53e, 0x8f6a6f28, 0x6bfbf774, 0x2fb6de38, 0xf40d86d1];
      var l = utf8.length;
      var withOne = ((l + 8) >> 6) + 1;
      var words = new Array(withOne * 16).fill(0);
      for (var i = 0; i < l; i++) words[i >> 2] |= (utf8.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
      words[l >> 2] |= 0x80 << (24 - (l % 4) * 8);
      words[withOne * 16 - 1] = l * 8;
      for (var j = 0; j < withOne; j++) {
        var w = new Array(64);
        var t;
        for (t = 0; t < 16; t++) w[t] = words[j * 16 + t];
        for (t = 16; t < 64; t++) {
          var s0 = rotr(7, w[t - 15]) ^ rotr(18, w[t - 15]) ^ (w[t - 15] >>> 3);
          var s1 = rotr(17, w[t - 2]) ^ rotr(19, w[t - 2]) ^ (w[t - 2] >>> 10);
          w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
        }
        var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
        for (var t2 = 0; t2 < 64; t2++) {
          var S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
          var ch = (e & f) ^ (~e & g);
          var temp1 = (h + S1 + ch + K[t2] + w[t2]) | 0;
          var S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
          var maj = (a & b) ^ (a & c) ^ (b & c);
          var temp2 = (S0 + maj) | 0;
          h = g; g = f; f = e; e = (d + temp1) | 0; d = c; c = b; b = a; a = (temp1 + temp2) | 0;
        }
        H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
        H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
      }
      var out = '';
      for (var m = 0; m < 8; m++) out += ('00000000' + ((H[m] >>> 0).toString(16))).slice(-8);
      return out;
    };
  })();

  // Hash formula (MUST stay identical to esign-signer.html contentHash()):
  // id | docName | docText | signerName | signerEmail | createdAt
  function contentHash(req) {
    return SHA(req.id + '|' + req.docName + '|' + req.docText + '|' + req.signerName + '|' + req.signerEmail + '|' + req.createdAt);
  }

  // ---------- create request ----------
  function val(id) { var el = document.getElementById(id); return el ? el.value : ''; }

  function renderRequests() {
    var v = document.getElementById('view');
    if (!v) return;
    var rs = requests();
    var rows = rs.map(function (r) {
      var st = r.status === 'signed' ? '<span style="color:var(--green);">signed</span>'
        : (r.status === 'exported' ? '<span style="color:var(--green);">signed · filed</span>'
        : '<span style="color:var(--gold);">awaiting signature</span>');
      return '<tr><td>' + esc(r.id) + '</td><td>' + esc(r.docName) + '</td><td>' + esc(r.signerName) +
        '</td><td>' + esc(r.caseId || '—') + '</td><td>' + st + '</td>' +
        '<td><button class="btn small" onclick="SLFEsign.openRequest(SLFEsign.find(\'' + esc(r.id) + '\'))">View / Send</button> ' +
        '<button class="btn small ghost" onclick="SLFEsign.openImport(\'' + esc(r.id) + '\')">Import signed</button> ' +
        '<button class="btn small danger" onclick="SLFEsign.deleteRequest(\'' + esc(r.id) + '\')">Delete</button></td></tr>';
    }).join('');
    v.innerHTML =
      '<div class="card"><h3>New Signing Request</h3><div class="fgrid">' +
      '<div><label class="fl">Case *</label><select id="es-case">' +
      SLF.cases.map(function (k) {
        var c = SLF.clientById(k.clientId);
        return '<option value="' + esc(k.id) + '">' + esc(k.id + (c ? ' — ' + c.name : '')) + '</option>';
      }).join('') +
      '</select></div>' +
      '<div><label class="fl">Document name *</label><input id="es-doc" placeholder="Power of Attorney" /></div>' +
      '<div class="full"><label class="fl">Document text — full agreement the signer will see and sign *</label>' +
      '<textarea id="es-text" rows="5" placeholder="Paste the full legal text of the document here. The signer reads exactly this text before signing."></textarea></div>' +
      '<div><label class="fl">Signer name *</label><input id="es-signer" placeholder="Jane Doe" /></div>' +
      '<div><label class="fl">Signer email *</label><input id="es-email" type="email" placeholder="jane@email.com" /></div>' +
      '<div class="full"><label class="fl">Message to signer (optional)</label><input id="es-msg" placeholder="Please review and sign. Thank you!" /></div>' +
      '</div><div class="modal-actions" style="justify-content:flex-start;">' +
      '<button class="btn" onclick="SLFEsign.createRequest()">Create Signing Request</button></div></div>' +
      '<div class="card"><h3>Signature Requests</h3>' +
      (rs.length ? '<table><thead><tr><th>ID</th><th>Document</th><th>Signer</th><th>Case</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>'
        : '<div class="empty">No signing requests yet. Create one above — pick a case, paste the document, name the signer.</div>') +
      '</div>';
  }

  function createRequest() {
    var caseId = val('es-case');
    var docName = val('es-doc').trim();
    var docText = val('es-text');
    var signerName = val('es-signer').trim();
    var signerEmail = val('es-email').trim();
    var msg = val('es-msg').trim();
    var errs = [];
    if (!docName) errs.push('Document name is required.');
    if (!docText.trim()) errs.push('Document text is required — the signer must see the full agreement.');
    if (!signerName) errs.push('Signer name is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signerEmail)) errs.push('Signer email is invalid.');
    if (errs.length) { alert('Please fix:\n- ' + errs.join('\n- ')); return; }
    var req = {
      id: 'ES-' + Date.now().toString(36).toUpperCase(),
      caseId: caseId || null,
      docName: docName, docText: docText,
      signerName: signerName, signerEmail: signerEmail, msg: msg,
      status: 'sent', createdAt: new Date().toISOString(),
      audit: [{ ts: new Date().toISOString(), action: 'created' }]
    };
    req.hash = contentHash(req);
    var all = requests();
    all.push(req);
    if (!saveRequests(all)) return;
    SLF.log('esign', 'request ' + req.id, docName + ' → ' + signerName);
    openRequest(req);
  }

  // ---------- request panel: send + import ----------
  function openRequest(r) {
    if (!r) return;
    var link = signerLink(r);
    var panel = '<div class="card"><h3>' + esc(r.docName) + ' — ' + esc(r.signerName) + '</h3>' +
      '<p style="font-size:12px;color:var(--muted);">Request <strong>' + esc(r.id) + '</strong> · case ' + esc(r.caseId || '—') + ' · created ' + esc(r.createdAt) + '</p>' +
      '<div class="fgrid" style="margin-top:14px;">' +
      '<div class="full"><label class="fl">Signing link — send this to the signer</label><input id="es-link" readonly value="' + esc(link) + '" /></div>' +
      '<div class="full"><label class="fl">Send it</label>' +
      '<a class="btn" style="text-decoration:none;" href="' + esc(mailtoHref(r)) + '">Open Email Draft</a> ' +
      '<button class="btn ghost" onclick="SLFEsign.copyLink()">Copy Link</button></div>' +
      '</div>' +
      '<div class="card" style="margin:16px 0 0 0;"><h3>Document the signer will see</h3>' +
      '<div style="white-space:pre-wrap;font-size:12.5px;line-height:1.6;">' + esc(r.docText) + '</div></div>' +
      '<div class="modal-actions" style="justify-content:flex-start;margin-top:16px;">' +
      '<button class="btn ghost" onclick="SLFEsign.renderRequests()">Back to list</button></div></div>';
    var v = document.getElementById('view');
    if (v) {
      v.innerHTML = panel;
      markAudit(r.id, 'viewed');
    }
  }

  // Every parameter used by the signer page's hash formula MUST be in the URL.
  function signerLink(r) {
    var base = location.href.replace(/[^/]*$/, '');
    return base + 'esign-signer.html' +
      '?id=' + encodeURIComponent(r.id) +
      '&doc=' + encodeURIComponent(r.docName) +
      '&text=' + encodeURIComponent(r.docText) +
      '&signer=' + encodeURIComponent(r.signerName) +
      '&email=' + encodeURIComponent(r.signerEmail) +
      '&created=' + encodeURIComponent(r.createdAt) +
      '&hash=' + encodeURIComponent(r.hash);
  }
  function mailtoHref(r) {
    var body = r.msg ? r.msg + '\n\n' : '';
    body += 'Please read and sign here:\n' + signerLink(r) +
      '\n\nAfter signing, download the signed copy (SLF-signed JSON file) and send it back to us by replying to this email.';
    return 'mailto:' + encodeURIComponent(r.signerEmail) +
      '?subject=' + encodeURIComponent('Signature requested: ' + r.docName + ' (' + r.id + ')') +
      '&body=' + encodeURIComponent(body);
  }
  function copyLink() {
    var el = document.getElementById('es-link');
    if (!el) return;
    el.select();
    try { document.execCommand('copy'); alert('Link copied to clipboard.'); }
    catch (e) { alert('Copy failed — select the link text and copy manually.'); }
  }

  function markAudit(id, action) {
    var all = requests();
    var r = all.filter(function (x) { return x.id === id; })[0];
    if (!r) return;
    r.audit.push({ ts: new Date().toISOString(), action: action });
    saveRequests(all);
  }

  function deleteRequest(id) {
    if (!confirm('Delete this signing request permanently? Signed data already imported into cases is kept.')) return;
    saveRequests(requests().filter(function (r) { return r.id !== id; }));
    SLF.log('esign-delete', 'request ' + id, 'signature request removed');
    renderRequests();
  }

  // ---------- import signed copy ----------
  function openImport(id) {
    the r = find(id);
    if (!r) return;
    var v = document.getElementById('view');
    if (!v) return;
    v.innerHTML = '<div class="card"><h3>Import Signed Copy — ' + esc(r.docName) + '</h3>' +
      '<p style="font-size:12.5px;color:var(--muted);">Select the <code>SLF-signed-' + esc(r.id) + '.json</code> file the signer sent back. The document hash is verified against this request — any mismatch is rejected.</p>' +
      '<input type="file" id="es-import-file" accept=".json,application/json" style="max-width:320px;" />' +
      '<button class="btn" style="margin-left:10px;" onclick="SLFEsign.importSigned(\'' + esc(r.id) + '\')">Verify &amp; Import</button>' +
      '<div id="es-import-status" style="font-size:12px;margin-top:10px;"></div></div>';
    var st = document.getElementById('es-import-status');
    if (st) st.textContent = 'Expected hash: ' + r.hash;
  }

  function importSigned(id) {
    var r = find(id);
    var fEl = document.getElementById('es-import-file');
    var st = document.getElementById('es-import-status');
    if (!r || !fEl || !fEl.files || !fEl.files[0]) { alert('Choose the signed file first.'); return; }
    var file = fEl.files[0];
    var reader = new FileReader();
    reader.onload = function (ev) {
      var parsed = null;
      try { parsed = JSON.parse(ev.target.result); } catch (e) {}
      if (!parsed || parsed.format !== 'slf-signed' || !parsed.requestId) {
        if (st) st.textContent = 'REJECTED: not a signed SLF document.';
        return;
      }
      if (parsed.requestId !== r.id) {
        if (st) st.textContent = 'REJECTED: this signed copy belongs to request ' + parsed.requestId + ', not ' + r.id + '.';
        return;
      }
      if (parsed.hash !== r.hash) {
        if (st) st.textContent = 'REJECTED: document hash mismatch — the signed document differs from the one sent. Cannot import.';
        SLF.log('esign-import', 'request ' + r.id, 'REJECTED — hash mismatch');
        return;
      }
      var all = requests();
      var rec = all.filter(function (x) { return x.id === r.id; })[0];
      if (!rec) { if (st) st.textContent = 'REJECTED: request no longer exists.'; return; }
      rec.status = 'signed';
      rec.signedAt = parsed.signedAt;
      rec.signatureData = parsed.signatureData;
      rec.typedName = parsed.typedName;
      rec.audit.push({ ts: new Date().toISOString(), action: 'signed copy imported' });
      if (!saveRequests(all)) return;
      SLF.log('esign-import', 'request ' + r.id, 'verified and imported — ' + r.docName);
      if (st) st.textContent = 'Imported and verified. Signature recorded for ' + r.docName + '.';
      setTimeout(function () { renderRequests(); }, 1200);
    };
    reader.onerror = function () { alert('Could not read the selected file.'); };
    reader.readAsText(file);
  }

  // ---------- nav + hook ----------
  function hook() {
    var nav = document.getElementById('nav');
    if (nav) {
      var b = document.createElement('button');
      b.setAttribute('data-view', 'esign');
      b.textContent = 'Signatures';
      b.addEventListener('click', function () {
        var all = document.querySelectorAll('#nav button');
        Array.prototype.forEach.call(all, function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        SLF.view = 'esign';
        SLF.render();
      });
      nav.appendChild(b);
    }
    var origRender = SLF.render;
    if (SLF.render.__esignHooked) return;
    SLF.render = function () {
      origRender.apply(SLF, arguments);
      try {
        if (SLF.view === 'esign') {
          document.getElementById('view-title').textContent = 'Signatures';
          renderRequests();
        }
      } catch (e) {}
    };
    SLF.render.__esignHooked = true;
  }

  document.addEventListener('DOMContentLoaded', function () { if (window.SLF) hook(); });

  return {
    requests: requests, saveRequests: saveRequests, find: find,
    createRequest: createRequest, renderRequests: renderRequests, openRequest: openRequest,
    openImport: openImport, importSigned: importSigned, deleteRequest: deleteRequest,
    copyLink: copyLink
  };
})();
