/* Aetherion BOS - Module System Test (Phase 1)
   Display-only demonstration module. No CRM data access,
   no localStorage, no network, no business logic. */
(function (global) {
  'use strict';
  if (!global.BOSModules) return; // registry must load first

  global.BOSModules.register({
    id: 'module-test',
    name: 'Module System Test',
    navLabel: 'Module Test',
    version: '1.0.0',
    permissions: [],

    render: function (container) {
      var section = global.document.createElement('section');
      section.className = 'bos-module-workspace';

      var heading = global.document.createElement('h2');
      heading.textContent = 'Module System Test';

      var description = global.document.createElement('p');
      description.textContent =
        'This workspace is rendered inside the Aetherion BOS shell.';

      section.appendChild(heading);
      section.appendChild(description);
      container.appendChild(section);
    }
  });
})(typeof window !== 'undefined' ? window : this);
