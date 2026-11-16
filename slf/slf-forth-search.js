// Forth clone — search field module.
// Owner directive (final, literal): the magnifying glass INSIDE
// the field where you type, and typing changes NOTHING on the
// page — no panel, no results, no reflow, no tab switch. v7
// still rendered a results panel on typing; that entire
// function and its panel element are removed here. The field
// accepts typing and that is all.
// The Budget strip tab stays removed (#43 order).
'use strict';
(function () {
  if (!window.SLFBoard || !SLFBoard.TABS) return;

  // ---- Keep the duplicate Budget strip tab removed (#43 order) ----
  for (var i = SLFBoard.TABS.length - 1; i >= 0; i--) {
    if (SLFBoard.TABS[i].id === 'budget') SLFBoard.TABS.splice(i, 1);
  }

  // The search field (glass inside it, rendered by
  // slf-forth-nav.js) accepts typing. Nothing observes the
  // input; nothing renders on typing; the page stays exactly
  // as it is.
})();
