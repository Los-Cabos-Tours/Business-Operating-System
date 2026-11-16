// Notes safety patch. The profile Notes box now starts BLANK on
// every open (user request - it is a fresh note field, not a
// display of old notes). saveProfile must NOT wipe a client's
// stored notes when the box is left empty: it only overwrites
// the stored notes when the user actually typed something.
'use strict';
(function () {
  if (!window.SLFBoard) return;
  SLFBoard.saveProfile = function () {
    var c = SLFBoard.client();
    if (!c) return;
    var custom = {};
    if (window.SLFFields) {
      var res = SLFFields.readInputs('client', 'pe-cf-');
      if (res.errors && res.errors.length) {
        alert('Please fix these first:\n- ' + res.errors.join('\n- '));
        return;
      }
      custom = res.values;
    }
    c.custom = custom;
    var notes = SLFBoard.val('pe-notes').trim();
    if (notes) c.notes = notes;
    c.updatedAt = Date.now();
    if (window.SLF) {
      SLF_STORE.write(SLF_CLIENTS_KEY, SLF.clients);
      SLF.log('board', 'profile (' + c.id + ')', 'profile edited from dashboard');
    }
    var el = document.getElementById('pe-flash');
    if (el) {
      el.textContent = 'Profile saved.';
      el.style.display = 'inline';
      setTimeout(function () { el.style.display = 'none'; }, 2500);
    }
    SLFBoard.render();
  };
})();
