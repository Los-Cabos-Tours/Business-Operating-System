// ============================================================
// SLF Single Navigation — v2 (single-part, clean).
// Owner report (2026-11-17): the area under "SLF CRM / Student
// Loan Forgiveness" rendered EMPTY — no navigation at all, panel
// floating under the sidebar title, main area blank.
// Root cause: v1 hid the sidebar nav and relied on a fragile
// top bar. Fix: ONE nav surface — the sidebar itself carries
// the 17 BOS modules, and the dashboard grid is inline-styled
// so the right column can never go blank.
// ============================================================
(function () {
  'use strict';

  var MODULES = [
    ['dashboard', 'Dashboard', 'dashboard'],
    ['guidelines', 'Guidelines', ''],
    ['contacts', 'Contacts', 'clients'],
    ['creditors', 'Creditors', ''],
    ['tasks', 'Tasks', ''],
    ['calendar', 'Calendar', ''],
    ['enrollments', 'Enrollments', ''],
    ['accounting', 'Accounting', ''],
    ['billing', 'Billing', ''],
    ['settlements', 'Settlements', ''],
    ['docs', 'Docs', ''],
    ['files', 'Files', ''],
    ['emarketing', 'E-Marketing', ''],
    ['sms', 'SMS', ''],
    ['reports', 'Reports', ''],
    ['insights', 'Insights', ''],
    ['admin', 'Admin', '']
  ];

  var BUILT = false;

  function find(id) {
    for (var i = 0; i < MODULES.length; i++) if (MODULES[i][0] === id) return MODULES[i];
    return null;
  }

  function build() {
    var nav = document.getElementById('nav');
    if (!nav) return;
    if (nav.getAttribute('data-bos-nav') === 'v2') { paint(); return; }
    var html = '';
    for (var i = 0; i < MODULES.length; i++) {
      html += '<button class="bos-mod" data-bos="' + MODULES[i][0] + '">' + MODULES[i][1] + '</button>';
    }
    nav.innerHTML = html;
    nav.setAttribute('data-bos-nav', 'v2');
    nav.style.display = '';
    paint();
  }

  function paint() {
    var nav = document.getElementById('nav');
    if (!nav) return;
    var active = nav.getAttribute('data-active') || 'dashboard';
    var kids = nav.querySelectorAll('.bos-mod');
    for (var i = 0; i < kids.length; i++) {
      var on = kids[i].getAttribute('data-bos') === active;
      kids[i].style.color = on ? 'var(--gold)' : 'var(--muted)';
      kids[i].style.borderLeftColor = on ? 'var(--gold)' : 'transparent';
      kids[i].style.fontWeight = on ? '600' : '400';
      kids[i].style.background = on ? 'rgba(201,168,76,0.1)' : 'none';
    }
  }

  function select(id) {
    var m = find(id);
    if (!m) return;
    var nav = document.getElementById('nav');
    if (nav) nav.setAttribute('data-active', id);
    if (window.SLFBoard && SLFBoard.state().clientId) SLFBoard.close();
    if (m[2]) {
      if (window.SLF) { SLF.view = m[2]; SLF.render(); }
    } else {
      var v = document.getElementById('view');
      var t = document.getElementById('view-title');
      if (t) t.textContent = m[1];
      if (v) v.innerHTML = '<div class="card"><h3>' + m[1] + ' — module workspace</h3>' +
        '<p style="color:var(--muted);font-size:13px;">This module\'s navigation destination is live. The ' + m[1] +
        ' workflow is in development. No data is stored here yet.</p></div>';
    }
    paint();
  }

  function layout() {
    var wrap = document.querySelector('.bwrap');
    if (wrap) wrap.setAttribute('style', 'display:grid;grid-template-columns:340px minmax(0,1fr);gap:16px;align-items:start;');
    var bright = document.querySelector('.bright');
    if (bright) bright.setAttribute('style', 'background:rgba(15,32,64,0.45);border:1px solid var(--line);border-radius:12px;padding:16px;min-height:300px;');
  }

  function bind() {
    var nav = document.getElementById('nav');
    if (!nav || nav.getAttribute('data-bos-click') === 'v2') return;
    nav.setAttribute('data-bos-click', 'v2');
    nav.addEventListener('click', function (ev) {
      var t = ev.target;
      while (t && t !== nav) {
        if (t.getAttribute && t.getAttribute('data-bos')) {
          ev.preventDefault();
          select(t.getAttribute('data-bos'));
          return;
        }
        t = t.parentNode;
      }
    });
  }

  function boot() {
    build();
    bind();
    layout();
    setInterval(function () { build(); bind(); layout(); }, 1000);
    if (window.MutationObserver) {
      new MutationObserver(function () { build(); layout(); }).observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();